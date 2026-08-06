"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"

export function LoginForm({ target = "/" }: { target?: string }) {
  const router = useRouter()
  const { login } = useAuth()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (submitting || !password) return
      setSubmitting(true)
      setError(undefined)
      const result = await login(password)
      setSubmitting(false)
      if (result.ok) {
        toast.success("로그인되었습니다")
        router.replace(target)
        router.refresh()
      } else {
        setError(result.error || "로그인 실패")
      }
    },
    [submitting, password, login, router, target]
  )

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-muted-foreground" />
          <h1 className="text-lg font-semibold">로그인</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">MD Editor에 접근하려면 비밀번호를 입력하세요.</p>

        <div className="mt-4 flex flex-col gap-2">
          <Input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            autoFocus
            aria-label="비밀번호"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting || !password}>
            {submitting ? "확인 중..." : "로그인"}
          </Button>
        </div>
      </form>
    </div>
  )
}