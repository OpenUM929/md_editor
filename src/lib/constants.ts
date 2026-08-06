// 첫 방문 시 폴더 선택 입력창에 미리 채워 넣을 기본 워크스페이스 폴더.
// 환경별 절대경로이므로 필요에 따라 수정. 없으면 첫 "열기" 시 자동 생성된다.
export const DEFAULT_FOLDER_PATH = "C:\\dev\\md_editor\\md files"
export const FILE_EXTENSION = ".md"
export const TEMP_DIR = ".temp"
export const TEMP_EXTENSION = ".md.tmp"
export const META_EXTENSION = ".md.tmp.meta"
export const LOCALSTORAGE_PREFIX = "md_editor_draft:"
export const AUTO_SAVE_DEBOUNCE_MS = 2000
export const AUTO_SAVE_THROTTLE_MS = 10000
export const MAX_TEMP_FILES = 50
export const TEMP_FILE_MAX_AGE_DAYS = 7
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
export const TEMPLATE_ROOT = "templates"
export const AUTH_SESSION_COOKIE = "__md_auth"
export const AUTH_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
export const AUTH_PATH = "/"
export const AUTH_TOKEN_SEPARATOR = "."
