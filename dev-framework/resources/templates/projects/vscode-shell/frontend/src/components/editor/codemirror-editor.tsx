'use client'

import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

interface CodeMirrorEditorProps {
  value: string
  extension: string
  onChange: (value: string) => void
}

function getLanguageExtension(ext: string): Extension | null {
  switch (ext) {
    case 'js':
    case 'jsx':
      return javascript({ jsx: true })
    case 'ts':
    case 'tsx':
      return javascript({ jsx: true, typescript: true })
    case 'py':
      return python()
    case 'json':
      return json()
    case 'md':
      return markdown()
    case 'html':
    case 'htm':
      return html()
    case 'css':
      return css()
    case 'yml':
    case 'yaml':
    case 'toml':
    case 'env':
    case 'txt':
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'dockerfile':
      return null
    default:
      return null
  }
}

const vscodeDarkTheme = {
  '&': {
    backgroundColor: '#1e1e1e',
    color: '#cccccc',
    height: '100%',
  },
  '.cm-gutters': {
    backgroundColor: '#1e1e1e',
    color: '#6b6b6b',
    border: 'none',
    borderRight: '1px solid #3e3e3e',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#2a2d2e',
    color: '#cccccc',
  },
  '.cm-activeLine': {
    backgroundColor: '#2a2d2e44',
  },
  '.cm-selectionBackground': {
    backgroundColor: '#264f78 !important',
  },
  '.cm-cursor': {
    borderLeftColor: '#cccccc',
  },
  '.cm-content': {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: '12px',
    lineHeight: '1.6',
  },
  '.cm-line': {
    padding: '0 8px',
  },
}

export default function CodeMirrorEditorComponent({
  value,
  extension,
  onChange,
}: CodeMirrorEditorProps) {
  const extensions = useMemo(() => {
    const exts: Extension[] = [
      EditorView.theme({
        '&': { height: '100%', position: 'relative' },
        '.cm-scroller': {
          position: 'absolute !important' as string,
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
          overflowY: 'auto',
        },
      }),
    ]
    const lang = getLanguageExtension(extension)
    if (lang) exts.push(lang)
    return exts
  }, [extension])

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme="dark"
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        foldGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        indentOnInput: true,
        tabSize: 2,
      }}
      height="100%"
      style={{ height: '100%' }}
    />
  )
}
