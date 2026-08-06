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
  <td class="doctitle" colspan="2">외부 연동</td>
  <td><span class="label">문서번호</span><span class="val">MSYS-OPS-04-13</span></td>
</tr>
<tr>
  <td><span class="label">분류</span><span class="val">운영 매뉴얼</span></td>
  <td><span class="label">개정번호</span><span class="val">Rev. 1.0</span></td>
  <td><span class="label">시행일</span><span class="val">2026-07-22</span></td>
</tr>
<tr>
  <td colspan="2"><span class="label">적용 범위</span><span class="val">공통 메뉴 - 외부 링크</span></td>
  <td><span class="label">승인</span><span class="val">운영팀장</span></td>
</tr>
</table>

# 외부 연동

> **핵심 기능**: MSYS와 연동되는 외부 시스템(Airflow, Kafka UI 등)으로의 빠른 접근 링크를 제공합니다.

---

## 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → Airflow / Kafka UI
- **URL**: 외부 URL (새 창으로 열림)
- **필요 권한**: 해당 메뉴 권한
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

## 2. 외부 시스템 목록

| 메뉴 | 설명 | URL 예시 | 로그인 필요 |
|------|------|----------|------------|
| Airflow | 데이터 수집 워크플로우 스케줄러 및 모니터링 | `http://airflow-server:8080` | 별도 계정 |
| Kafka UI | 메시지 브로커(Kafka) 관리 및 모니터링 | `http://kafka-ui-server:8080` | 별도 계정 |

---

## 3. 주의사항

| 항목 | 설명 |
|------|------|
| 별도 로그인 | 외부 시스템은 MSYS 계정과 별도의 인증이 필요할 수 있습니다. |
| 네트워크 접근 | 외부 시스템 서버에 대한 네트워크 접근 권한이 필요합니다. |
| VPN | 일부 외부 시스템은 VPN 연결이 필요할 수 있습니다. |
| 보안 | 외부 시스템 URL 및 계정 정보는 유출되지 않도록 주의하세요. |

---

## 4. 문제 해결

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 페이지가 열리지 않음 | 네트워크 접근 불가 또는 URL 변경 | 네트워크 상태 확인, 관리자에게 URL 변경 여부 확인 |
| 로그인 실패 | 잘못된 계정 정보 | 해당 시스템의 관리자에게 계정 확인 요청 |
| 403 Forbidden | 접근 권한 없음 | 해당 시스템의 관리자에게 권한 요청 |

---

> 메뉴얼 계속: [05-mngr-sett.md](../05-mngr-sett.md)

<div class="doc-footer">
  <span><b>MSYS-OPS-04-13</b> · Rev. 1.0</span>
  <span>1 / 1</span>
</div>
