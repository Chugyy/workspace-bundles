'use client'

import { useCallback, useState } from 'react'

export function useFileTreeState() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const collapseAll = useCallback(() => {
    setExpanded(new Set())
  }, [])

  const expand = useCallback((path: string) => {
    setExpanded((prev) => {
      if (prev.has(path)) return prev
      const next = new Set(prev)
      next.add(path)
      return next
    })
  }, [])

  const isExpanded = useCallback(
    (path: string) => expanded.has(path),
    [expanded]
  )

  return { toggle, collapseAll, expand, isExpanded }
}
