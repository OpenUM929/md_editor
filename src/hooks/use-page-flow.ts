import { useEffect } from "react"
import type { Editor } from "@tiptap/react"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import type { EditorView } from "@tiptap/pm/view"
import type { MarginValues } from "@/lib/a4-margins"
import { A4_DIMENSIONS } from "@/lib/a4-margins"
import type { PageMode } from "@/lib/page-mode"
import { computePageFlow, type FlowBlock } from "@/lib/page-flow-core"

const PX_PER_MM = 96 / 25.4
const pageFlowKey = new PluginKey<DecorationSet>("pageFlow")

/**
 * 상태 비의존(stateless) 페이지 흐름 — 워드/한글 방식.
 *
 * 왜 ProseMirror 데코레이션인가:
 * ProseMirror 는 contenteditable 내부 DOM 을 자체 모델과 동기화하며, 관리 중인 문단에
 * 직접 넣은 inline style(margin 등)을 MutationObserver 가 되돌려 버린다. 따라서 표시용
 * 여백은 반드시 "위젯 데코레이션"(뷰 전용, 되돌려지지 않음)으로 넣어야 한다.
 *
 * 원칙:
 * 1. 편집 문서는 하나의 연속 흐름. 페이지는 뒤에 그려진 배경 격자.
 * 2. 문서(doc)를 절대 변경하지 않는다 — 데코레이션만 갱신(meta 트랜잭션, docChanged=false)
 *    → tiptap 'update'/자동저장/onChange 가 발화하지 않아 순환·오염이 불가능.
 * 3. 매 측정마다 데코를 걷어내고(자연 레이아웃) 처음부터 다시 계산 → 입력이 같으면
 *    출력도 항상 같다. "1페이지를 고쳤는데 3페이지가 흔들리는" 연쇄가 발생할 수 없다.
 * 4. 페이지 경계를 넘는 블록만 다음 페이지 상단으로 밀어내는 스페이서 위젯을 삽입.
 * 5. 페이지 수는 밀어낸 뒤의 콘텐츠 높이에서 파생.
 */
export function usePageFlow(
  editor: Editor | null,
  pageMode: PageMode,
  marginValues: MarginValues | null,
  setPageCount: (n: number) => void
) {
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const pageH = (A4_DIMENSIONS.height + A4_DIMENSIONS.gap) * PX_PER_MM
    const sheetH = A4_DIMENSIONS.height * PX_PER_MM

    const spacer = (px: number) => {
      const el = document.createElement("div")
      el.className = "pageflow-spacer"
      el.style.cssText = `height:${px}px;margin:0;padding:0;pointer-events:none;user-select:none;`
      el.setAttribute("contenteditable", "false")
      el.setAttribute("aria-hidden", "true")
      return el
    }

    const setDecos = (view: EditorView, decos: DecorationSet) => {
      view.dispatch(view.state.tr.setMeta(pageFlowKey, decos))
    }

    const measure = (view: EditorView) => {
      if (view.isDestroyed) return

      // bunri 가 아니면 데코를 비우고 연속 흐름으로 둔다.
      if (pageMode !== "bunri" || !marginValues) {
        const cur = pageFlowKey.getState(view.state)
        if (cur && cur !== DecorationSet.empty) setDecos(view, DecorationSet.empty)
        setPageCount(1)
        return
      }

      const topM = marginValues.top * PX_PER_MM
      const botM = marginValues.bottom * PX_PER_MM

      // 1) 데코 제거 → 자연 레이아웃으로 되돌린 뒤 측정.
      setDecos(view, DecorationSet.empty)
      void view.dom.getBoundingClientRect() // 강제 리플로우

      const pmTop = view.dom.getBoundingClientRect().top
      const offsets: number[] = []
      const blocks: FlowBlock[] = []
      view.state.doc.forEach((node, offset) => {
        const dom = view.nodeDOM(offset) as HTMLElement | null
        if (!dom || typeof dom.getBoundingClientRect !== "function") return
        const r = dom.getBoundingClientRect()
        offsets.push(offset)
        blocks.push({ top: r.top - pmTop, height: r.height, isBreak: node.type.name === "pageBreak" })
      })

      // 2) 공용 코어가 페이지 경계를 결정한다(화면 격자 = 297+gap).
      const { spacers, pageCount } = computePageFlow(blocks, {
        pageStepPx: pageH,
        sheetHeightPx: sheetH,
        topMarginPx: topM,
        botMarginPx: botM,
      })

      // 3) 결정된 스페이서를 위젯 데코로 삽입(doc 무변경 meta 트랜잭션).
      const decos = spacers.map(({ index, delta }) =>
        Decoration.widget(offsets[index], () => spacer(delta), {
          side: -1,
          key: `sp:${offsets[index]}:${Math.round(delta)}`,
        })
      )
      setDecos(view, DecorationSet.create(view.state.doc, decos))
      setPageCount(pageCount)
    }

    // 측정 스케줄러(디바운스 + rAF). doc 변경 시에만 예약 → 데코 meta 트랜잭션으로 인한
    // 재측정 루프가 원천적으로 발생하지 않는다.
    let timer: ReturnType<typeof setTimeout> | undefined
    let viewRef: EditorView | null = null
    const schedule = (delay: number) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        requestAnimationFrame(() => {
          if (viewRef) measure(viewRef)
        })
      }, delay)
    }

    const plugin = new Plugin<DecorationSet>({
      key: pageFlowKey,
      state: {
        init: () => DecorationSet.empty,
        apply(tr, old) {
          const meta = tr.getMeta(pageFlowKey) as DecorationSet | undefined
          if (meta) return meta
          return old.map(tr.mapping, tr.doc)
        },
      },
      props: {
        decorations(state) {
          return pageFlowKey.getState(state)
        },
      },
      view(view) {
        viewRef = view
        schedule(80)
        const onResize = () => schedule(150)
        window.addEventListener("resize", onResize)
        return {
          update(v, prev) {
            // doc 가 실제로 바뀐 경우에만 재측정(데코 meta 트랜잭션은 무시).
            if (!prev.doc.eq(v.state.doc)) schedule(120)
          },
          destroy() {
            window.removeEventListener("resize", onResize)
            viewRef = null
          },
        }
      },
    })

    editor.registerPlugin(plugin)
    // pageMode/margin 변경 시 즉시 반영
    schedule(60)

    return () => {
      clearTimeout(timer)
      if (!editor.isDestroyed) editor.unregisterPlugin(pageFlowKey)
    }
  }, [editor, pageMode, marginValues, setPageCount])
}
