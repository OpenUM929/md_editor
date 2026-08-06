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
  <td class="doctitle" colspan="2">매핑 관리</td>
  <td><span class="label">문서번호</span><span class="val">MSYS-OPS-04-07</span></td>
</tr>
<tr>
  <td><span class="label">분류</span><span class="val">운영 매뉴얼</span></td>
  <td><span class="label">개정번호</span><span class="val">Rev. 1.0</span></td>
  <td><span class="label">시행일</span><span class="val">2026-07-22</span></td>
</tr>
<tr>
  <td colspan="2"><span class="label">적용 범위</span><span class="val">공통 메뉴 - 매핑</span></td>
  <td><span class="label">승인</span><span class="val">운영팀장</span></td>
</tr>
</table>

# 매핑 관리

> **핵심 기능**: 데이터베이스 테이블 컬럼의 변경 이력을 관리하고, 레거시 코드와 신규 코드 간의 컬럼 매핑 정보를 유지하여 호환성을 보장합니다.

---

## 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → 매핑 관리
- **URL**: `/mapping`
- **필요 권한**: `mapping`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

## 2. 화면 구성

### 2.1 전체 화면 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                    컬럼 매핑 관리                                │
├─────────────────────────────────────────────────────────────────┤
│  데이터베이스 테이블 컬럼의 변경 이력을 관리하고 레거시 코드와의   │
│  호환성을 유지합니다.                                            │
├─────────────────────────────────────────────────────────────────┤
│  [매핑되지 않은 신규 컬럼]                              [새로고침]│
│  ┌──────────────┬──────────────┬──────────────┐                 │
│  │ 테이블명     │ 컬럼명       │ 작업         │                 │
│  └──────────────┴──────────────┴──────────────┘                 │
├─────────────────────────────────────────────────────────────────┤
│  [매핑 관리]                                    [신규 매핑 추가]│
│  ┌────┬────────────┬────────────┬────────────┬──────┬──────┬──────┐│
│  │ID  │이전 테이블 │이전 컬럼   │새 테이블   │새 컬럼│설명  │작업  ││
│  └────┴────────────┴────────────┴────────────┴──────┴──────┴──────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 각 영역 상세 설명

#### ① 매핑되지 않은 신규 컬럼

| 컬럼 | 설명 |
|------|------|
| 테이블명 | 신규 컬럼이 추가된 테이블 이름 |
| 컬럼명 | 매핑되지 않은 신규 컬럼 이름 |
| 작업 | 매핑 추가 버튼 |

**동작 로직:**
- 시스템 startup 시 또는 `새로고침` 버튼 클릭 시 DB 스키마 스캔
- `tb_col_mapp` 테이블에 등록되지 않은 컬럼을 자동으로 감지
- 매핑 추가 버튼 클릭 시 매핑 모달이 열리며 해당 테이블/컬럼명이 자동으로 채워짐

#### ② 매핑 관리 테이블

| 컬럼 | 설명 |
|------|------|
| ID | 매핑 고유 ID |
| 이전 테이블명 | 레거시(변경 전) 테이블 이름 |
| 이전 컬럼명 | 레거시(변경 전) 컬럼 이름 |
| 새 테이블명 | 신규(변경 후) 테이블 이름 |
| 새 컬럼명 | 신규(변경 후) 컬럼 이름 |
| 설명 | 매핑에 대한 부가 설명 |
| 수정일 | 마지막 수정 일시 |
| 작업 | 수정/삭제 버튼 |

**동작 로직:**
- `tb_col_mapp` 테이블의 모든 매핑 정보 표시
- 행 클릭 시 매핑 모달 열림 (수정 모드)
- `신규 매핑 추가` 버튼 클릭 시 빈 모달 열림 (등록 모드)

#### ③ 매핑 정보 모달 (`#mapping-modal`)

| 필드 | ID | 설명 | 필수 |
|------|-----|------|------|
| 이전 테이블명 | `#bf-tbl-nm` | 레거시 테이블 이름 | - |
| 이전 컬럼명 | `#bf-col-nm` | 레거시 컬럼 이름 | - |
| 새 테이블명 | `#new-tbl-nm` | 신규 테이블 이름 | ✅ |
| 새 컬럼명 | `#new-col-nm` | 신규 컬럼 이름 | ✅ |
| 설명 | `#expl` | 매핑 설명 | - |

---

## 3. 데이터 흐름 및 처리 로직

### 3.1 전체 데이터 흐름도

```
[사용자] → [mapping_management.html] → [mapping.js]
                                              ↓
                          [fetch('/api/mappings')]
                                              ↓
                          [mapping_routes.py]
                                              ↓
                          [MappingService]
                                              ↓
                          [MappingMapper]
                                              ↓
                          [sql/mapping/*.sql]
                                              ↓
                          [TB_COL_MAPP]
```

### 3.2 매핑 조회 절차

1. 페이지 진입 시 `GET /api/mappings` API 호출
2. `MappingService`가 `MappingMapper`를 통해 `TB_COL_MAPP` 조회
3. 응답 데이터를 테이블에 렌더링

### 3.3 매핑 저장 절차

**신규 등록:**
1. `신규 매핑 추가` 버튼 클릭
2. 모달 폼에 데이터 입력
3. `저장` 버튼 클릭
4. `POST /api/mappings` API 호출

**수정:**
1. 대상 행 클릭
2. 모달 폼에서 데이터 수정
3. `저장` 버튼 클릭
4. `PUT /api/mappings/{id}` API 호출

**삭제:**
1. 대상 행의 `삭제` 버튼 클릭
2. 확인 대화상자 표시
3. `DELETE /api/mappings/{id}` API 호출

### 3.4 신규 컬럼 감지 로직

```
1. DB 메타데이터 조회 (INFORMATION_SCHEMA.COLUMNS)
2. tb_col_mapp의 모든 (테이블명, 컬럼명) 집합 생성
3. DB 메타데이터와 비교하여 미등록 컬럼 식별
4. 미등록 컬럼을 "매핑되지 않은 신규 컬럼" 테이블에 표시
```

---

## 4. 조작 방법

### 4.1 매핑 목록 조회

**조작 절차:**
1. 상단 메뉴 → 매핑 관리 클릭
2. 매핑 관리 테이블에서 목록 확인

**확인 방법:**
- 이전/새 테이블명과 컬럼명이 정상적으로 표시되는지 확인

### 4.2 신규 매핑 등록

**조작 절차:**
1. `신규 매핑 추가` 버튼 클릭
2. 모달 폼에 이전/새 테이블명, 컬럼명 입력
3. 설명 입력 (선택 사항)
4. `저장` 버튼 클릭

**확인 방법:**
- 목록에 신규 항목이 추가되었는지 확인

### 4.3 기존 매핑 수정

**조작 절차:**
1. 대상 행 클릭
2. 모달 폼에서 필요한 필드 수정
3. `저장` 버튼 클릭

**확인 방법:**
- 목록의 해당 행 내용이 변경되었는지 확인

### 4.4 매핑 삭제

**조작 절차:**
1. 대상 행의 `삭제` 버튼 클릭
2. 확인 대화상자에서 `확인` 클릭

**확인 방법:**
- 목록에서 해당 행이 사라졌는지 확인

### 4.5 신규 컬럼 매핑 추가

**조작 절차:**
1. `매핑되지 않은 신규 컬럼` 테이블 확인
2. 대상 행의 `매핑 추가` 버튼 클릭
3. 모달이 열리며 테이블명/컬럼명이 자동으로 채워짐
4. 이전 테이블명/컬럼명 입력 (있는 경우)
5. `저장` 버튼 클릭

**확인 방법:**
- 신규 컬럼 테이블에서 해당 행이 사라졌는지 확인
- 매핑 관리 테이블에 추가되었는지 확인

---

## 5. 모니터링 체크리스트

- [ ] **매핑되지 않은 신규 컬럼**이 지속적으로 증가하지 않는지 확인
- [ ] **이전 테이블명/컬럼명**이 누락된 매핑이 없는지 확인
- [ ] **새 테이블명/컬럼명**이 실제 DB 스키마와 일치하는지 확인
- [ ] **설명**이 명확하게 작성되어 있는지 확인

---

## 6. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 매핑 목록이 비어있음 | 등록된 매핑 정보 없음 | 신규 매핑 추가 또는 DB 스키마 변경 시 자동 감지 대기 |
| 신규 컬럼이 감지되지 않음 | DB 스키마 변경 후 새로고침 미실행 | `새로고침` 버튼 클릭 |
| 저장 실패 | 필수 항목(새 테이블명/컬럼명) 누락 | 필수 필드 입력 확인 |
| 중복 매핑 저장 | 동일한 (새 테이블명, 새 컬럼명)이 이미 존재 | 기존 매핑 수정 또는 중복 여부 확인 |
| 이전 코드 호환성 문제 | 매핑 정보 부정확 또는 누락 | 매핑 테이블의 이전/새 컬럼명 정확성 확인 |

---

## 7. 관련 DB 테이블 및 쿼리

### 7.1 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `tb_col_mapp` | 컬럼 매핑 정보 (ID, 이전 테이블명, 이전 컬럼명, 새 테이블명, 새 컬럼명, 설명, 수정일) |
| `INFORMATION_SCHEMA.COLUMNS` | DB 메타데이터 (테이블명, 컬럼명 등) |

### 7.2 매핑 API

```
GET    /api/mappings              # 매핑 목록 조회
POST   /api/mappings              # 매핑 신규 등록
GET    /api/mappings/{id}         # 매핑 상세 조회
PUT    /api/mappings/{id}         # 매핑 수정
DELETE /api/mappings/{id}         # 매핑 삭제
GET    /api/unmapped-columns      # 매핑되지 않은 신규 컬럼 조회
```

---

> 다음 문서: [08-api-key-mngr.md](08-api-key-mngr.md)

<div class="doc-footer">
  <span><b>MSYS-OPS-04-07</b> · Rev. 1.0</span>
  <span>1 / 1</span>
</div>
