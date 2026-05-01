'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { terminalService } from '@/services/terminal/terminal.service'
import { terminalRegistry } from '@/services/terminal/terminal.registry'

export function useTerminal(
  terminalId: string,
  tmuxSessionName: string,
  containerRef: RefObject<HTMLDivElement | null>,
  isActive: boolean
) {
  const xtermRef = useRef<import('@xterm/xterm').Terminal | null>(null)
  const fitAddonRef = useRef<import('@xterm/addon-fit').FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let aborted = false
    let resizeObserver: ResizeObserver | null = null
    let localTerminal: import('@xterm/xterm').Terminal | null = null

    const init = async () => {
      const { Terminal } = await import('@xterm/xterm')
      const { FitAddon } = await import('@xterm/addon-fit')
      const { WebLinksAddon } = await import('@xterm/addon-web-links')

      if (aborted || !containerRef.current) return

      const terminal = new Terminal({
        theme: {
          background: '#1e1e1e',
          foreground: '#cccccc',
          cursor: '#cccccc',
          selectionBackground: '#264f78',
          black: '#1e1e1e',
          brightBlack: '#666666',
          red: '#f44747',
          brightRed: '#f44747',
          green: '#6a9955',
          brightGreen: '#6a9955',
          yellow: '#d7ba7d',
          brightYellow: '#d7ba7d',
          blue: '#569cd6',
          brightBlue: '#569cd6',
          magenta: '#c586c0',
          brightMagenta: '#c586c0',
          cyan: '#4ec9b0',
          brightCyan: '#4ec9b0',
          white: '#d4d4d4',
          brightWhite: '#ffffff',
        },
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: 12,
        lineHeight: 1.2,
        cursorBlink: true,
        scrollback: 5000,
        altClickMovesCursor: true,
      })

      localTerminal = terminal

      const fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)
      terminal.loadAddon(new WebLinksAddon())

      if (aborted || !containerRef.current) {
        terminal.dispose()
        return
      }

      terminal.open(containerRef.current)

      // Shift+Up/Down: scroll xterm scrollback in normal mode,
      // or send arrow keys to TUI apps (like Claude Code) in alternate buffer
      terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
        if (e.shiftKey && e.type === 'keydown') {
          const inAltBuffer = terminal.buffer.active.type === 'alternate'

          if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (inAltBuffer) {
              // Send Up arrow to the TUI app for scrolling
              const ws = terminalService.getSocket(terminalId)
              if (ws?.readyState === WebSocket.OPEN) ws.send('\x1b[A')
            } else {
              terminal.scrollLines(-3)
            }
            return false
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (inAltBuffer) {
              const ws = terminalService.getSocket(terminalId)
              if (ws?.readyState === WebSocket.OPEN) ws.send('\x1b[B')
            } else {
              terminal.scrollLines(3)
            }
            return false
          }
          if (e.key === 'PageUp') {
            e.preventDefault()
            if (inAltBuffer) {
              const ws = terminalService.getSocket(terminalId)
              if (ws?.readyState === WebSocket.OPEN) ws.send('\x1b[5~')
            } else {
              terminal.scrollPages(-1)
            }
            return false
          }
          if (e.key === 'PageDown') {
            e.preventDefault()
            if (inAltBuffer) {
              const ws = terminalService.getSocket(terminalId)
              if (ws?.readyState === WebSocket.OPEN) ws.send('\x1b[6~')
            } else {
              terminal.scrollPages(1)
            }
            return false
          }
        }
        return true
      })

      // Also intercept wheel/trackpad to send arrow keys when in alternate buffer
      // (TUI apps like Claude Code), or scroll xterm scrollback in normal mode
      const xtermScreen = containerRef.current.querySelector('.xterm-screen')
      if (xtermScreen) {
        xtermScreen.addEventListener('wheel', (e) => {
          const inAltBuffer = terminal.buffer.active.type === 'alternate'
          if (inAltBuffer) {
            e.preventDefault()
            e.stopPropagation()
            const evt = e as WheelEvent
            const lines = Math.round(evt.deltaY / 30) || (evt.deltaY > 0 ? 1 : -1)
            const ws = terminalService.getSocket(terminalId)
            if (ws?.readyState === WebSocket.OPEN) {
              const key = lines > 0 ? '\x1b[B' : '\x1b[A'
              const count = Math.abs(lines)
              for (let i = 0; i < count; i++) ws.send(key)
            }
          }
          // In normal buffer, let xterm handle scroll natively
        }, { passive: false, capture: true })
      }

      // Wait for layout to settle before fitting
      await new Promise((r) => setTimeout(r, 150))
      if (aborted) { terminal.dispose(); return }

      fitAddon.fit()

      xtermRef.current = terminal
      fitAddonRef.current = fitAddon
      terminalRegistry.set(terminalId, terminal)

      let retryCount = 0

      const setupWsHandlers = (ws: WebSocket) => {
        terminal.onData((data) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data)
          }
        })

        ws.onmessage = (event) => {
          terminal.write(event.data)
        }

        ws.onopen = () => {
          if (retryCount > 0) {
            terminal.write('\r\n\x1b[32m[Reconnected]\x1b[0m\r\n')
          }
          retryCount = 0
          const sendResize = () => {
            fitAddon.fit()
            if (terminal.cols > 1 && terminal.rows > 1) {
              ws.send(JSON.stringify({
                type: 'resize',
                cols: terminal.cols,
                rows: terminal.rows,
              }))
            } else {
              setTimeout(sendResize, 200)
            }
          }
          sendResize()
        }

        ws.onerror = (err) => {
          console.error(`[useTerminal] WS ERROR for ${terminalId}:`, err)
        }

        ws.onclose = (e) => {
          console.log(`[useTerminal] WS CLOSE for ${terminalId} - code: ${e.code}, reason: ${e.reason}`)

          // Only stop reconnecting if component is unmounting
          if (aborted) return

          retryCount++
          const delay = Math.min(1000 * Math.pow(2, Math.min(retryCount - 1, 5)), 30000)
          terminal.write(`\r\n\x1b[33m[Connection lost — reconnecting in ${delay / 1000}s...]\x1b[0m\r\n`)

          setTimeout(() => {
            if (aborted) return
            const newWs = terminalService.connect(terminalId, tmuxSessionName)
            setupWsHandlers(newWs)
          }, delay)
        }
      }

      const ws = terminalService.connect(terminalId, tmuxSessionName)
      setupWsHandlers(ws)

      resizeObserver = new ResizeObserver(() => {
        if (fitAddonRef.current && xtermRef.current) {
          fitAddonRef.current.fit()
          const currentWs = terminalService.getSocket(terminalId)
          if (currentWs?.readyState === WebSocket.OPEN) {
            currentWs.send(JSON.stringify({
              type: 'resize',
              cols: xtermRef.current.cols,
              rows: xtermRef.current.rows,
            }))
          }
        }
      })

      if (containerRef.current) {
        resizeObserver.observe(containerRef.current)
      }
    }

    init()

    return () => {
      aborted = true
      resizeObserver?.disconnect()
      if (localTerminal) {
        localTerminal.dispose()
      }
      xtermRef.current = null
      fitAddonRef.current = null
      terminalRegistry.delete(terminalId)
      terminalService.disconnect(terminalId)
    }
  }, [terminalId, tmuxSessionName]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isActive && fitAddonRef.current && xtermRef.current) {
      // Small delay to let CSS position switch from absolute to relative
      setTimeout(() => {
        fitAddonRef.current?.fit()
        // Send updated dimensions to server
        const ws = terminalService.getSocket(terminalId)
        if (ws?.readyState === WebSocket.OPEN && xtermRef.current) {
          ws.send(JSON.stringify({
            type: 'resize',
            cols: xtermRef.current.cols,
            rows: xtermRef.current.rows,
          }))
        }
      }, 50)
    }
  }, [isActive, terminalId])
}
