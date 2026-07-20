import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import matter from "gray-matter"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const templatesDir = path.join(root, "templates")
const outFile = path.join(root, "public", "templates.json")

const TOPIC_DISPLAY = {
  report: "업무 보고서",
  meeting: "회의록",
  proposal: "제안서",
  technical: "기술 문서",
  "one-paper": "원페이퍼",
}

const TOPIC_ORDER = ["report", "meeting", "proposal", "technical", "one-paper"]

const FILE_EXTENSION = ".md"

async function main() {
  let topicDirs
  try {
    topicDirs = await fs.readdir(templatesDir, { withFileTypes: true })
  } catch {
    console.warn("templates/ directory not found. Skipping.")
    await fs.writeFile(outFile, JSON.stringify({ groups: [] }))
    return
  }

  const groupMap = new Map()

  for (const entry of topicDirs.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith(".")) continue

    const topicDir = path.join(templatesDir, entry.name)
    let files
    try {
      files = await fs.readdir(topicDir)
    } catch {
      continue
    }

    const templates = []

    for (const file of files.sort()) {
      if (!file.endsWith(FILE_EXTENSION)) continue
      const filePath = path.join(topicDir, file)
      const relativePath = `${entry.name}/${file}`

      try {
        const content = await fs.readFile(filePath, "utf-8")
        const { data } = matter(content)

        templates.push({
          title: data.title || path.basename(file, FILE_EXTENSION),
          topic: data.topic || entry.name,
          description: data.description || "",
          order: typeof data.order === "number" ? data.order : 99,
          createdAt: data.createdAt || "",
          slug: path.basename(file, FILE_EXTENSION),
          relativePath,
          // 프론트매터를 본문에 유지하여 런타임(mdToHtml/htmlToMd) 왕복 시 pageMode 등 메타 보존
          body: content,
        })
      } catch (e) {
        console.warn(`Failed to parse ${filePath}:`, e.message)
        continue
      }
    }

    templates.sort((a, b) => a.order - b.order)

    if (templates.length > 0) {
      groupMap.set(entry.name, templates)
    }
  }

  const groups = []

  for (const topic of TOPIC_ORDER) {
    const templates = groupMap.get(topic)
    if (templates) {
      groups.push({
        topic,
        displayName: TOPIC_DISPLAY[topic] || topic,
        templates,
      })
    }
  }

  for (const [topic, templates] of groupMap) {
    if (!TOPIC_ORDER.includes(topic)) {
      groups.push({
        topic,
        displayName: TOPIC_DISPLAY[topic] || topic,
        templates,
      })
    }
  }

  await fs.writeFile(outFile, JSON.stringify({ groups }, null, 2))
  console.log(`Generated templates.json with ${groups.length} groups`)
}

main().catch((e) => {
  console.error("Failed to build templates:", e)
  process.exit(1)
})
