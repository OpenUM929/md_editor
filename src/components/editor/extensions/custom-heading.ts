import { Heading } from "@tiptap/extension-heading"
import { mergeAttributes } from "@tiptap/core"

export const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      accentBorderColor: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.borderLeftColor || null,
      },
      accentBorderWidth: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.borderLeftWidth || null,
      },
      // 이 헤딩 하나에만 적용되는 글자 크기/굵기(문단 스타일 단위). 본문 텍스트를 선택해
      // 거는 인라인 마크(TextStyle/FontSize, Bold)와는 별개의 메커니즘이다 — 인라인 마크는
      // 선택한 글자에만 붙어 h1~h4 태그 자체의 스타일에는 반영되지 않으므로, 번호 매기기
      // (globals.css의 h2::before 등 CSS counter)가 그 글자 크기/굵기를 상속받지 못해
      // 번호와 텍스트 크기가 어긋나 보이는 문제가 있었다(계획서 27_03). 이 속성은 h2 태그
      // 자체에 인라인 스타일로 실리므로 ::before가 정상적으로 상속받는다.
      fontSize: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.fontSize || null,
      },
      bold: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const w = el.style.fontWeight
          if (!w) return null
          return w === "bold" || parseInt(w, 10) >= 600
        },
      },
    }
  },

  renderHTML({ node, HTMLAttributes }) {
    const styles: string[] = []
    if (node.attrs.accentBorderColor) {
      styles.push(`border-left-color: ${node.attrs.accentBorderColor}`)
    }
    if (node.attrs.accentBorderWidth) {
      styles.push(`border-left-width: ${node.attrs.accentBorderWidth}`)
    }
    if (node.attrs.fontSize) {
      styles.push(`font-size: ${node.attrs.fontSize}`)
    }
    if (node.attrs.bold === true) {
      styles.push(`font-weight: bold`)
    } else if (node.attrs.bold === false) {
      styles.push(`font-weight: normal`)
    }
    const htmlAttrs = { ...HTMLAttributes }
    if (styles.length > 0) {
      htmlAttrs.style = styles.join("; ")
    } else {
      delete htmlAttrs.style
    }
    return [
      `h${node.attrs.level}`,
      mergeAttributes(this.options.HTMLAttributes, htmlAttrs),
      0,
    ]
  },
})
