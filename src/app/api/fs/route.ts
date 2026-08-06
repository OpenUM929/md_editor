import { NextRequest, NextResponse } from "next/server"
import * as server from "@/lib/fs/server"
import { requireAuth } from "@/lib/require-auth"

type Action =
  | "readFile" | "writeFile" | "writeMd" | "writeBinary"
  | "getFileTree" | "validateRoot"
  | "ensureRoot" | "createFile" | "createDirectory" | "deleteFile" | "renameFile"
  | "deleteDirectory" | "renameDirectory"
  | "writeTemp" | "readTemp" | "discardTemp"
  | "revealInFolder" | "openRootFolder"
  | "copyFile"

export async function POST(req: NextRequest) {
  const guard = requireAuth(req)
  if (!guard.ok) return guard.response

  try {
    const body = await req.json()
    const { action, root } = body as { action: Action; root: string }

    if (!root) throw new Error("root 경로가 필요합니다")

    switch (action) {
      case "readFile":
        return ok(await server.readFile(root, body.filePath))

      case "writeFile":
        await server.writeFile(root, body.filePath, body.content)
        return ok(true)

      case "writeMd":
        await server.writeMd(root, body.filePath, body.content)
        return ok(true)

      case "writeBinary":
        await server.writeBinary(root, body.filePath, body.content)
        return ok(true)

      case "getFileTree":
        return ok(await server.getFileTree(root))

      case "validateRoot":
        return ok(await server.validateRoot(root))

      case "ensureRoot":
        return ok(await server.ensureRootDir(root))

      case "createFile":
        await server.createFile(root, body.filePath)
        return ok(true)

      case "createDirectory":
        await server.createDirectory(root, body.dirPath)
        return ok(true)

      case "deleteFile":
        await server.deleteFile(root, body.filePath)
        return ok(true)

      case "renameFile":
        await server.renameFile(root, body.filePath, body.newPath)
        return ok(true)

      case "deleteDirectory":
        await server.deleteDirectory(root, body.dirPath)
        return ok(true)

      case "renameDirectory":
        await server.renameDirectory(root, body.dirPath, body.newPath)
        return ok(true)

      case "copyFile":
        await server.copyFile(root, body.filePath, body.destPath)
        return ok(true)

      case "writeTemp":
        await server.writeTemp(root, body.filePath, body.content)
        return ok(true)

      case "readTemp":
        return ok(await server.readTemp(root, body.filePath))

      case "discardTemp":
        await server.discardTemp(root, body.filePath)
        return ok(true)

      case "revealInFolder":
        return ok(await server.revealInFolder(root, body.filePath))

      case "openRootFolder":
        return ok(await server.openRootFolder(root))

      default:
        throw new Error(`알 수 없는 action: ${action}`)
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

function ok(data: unknown) {
  return NextResponse.json({ data })
}
