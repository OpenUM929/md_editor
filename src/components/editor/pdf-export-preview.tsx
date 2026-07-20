"use client"

import { useState } from "react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas-pro"
import { A4_MARGIN_PRESETS } from "@/lib/a4-margins"
import type { MarginPresetId } from "@/lib/a4-margins"

type Props = {
  html: string
  marginPresetId: MarginPresetId
  onClose: () => void
}

export function PdfExportPreview({ html, marginPresetId, onClose }: Props) {
  const margin = A4_MARGIN_PRESETS[marginPresetId].values
  const sidePadding = margin.left
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const sheet = document.querySelector<HTMLElement>(".pdf-preview-sheet")
    if (!sheet) return
    setSaving(true)
    try {
      const canvas = await html2canvas(sheet, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        windowWidth: sheet.scrollWidth,
      })
      const pxPerMm = 96 / 25.4
      const widthMm = sheet.scrollWidth / pxPerMm
      const heightMm = sheet.scrollHeight / pxPerMm
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [widthMm, heightMm],
        compress: true,
      })
      const imgWidth = widthMm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.92),
        "JPEG",
        0,
        0,
        imgWidth,
        imgHeight
      )
      const blob = pdf.output("blob")
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "document.pdf"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      onClose()
    } catch (e) {
      ;(window as unknown as Record<string, unknown>).__saveErr = String(e)
      console.error("PDF save error:", e)
      setSaving(false)
    }
  }

  return (
    <div className="pdf-preview-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="pdf-preview-panel" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-preview-header">
          <span className="pdf-preview-title">PDF 미리보기</span>
          <button type="button" className="pdf-preview-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="pdf-preview-scroll">
          <div
            className="pdf-preview-sheet prose max-w-none"
            style={{ padding: `0 ${sidePadding}mm` }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
        <div className="pdf-preview-footer">
          <button type="button" className="pdf-preview-btn" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="pdf-preview-btn pdf-preview-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "저장 중..." : "PDF로 저장"}
          </button>
        </div>
      </div>
    </div>
  )
}
