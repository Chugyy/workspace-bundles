# agent.py
#
# Direct SDK implementation — replaces HTTP proxy to agent-proxy.
# Uses claude-agent-sdk to spawn Claude Code locally.
# Maintains identical interface: start() / stop() / is_running() / subscribe() / unsubscribe()

import asyncio
import base64
from typing import Dict, List, Optional

import asyncpg

# SDK patch — gracefully handle MessageParseError on unknown message types
try:
    import claude_agent_sdk._internal.client as _sdk_client
    from claude_agent_sdk._errors import MessageParseError as _MessageParseError
    _orig_parse = _sdk_client.parse_message

    def _safe_parse(data):
        try:
            return _orig_parse(data)
        except _MessageParseError:
            return None

    _sdk_client.parse_message = _safe_parse
except Exception:
    pass

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ResultMessage,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
    query,
)

from config.config import settings
from config.logger import logger

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_TEXT_MIME_EXACT = {"application/json", "application/xml", "application/yaml", "application/x-yaml"}


def _is_auth_error(message: ResultMessage) -> bool:
    if not message.is_error:
        return False
    text = str(getattr(message, "result", "") or "").lower()
    return any(t in text for t in ("not logged in", "401", "403", "unauthorized"))


def _build_prompt_input(prompt: str, files: list[dict] | None):
    """Return plain string or async generator for multimodal prompts."""
    if not files:
        return prompt

    async def _generator():
        content = []
        for f in files:
            mime = f.get("mime_type") or "application/octet-stream"
            raw: bytes = f["bytes"]
            filename = f.get("filename", "file")

            if mime.startswith("image/"):
                content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": mime,
                        "data": base64.standard_b64encode(raw).decode(),
                    },
                })
            elif mime.startswith("text/") or mime in _TEXT_MIME_EXACT:
                try:
                    text = raw.decode("utf-8")
                except Exception:
                    text = raw.decode("latin-1", errors="replace")
                content.append({"type": "text", "text": f'<file name="{filename}">\n{text}\n</file>'})
            else:
                content.append({
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": mime if mime == "application/pdf" else "application/pdf",
                        "data": base64.standard_b64encode(raw).decode(),
                    },
                    "title": filename,
                })

            content.append({"type": "text", "text": f'[file: "{filename}"]'})

        content.append({"type": "text", "text": prompt})
        yield {
            "type": "user",
            "message": {"role": "user", "content": content},
            "parent_tool_use_id": None,
            "session_id": "",
        }

    return _generator()


# ---------------------------------------------------------------------------
# AgentManager singleton
# ---------------------------------------------------------------------------

class AgentManager:
    """Singleton managing Claude agent sessions via direct SDK calls."""

    _instance: Optional["AgentManager"] = None

    def __init__(self) -> None:
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.event_queues: Dict[str, asyncio.Queue] = {}
        self.event_buffers: Dict[str, List[dict]] = {}

    @classmethod
    def get(cls) -> "AgentManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ------------------------------------------------------------------
    # SSE subscription (unchanged interface)
    # ------------------------------------------------------------------

    def subscribe(self, session_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        for event in self.event_buffers.pop(session_id, []):
            queue.put_nowait(event)
        self.event_queues[session_id] = queue
        return queue

    def unsubscribe(self, session_id: str) -> None:
        self.event_queues.pop(session_id, None)

    def _push_event(self, session_id: str, event: dict) -> None:
        queue = self.event_queues.get(session_id)
        if queue is not None:
            queue.put_nowait(event)
        else:
            self.event_buffers.setdefault(session_id, []).append(event)

    # ------------------------------------------------------------------
    # Task lifecycle
    # ------------------------------------------------------------------

    async def start(
        self,
        session_id: str,
        prompt: str,
        pool: asyncpg.Pool,
        allowed_tools: list[str],
        resume_claude_session_id: Optional[str] = None,
        files: Optional[list[dict]] = None,
        cwd: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        task = asyncio.create_task(
            self._run(session_id, prompt, pool, allowed_tools, resume_claude_session_id, files, cwd, model)
        )
        self.active_tasks[session_id] = task

    async def stop(self, session_id: str) -> bool:
        task = self.active_tasks.get(session_id)
        if task is None or task.done():
            return False
        task.cancel()
        return True

    def is_running(self, session_id: str) -> bool:
        task = self.active_tasks.get(session_id)
        return task is not None and not task.done()

    # ------------------------------------------------------------------
    # Core loop
    # ------------------------------------------------------------------

    async def _run(
        self,
        session_id: str,
        prompt: str,
        pool: asyncpg.Pool,
        allowed_tools: list[str],
        resume_claude_session_id: Optional[str],
        files: Optional[list[dict]] = None,
        cwd: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        from app.database.crud.messages import count_messages_crud, create_message_crud, update_message_content_crud
        from app.database.crud.sessions import update_session_status_crud

        claude_session_id: Optional[str] = None
        tool_use_message_map: dict[str, tuple[str, list]] = {}

        try:
            # 1. Persist user message
            count = await count_messages_crud(pool, session_id)
            user_content: dict = {"text": prompt}
            if files:
                user_content["attachments"] = [
                    {
                        "file_id": f.get("file_id"),
                        "filename": f.get("filename"),
                        "mime_type": f.get("mime_type"),
                        "size": f.get("size"),
                    }
                    for f in files
                ]
            await create_message_crud(pool, session_id, "user", user_content, count)

            # 2. Guard — token required
            token = settings.claude_code_oauth_token
            if not token:
                self._push_event(session_id, {"type": "error", "reason": "token_missing"})
                return

            # 3. Run SDK
            options = ClaudeAgentOptions(
                allowed_tools=allowed_tools,
                permission_mode="bypassPermissions",
                cwd=cwd or f"{settings.base_workspaces_path}/default",
                resume=resume_claude_session_id,
                setting_sources=["user", "project", "local"],
                env={"CLAUDE_CODE_OAUTH_TOKEN": token},
                **({"model": model} if model else {}),
            )
            prompt_input = _build_prompt_input(prompt, files)
            sequence = count + 1

            async for message in query(prompt=prompt_input, options=options):

                if isinstance(message, ResultMessage):
                    if _is_auth_error(message):
                        self._push_event(session_id, {"type": "error", "reason": "auth_error"})
                        return
                    claude_session_id = message.session_id
                    self._push_event(session_id, {
                        "type": "result",
                        "claude_session_id": claude_session_id,
                    })
                    continue

                if isinstance(message, UserMessage) and isinstance(message.content, list):
                    for block in message.content:
                        if isinstance(block, ToolResultBlock):
                            content = block.content
                            if isinstance(content, list):
                                content = "\n".join(
                                    item.get("text", "") for item in content
                                    if isinstance(item, dict) and item.get("type") == "text"
                                )
                            tool_use_id = block.tool_use_id
                            if tool_use_id and tool_use_id in tool_use_message_map:
                                msg_id, blocks = tool_use_message_map[tool_use_id]
                                for b in blocks:
                                    if b.get("type") == "tool_use" and b.get("id") == tool_use_id:
                                        b["output"] = content or ""
                                        b["is_error"] = bool(block.is_error)
                                        break
                                await update_message_content_crud(pool, msg_id, {"blocks": blocks})
                            self._push_event(session_id, {
                                "type": "tool_result",
                                "tool_use_id": tool_use_id,
                                "content": content or "",
                                "is_error": bool(block.is_error),
                            })
                    continue

                if isinstance(message, AssistantMessage):
                    blocks = []
                    for block in message.content:
                        if isinstance(block, TextBlock):
                            blocks.append({"type": "text", "text": block.text})
                        elif isinstance(block, ToolUseBlock):
                            blocks.append({
                                "type": "tool_use",
                                "id": block.id,
                                "name": block.name,
                                "input": block.input,
                            })
                    msg = await create_message_crud(
                        pool, session_id, "assistant", {"blocks": blocks}, sequence
                    )
                    sequence += 1
                    msg_id = str(msg["id"])
                    for block in blocks:
                        if block.get("type") == "tool_use":
                            tool_use_message_map[block["id"]] = (msg_id, blocks)
                    self._push_event(session_id, {"type": "assistant", "blocks": blocks})

            await update_session_status_crud(pool, session_id, "completed", claude_session_id)
            self._push_event(session_id, {"type": "completed"})

        except asyncio.CancelledError:
            await asyncio.shield(
                update_session_status_crud(pool, session_id, "stopped", claude_session_id)
            )
            self._push_event(session_id, {"type": "stopped"})

        except Exception as exc:
            logger.error(f"Agent error for session {session_id}: {exc}")
            await update_session_status_crud(pool, session_id, "error", None)
            self._push_event(session_id, {"type": "error", "message": str(exc)})

        finally:
            self.active_tasks.pop(session_id, None)
