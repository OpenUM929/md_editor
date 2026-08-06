import { test, expect } from "@playwright/test"

const BASE = "http://localhost:3000"
const PASSWORD = process.env.AUTH_PASSWORD ?? "admin123"

test("login-success", async ({ page }) => {
  await page.goto(`${BASE}/login`)
  await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible()
  const input = page.getByLabel("비밀번호")
  await input.fill(PASSWORD)
  await page.getByRole("button", { name: "로그인" }).click()
  await page.waitForURL(`${BASE}/`)
})

test("wrong-password", async ({ page }) => {
  await page.goto(`${BASE}/login`)
  const input = page.getByLabel("비밀번호")
  await input.fill("wrong-password")
  await page.getByRole("button", { name: "로그인" }).click()
  await expect(page).toHaveURL(/\/login/)
})