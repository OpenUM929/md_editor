"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { initRootHandle, requestRootFolder, getRootHandle, setRootPath } from "@/lib/fs-access"

type WorkspaceContextType = {
  rootHandle: FileSystemDirectoryHandle | null
  rootPath: string | null
  ready: boolean
  requestFolder: () => Promise<boolean>
  setFolderPath: (path: string) => Promise<boolean>
  resetWorkspace: () => Promise<void>
}

const Ctx = createContext<WorkspaceContextType | null>(null)

const ROOT_PATH_KEY = "md_editor_root_path"

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [rootHandle, setRootHandleState] = useState<FileSystemDirectoryHandle | null>(null)
  const [rootPath, setRootPathState] = useState<string | null>(null)

  useEffect(() => {
    const storedPath = localStorage.getItem(ROOT_PATH_KEY)
    if (storedPath) {
      setRootPath(storedPath)
      setRootPathState(storedPath)
      setReady(true)
      return
    }
    initRootHandle()
      .then((ok) => {
        if (ok) {
          setRootHandleState(getRootHandle())
          setReady(true)
        }
      })
      .catch(() => {})
  }, [])

  const requestFolder = useCallback(async (): Promise<boolean> => {
    const handle = await requestRootFolder()
    if (handle) {
      setRootHandleState(handle)
      setReady(true)
      localStorage.removeItem(ROOT_PATH_KEY)
      return true
    }
    return false
  }, [])

  const setFolderPath = useCallback(async (path: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ensureRoot", root: path }),
      })
      const json = await res.json()
      if (!res.ok || json.error || !json.data) return false
      setRootPath(path)
      setRootPathState(path)
      localStorage.setItem(ROOT_PATH_KEY, path)
      setReady(true)
      return true
    } catch {
      return false
    }
  }, [])

  const resetWorkspace = useCallback(async () => {
    const { clearHandle } = await import("@/lib/fs-access")
    await clearHandle()
    setRootHandleState(null)
    setRootPathState(null)
    localStorage.removeItem(ROOT_PATH_KEY)
    setReady(false)
  }, [])

  return (
    <Ctx.Provider value={{ rootHandle, rootPath, ready, requestFolder, setFolderPath, resetWorkspace }}>
      {children}
    </Ctx.Provider>
  )
}

export function useWorkspace(): WorkspaceContextType {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider")
  return ctx
}
