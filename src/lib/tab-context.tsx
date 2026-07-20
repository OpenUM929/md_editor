"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { TemplateMeta } from "./types"

export type DocTab = {
  id: string
  type: "doc"
  root: string
  filePath: string
  title: string
  content: string
  dirty: boolean
  recoveryDismissed?: boolean
}

export type TemplateTab = {
  id: string
  type: "template"
  templateRelativePath: string
  title: string
  content: string
  fetched: boolean
}

export type Tab = DocTab | TemplateTab

type TabContext = {
  tabs: Tab[]
  activeTabId: string | null
  openDoc: (root: string, filePath: string, initialContent?: string) => string
  openTemplate: (meta: TemplateMeta) => string
  activateTab: (id: string) => void
  updateTabContent: (id: string, content: string) => void
  setTabDirty: (id: string, dirty: boolean) => void
  setRecoveryDismissed: (id: string, dismissed: boolean) => void
  setTemplateFetched: (id: string, content: string) => void
  closeTab: (id: string) => void
  closeTabsToRight: (id: string) => void
  closeTabsToLeft: (id: string) => void
  closeOthers: (id: string) => void
  closeAll: () => void
  getActiveTab: () => Tab | undefined
}

const Ctx = createContext<TabContext | null>(null)

let nextId = 1
function genId() {
  return `tab-${nextId++}`
}

function titleFromPath(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/")
  const file = parts[parts.length - 1] || parts[parts.length - 2] || ""
  return file.replace(/\.md$/i, "")
}

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  const openDoc = useCallback((root: string, filePath: string, initialContent?: string): string => {
    const id = genId()
    let resultId = id
    setTabs((prev) => {
      const existing = prev.find(
        (t): t is DocTab => t.type === "doc" && t.root === root && t.filePath === filePath
      )
      if (existing) {
        resultId = existing.id
        setActiveTabId(existing.id)
        return prev
      }
      const tab: DocTab = {
        id,
        type: "doc",
        root,
        filePath,
        title: titleFromPath(filePath),
        content: initialContent ?? "",
        dirty: false,
      }
      setActiveTabId(id)
      return [...prev, tab]
    })
    return resultId
  }, [])

  const openTemplate = useCallback((meta: TemplateMeta): string => {
    const id = genId()
    let resultId = id
    setTabs((prev) => {
      const existing = prev.find(
        (t): t is TemplateTab => t.type === "template" && t.templateRelativePath === meta.relativePath
      )
      if (existing) {
        resultId = existing.id
        setActiveTabId(existing.id)
        return prev
      }
      const tab: TemplateTab = {
        id,
        type: "template",
        templateRelativePath: meta.relativePath,
        title: meta.title,
        content: "",
        fetched: false,
      }
      setActiveTabId(id)
      return [...prev, tab]
    })
    return resultId
  }, [])

  const activateTab = useCallback((id: string) => {
    setActiveTabId(id)
  }, [])

  const updateTabContent = useCallback((id: string, content: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, content, dirty: true } : t))
    )
  }, [])

  const setTabDirty = useCallback((id: string, dirty: boolean) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, dirty } : t))
    )
  }, [])

  const setRecoveryDismissed = useCallback((id: string, dismissed: boolean) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === id && t.type === "doc" ? { ...t, recoveryDismissed: dismissed } : t
      )
    )
  }, [])

  const setTemplateFetched = useCallback((id: string, content: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === id && t.type === "template"
          ? { ...t, content, fetched: true }
          : t
      )
    )
  }, [])

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      if (idx === -1) return prev
      const next = prev.filter((t) => t.id !== id)
      if (next.length === 0) {
        setActiveTabId(null)
      } else if (activeTabId === id) {
        const newIdx = Math.min(idx, next.length - 1)
        setActiveTabId(next[newIdx].id)
      }
      return next
    })
  }, [activeTabId])

  const closeTabsToRight = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      if (idx === -1) return prev
      const keep = prev.slice(0, idx + 1)
      if (activeTabId && !keep.find((t) => t.id === activeTabId)) {
        setActiveTabId(keep[keep.length - 1].id)
      }
      return keep
    })
  }, [activeTabId])

  const closeTabsToLeft = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      if (idx === -1) return prev
      const keep = prev.slice(idx)
      if (activeTabId && !keep.find((t) => t.id === activeTabId)) {
        setActiveTabId(keep[0].id)
      }
      return keep
    })
  }, [activeTabId])

  const closeOthers = useCallback((id: string) => {
    setTabs((prev) => {
      const keep = prev.filter((t) => t.id === id)
      if (keep.length === 0) {
        setActiveTabId(null)
        return []
      }
      setActiveTabId(id)
      return keep
    })
  }, [])

  const closeAll = useCallback(() => {
    setTabs([])
    setActiveTabId(null)
  }, [])

  const getActiveTab = useCallback((): Tab | undefined => {
    return tabs.find((t) => t.id === activeTabId)
  }, [tabs, activeTabId])

  return (
    <Ctx.Provider
      value={{
        tabs,
        activeTabId,
        openDoc,
        openTemplate,
        activateTab,
        updateTabContent,
        setTabDirty,
        setRecoveryDismissed,
        setTemplateFetched,
        closeTab,
        closeTabsToRight,
        closeTabsToLeft,
        closeOthers,
        closeAll,
        getActiveTab,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useTabs(): TabContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useTabs must be used within TabProvider")
  return ctx
}
