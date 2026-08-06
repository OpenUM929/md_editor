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
  <td class="doctitle" colspan="2">API 테스트</td>
  <td><span class="label">문서번호</span><span class="val">MSYS-OPS-04-12</span></td>
</tr>
<tr>
  <td><span class="label">분류</span><span class="val">운영 매뉴얼</span></td>
  <td><span class="label">개정번호</span><span class="val">Rev. 1.0</span></td>
  <td><span class="label">시행일</span><span class="val">2026-07-22</span></td>
</tr>
<tr>
  <td colspan="2"><span class="label">적용 범위</span><span class="val">공통 메뉴 - API 테스트</span></td>
  <td><span class="label">승인</span><span class="val">운영팀장</span></td>
</tr>
</table>

# API 테스트

> **핵심 기능**: 데이터 수집에 사용되는 API를 직접 호출하여, 요청/응답을 테스트하고 유효성을 검증합니다.

---

## 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → API 테스트
- **URL**: `/api_test`
- **필요 권한**: `api_test`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

## 2. 화면 구성

### 2.1 전체 화면 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  [요청 패널]                                                     │
│  URL: [________________________________________]               │
│  메서드: [GET ▼]  [Content-Type: application/json ▼]            │
│  헤더:                                                           │
│  ┌────────┬────────┐                                           │
│  │키      │값      │                                           │
│  └────────┴────────┘                                           │
│  바디:                                                           │
│  {                                                               │
│    "param1": "value1"                                            │
│  }                                                               │
│                                          [실행]                  │
├─────────────────────────────────────────────────────────────────┤
│  [응답 패널]                                                     │
│  상태: 200 OK  소요시간: 245ms                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ {                                                        │  │
│  │   "result": "success",                                   │  │
│  │   "data": [...]                                          │  │
│  │ }                                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 각 영역 상세 설명

#### ① 요청 패널

| 요소 | 설명 |
|------|------|
| URL | API 엔드포인트 주소 |
| 메서드 | HTTP 메서드 (GET/POST/PUT/DELETE) |
| Content-Type | 요청 본문 형식 (application/json 등) |
| 헤더 | 추가 HTTP 헤더 (키-값 쌍) |
| 바디 | 요청 본문 (JSON/XML/폼 데이터) |
| 실행 버튼 | API 호출 실행 |

#### ② 응답 패널

| 요소 | 설명 |
|------|------|
| 상태 | HTTP 상태 코드 (200, 404, 500 등) |
| 소요시간 | API 호출 소요 시간 (ms) |
| 응답 본문 | API 응답 데이터 (JSON/XML) |

---

## 3. 조작 방법

### 3.1 API 테스트 실행

**조작 절차:**
1. URL 입력
2. 메서드 선택
3. 필요 시 헤더/바디 입력
4. `실행` 버튼 클릭

**확인 방법:**
- 상태 코드가 200번대인지 확인
- 응답 본문에 예상 데이터가 포함되어 있는지 확인
- 소요 시간이 정상 범위인지 확인

### 3.2 API 키 테스트

**조작 절차:**
1. URL에 API 키 파라미터 포함
2. `실행` 버튼 클릭
3. 응답 확인

---

## 4. 모니터링 체크리스트

- [ ] **상태 코드**가 200번대인지 확인
- [ ] **응답 시간**이 5초 이내인지 확인
- [ ] **응답 데이터**가 정상적인 형식인지 확인
- [ ] **API 키**가 유효한지 확인

---

## 5. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 404 Not Found | 잘못된 URL | API 명세서 확인 |
| 401 Unauthorized | 잘못된 API 키 | API 키 관리 메뉴에서 키 확인 |
| 500 Internal Server Error | 대상 서버 오류 | 대상 서버 상태 확인 |
| 응답 시간 초과 | 네트워크 지연 | 네트워크 상태 확인 또는 재시도 |
| 응답 데이터 파싱 실패 | 잘못된 JSON 형식 | 응답 본문의 따옴표, 쉼표 확인 |

---

> 다음 문서: [13-external-links.md](13-external-links.md)

<div class="doc-footer">
  <span><b>MSYS-OPS-04-12</b> · Rev. 1.0</span>
  <span>1 / 1</span>
</div>
