<style>
@page { size: A4 portrait; margin: 18mm 16mm 20mm; }
@media print {
  .pagebreak { page-break-after: always; }
  .chapter { page-break-before: always; }
  img, table, pre { page-break-inside: avoid; }
  h2, h3, h4 { page-break-after: avoid; }
}
body {
  max-width: 178mm; margin: 0 auto;
  font-family: "Pretendard","맑은 고딕","Malgun Gothic",-apple-system,sans-serif;
  font-size: 9.6pt; line-height: 1.65; color: #151515;
}
/* 제목블록 (엔지니어링 도면 규격) */
table.titleblock { width:100%; border-collapse:collapse; margin:0 0 20px; font-size:8.3pt; table-layout:fixed; }
table.titleblock td { border:1pt solid #151515; padding:5px 8px; vertical-align:top; }
table.titleblock .label { display:block; font-size:6.8pt; color:#666; letter-spacing:.06em; text-transform:uppercase; margin-bottom:2px; }
table.titleblock .val { font-weight:700; color:#151515; }
table.titleblock .doctitle { font-size:13pt; font-weight:800; padding:10px 10px; }
/* H1은 제목블록이 대신하므로 숨김 */
h1 { display:none; }
/* 조항 번호 체계 */
h2 { font-size:11.5pt; font-weight:800; margin:22px 0 8px; padding-bottom:4px; border-bottom:1pt solid #151515; color:#151515; font-variant-numeric:tabular-nums; }
h3 { font-size:10.2pt; font-weight:700; margin:12px 0 6px; color:#151515; font-variant-numeric:tabular-nums; }
h4 { font-size:9.5pt; font-weight:700; margin:10px 0 5px; color:#3a3a3a; }
h5 { font-size:9.2pt; font-weight:700; margin:8px 0 4px; color:#555; }
p { margin:5px 0; color:#2a2a2a; }
/* 데이터 표 (마크다운 표에도 적용) */
table:not(.titleblock) { width:100%; border-collapse:collapse; font-size:8.8pt; table-layout:fixed; word-break:break-word; margin:8px 0 14px; }
table:not(.titleblock) th { border:0.75pt solid #151515; background:#ececec; padding:5px 8px; text-align:left; font-weight:700; font-size:8pt; }
table:not(.titleblock) td { border:0.5pt solid #999; padding:5px 8px; color:#2a2a2a; }
/* 목록 */
ol, ul { margin:6px 0 12px; padding-left:20px; }
li { margin:3px 0; color:#2a2a2a; }
blockquote { margin:10px 0; padding:7px 10px; border:0.75pt solid #999; background:#f7f7f7; font-size:8.7pt; color:#444; }
pre { font-size:8pt; background:#f2f2f2; padding:8px 10px; border:0.5pt solid #ccc; margin:6px 0 12px; white-space:pre-wrap; word-break:break-all; }
code { font-size:8.3pt; background:#ececec; padding:1px 4px; font-family:"SFMono-Regular",Consolas,monospace; word-break:break-all; }
pre code { background:none; padding:0; }
img { max-width:100%; height:auto; border:0.5pt solid #ccc; }
/* 통합본 장 구분 */
.chapter { font-size:15pt; font-weight:800; color:#151515; margin:0 0 14px; padding:10px 0 8px; border-top:2.5pt solid #151515; border-bottom:0.75pt solid #151515; letter-spacing:.01em; }
.chapter .docno { float:right; font-size:8.5pt; font-weight:700; color:#767676; font-variant-numeric:tabular-nums; }
.doc-footer { margin-top:30px; padding-top:6px; border-top:1pt solid #151515; display:flex; justify-content:space-between; font-size:7.5pt; color:#444; }
.doc-footer b { color:#151515; }
</style>

<table class="titleblock">
<tr>
  <td class="doctitle" colspan="2">MSYS 운영자 메뉴얼</td>
  <td><span class="label">문서번호</span><span class="val">MSYS-OPS-00R</span></td>
</tr>
<tr>
  <td><span class="label">분류</span><span class="val">운영 매뉴얼</span></td>
  <td><span class="label">개정번호</span><span class="val">Rev. 1.0</span></td>
  <td><span class="label">시행일</span><span class="val">2026-07-22</span></td>
</tr>
<tr>
  <td colspan="2"><span class="label">적용 범위</span><span class="val">운영자 메뉴얼 표지 및 구조</span></td>
  <td><span class="label">승인</span><span class="val">운영팀장</span></td>
</tr>
</table>

# MSYS 운영자 메뉴얼

## 개요

본 메뉴얼은 MSYS(수집 현황 대시보드) 시스템을 운영하는 운영자 및 인수인계자를 위한 실무 중심 가이드입니다.

## 대상 독자

- 시스템 운영자
- 인수인계자
- 관리자(admin 권한 보유자)

## 메뉴얼 구조

```
operator-manual/
├── README.md                          # 본 파일
├── DEVELOPMENT.md                     # 메뉴얼 작성 개발 가이드
├── 00-getting-started.md              # 빠른 시작 가이드
├── 01-system-overview.md              # 시스템 개요
├── 02-environment-setup.md            # 환경 설정
├── 03-deployment.md                   # 배포 절차
├── 04-common-menus/                   # 일반 메뉴
│   ├── 01-dashboard.md
│   ├── 02-collection-schedule.md
│   ├── 03-chart-analysis.md
│   ├── 04-data-analysis.md
│   ├── 05-data-spec.md
│   ├── 06-card-summary.md
│   ├── 07-mapping.md
│   ├── 08-api-key-mngr.md
│   ├── 09-jandi.md
│   ├── 10-raw-data.md
│   ├── 11-admin.md
│   ├── 12-api-test.md
│   ├── 13-external-links.md
│   └── images/
├── 05-mngr-sett.md                    # 관리자 설정 (별도 파일)
├── 06-daily-operations.md             # 일상 운영
├── 07-troubleshooting.md              # 장애 대응
├── 08-backup-recovery.md              # 백업/복구
└── appendix/
    ├── command-cheatsheet.md
    └── config-reference.md
```

## 작성 원칙

1. **조작 중심**: "이 버튼을 누륵 ~된다" 형식으로 절차 서술
2. **모니터링 포함**: 상태 확인 방법, 정상/비정상 기준, 확인 주기 명시
3. **스크린샷 활용**: 기능 영역만 확대 캡처 + 화살표/번호로 설명
4. **실무 지향**: 이론 설명 최소화, 실제 업무 흐름 중심

## 버전 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0 | 2026-05-11 | - | 초안 작성 |

<div class="doc-footer">
  <span><b>MSYS-OPS-00R</b> · Rev. 1.0</span>
  <span>1 / 1</span>
</div>
