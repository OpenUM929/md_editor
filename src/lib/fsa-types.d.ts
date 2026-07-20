interface FileSystemHandlePermissionDescriptor {
  mode: "read" | "readwrite"
}

interface FileSystemDirectoryHandle {
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
  getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle>
  getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle>
  removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<void>
  values(): AsyncIterableIterator<FileSystemHandle>
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
  keys(): AsyncIterableIterator<string>
  resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>
}

interface FileSystemFileHandle {
  getFile(): Promise<File>
  createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
}

interface FileSystemHandle {
  kind: "file" | "directory"
  name: string
  isSameEntry(other: FileSystemHandle): Promise<boolean>
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | BufferSource | Blob): Promise<void>
  seek(position: number): Promise<void>
  truncate(size: number): Promise<void>
}

type FileSystemHandleKind = "file" | "directory"

interface FileSystemGetFileOptions {
  create?: boolean
}

interface FileSystemGetDirectoryOptions {
  create?: boolean
}

interface FileSystemRemoveOptions {
  recursive?: boolean
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean
}

interface Window {
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>
}
