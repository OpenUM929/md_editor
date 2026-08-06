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
  <td class="doctitle" colspan="2">API 키 관리</td>
  <td><span class="label">문서번호</span><span class="val">MSYS-OPS-04-08</span></td>
</tr>
<tr>
  <td><span class="label">분류</span><span class="val">운영 매뉴얼</span></td>
  <td><span class="label">개정번호</span><span class="val">Rev. 1.0</span></td>
  <td><span class="label">시행일</span><span class="val">2026-07-22</span></td>
</tr>
<tr>
  <td colspan="2"><span class="label">적용 범위</span><span class="val">공통 메뉴 - API 키 관리</span></td>
  <td><span class="label">승인</span><span class="val">운영팀장</span></td>
</tr>
</table>

# API 키 관리

> **핵심 기능**: 데이터 수집에 사용되는 API 키의 등록, 조회, 수정, 삭제 및 만료 알림 메일 스케줄 관리를 수행합니다.

---

## 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → API 키 관리
- **URL**: `/api_key_mngr`
- **필요 권한**: `api_key_mngr`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

## 2. 화면 구성

### 2.1 전체 화면 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  API 키 관리    기간 차트    위험군    설정     [설정 동기화]     │
├─────────────────────────────────────────────────────────────────┤
│  [API 키 관리 탭]                                               │
│  정상 API 키 관리 테이블 │ 비정상 API 키 관리 테이블            │
│  [전체(n)] [정상(n)] [만료임박30(n)] [만료임박7(n)] [오버(n)]   │
│  ┌────┬──────┬──────┬──────┬────────┬──────┬──────┬──────┬────┐│
│  │ ✓  │코드명│명칭  │API값 │책임자  │기간  │등록일│남은  │수정││
│  │    │      │      │      │이메일  │      │      │기간  │    ││
│  └────┴──────┴──────┴──────┴────────┴──────┴──────┴──────┴────┘│
├─────────────────────────────────────────────────────────────────┤
│  [기간 차트 탭]                                                 │
│  [간트 차트 - API 키 유효기간 시각화]                            │
├─────────────────────────────────────────────────────────────────┤
│  [위험군 탭]                                                    │
│  [전체] [✅전송완료] [❌전송실패] [⏳대기중]                     │
│  위험군 API 키 관리 테이블 (1개월 이내 만료)                     │
├─────────────────────────────────────────────────────────────────┤
│  [설정 탭]                                                      │
│  메일 알림 설정 │ 스케줄 설정                                    │
│  [30일 전] [7일 전] [당일]                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 각 영역 상세 설명

#### ① 탭 메뉴

| 탭 | ID | 설명 |
|------|-----|------|
| API 키 관리 | `content0` | API 키 목록 조회/등록/수정/삭제 |
| 기간 차트 | `content1` | API 키 유효기간 간트 차트 시각화 |
| 위험군 | `content2` | 1개월 이내 만료 API 키 관리 |
| 설정 | `content3` | 메일 알림 및 스케줄 설정 |

#### ② API 키 관리 탭 (`content0`)

**서브 탭:**
| 서브 탭 | 설명 |
|---------|------|
| 정상 API 키 관리 테이블 | 정상 상태의 API 키 목록 |
| 비정상 API 키 관리 테이블 | 만료 또는 오류 상태의 API 키 목록 |

**상태 필터 버튼:**
| 필터 | 설명 | 색상 |
|------|------|------|
| 전체키 | 모든 API 키 | 회색 |
| 정상 | 만료까지 30일 이상 남은 키 | 녹색 |
| 만료 임박(30일) | 30일 이내 만료 예정 | 노란색 |
| 만료 임박(7일) | 7일 이내 만료 예정 | 주황색 |
| 오버 | 이미 만료된 키 | 빨간색 |

**테이블 컬럼:**
| 컬럼 | 설명 |
|------|------|
| ✓ | 다중 선택 체크박스 |
| 코드명 | API 키 코드 (예: CD101) |
| 명칭 | API 키 한글 이름 |
| API값 | 실제 API 키 값 (마스킹 처리) |
| API책임자이메일 | 담당자 이메일 주소 |
| 기간 | 유효 기간 (년) |
| 등록일 | 최초 등록일 |
| 남은 기간 | 만료까지 남은 일수 |
| 알림 메일 전송 | 테스트 메일 발송 버튼 |
| 수정 | 개별 수정 버튼 |

**일괄 수정:**
- 체크박스로 다중 선택 후 `일괄 수정` 버튼 클릭
- 일괄 수정 모달에서 공통 필드 일괄 변경 가능

**CD 업데이트 동작:**
- `TB_MNGR_SETT`의 CD 값을 `TB_API_KEY_MNG`에 동기화
- `TB_CON_MST`의 ITEM10 값으로 업데이트
- `TB_CON_MST`의 UDATE_DT를 START_DT에 저장
- DUE 기본값: 1년

#### ③ 기간 차트 탭 (`content1`)

**간트 차트 (Gantt Chart):**
- 각 API 키의 유효기간을 막대 그래프로 시각화
- X축: 시간 (등록일 ~ 만료일)
- Y축: API 키 코드명
- 오늘 날짜 기준 빨간색 세로선 표시
- 상태별 막대 색상: 녹색(정상), 주황(만료임박), 빨강(오버)
- 마우스 오버 시 툴팁으로 상세 정보 표시

#### ④ 위험군 탭 (`content2`)

**정의:** 1개월 이내로 만료되는 API 키

**메일 전송 상태 필터:**
| 필터 | 설명 |
|------|------|
| 전체 | 모든 위험군 키 |
| ✅ 전송완료 | 알림 메일이 성공적으로 전송된 키 |
| ❌ 전송실패 | 알림 메일 전송에 실패한 키 |
| ⏳ 대기중 | 아직 알림 메일이 전송되지 않은 키 |

#### ⑤ 설정 탭 (`content3`)

**메일 알림 설정:**
| 항목 | 템플릿 변수 | 설명 |
|------|------------|------|
| 30일 전 메일 | `{{cd}}`, `{{cd_nm}}`, `{{expiry_dt}}`, `{{days_remaining}}`, `{{start_dt}}`, `{{due}}`, `{{api_ownr_email_addr}}` | 만료 30일 전 발송 |
| 7일 전 메일 | 동일 | 만료 7일 전 발송 |
| 당일 메일 | 동일 | 만료 당일 발송 |

**메일 설정 항목:**
- 메일 제목
- 보내는 사람 Email
- 메일 내용
- 미리보기 (샘플: CD101 기준)
- 과거 버전 이력 (최대 3개)
- 기본값 복원 버튼

**스케줄 설정:**
| 항목 | 설정 내용 |
|------|----------|
| 주기 (일) | 1/3/5/7/10/15/30일 중 선택 |
| 실행 시간 | 00~23시 중 선택 |
| 활성화 | 체크박스로 ON/OFF |

---

## 3. 데이터 흐름 및 처리 로직

### 3.1 전체 데이터 흐름도

```
[사용자] → [api_key_mngr.html] → [api_key_mngr.js]
                                              ↓
                          [fetch('/api/api_key_mngr')]
                                              ↓
                          [api_key_mngr_routes.py]
                                              ↓
                          [ApiKeyMngrService]
                                              ↓
                          [ApiKeyMngrMapper]
                                              ↓
                          [TB_API_KEY_MNGR]
                                              ↓
                          [메일 스케줄러 연동]
```

### 3.2 API 키 상태 분류 기준

| 상태 | 조건 |
|------|------|
| 정상 | 만료일 - 오늘 > 30일 |
| 만료 임박(30일) | 7일 < 만료일 - 오늘 ≤ 30일 |
| 만료 임박(7일) | 0일 < 만료일 - 오늘 ≤ 7일 |
| 오버 | 만료일 - 오늘 ≤ 0일 |

### 3.3 메일 알림 스케줄

```
1. 스케줄러가 설정된 주기/시간에 실행
2. TB_API_KEY_MNGR에서 대상 키 조회 (30일/7일/당일 기준)
3. 메일 템플릿 변수 치환
4. SMTP 서버 통해 메일 발송
5. 발송 결과를 TB_API_KEY_MNGR_MAIL_LOG에 기록
```

---

## 4. 조작 방법

### 4.1 API 키 등록

**조작 절차:**
1. `API 키 관리` 탭 선택
2. 테이블 내 `등록` 버튼 클릭 (또는 빈 행 더블클릭)
3. 코드명, 명칭, API값, 책임자 이메일, 기간 입력
4. `저장` 버튼 클릭

**확인 방법:**
- 목록에 신규 항목이 추가되었는지 확인
- 상태가 정상(녹색)으로 표시되는지 확인

### 4.2 API 키 수정

**조작 절차 (개별):**
1. 대상 행의 `수정` 버튼 클릭
2. 필드 수정
3. `저장` 버튼 클릭

**조작 절차 (일괄):**
1. 체크박스로 다중 선택
2. `일괄 수정` 버튼 클릭
3. 공통 수정 필드 입력
4. `저장` 버튼 클릭

### 4.3 만료 알림 메일 테스트

**조작 절차:**
1. 대상 행의 `알림 메일 전송` 버튼 클릭
2. 테스트 메일 발송 확인

### 4.4 메일 알림 설정 변경

**조작 절차:**
1. `설정` 탭 선택
2. `메일 알림 설정` 서브 탭 선택
3. 30일 전 / 7일 전 / 당일 메일 제목/내용 수정
4. `설정 저장` 버튼 클릭

### 4.5 스케줄 설정 변경

**조작 절차:**
1. `설정` 탭 선택
2. `스케줄 설정` 서브 탭 선택
3. 주기(일), 실행 시간, 활성화 여부 설정
4. `설정 저장` 버튼 클릭

---

## 5. 모니터링 체크리스트

- [ ] **오버 상태 키**가 있는지 확인 (즉시 갱신 필요)
- [ ] **만료 임박(7일)** 키가 있는지 확인
- [ ] **메일 전송 상태**에서 실패 항목이 있는지 확인
- [ ] **위험군** 키에 대해 담당자가 조치했는지 확인
- [ ] **스케줄 설정**이 활성화되어 있는지 확인
- [ ] **메일 알림 템플릿**이 최신 상태인지 확인

---

## 6. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| API 키가 오버로 표시됨 | 만료일이 지남 | 즉시 API 키 갱신 후 등록일/기간 수정 |
| 메일 전송 실패 | SMTP 설정 오류 또는 잘못된 이메일 주소 | 설정 탭의 SMTP 설정 확인, 책임자 이메일 주소 확인 |
| 알림 메일이 가지 않음 | 스케줄 비활성화 또는 주기 설정 부적절 | 설정 탭에서 스케줄 활성화 및 주기 확인 |
| CD 업데이트 후 키가 사라짐 | TB_MNGR_SETT에서 CD가 삭제됨 | TB_CON_MST의 ITEM10 값 확인 |
| 간트 차트가 비어있음 | 등록된 API 키 없음 | API 키 등록 필요 |
| 일괄 수정이 안 됨 | 선택된 항목 없음 | 체크박스로 항목 선택 확인 |

---

## 7. 관련 DB 테이블 및 쿼리

### 7.1 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `tb_api_key_mngr` | API 키 기본 정보 (코드, 값, 책임자, 등록일, 기간) |
| `tb_api_key_mngr_mail_log` | 메일 발송 이력 (발송일, 상태, 결과) |
| `tb_api_key_mngr_mail_sett` | 메일 알림 설정 (템플릿, 스케줄) |
| `tb_api_key_mngr_mail_schd` | 메일 스케줄 정보 (주기, 시간, 활성화 여부) |
| `tb_con_mst` | 수집 작업 마스터 (CD, ITEM10, UDATE_DT) |
| `tb_mngr_sett` | 관리자 설정 (CD 목록) |

### 7.2 API 키 관리 API

```
GET    /api/api_key_mngr              # API 키 목록 조회
POST   /api/api_key_mngr              # API 키 신규 등록
PUT    /api/api_key_mngr/{id}         # API 키 수정
DELETE /api/api_key_mngr/{id}         # API 키 삭제
POST   /api/api_key_mngr/batch        # 일괄 수정
POST   /api/api_key_mngr/send-mail    # 테스트 메일 발송
POST   /api/api_key_mngr/sync-cd      # CD 동기화
GET    /api/api_key_mngr/gantt        # 간트 차트 데이터
GET    /api/api_key_mngr/risk         # 위험군 키 조회
POST   /api/api_key_mngr/settings     # 설정 저장
```

---

> 다음 문서: [09-jandi.md](09-jandi.md)

<div class="doc-footer">
  <span><b>MSYS-OPS-04-08</b> · Rev. 1.0</span>
  <span>1 / 1</span>
</div>
