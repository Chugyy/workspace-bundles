# core/services/files.py
# Generic sandboxed file operations. All functions take a root Path.
# Used by workspaces.py and profiles.py — never called directly from routes.

import io
import shutil
import zipfile
from pathlib import Path


def _safe_resolve(root: Path, subpath: str) -> tuple[Path, Path]:
    base = root.resolve()
    clean = subpath.strip("/")
    target = (base / clean).resolve() if clean else base
    if not str(target).startswith(str(base)):
        raise ValueError("Path traversal not allowed")
    return base, target


def list_dir(root: Path, subpath: str = "") -> dict:
    base, target = _safe_resolve(root, subpath)
    if not target.exists():
        raise FileNotFoundError(f"Path not found: {subpath}")
    entries = []
    for item in sorted(target.iterdir(), key=lambda p: (p.is_file(), p.name)):
        entries.append({
            "name": item.name,
            "type": "dir" if item.is_dir() else "file",
            "size": item.stat().st_size if item.is_file() else None,
        })
    return {"path": subpath or "/", "entries": entries}


def read_file(root: Path, subpath: str) -> tuple[str, str]:
    _, target = _safe_resolve(root, subpath)
    if not target.exists() or not target.is_file():
        raise FileNotFoundError(f"File not found: {subpath}")
    suffix = target.suffix.lower()
    text_extensions = {
        '.md', '.txt', '.py', '.js', '.ts', '.tsx', '.jsx', '.json',
        '.yaml', '.yml', '.toml', '.cfg', '.ini', '.sh', '.bash',
        '.css', '.html', '.xml', '.sql', '.env', '.gitignore', '.dockerignore', '',
    }
    if suffix in text_extensions or target.stat().st_size < 512_000:
        try:
            return target.read_text(encoding='utf-8'), 'text'
        except UnicodeDecodeError:
            return '[Binary file]', 'binary'
    return '[File too large to display]', 'binary'


def write_file(root: Path, subpath: str, content: str) -> None:
    _, target = _safe_resolve(root, subpath)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def delete_path(root: Path, subpath: str) -> None:
    _, target = _safe_resolve(root, subpath)
    if not target.exists():
        raise FileNotFoundError(f"Path not found: {subpath}")
    shutil.rmtree(target) if target.is_dir() else target.unlink()


def duplicate_path(root: Path, subpath: str) -> str:
    base, target = _safe_resolve(root, subpath)
    if not target.exists():
        raise FileNotFoundError(f"Path not found: {subpath}")
    stem, suffix, parent = target.stem, target.suffix, target.parent
    dest = parent / f"{stem} (copy){suffix}"
    counter = 2
    while dest.exists():
        dest = parent / f"{stem} (copy {counter}){suffix}"
        counter += 1
    shutil.copytree(target, dest) if target.is_dir() else shutil.copy2(target, dest)
    return str(dest.relative_to(base))


def download_path(root: Path, subpath: str) -> tuple[io.BytesIO, str]:
    _, target = _safe_resolve(root, subpath)
    if not target.exists():
        raise FileNotFoundError(f"Path not found: {subpath}")
    if target.is_file():
        return io.BytesIO(target.read_bytes()), target.name
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in target.rglob("*"):
            if f.is_file():
                zf.write(f, f.relative_to(target))
    buf.seek(0)
    return buf, f"{target.name}.zip"


def zip_dir(root: Path) -> io.BytesIO:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in root.rglob("*"):
            if f.is_file():
                zf.write(f, f.relative_to(root))
    buf.seek(0)
    return buf


def copy_path(src_root: Path, src_subpath: str, dst_root: Path, dst_subpath: str) -> str:
    _, src = _safe_resolve(src_root, src_subpath)
    dst_base = dst_root.resolve()
    dst = (dst_base / dst_subpath.strip("/") / src.name).resolve()
    if not str(dst).startswith(str(dst_base)):
        raise ValueError("Path traversal not allowed")
    if not src.exists():
        raise FileNotFoundError(f"Source not found: {src_subpath}")
    if dst.exists():
        raise ValueError(f"Destination already exists: {dst.relative_to(dst_base)}")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(src, dst) if src.is_dir() else shutil.copy2(src, dst)
    return str(dst.relative_to(dst_base))


def move_path(src_root: Path, src_subpath: str, dst_root: Path, dst_subpath: str) -> str:
    _, src = _safe_resolve(src_root, src_subpath)
    dst_base = dst_root.resolve()
    dst = (dst_base / dst_subpath.strip("/") / src.name).resolve()
    if not str(dst).startswith(str(dst_base)):
        raise ValueError("Path traversal not allowed")
    if not src.exists():
        raise FileNotFoundError(f"Source not found: {src_subpath}")
    if dst == src:
        raise ValueError("Cannot move to the same location")
    if dst.exists():
        raise ValueError(f"Destination already exists: {dst.relative_to(dst_base)}")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    return str(dst.relative_to(dst_base))
