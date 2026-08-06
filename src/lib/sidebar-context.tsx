"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

const DEFAULT_WIDTH = 256
const MIN_WIDTH = 150
const MAX_WIDTH = 500
const STORAGE_KEY = "sidebar-width"

function readWidth(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return DEFAULT_WIDTH
  const n = Number(saved)
  if (Number.isNaN(n)) return DEFAULT_WIDTH
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n))
}

type SidebarContext = {
  open: boolean
  setOpen: (v: boolean) => void
  width: number
  setWidth: (v: number) => void
}

const Ctx = createContext<SidebarContext>({
  open: true,
  setOpen: () => {},
  width: DEFAULT_WIDTH,
  setWidth: () => {},
})

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true)
  const [width, setWidthState] = useState(readWidth)

  const setWidth = useCallback((v: number) => {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, v))
    setWidthState(clamped)
    localStorage.setItem(STORAGE_KEY, String(clamped))
  }, [])

  return (
    <Ctx.Provider value={{ open, setOpen, width, setWidth }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSidebar() {
  return useContext(Ctx)
}
