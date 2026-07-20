import fs from "fs/promises"
import path from "path"
import { FILE_EXTENSION, TEMP_DIR, TEMP_EXTENSION } from "@/lib/constants"
import { htmlToMd } from "@/lib/markdown"

async function safeRoot(root: string): Promise<string> {
  const resolved = path.resolve(root)
  const valid = await fs.stat(resolved).then((s) => s.isDirectory()).catch(() => false)
  if (!valid) throw new Error("루트 경로가 유효한 디렉토리가 아닙니다")
  return resolved
}

function safePath(root: string, filePath: string): string {
  const resolved = path.resolve(root, filePath)
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error("허용되지 않은 경로입니다")
  }
  return resolved
}

export async function readFile(root: string, filePath: string): Promise<string> {
  const p = safePath(await safeRoot(root), filePath)
  return await fs.readFile(p, "utf-8")
}

export async function writeFile(root: string, filePath: string, html: string): Promise<void> {
  const p = safePath(await safeRoot(root), filePath)
  const md = htmlToMd(html)
  await fs.writeFile(p, md, "utf-8")
}

export async function writeMd(root: string, filePath: string, md: string): Promise<void> {
  const p = safePath(await safeRoot(root), filePath)
  await fs.writeFile(p, md, "utf-8")
}

type TreeNode = { name: string; path: string; type: "file" | "directory"; children?: TreeNode[] }

export async function getFileTree(root: string): Promise<TreeNode[]> {
  const dir = await safeRoot(root)
  const result: TreeNode[] = []
  await walk(dir, "", result)
  return result
}

export async function validateRoot(root: string): Promise<boolean> {
  try {
    await safeRoot(root)
    return true
  } catch {
    return false
  }
}

export async function ensureRootDir(root: string): Promise<boolean> {
  try {
    const resolved = path.resolve(root)
    const stat = await fs.stat(resolved).catch(() => null)
    if (stat) return stat.isDirectory()
    await fs.mkdir(resolved, { recursive: true })
    return true
  } catch {
    return false
  }
}

async function walk(dir: string, prefix: string, result: TreeNode[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
    return a.name.localeCompare(b.name)
  })
   for (const entry of entries) {
     if (entry.name === TEMP_DIR || entry.name === "node_modules" || entry.name.startsWith(".")) continue
    const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      const children: TreeNode[] = []
      await walk(path.join(dir, entry.name), entryPath, children)
      result.push({ name: entry.name, path: entryPath, type: "directory", children })
    } else if (entry.name.endsWith(FILE_EXTENSION)) {
      result.push({ name: entry.name, path: entryPath, type: "file" })
    }
  }
}

export async function createFile(root: string, filePath: string): Promise<void> {
  if (!filePath.endsWith(FILE_EXTENSION)) throw new Error(".md 파일만 생성할 수 있습니다")
  const p = safePath(await safeRoot(root), filePath)
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, "", "utf-8")
}

export async function createDirectory(root: string, dirPath: string): Promise<void> {
  const p = safePath(await safeRoot(root), dirPath)
  await fs.mkdir(p, { recursive: true })
}

export async function deleteFile(root: string, filePath: string): Promise<void> {
  const p = safePath(await safeRoot(root), filePath)
  await fs.unlink(p)
  await discardTemp(root, filePath)
}

export async function renameFile(root: string, oldPath: string, newPath: string): Promise<void> {
  if (!newPath.endsWith(FILE_EXTENSION)) throw new Error(".md 파일명만 사용할 수 있습니다")
  const r = await safeRoot(root)
  const oldP = safePath(r, oldPath)
  const newP = safePath(r, newPath)
  await fs.mkdir(path.dirname(newP), { recursive: true })
  await fs.rename(oldP, newP)
}

function tempFileName(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/\//g, "_") + TEMP_EXTENSION
}

function tempPath(root: string, filePath: string): string {
  return path.join(root, TEMP_DIR, tempFileName(filePath))
}

export async function writeTemp(root: string, filePath: string, html: string): Promise<void> {
  const r = await safeRoot(root)
  const md = htmlToMd(html)
  const tp = tempPath(r, filePath)
  await fs.mkdir(path.dirname(tp), { recursive: true })
  await fs.writeFile(tp, md, "utf-8")
}

export async function readTemp(root: string, filePath: string): Promise<string | null> {
  try {
    const r = await safeRoot(root)
    const tp = tempPath(r, filePath)
    return await fs.readFile(tp, "utf-8")
  } catch { return null }
}

export async function discardTemp(root: string, filePath: string): Promise<void> {
  try {
    const r = await safeRoot(root)
    const tp = tempPath(r, filePath)
    await fs.unlink(tp)
  } catch { /* ignore */ }
}
