/**
 * 페이지 나눔 "결정" 공용 코어 — 화면(use-page-flow)·인쇄/PDF(print)가 공유한다.
 *
 * 왜 공용인가:
 * 예전엔 화면은 위젯 데코레이션으로, 인쇄/PDF는 완전히 다른 경로(html2canvas 래스터,
 * 브라우저 기본 나눔)로 페이지를 나눠 "미리보기가 화면과 다르게" 보였다. 이 함수 하나로
 * 결정을 단일화해 입력(측정된 블록들)이 같으면 어느 표면이든 같은 페이지 경계를 얻는다.
 *
 * 순수 함수(DOM 비의존): 측정은 호출자가 하고, 여기서는 좌표만 계산한다.
 * 좌표계는 호출자가 geom 으로 주입한다 —
 *   - 화면: pageStepPx = (297 + gap)px 격자, 인쇄: pageStepPx = 297px (gap 없음).
 * 페이지당 인쇄 가능 높이(usable = sheetHeight - top - bottom)는 두 경우 동일하므로,
 * "어느 블록이 넘쳐 다음 장으로 밀리는가"라는 결정은 gap 유무와 무관하게 같다.
 */

export const PAGE_FLOW_EPS = 6

/** 자연 레이아웃(데코/나눔 제거 상태)에서 측정한 최상위 블록. top/height 는 px. */
export type FlowBlock = {
  /** 콘텐츠 시작점 기준 상대 top(px) */
  top: number
  /** border-box 높이(px) */
  height: number
  /** 수동 페이지 나눔 노드(pageBreak)인가 */
  isBreak: boolean
}

export type PageGeom = {
  /** 한 페이지가 차지하는 세로 스텝(px). 화면=(297+gap)px, 인쇄=297px */
  pageStepPx: number
  /** 용지 한 장 높이(px) = 297mm */
  sheetHeightPx: number
  topMarginPx: number
  botMarginPx: number
}

/** 화면 위젯 데코레이션용: index 블록 앞에 delta(px) 스페이서를 넣어 다음 페이지 상단으로 민다. */
export type FlowSpacer = { index: number; delta: number }

export type FlowResult = {
  /** 화면: 이 스페이서들을 위젯 데코로 삽입 */
  spacers: FlowSpacer[]
  /** 인쇄: startsNewPage[i] 인 블록에 break-before:page (자동 넘침만; 수동 나눔은 CSS 가 처리) */
  startsNewPage: boolean[]
  pageCount: number
}

/**
 * 블록들을 페이지에 배치한다. 로직은 예전 use-page-flow.ts 의 단일 패스와 동일 —
 * 경계를 넘는 블록만 다음 페이지 상단으로 밀어내고(스페이서/새 페이지 표시), 밀어낸 뒤의
 * 콘텐츠 높이에서 페이지 수를 파생한다.
 */
export function computePageFlow(blocks: FlowBlock[], geom: PageGeom): FlowResult {
  const { pageStepPx: pageH, sheetHeightPx: sheetH, topMarginPx: topM, botMarginPx: botM } = geom
  const usableH = sheetH - topM - botM

  const spacers: FlowSpacer[] = []
  const startsNewPage = blocks.map(() => false)

  let push = 0
  let maxBottom = 0
  let forceNextTop: number | null = null

  blocks.forEach((it, idx) => {
    const effTop = it.top + push
    let desiredTop = effTop

    // 직전 수동 나눔이 강제한 다음 페이지 상단
    if (forceNextTop !== null) {
      if (forceNextTop > effTop) desiredTop = forceNextTop
      forceNextTop = null
    }

    // 한 페이지에 들어가는 블록이 현재 페이지 인쇄영역을 넘치면 다음 페이지 상단으로.
    if (!it.isBreak && it.height <= usableH) {
      const i = Math.floor(Math.max(0, desiredTop - topM) / pageH)
      const printableBottom = i * pageH + sheetH - botM
      if (desiredTop + it.height > printableBottom + PAGE_FLOW_EPS) {
        desiredTop = (i + 1) * pageH + topM
        startsNewPage[idx] = true // 자동 넘침 → 인쇄에서 break-before
      }
    }

    const delta = desiredTop - effTop
    if (delta > 0.5) {
      spacers.push({ index: idx, delta })
      push += delta
    }

    const finalTop = it.top + push
    maxBottom = Math.max(maxBottom, finalTop + it.height)

    if (it.isBreak) {
      forceNextTop = (Math.floor(Math.max(0, finalTop - topM) / pageH) + 1) * pageH + topM
    }
  })

  const pageCount = Math.max(1, Math.round((maxBottom - PAGE_FLOW_EPS) / pageH + 0.5))
  return { spacers, startsNewPage, pageCount }
}
