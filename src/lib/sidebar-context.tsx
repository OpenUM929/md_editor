"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type SidebarContext = {
  open: boolean
  setOpen: (v: boolean) => void
}

const Ctx = createContext<SidebarContext>({ open: true, setOpen: () => {} })

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>
}

export function useSidebar() {
  return useContext(Ctx)
}
