"use client"

import { Badge } from "@/components/ui/badge"
import { Loader2, Check, AlertCircle } from "lucide-react"

type Props = {
  status: "idle" | "saving" | "saved" | "error"
}

export function AutoSaveIndicator({ status }: Props) {
  if (status === "idle") return null

  return (
    <Badge
      variant={status === "error" ? "destructive" : "outline"}
      className="gap-1 text-xs"
    >
      {status === "saving" && (
        <>
          <Loader2 className="size-3 animate-spin" />
          저장 중...
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="size-3" />
          자동 저장됨
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="size-3" />
          자동 저장 실패
        </>
      )}
    </Badge>
  )
}
