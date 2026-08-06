"use client"

import { useCallback, useEffect, useState } from "react"

type AuthStatus = {
  authed: boolean
  enabled: boolean
}

const IDLE: AuthStatus = { authed: false, enabled: false }

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>(IDLE)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status")
      const json = await res.json()
      if (res.ok && typeof json.authed === "boolean" && typeof json.enabled === "boolean") {
        setStatus({ authed: json.authed, enabled: json.enabled })
      } else {
        setStatus({ authed: false, enabled: true })
      }
    } catch {
      setStatus({ authed: false, enabled: true })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  const login = useCallback(
    async (password: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        })
        const json = await res.json().catch(() => ({}))
        if (res.ok) {
          await refresh()
          return { ok: true }
        }
        return { ok: false, error: json.error || "로그인 실패" }
      } catch {
        return { ok: false, error: "네트워크 오류가 발생했습니다" }
      }
    },
    [refresh]
  )

  const logout = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" })
      if (res.ok) {
        setStatus((s) => ({ ...s, authed: false }))
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  return { authed: status.authed, enabled: status.enabled, loading, login, logout, refresh }
}