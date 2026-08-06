import { openDB, type IDBPDatabase } from "idb"
import { htmlToMd, mdToHtml } from "./markdown"
import {
  FILE_EXTENSION,
  TEMP_DIR,
  TEMP_EXTENSION,
  MAX_FILE_SIZE_BYTES,
} from "./constants"
import type { FileTreeNode } from "./types"

// --- Module-level root handle / path ---
let rootHandle: FileSystemDirectoryHandle | null = null
let rootPath: string | null = null

export function getRootHandle(): FileSystemDirectoryHandle | null {
  return rootHandle
}

export function isPathMode(): boolean {
  return !rootHandle && !!rootPath
}

export function getRootPath(): string | null {
  return rootPath
}

export function setRootPath(p: string): void {
  rootPath = p
  rootHandle = null
}

// --- Path-mode API wrapper ---
async function api<T>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("/api/fs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, root: rootPath, ...extra }),
  })
  const json = await res.json()
  if (!res.ok || json.error) throw new Error(json.error || `API 오류 (${res.status})`)
  return json.data as T
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// --- Meta IndexedDB for handle persistence ---
const META_DB_NAME = "md_editor_meta"
const META_DB_VERSION = 1
const META_STORE = "meta"
const ROOT_HANDLE_KEY = "rootHandle"

let metaDbPromise: Promise<IDBPDatabase> | null = null

async function getMetaDb(): Promise<IDBPDatabase> {
  if (!metaDbPromise) {
    metaDbPromise = openDB(META_DB_NAME, META_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE)
        }
      },
    })
  }
  return metaDbPromise
}

async function getStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getMetaDb()
    const handle = await db.get(META_STORE, ROOT_HANDLE_KEY)
    return handle || null
  } catch {
    return null
  }
}

async function storeHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await getMetaDb()
  await db.put(META_STORE, handle, ROOT_HANDLE_KEY)
}

export async function clearHandle(): Promise<void> {
  const db = await getMetaDb()
  await db.delete(META_STORE, ROOT_HANDLE_KEY)
}

// --- Permission ---

async function verifyPermission(
  handle: FileSystemDirectoryHandle,
  mode: "read" | "readwrite" = "readwrite"
): Promise<boolean> {
  const h = handle as unknown as {
    queryPermission: (opts: { mode: string }) => Promise<string>
    requestPermission: (opts: { mode: string }) => Promise<string>
  }
  const opts = { mode }
  try {
    if ((await h.queryPermission(opts)) === "granted") return true
    if ((await h.requestPermission(opts)) === "granted") return true
  } catch {
    // requestPermission requires a user gesture; on automatic restore
    // (page load) it throws SecurityError. Treat as not-permitted.
    return false
  }
  return false
}

// --- Folder selection ---

export async function requestRootFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
    return null
  }
  try {
    const handle = await window.showDirectoryPicker()
    const ok = await verifyPermission(handle, "readwrite")
    if (!ok) return null
    try {
      const testHandle = await handle.getFileHandle(".fsa-test", { create: true })
      const writable = await testHandle.createWritable()
      await writable.write("test")
      await writable.close()
      await handle.removeEntry(".fsa-test")
    } catch {
      return null
    }
    rootHandle = handle
    await storeHandle(handle)
    return handle
  } catch {
    return null
  }
}

// --- Init from stored handle ---

export async function initRootHandle(): Promise<boolean> {
  const stored = await getStoredHandle()
  if (!stored) return false
  const ok = await verifyPermission(stored, "readwrite")
  if (!ok) {
    await clearHandle()
    return false
  }
  rootHandle = stored
  return true
}

// --- Internal helpers ---

function ensureRoot(): FileSystemDirectoryHandle {
  if (!rootHandle && !rootPath) throw new Error("워크스페이스 폴더가 선택되지 않았습니다")
  if (isPathMode()) throw new Error("잘못된 호출: path 모드에서 FSA 필요")
  return rootHandle!
}

async function getSubDir(
  dir: FileSystemDirectoryHandle,
  segments: string[],
  create = false
): Promise<FileSystemDirectoryHandle | null> {
  let current = dir
  for (const seg of segments) {
    try {
      current = await current.getDirectoryHandle(seg, { create })
    } catch {
      return null
    }
  }
  return current
}

async function getFile(
  dir: FileSystemDirectoryHandle,
  filePath: string
): Promise<FileSystemFileHandle | null> {
  const parts = filePath.replace(/\\/g, "/").split("/")
  const fileName = parts.pop()!
  const parent = await getSubDir(dir, parts, false)
  if (!parent) return null
  try {
    return await parent.getFileHandle(fileName)
  } catch {
    return null
  }
}

async function getOrCreateFile(
  dir: FileSystemDirectoryHandle,
  filePath: string
): Promise<FileSystemFileHandle> {
  const parts = filePath.replace(/\\/g, "/").split("/")
  const fileName = parts.pop()!
  const parent = await getSubDir(dir, parts, true)
  if (!parent) throw new Error("디렉토리를 찾을 수 없습니다")
  return await parent.getFileHandle(fileName, { create: true })
}

/**
 * 저장 파일이 있는 폴더를 OS 탐색기에서 연다. 경로 모드에서만 동작(절대경로 반환).
 * FSA(폴더 선택) 모드는 브라우저 샌드박스라 절대경로를 알 수 없어 null 을 반환한다.
 */
export async function revealInFolder(filePath: string): Promise<string | null> {
  if (!isPathMode()) return null
  try {
    return await api<string>("revealInFolder", { filePath })
  } catch {
    return null
  }
}

/**
 * 루트 워크스페이스 폴더를 OS 탐색기에서 연다. 경로 모드에서만 동작(절대경로 반환).
 * FSA(폴더 선택) 모드는 브라우저 샌드박스라 절대경로를 알 수 없어 null 을 반환한다.
 */
export async function openRootFolder(): Promise<string | null> {
  if (!isPathMode()) return null
  try {
    return await api<string>("openRootFolder")
  } catch {
    return null
  }
}

// --- File tree ---

export async function getFileTree(): Promise<{ tree: FileTreeNode[]; error?: string }> {
  try {
    if (isPathMode()) return { tree: await api<FileTreeNode[]>("getFileTree") }
    const handle = ensureRoot()
    const tree: FileTreeNode[] = []
    await walkDir(handle, "", tree)
    return { tree }
  } catch (e) {
    return { tree: [], error: String(e) }
  }
}

async function walkDir(
  dirHandle: FileSystemDirectoryHandle,
  prefix: string,
  result: FileTreeNode[]
): Promise<void> {
  const entries: { name: string; kind: FileSystemHandleKind }[] = []

  for await (const [name, handle] of dirHandle.entries()) {
    entries.push({ name, kind: handle.kind })
  }

  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  for (const { name, kind } of entries) {
    const entryPath = prefix ? `${prefix}/${name}` : name

    if (name === TEMP_DIR || name.startsWith(".")) continue

    if (kind === "directory") {
      const childHandle = await dirHandle.getDirectoryHandle(name)
      const children: FileTreeNode[] = []
      await walkDir(childHandle, entryPath, children)
      result.push({ name, path: entryPath, type: "directory", children })
    } else if (name.endsWith(FILE_EXTENSION)) {
      result.push({ name, path: entryPath, type: "file" })
    }
  }
}

// --- Read / Write ---

export async function readMdFile(
  _root: string,
  filePath: string
): Promise<string> {
  if (!filePath.endsWith(FILE_EXTENSION)) {
    throw new Error(".md 파일만 읽을 수 있습니다")
  }
  if (isPathMode()) return api<string>("readFile", { filePath })
  const handle = ensureRoot()
  const fileHandle = await getFile(handle, filePath)
  if (!fileHandle) throw new Error("파일을 찾을 수 없습니다")
  const file = await fileHandle.getFile()
  return await file.text()
}

export async function saveMdFile(
  _root: string,
  filePath: string,
  html: string
): Promise<void> {
  if (!filePath.endsWith(FILE_EXTENSION)) {
    throw new Error(".md 파일만 저장할 수 있습니다")
  }
  if (isPathMode()) {
    await api("writeFile", { filePath, content: html })
    return
  }
  const markdown = htmlToMd(html)
  if (markdown.length > MAX_FILE_SIZE_BYTES) {
    throw new Error("파일 크기가 너무 큽니다 (최대 10MB)")
  }
  const handle = ensureRoot()
  const fileHandle = await getOrCreateFile(handle, filePath)
  const writable = await fileHandle.createWritable()
  await writable.write(markdown)
  await writable.close()
  await discardTempFile("", filePath)
}

// --- Auto-save / Recovery (via .temp/ on disk) ---

function tempFileName(filePath: string): string {
  const sanitized = filePath.replace(/\\/g, "/").replace(/\//g, "_")
  return `${sanitized}${TEMP_EXTENSION}`
}

function tempPath(filePath: string): string {
  return `${TEMP_DIR}/${tempFileName(filePath)}`
}

async function ensureTempDir(): Promise<FileSystemDirectoryHandle> {
  const root = ensureRoot()
  try {
    return await root.getDirectoryHandle(TEMP_DIR, { create: true })
  } catch {
    throw new Error("임시 디렉토리를 생성할 수 없습니다")
  }
}

export async function autoSaveTemp(
  _root: string,
  filePath: string,
  html: string
): Promise<void> {
  if (!filePath.endsWith(FILE_EXTENSION)) return
  if (isPathMode()) {
    await api("writeTemp", { filePath, content: html })
    return
  }
  const markdown = htmlToMd(html)
  const tempDir = await ensureTempDir()
  const tp = tempPath(filePath)
  const fileName = tp.split("/").pop()!
  const fileHandle = await tempDir.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(markdown)
  await writable.close()
}

export async function getRecoveryInfo(
  _root: string,
  filePath: string
): Promise<{
  tempContent: {
    content: string
    meta: { lastAutoSaveAt: string; originalMd5: string; filePath: string } | null
  } | null
  originalContent: string | null
} | null> {
  let tempContent: string | null = null
  let tempSavedAt = ""

  if (isPathMode()) {
    const content = await api<string | null>("readTemp", { filePath })
    if (!content) return null
    tempContent = content
    tempSavedAt = ""
  } else {
    try {
      const root = ensureRoot()
      const tempDir = await root.getDirectoryHandle(TEMP_DIR)
      const tp = tempPath(filePath)
      const fileName = tp.split("/").pop()!
      const fileHandle = await tempDir.getFileHandle(fileName)
      const file = await fileHandle.getFile()
      tempContent = await file.text()
      tempSavedAt = new Date(file.lastModified).toISOString()
    } catch {
      return null
    }
  }

  if (!tempContent) return null

  let originalContent: string | null = null
  try {
    originalContent = await readMdFile("", filePath)
  } catch {
    originalContent = null
  }

  // 원본과 실제로 다른 내용일 때만 복구 대상으로 간주한다.
  // 동일하면(과거 throttle 버그로 남은 stale 임시파일 등) 정리 후 null 반환.
  if (originalContent !== null && !(await tempDiffersFromOriginal(tempContent, originalContent))) {
    try {
      await discardTempFile("", filePath)
    } catch {
      // 임시파일 정리 실패는 무시
    }
    return null
  }

  return {
    tempContent: {
      content: tempContent,
      meta: {
        lastAutoSaveAt: tempSavedAt,
        originalMd5: "none",
        filePath,
      },
    },
    originalContent,
  }
}

async function tempDiffersFromOriginal(temp: string, original: string): Promise<boolean> {
  const normalize = async (md: string): Promise<string> => {
    try {
      const html = await mdToHtml(md)
      return html
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
    } catch {
      return md.replace(/\s+/g, " ").trim().toLowerCase()
    }
  }
  return (await normalize(temp)) !== (await normalize(original))
}

export async function applyTempToOriginal(
  _root: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const recovery = await getRecoveryInfo("", filePath)
    if (!recovery?.tempContent) {
      return { success: false, error: "임시 파일을 찾을 수 없습니다" }
    }

    if (isPathMode()) {
      await api("writeMd", { filePath, content: recovery.tempContent.content })
      await api("discardTemp", { filePath })
      return { success: true }
    }

    const handle = ensureRoot()
    const fileHandle = await getOrCreateFile(handle, filePath)
    const writable = await fileHandle.createWritable()
    await writable.write(recovery.tempContent.content)
    await writable.close()
    await discardTempFile("", filePath)

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function discardTempFile(
  _root: string,
  filePath: string
): Promise<void> {
  if (isPathMode()) {
    await api("discardTemp", { filePath })
    return
  }
  try {
    const root = ensureRoot()
    const tempDir = await root.getDirectoryHandle(TEMP_DIR)
    const tp = tempPath(filePath)
    const fileName = tp.split("/").pop()!
    await tempDir.removeEntry(fileName)
  } catch {
    // Ignore if temp file doesn't exist
  }
}

// --- File system operations ---

export async function createFile(
  _root: string,
  filePath: string
): Promise<void> {
  if (!filePath.endsWith(FILE_EXTENSION)) {
    throw new Error(".md 파일만 생성할 수 있습니다")
  }
  if (isPathMode()) {
    await api("createFile", { filePath })
    return
  }
  const handle = ensureRoot()
  await getOrCreateFile(handle, filePath)
}

export async function createDirectory(
  _root: string,
  dirPath: string
): Promise<void> {
  if (isPathMode()) {
    await api("createDirectory", { dirPath })
    return
  }
  const handle = ensureRoot()
  const parts = dirPath.replace(/\\/g, "/").split("/")
  let current = handle
  for (const seg of parts) {
    current = await current.getDirectoryHandle(seg, { create: true })
  }
}

export async function deleteFile(
  _root: string,
  filePath: string
): Promise<void> {
  if (isPathMode()) {
    await api("deleteFile", { filePath })
    return
  }
  const handle = ensureRoot()
  const parts = filePath.replace(/\\/g, "/").split("/")
  const fileName = parts.pop()!
  const parent = await getSubDir(handle, parts, false)
  if (parent) {
    await parent.removeEntry(fileName)
  }
  await discardTempFile("", filePath)
}

export async function renameFile(
  _root: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  if (!newPath.endsWith(FILE_EXTENSION)) {
    throw new Error(".md 파일명만 사용할 수 있습니다")
  }
  if (isPathMode()) {
    await api("renameFile", { filePath: oldPath, newPath })
    return
  }
  const handle = ensureRoot()
  const oldHandle = await getFile(handle, oldPath)
  if (!oldHandle) throw new Error("파일을 찾을 수 없습니다")

  const content = await (await oldHandle.getFile()).text()
  const newFileHandle = await getOrCreateFile(handle, newPath)
  const writable = await newFileHandle.createWritable()
  await writable.write(content)
  await writable.close()

  const parts = oldPath.replace(/\\/g, "/").split("/")
  const fileName = parts.pop()!
  const parent = await getSubDir(handle, parts, false)
  if (parent) {
    await parent.removeEntry(fileName)
  }
  await discardTempFile("", oldPath)
}

export async function deleteDirectory(
  _root: string,
  dirPath: string
): Promise<void> {
  if (isPathMode()) {
    await api("deleteDirectory", { dirPath })
    return
  }
  const handle = ensureRoot()
  const parts = dirPath.replace(/\\/g, "/").split("/")
  const dirName = parts.pop()!
  const parent = await getSubDir(handle, parts, false)
  if (parent) {
    await parent.removeEntry(dirName, { recursive: true })
  }
}

export async function renameDirectory(
  _root: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  if (isPathMode()) {
    await api("renameDirectory", { dirPath: oldPath, newPath })
    return
  }
  // FSA에는 디렉토리 이동/이름변경 API가 없으므로 재귀 복사 후 삭제한다.
  const handle = ensureRoot()
  const oldSegments = oldPath.replace(/\\/g, "/").split("/")
  const oldDir = await getSubDir(handle, oldSegments, false)
  if (!oldDir) throw new Error("폴더를 찾을 수 없습니다")

  const newSegments = newPath.replace(/\\/g, "/").split("/")
  const newDir = await getSubDir(handle, newSegments, true)
  if (!newDir) throw new Error("대상 폴더를 만들 수 없습니다")

  await copyDirContents(oldDir, newDir)

  const parentSegments = oldSegments.slice(0, -1)
  const dirName = oldSegments[oldSegments.length - 1]
  const parent = await getSubDir(handle, parentSegments, false)
  if (parent) {
    await parent.removeEntry(dirName, { recursive: true })
  }
}

async function copyDirContents(
  from: FileSystemDirectoryHandle,
  to: FileSystemDirectoryHandle
): Promise<void> {
  for await (const [name, entry] of from.entries()) {
    if (entry.kind === "directory") {
      const srcSub = await from.getDirectoryHandle(name)
      const destSub = await to.getDirectoryHandle(name, { create: true })
      await copyDirContents(srcSub, destSub)
    } else {
      const srcFile = await (await from.getFileHandle(name)).getFile()
      const destHandle = await to.getFileHandle(name, { create: true })
      const writable = await destHandle.createWritable()
      await writable.write(await srcFile.arrayBuffer())
      await writable.close()
    }
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  if (isPathMode()) {
    try {
      await api("readFile", { filePath })
      return true
    } catch {
      return false
    }
  }
  const handle = ensureRoot()
  try {
    const parts = filePath.replace(/\\/g, "/").split("/")
    const fileName = parts.pop()!
    const dir = await getSubDir(handle, parts, false)
    if (!dir) return false
    await dir.getFileHandle(fileName)
    return true
  } catch {
    return false
  }
}

export async function duplicateFile(_root: string, filePath: string): Promise<string> {
  if (!filePath.endsWith(FILE_EXTENSION)) {
    throw new Error(".md 파일만 복제할 수 있습니다")
  }

  const parts = filePath.replace(/\\/g, "/").split("/")
  const fileName = parts.pop()!
  const baseName = fileName.replace(/\.md$/, "")
  const parent = parts.join("/")

  let candidate = parent ? `${parent}/${baseName} (복사본).md` : `${baseName} (복사본).md`
  let counter = 2
  while (await fileExists(candidate)) {
    candidate = parent
      ? `${parent}/${baseName} (복사본 ${counter}).md`
      : `${baseName} (복사본 ${counter}).md`
    counter++
  }

  if (isPathMode()) {
    await api("copyFile", { filePath, destPath: candidate })
  } else {
    const handle = ensureRoot()
    const srcHandle = await getFile(handle, filePath)
    if (!srcHandle) throw new Error("원본 파일을 찾을 수 없습니다")
    const content = await (await srcHandle.getFile()).text()

    const destFileHandle = await getOrCreateFile(handle, candidate)
    const writable = await destFileHandle.createWritable()
    await writable.write(content)
    await writable.close()
  }
  return candidate
}

/** 파일 또는 폴더를 다른 폴더로 이동한다(이름은 유지). destDir=""이면 루트로 이동. */
export async function moveFile(
  _root: string,
  filePath: string,
  destDir: string
): Promise<string> {
  const normalized = filePath.replace(/\\/g, "/")
  const fileName = normalized.split("/").pop()!
  const cleanDest = destDir.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
  const newPath = cleanDest ? `${cleanDest}/${fileName}` : fileName
  if (newPath === normalized) return newPath
  if (normalized.endsWith(FILE_EXTENSION)) {
    await renameFile("", normalized, newPath)
  } else {
    await renameDirectory("", normalized, newPath)
  }
  return newPath
}

// --- Template utilities ---

export async function addDocumentFromTemplate(
  filePath: string,
  content: string
): Promise<void> {
  if (isPathMode()) {
    await api("writeMd", { filePath, content })
    return
  }
  const handle = ensureRoot()
  const fileHandle = await getOrCreateFile(handle, filePath)
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

export async function revealInFileExplorer(filePath: string): Promise<void> {
  if (!isPathMode()) return
  await api("revealInFolder", { filePath })
}

export async function openRootInFileExplorer(): Promise<void> {
  if (!isPathMode()) return
  await api("openRootFolder", {})
}

// --- Import ---

export async function importDocuments(
  files: { path: string; content: string }[],
  basePath: string = ""
): Promise<void> {
  const resolvePath = (filePath: string) =>
    basePath ? `${basePath}/${filePath}` : filePath

  if (isPathMode()) {
    for (const file of files) {
      await api("writeMd", { filePath: resolvePath(file.path), content: file.content })
    }
    return
  }
  const handle = ensureRoot()
  for (const file of files) {
    const fileHandle = await getOrCreateFile(handle, resolvePath(file.path))
    const writable = await fileHandle.createWritable()
    await writable.write(file.content)
    await writable.close()
  }
}

export async function importBinaryFiles(
  files: { path: string; data: ArrayBuffer }[],
  basePath: string = ""
): Promise<void> {
  const resolvePath = (filePath: string) =>
    basePath ? `${basePath}/${filePath}` : filePath

  if (isPathMode()) {
    for (const file of files) {
      const base64 = arrayBufferToBase64(file.data)
      await api("writeBinary", { filePath: resolvePath(file.path), content: base64 })
    }
    return
  }

  const handle = ensureRoot()
  for (const file of files) {
    const fileHandle = await getOrCreateFile(handle, resolvePath(file.path))
    const writable = await fileHandle.createWritable()
    await writable.write(file.data)
    await writable.close()
  }
}

export async function saveHwpxBlob(
  root: string,
  filePath: string,
  blob: Blob
): Promise<void> {
  const handle = ensureRoot()
  const fileHandle = await getOrCreateFile(handle, filePath)
  const writable = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()
}

/** 임의 바이너리(예: .docx)를 워크스페이스 내부 경로에 저장(FSA 모드). */
export async function saveBinaryFile(
  _root: string,
  filePath: string,
  blob: Blob
): Promise<void> {
  const handle = ensureRoot()
  const fileHandle = await getOrCreateFile(handle, filePath)
  const writable = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()
}
