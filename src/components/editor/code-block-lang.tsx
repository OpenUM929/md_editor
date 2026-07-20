"use client"

import { useCallback } from "react"
import type { Editor } from "@tiptap/react"

const LANGUAGES = [
  { label: "Plain Text", value: null },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "JSX", value: "jsx" },
  { label: "TSX", value: "tsx" },
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
  { label: "Python", value: "python" },
  { label: "Rust", value: "rust" },
  { label: "Go", value: "go" },
  { label: "Java", value: "java" },
  { label: "Kotlin", value: "kotlin" },
  { label: "SQL", value: "sql" },
  { label: "Bash", value: "bash" },
  { label: "JSON", value: "json" },
  { label: "YAML", value: "yaml" },
  { label: "Markdown", value: "markdown" },
  { label: "Diff", value: "diff" },
]

type Props = {
  editor: Editor | null
}

export function CodeBlockLangSelector({ editor }: Props) {
  const isActive = editor?.isActive("codeBlock")
  const currentLang = isActive ? editor?.getAttributes("codeBlock").language : null

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!editor) return
      const value = e.target.value || null
      editor.chain().focus().updateAttributes("codeBlock", { language: value }).run()
    },
    [editor]
  )

  if (!isActive) return null

  return (
    <div className="absolute right-2 top-2 z-10">
      <select
        value={currentLang || ""}
        onChange={handleChange}
        className="h-6 rounded border bg-background px-1.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        onClick={(e) => e.stopPropagation()}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.value || ""} value={lang.value || ""}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  )
}
