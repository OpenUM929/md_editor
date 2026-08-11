import { Node } from "@tiptap/core"

export const PageBreak = Node.create({
  name: "pageBreak",

  group: "block",

  atom: true,

  selectable: false,

  draggable: true,

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => {
        this.editor.chain().focus().insertContent({ type: "pageBreak", attrs: { auto: false } }).run()
        return true
      },
    }
  },

  addAttributes() {
    return {
      auto: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-auto") === "true",
        renderHTML: (attrs) => {
          if (attrs.auto) {
            return { "data-auto": "true" }
          }
          return {}
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: "div[data-page-break]" }]
  },

  renderHTML({ node }) {
    if (node.attrs.auto) {
      return [
        "div",
        {
          class: "page-break page-break--auto",
          "data-page-break": "",
          "data-auto": "true",
        },
        [
          "div",
          { class: "page-break-gap" },
          ["span", { class: "page-break-number", "data-page-num": "" }],
        ],
      ]
    }
    return [
      "div",
      {
        class: "page-break page-break--manual",
        "data-page-break": "",
      },
      ["span", { class: "page-break-line" }],
      ["span", { class: "page-break-label", "data-page-num": "" }],
      ["span", { class: "page-break-line" }],
    ]
  },
})
