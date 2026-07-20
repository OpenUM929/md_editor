"use client"

import { useEffect } from "react"

export function DevSWCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker
      .getRegistrations()
      .then((rs) => rs.forEach((r) => r.unregister()))
  }, [])
  return null
}
