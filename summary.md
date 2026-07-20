## Objective
- Fix md_editor recovery/auto-save subsystem bugs and verify via Playwright (not predictions): (1) phantom "unsaved changes" dialog on unedited files, (2) recovery apply caused full-page reload/overwrite, (3) after recovery the temp regenerates so the dialog reappears on reopen, (4) X button on the recovery dialog does nothing. User demands facts verified by Playwright e2e.

## Important Details
- Build mode is ACTIVE — edits and Playwright execution allowed.
- Verified facts (all confirmed by passing e2e, not assumption):
  - `fs-access.ts getRecoveryInfo` (289) now compares temp vs original via `mdToHtml`→strip→normalize; equal ⇒ `discardTempFile` + return null (phantom fix). Temp is stored as **markdown** (`autoSaveTemp` runs `htmlToMd`), so the markdown-vs-markdown comparison is valid.
  - `doc-tab-content.tsx handleRecoveryApply` (92) replaced `window.location.reload()` with in-place update; also calls `markSaved(editorRef.current.getHTML())` so the auto-save baseline matches the editor's real serialization (prevents temp regeneration after recovery/save/discard).
  - `use-auto-save.ts` gained `markSaved(value?)` (91) → `baselineRef.current = value ?? contentRef.current`; returned as `{ save, markSaved }`. `save()` compares `contentRef.current` vs `baselineRef.current` and early-returns when equal (no temp write).
  - `recovery-dialog.tsx` gained `onClose` prop + `onOpenChange={(next)=>{ if(!next) onClose() }}`. `doc-tab-content` passes `onClose={() => setDismissed(true)}`; `showRecovery` is derived (`!!recoveryInfo && !tab.recoveryDismissed && !dismissed`), fixing both the X-button (issue 2) and an async-arrival race.
- e2e `e2e/recovery.spec.ts` (stateful localStorage-backed `showDirectoryPicker` mock) — 4 tests, all PASS: phantom(no dialog), real-edit(dialog + in-place apply, no reload), reload-after-apply(no re-prompt), X-button(close).
- Pre-existing, unrelated blockers (outside recovery scope, do NOT block `next dev`/Playwright):
  - `globals.css:265` had a malformed double-backslash `.print\\:hidden` that broke `next dev` CSS compile (whole app failed to render). Fixed to valid `.print\:hidden`. (Was the reason the dev server appeared "dead" / file list never rendered.)
  - `tsc` errors in print/page-break feature (`page-break.ts`, `editor-toolbar.tsx`, `slash-command-popup.tsx`, `use-auto-page-break.ts`) still block `next build` but not `next dev`.
  - `pw_check.cjs` triggers a lint `require()` error (stray file, pre-existing).
- Dev server: `next dev` on :3000, running (was restarted after a CSS-compile crash). `next dev` requires clearing `.next/dev`+`.next/cache` after editing `globals.css` (Turbopack caches the bad CSS).
- Playwright temp-file naming: for `notes.md` the temp lives at `.temp/notes.md.md.tmp` (`TEMP_EXTENSION=".md.tmp"` appended to full filename).
- Test mock pitfalls fixed during verification: (a) mock must store temp under nested `.temp/` dir; (b) injected mock is PLAIN JS — TS `as` casts in it throw in-browser; (c) the storage key must persist in `localStorage` (not `window`) to survive `page.reload()`.

## Work State
### Completed
- Phantom dialog fix (`fs-access.ts getRecoveryInfo` temp↔original comparison + discard).
- Recovery apply in-place update (no page reload/overwrite).
- Issue 1: temp no longer regenerates after apply/save/discard (`markSaved` baseline sync in `use-auto-save` + `doc-tab-content`).
- Issue 2: X button closes dialog (`recovery-dialog` `onClose` + derived `showRecovery`).
- `globals.css` malformed `.print\\:hidden` → `.print\:hidden` (unblocked the dev server/CSS compile).
- e2e spec: 4 tests covering phantom, real-edit apply, reload-after-apply, X-button — **all passing (14.6s)**.
- lint: clean except the pre-existing `pw_check.cjs` `require()` error.

### Active
- (none)

### Blocked
- (none)

## Next Move
1. Optional cleanup (out of scope, confirm with user before doing): remove stray `pw_check.cjs`; resolve pre-existing print/page-break `tsc` errors so `next build` succeeds; drop unused `AUTO_SAVE_THROTTLE_MS` constant.
2. If the user wants, extend e2e coverage (e.g., discard path, multi-file) — current 4 tests already cover both reported regressions.

## Relevant Files
- `C:\dev\md_editor\src\hooks\use-auto-save.ts`: `markSaved` (91) — baseline sync (Issue 1 root cause fix)
- `C:\dev\md_editor\src\components\tab\doc-tab-content.tsx`: `handleRecoveryApply`(92)/`handleRecoveryDiscard`(110)/`handleSave`(68) use `markSaved`; `showRecovery` derived from `dismissed`; `RecoveryDialog onClose` wired (Issue 2)
- `C:\dev\md_editor\src\components\editor\recovery-dialog.tsx`: added `onClose` prop + `onOpenChange` (X button fix)
- `C:\dev\md_editor\src\lib\fs-access.ts`: `getRecoveryInfo`(289) temp↔original comparison + discard (phantom fix); temp stored as markdown via `autoSaveTemp`(272)
- `C:\dev\md_editor\src\app\globals.css`: `:265` `.print\:hidden` (fixed malformed double-backslash that broke `next dev` CSS compile)
- `C:\dev\md_editor\e2e\recovery.spec.ts`: stateful mock + 4 passing recovery tests
- `C:\dev\md_editor\playwright.config.ts`: webServer `npx next start --port 3000`, reuseExistingServer (dev server currently `next dev` on :3000)
- `C:\dev\md_editor\src\components\ui\dialog.tsx`: X button calls `onOpenChange(false)` → required `onOpenChange` on controlled Dialog
- `C:\dev\md_editor\src\lib\constants.ts`: `TEMP_DIR=".temp"`, `TEMP_EXTENSION=".md.tmp"`, `AUTO_SAVE_THROTTLE_MS=10000` (unused)
