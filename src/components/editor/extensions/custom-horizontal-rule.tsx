import { HorizontalRule } from "@tiptap/extension-horizontal-rule"
import { mergeAttributes, type NodeViewProps } from "@tiptap/core"
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react"
import { useState, useCallback } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getRecentColors, addRecentColor } from "@/lib/recent-colors"

const HR_THICKNESS_PRESETS = [
  { label: "0.5pt", value: "0.5pt" },
  { label: "1pt", value: "1pt" },
  { label: "1.5pt", value: "1.5pt" },
  { label: "2pt", value: "2pt" },
  { label: "3pt", value: "3pt" },
  { label: "4pt", value: "4pt" },
  { label: "5pt", value: "5pt" },
]

const DEFAULT_THICKNESS = "1pt"
const DEFAULT_COLOR = "#999999"

function HRNodeView({
  node,
  updateAttributes,
}: NodeViewProps) {
  const [open, setOpen] = useState(false)
  const [recentColors, setRecentColors] = useState<string[]>(() => getRecentColors())
  const thickness = (node.attrs.thickness as string) || null
  const color = (node.attrs.color as string) || null

  const handleThicknessChange = useCallback((val: string) => {
    updateAttributes({ thickness: val })
  }, [updateAttributes])

  const handleColorChange = useCallback((val: string) => {
    updateAttributes({ color: val })
    setRecentColors(addRecentColor(val))
  }, [updateAttributes])

  const handleReset = useCallback(() => {
    updateAttributes({ thickness: null, color: null })
  }, [updateAttributes])

  return (
    <NodeViewWrapper as="div" className="hr-node-view">
      <div className="flex items-center gap-1 group">
        <hr
          className="flex-1 my-1"
          style={{
            borderTopWidth: thickness || undefined,
            borderTopColor: color || undefined,
          }}
        />
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            render={(props) => (
              <button
                {...props}
                type="button"
                className="text-[10px] text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer select-none leading-none"
              >
                ▽
              </button>
            )}
          />
          <DropdownMenuContent align="start" className="w-52 p-3">
            <div className="space-y-3">
              {/* 두께 */}
              <div className="space-y-1">
                <label className="text-xs font-medium">두께</label>
                <div className="flex flex-wrap gap-1">
                  {HR_THICKNESS_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handleThicknessChange(preset.value)}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                        (thickness || DEFAULT_THICKNESS) === preset.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-accent"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* 색상 */}
              <div className="space-y-1">
                <label className="text-xs font-medium">색상</label>
                {recentColors.length > 0 && (
                  <div className="flex items-center gap-1 mb-1">
                    {recentColors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleColorChange(c)}
                        className="size-5 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color || DEFAULT_COLOR}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="size-7 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    초기화
                  </button>
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </NodeViewWrapper>
  )
}

export const CustomHorizontalRule = HorizontalRule.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      thickness: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.borderTopWidth || null,
      },
      color: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.borderTopColor || null,
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(HRNodeView)
  },

  renderHTML({ node, HTMLAttributes }) {
    const styles: string[] = []
    if (node.attrs.thickness) {
      styles.push(`border-top-width: ${node.attrs.thickness}`)
    }
    if (node.attrs.color) {
      styles.push(`border-top-color: ${node.attrs.color}`)
    }
    const htmlAttrs = { ...HTMLAttributes }
    if (styles.length > 0) {
      htmlAttrs.style = styles.join("; ")
    } else {
      delete htmlAttrs.style
    }
    return ["hr", mergeAttributes(this.options.HTMLAttributes, htmlAttrs)]
  },
})
