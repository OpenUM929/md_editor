// md 파일 가져오기 시 참조 이미지(및 첨부)를 img.<파일명>/ 폴더로 모아 정리한다.
// 드래그앤드롭(layout.tsx)과 "가져오기" 다이얼로그(import-content.tsx) 양쪽에서 공용으로 쓴다.

export type ImportMdFile = { path: string; content: string }
export type ImportBinaryFile = { path: string; data: ArrayBuffer }
export type MissingImage = { mdPath: string; imageRef: string; resolvedPath: string }

export function parseImageRefs(markdown: string): string[] {
  const refs: string[] = []
  const re = /!\[[^\]]*\]\(([^)]+)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(markdown)) !== null) {
    const src = m[1].trim()
    if (src && !/^(https?:|data:|blob:|#)/.test(src)) {
      refs.push(src)
    }
  }
  return [...new Set(refs)]
}

export function resolveImagePaths(mdPath: string, refs: string[]): string[] {
  const docDir = mdPath.includes("/") ? mdPath.split("/").slice(0, -1).join("/") : ""
  return refs.map((ref) => {
    if (/^(https?:|data:|blob:)/.test(ref)) return ref
    const parts = (docDir ? docDir + "/" : "") + ref
    const stack: string[] = []
    for (const p of parts.split("/")) {
      if (p === "..") stack.pop()
      else if (p && p !== ".") stack.push(p)
    }
    return stack.join("/")
  })
}

export function imgFolderName(mdPath: string): string {
  const name = mdPath.split("/").pop() || mdPath
  return `img.${name.replace(/\.md$/i, "")}`
}

export function isInImgFolder(imagePath: string, mdPath: string): boolean {
  const folder = imgFolderName(mdPath)
  return imagePath.startsWith(folder + "/")
}

export function computeImgDestPath(imagePath: string, mdPath: string): string {
  if (isInImgFolder(imagePath, mdPath)) return imagePath
  const folder = imgFolderName(mdPath)
  const fileName = imagePath.split("/").pop() || imagePath
  return `${folder}/${fileName}`
}

export function rewriteImagePaths(markdown: string, mdPath: string): string {
  const folder = imgFolderName(mdPath)
  return markdown.replace(
    /(!\[[^\]]*\]\()([^)]+)(\))/g,
    (_match, prefix: string, src: string, suffix: string) => {
      const trimmed = src.trim()
      if (/^(https?:|data:|blob:|#)/.test(trimmed)) return prefix + src + suffix
      if (trimmed.startsWith(folder + "/")) return prefix + src + suffix
      const fileName = trimmed.split("/").pop() || trimmed
      return prefix + `${folder}/${fileName}` + suffix
    }
  )
}

export type RelocationResult = {
  rewrittenMdFiles: ImportMdFile[]
  relocatedBinaryFiles: ImportBinaryFile[]
  passthroughBinaryFiles: ImportBinaryFile[]
  missingImages: MissingImage[]
  relocatedCount: number
}

// 같이 선택/드롭된 이미지는 img.<파일명>/ 폴더로 재배치하고, md 본문의 참조 경로도 그에 맞춰 고친다.
// 참조는 있으나 함께 들어오지 않은 이미지는 missingImages 로 보고해 호출부가 "폴더에서 찾기" 등을 안내하게 한다.
export function relocateImportedImages(
  mdFiles: ImportMdFile[],
  binaryFiles: ImportBinaryFile[]
): RelocationResult {
  const imgRelocMap = new Map<string, { mdPath: string; originalRef: string; newPath: string }[]>()
  for (const mdFile of mdFiles) {
    const refs = parseImageRefs(mdFile.content)
    const resolved = resolveImagePaths(mdFile.path, refs)
    for (let i = 0; i < refs.length; i++) {
      const imgPath = resolved[i]
      if (isInImgFolder(imgPath, mdFile.path)) continue
      const destPath = computeImgDestPath(imgPath, mdFile.path)
      if (!imgRelocMap.has(imgPath)) imgRelocMap.set(imgPath, [])
      imgRelocMap.get(imgPath)!.push({ mdPath: mdFile.path, originalRef: refs[i], newPath: destPath })
    }
  }

  const relocatedBinaryFiles: ImportBinaryFile[] = []
  const passthroughBinaryFiles: ImportBinaryFile[] = []
  const relocatedKeys = new Set<string>()
  for (const bf of binaryFiles) {
    const reloc = imgRelocMap.get(bf.path)
    if (reloc) {
      relocatedBinaryFiles.push({ path: reloc[0].newPath, data: bf.data })
      relocatedKeys.add(bf.path)
    } else {
      passthroughBinaryFiles.push(bf)
    }
  }

  const missingImages: MissingImage[] = []
  for (const [imgPath, infos] of imgRelocMap) {
    if (!relocatedKeys.has(imgPath)) {
      for (const info of infos) {
        missingImages.push({ mdPath: info.mdPath, imageRef: info.originalRef, resolvedPath: imgPath })
      }
    }
  }

  const rewrittenMdFiles = mdFiles.map((f) => ({ path: f.path, content: rewriteImagePaths(f.content, f.path) }))

  return {
    rewrittenMdFiles,
    relocatedBinaryFiles,
    passthroughBinaryFiles,
    missingImages,
    relocatedCount: relocatedKeys.size,
  }
}

export async function findFileInDir(
  dir: FileSystemDirectoryHandle,
  targetPath: string
): Promise<File | null> {
  const parts = targetPath.split("/")
  let current = dir
  for (let i = 0; i < parts.length - 1; i++) {
    const entry = await current.getDirectoryHandle(parts[i]).catch(() => null)
    if (!entry) return null
    current = entry
  }
  const fileHandle = await current.getFileHandle(parts[parts.length - 1]).catch(() => null)
  return fileHandle ? await fileHandle.getFile() : null
}

// 누락된 이미지를 사용자가 고른 폴더에서 찾아 img.<파일명>/ 규칙에 맞는 경로로 반환한다.
// md 본문은 relocateImportedImages 단계에서 이미 img.<파일명>/ 경로로 다시 쓰였으므로 여기서는 다시 쓰지 않는다.
export async function locateMissingImages(
  dirHandle: FileSystemDirectoryHandle,
  missing: MissingImage[]
): Promise<ImportBinaryFile[]> {
  const found: ImportBinaryFile[] = []
  for (const img of missing) {
    const file = await findFileInDir(dirHandle, img.resolvedPath)
    if (file) {
      found.push({ path: computeImgDestPath(img.resolvedPath, img.mdPath), data: await file.arrayBuffer() })
    }
  }
  return found
}

// 브라우저는 선택/드롭된 파일의 원본 폴더를 알려주지 않으므로(보안 정책), md 하나만 가져올 때
// 참조 이미지를 완전 자동으로 찾아올 방법이 없다. 대신 가져오기 실행 중 누락이 확인되는 즉시
// "원본 폴더 선택"을 유도해, 완료 후 별도 배너를 보고 다시 찾아야 하는 두 단계를 하나로 합친다.
export async function promptForMissingImages(
  missing: MissingImage[]
): Promise<{ found: ImportBinaryFile[]; stillMissing: MissingImage[] }> {
  if (missing.length === 0) return { found: [], stillMissing: [] }
  if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
    return { found: [], stillMissing: missing }
  }

  const count = new Set(missing.map((m) => m.resolvedPath)).size
  const wantsToPick = window.confirm(
    `이 md 파일이 참조하는 이미지 ${count}개를 함께 가져오지 못했습니다.\n이미지가 있던 원본 폴더를 지금 선택하시겠습니까?`
  )
  if (!wantsToPick) return { found: [], stillMissing: missing }

  try {
    const dirHandle = await window.showDirectoryPicker()
    const found = await locateMissingImages(dirHandle, missing)
    const foundDestPaths = new Set(found.map((f) => f.path))
    const stillMissing = missing.filter((m) => !foundDestPaths.has(computeImgDestPath(m.resolvedPath, m.mdPath)))
    return { found, stillMissing }
  } catch {
    return { found: [], stillMissing: missing }
  }
}
