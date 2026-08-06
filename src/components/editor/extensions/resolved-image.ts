import Image from "@tiptap/extension-image"

export const ResolvedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      canonicalSrc: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-canonical-src"),
        renderHTML: (attrs) =>
          attrs.canonicalSrc ? { "data-canonical-src": attrs.canonicalSrc as string } : {},
      },
    }
  },
})
