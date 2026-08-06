import "server-only"

export function getAuthEnabled(): boolean {
  return process.env.AUTH_ENABLED !== "false"
}

export function getAuthSecret(): string {
  return process.env.AUTH_SECRET ?? ""
}

export function getAuthPasswordHash(): string {
  return process.env.AUTH_PASSWORD_HASH ?? ""
}

export function getAuthSalt(): string {
  return process.env.AUTH_SALT ?? ""
}
