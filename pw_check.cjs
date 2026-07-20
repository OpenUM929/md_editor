const { chromium } = require("playwright")

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message))

  await page.goto("http://localhost:3000/sample.md", { waitUntil: "networkidle", timeout: 20000 }).catch(e => console.log("goto err:", e.message))
  await page.waitForTimeout(3500)

  const printBtn = await page.locator("button[aria-label*='Print'], button:has-text('Print')").count()
  const a4Canvas = await page.locator(".a4-canvas").count()
  const tiptap = await page.locator(".tiptap-editor").count()
  const bodyText = (await page.locator("body").innerText().catch(() => "")).slice(0, 200)

  console.log("PRINT_BTN_COUNT:", printBtn)
  console.log("A4_CANVAS_COUNT:", a4Canvas)
  console.log("TIPTAP_EDITOR_COUNT:", tiptap)
  console.log("BODY_TEXT_SNIPPET:", JSON.stringify(bodyText))
  console.log("CONSOLE_ERRORS:", JSON.stringify(errors.slice(0, 8)))

  await page.screenshot({ path: "C:\\Users\\ADMINI~1\\AppData\\Local\\Temp\\opencode\\shot.png", fullPage: false })
  await browser.close()
})()
