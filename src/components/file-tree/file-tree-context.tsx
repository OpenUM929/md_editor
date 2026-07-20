"use client"

import { createContext, useContext, type ReactNode } from "react"

type FileTreeContextType = {
  reload: () => void
  reloadCounter: number
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
