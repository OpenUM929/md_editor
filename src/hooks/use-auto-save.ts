"use client"

import { useEffect, useRef, useCallback } from "react"
import { autoSaveTemp } from "@/lib/fs-access"
import { AUTO_SAVE_DEBOUNCE_MS, LOCALSTORAGE_PREFIX } from "@/lib/constants"

type AutoSaveStatus = "idle" | "saving" | "saved" | "error"

export function useAutoSave(
  rootDir: string,
  filePath: string,
  content: string,
  onChangeStatus?: (status: AutoSaveStatus) => void
) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const rootRef = useRef(rootDir)
  const fileRef = useRef(filePath)
  const contentRef = useRef(content)
  const baselineRef = useRef<string | null>(null)
  const baselineFileRef = useRef<string | null>(null)

  useEffect(() => {
    rootRef.current = rootDir
    fileRef.current = filePath
    contentRef.current = content
    if (baselineFileRef.current !== filePath) {
      baselineFileRef.current = filePath
      baselineRef.current = null
    }
    if (baselineRef.current === null && content) {
      baselineRef.current = content
    }
  })

  const save = useCallback(async () => {
    const current = contentRef.current
    if (!current) return
    if (current === baselineRef.current) return

    onChangeStatus?.("saving")

    try {
      localStorage.setItem(
        `${LOCALSTORAGE_PREFIX}${fileRef.current}`,
        JSON.stringify({ content: current, savedAt: new Date().toISOString() })
      )

      await autoSaveTemp(rootRef.current, fileRef.current, current)
      onChangeStatus?.("saved")
    } catch {
      onChangeStatus?.("error")
    }
  }, [onChangeStatus])

  // Debounced auto-save on content change (single 2s debounce)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = setTimeout(() => {
      void save()
    }, AUTO_SAVE_DEBOUNCE_MS)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [content, save])

  // Flush latest content before unload/reload so edits aren't lost on F5
  useEffect(() => {
    const flush = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      void save()
    }
    window.addEventListener("pagehide", flush)
    window.addEventListener("beforeunload", flush)
    return () => {
      window.removeEventListener("pagehide", flush)
      window.removeEventListener("beforeunload", flush)
    }
  }, [save])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  // 파일에 실제 저장(수동 저장/복구 적용/삭제)된 시점에 baseline을 갱신한다.
  // 갱신하지 않으면 자동저장이 동일 내용을 temp로 다시 써서 복구 대화상자가 반복 노출된다.
  const markSaved = useCallback((value?: string) => {
    baselineRef.current = value ?? contentRef.current
  }, [])

  return { save, markSaved }
}
