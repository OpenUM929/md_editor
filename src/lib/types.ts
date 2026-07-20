export type FileTreeNode = {
  name: string
  path: string
  type: "file" | "directory"
  children?: FileTreeNode[]
}

export type TemplateMeta = {
  title: string
  topic: string
  description: string
  order: number
  createdAt: string
  slug: string
  relativePath: string
}

export type TemplateDetail = TemplateMeta & {
  body: string
}

export type TemplateGroup = {
  topic: string
  displayName: string
  templates: TemplateMeta[]
}
