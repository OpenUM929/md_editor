"use client"

import { createContext, useContext, useCallback, useState, useRef, type ReactNode } from "react"

type FileTreeContextType = {
  reload: () => void
  reloadCounter: number
  selectedPaths: Set<string>
  lastSelectedPath: string | null
  toggleSelect: (path: string) => void
  rangeSelect: (path: string, allPaths: string[]) => void
  clearSelection: () => void
  selectAll: (paths: string[]) => void
  isSelected: (path: string) => boolean
}

const Ctx = createContext<FileTreeContextType | null>(null)

export function FileTreeContextProvider({
  children,
  value,
}: {
  children: ReactNode
  value: FileTreeContextType
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useFileTree(): FileTreeContextType {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useFileTree must be used within FileTreeContextProvider")
  return ctx
}

export function useFileTreeSelection() {
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const lastSelectedRef = useRef<string | null>(null)

  const toggleSelect = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      lastSelectedRef.current = path
      return next
    })
  }, [])

  const rangeSelect = useCallback((path: string, allPaths: string[]) => {
    const last = lastSelectedRef.current
    if (!last) {
      setSelectedPaths(new Set([path]))
      lastSelectedRef.current = path
      return
    }
    const fromIdx = allPaths.indexOf(last)
    const toIdx = allPaths.indexOf(path)
    if (fromIdx === -1 || toIdx === -1) {
      setSelectedPaths(new Set([path]))
      lastSelectedRef.current = path
      return
    }
    const start = Math.min(fromIdx, toIdx)
    const end = Math.max(fromIdx, toIdx)
    const range = allPaths.slice(start, end + 1)
    setSelectedPaths(new Set(range))
    lastSelectedRef.current = path
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set())
    lastSelectedRef.current = null
  }, [])

  const selectAll = useCallback((paths: string[]) => {
    setSelectedPaths(new Set(paths))
  }, [])

  const isSelected = useCallback((path: string) => {
    return selectedPaths.has(path)
  }, [selectedPaths])

  return {
    selectedPaths,
    lastSelectedPath: lastSelectedRef.current,
    toggleSelect,
    rangeSelect,
    clearSelection,
    selectAll,
    isSelected,
  }
}
