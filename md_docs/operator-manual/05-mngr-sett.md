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
  <td class="doctitle" colspan="2">관리자 설정 (mngr_sett)</td>
  <td><span class="label">문서번호</span><span class="val">MSYS-OPS-05</span></td>
</tr>
<tr>
  <td><span class="label">분류</span><span class="val">운영 매뉴얼</span></td>
  <td><span class="label">개정번호</span><span class="val">Rev. 1.0</span></td>
  <td><span class="label">시행일</span><span class="val">2026-07-22</span></td>
</tr>
<tr>
  <td colspan="2"><span class="label">적용 범위</span><span class="val">관리자 설정 화면 조작</span></td>
  <td><span class="label">승인</span><span class="val">운영팀장</span></td>
</tr>
</table>

# 관리자 설정 (mngr_sett)

> ⚠️ **별도 파일**: 본 문서는 관리자 설정 메뉴의 방대한 기능을 다루기 위해 별도 파일로 분리되었습니다.

---

## 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → 관리자 설정
- **URL**: `/mngr_sett`
- **필요 권한**: `mngr_sett`
- **상세 권한**: 관리자 설정 페이지 접근 및 설정 변경 권한

---

## 2. 화면 구성

관리자 설정 화면은 상단의 **탭 11개**로 구성됩니다.

<img src="images/mngr-sett-overview.png" width="800" alt="관리자 설정 탭 구성">

| 번호 | 탭 명칭 | 설명 | 본 문서 |
|:---:|------|------|:---:|
| ① | 기본 설정 | Job ID별 기본 설정, 설정 동기화, 내보내기/가져오기 | 3장 · 9장 |
| ② | 수집 스케줄 설정 | 그룹 설정, 진행률 임계값 | 8장 |
| ③ | Icon 관리 | 아이콘 등록/수정/삭제, 가져오기/내보내기 | 7장 |
| ④ | 차트/시각화 설정 | 차트 표시 및 색상 설정 | — |
| ⑤ | 사용자 관리 | 사용자 승인/거절/삭제, 권한 설정 | 4장 |
| ⑥ | 데이터 접근 권한 | Job ID별 데이터 접근 권한 설정 | 5장 |
| ⑦ | 엑셀 양식 관리 | 엑셀 출력 템플릿 등록/관리 | — |
| ⑧ | 통계 | 기간별 수집 통계 조회 | — |
| ⑨ | 데이터정의 | 수집 데이터 정의 관리 | — |
| ⑩ | 팝업 관리 | 공지 팝업 등록/수정/삭제 | — |
| ⑪ | 사용자접속정보 | 사용자 접속 이력 및 상태 설정 | — |

> ℹ️ 표의 번호는 캡처 이미지의 탭 배치 순서(왼쪽 → 오른쪽)와 같습니다.

---

## 3. 설정 관리

### 3.1 Job ID별 설정

**목적:** 각 수집 작업(Job ID)별로 임계값, 색상, 아이콘을 설정합니다.

**조작 절차:**
1. 설정 탭 선택
2. Job ID 검색 또는 목록에서 선택
3. 임계값(Threshold) 입력
4. 색상 선택
5. 아이콘 선택
6. 저장 버튼 클릭

**확인 방법:** 설정 저장 후 목록에 반영 여부 확인

**주의사항:** 잘못된 임계값 설정 시 대시보드 상태 표시가 부정확해질 수 있습니다.

---

## 4. 사용자 관리

### 4.1 사용자 승인

**목적:** 가입 신청한 사용자를 승인합니다.

**조작 절차:**
1. 사용자 탭 선택
2. 상태가 `PENDING`인 사용자 검색
3. 승인 버튼 클릭
4. 확인 다이얼로그에서 확인

**확인 방법:** 사용자 상태가 `APPROVED`로 변경됨

**주의사항:** 승인 시 비밀번호가 ID와 동일하게 초기화됩니다.

### 4.2 사용자 권한 설정

**목적:** 사용자별 메뉴 접근 권한을 설정합니다.

**조작 절차:**
1. 사용자 탭 선택
2. 대상 사용자 선택
3. 권한 체크박스 그룹에서 메뉴 선택
4. 저장 버튼 클릭

### 4.3 대량 사용자 추가

**목적:** 여러 사용자를 한 번에 추가합니다.

**조작 절차:**
1. 사용자 탭 → 대량 추가 버튼 클릭
2. 사용자 ID 목록 입력 (쉼표 또는 줄바꿈 구분)
3. 유효성 검사 버튼 클릭
4. 추가 버튼 클릭

**주의사항:** 4-20자 영문, 숫자만 허용됩니다.

---

## 5. 데이터 권한

### 5.1 Job ID 접근 권한 설정

**목적:** 사용자별로 접근 가능한 Job ID를 제한합니다.

**조작 절차:**
1. 데이터 권한 탭 선택
2. 대상 사용자 선택
3. Job ID 체크박스 선택
4. 저장 버튼 클릭

**확인 방법:** 해당 사용자로 로그인 후 접근 가능한 Job ID만 표시되는지 확인

---

## 6. 상태 코드

> ⚠️ **확인 필요**: 현재 `templates/mngr_sett.html`에 **"상태 코드" 탭이 존재하지 않습니다.** (탭 11개 중 해당 없음)
> 아래 절차의 "상태 코드 탭 선택" 단계는 현재 화면에서 수행할 수 없습니다. 기능 이동·삭제 여부 확인 후 본 장을 정정해야 합니다.

### 6.1 상태 코드 동기화

**목적:** `tb_con_mst`의 CD900 그룹과 `tb_sts_cd_mst`를 동기화합니다.

**조작 절차:**
1. 상태 코드 탭 선택
2. 동기화 버튼 클릭
3. 결과 메시지 확인

### 6.2 상태 코드 커스터마이징

**목적:** 상태 코드별 색상, 아이콘, 배경/글자색을 설정합니다.

**조작 절차:**
1. 상태 코드 탭 선택
2. 대상 상태 코드 행 선택
3. 색상 선택기에서 색상 선택
4. 아이콘 드롭다운에서 선택
5. 저장 버튼 클릭

---

## 7. 아이콘 관리

### 7.1 아이콘 등록/수정

**목적:** 시스템에서 사용할 아이콘을 관리합니다.

**조작 절차:**
1. 아이콘 탭 선택
2. 등록 버튼 클릭
3. 아이콘 코드, 이름, 설명 입력
4. 이미지 업로드
5. 저장 버튼 클릭

### 7.2 아이콘 가져오기/내보내기

**조작 절차:**
- 내보내기: CSV 버튼 클릭 → `icons.csv` 다운로드
- 가져오기: 파일 선택 → CSV 업로드 → 확인

---

## 8. 스케줄 표시 설정

### 8.1 그룹 설정

**목적:** 수집 스케줄 화면에서 Job ID 그룹핑 기준을 설정합니다.

### 8.2 진행률 임계값

**목적:** 진행률 표시 색상 변경 기준을 설정합니다.

---

## 9. 설정 백업/복원

### 9.1 설정 내보내기

**조작 절차:**
1. 설정 탭 → 내보내기 버튼 클릭
2. `admin_settings.json` 파일 다운로드

### 9.2 설정 가져오기

**조작 절차:**
1. 설정 탭 → 가져오기 버튼 클릭
2. JSON 파일 선택
3. 확인 메시지 확인 후 업로드

---

## 10. API 관리

> ⚠️ **확인 필요**: `mngr_sett` 화면에 **"API 관리" 탭이 존재하지 않습니다.**
> API 키 관리는 별도 메뉴 **`/api_key_mngr`** 에서 제공되며, 상세 설명은 [`04-common-menus/08-api-key-mngr.md`](04-common-menus/08-api-key-mngr.md)에 있습니다.
> 아래 절차의 "API 관리 탭 선택" 단계는 현재 화면에서 수행할 수 없습니다.

### 10.1 API 키 목록 조회

**목적:** 등록된 API 키 목록을 조회합니다.

**조작 절차:**
1. API 관리 탭 선택
2. 페이징 또는 검색어 입력
3. 목록 확인

**확인 항목:** 코드, 만료일, 담당자 이메일, 상태

### 10.2 API 키 등록/수정

**조작 절차:**
1. 등록 버튼 클릭
2. 코드, 만료일, 담당자 이메일 입력
3. 저장 버튼 클릭

**주의사항:** 만료일이 지난 API 키는 알림 대상이 됩니다.

### 10.3 API 키 삭제

**조작 절차:**
1. 대상 행 선택
2. 삭제 버튼 클릭
3. 확인 다이얼로그에서 확인

### 10.4 만료 알림 설정

**목적:** API 키 만료 전 메일 알림을 설정합니다.

**알림 기준:**
| 기간 | 발송 시점 |
|------|----------|
| 30일 전 | 1회 발송 |
| 7~1일 전 | 매일 발송 |
| 당일 | 1회 발송 |

### 10.5 메일 테스트

**조작 절차:**
1. 테스트 메일 발송 버튼 클릭
2. SMTP 연결 및 발송 결과 확인

---

## 11. 모니터링 체크리스트

- [ ] 사용자 승인 대기 목록 매일 확인
- [ ] API 키 만료 30일 이내 항목 주간 확인
- [ ] 상태 코드 동기화 월간 실행
- [ ] 설정 백업 월간 실행

---

## 12. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 사용자 승인 후 로그인 불가 | 비밀번호 초기화 미반영 | 관리자가 비밀번호 재초기화 |
| API 키 알림 미발송 | SMTP 설정 오류 | `.env` 메일 서버 설정 확인 |
| 상태 코드 미동기화 | CD900 그룹 변경 | 수동 동기화 버튼 실행 |

---

> 다음 문서: [06-daily-operations.md](06-daily-operations.md)

<div class="doc-footer">
  <span><b>MSYS-OPS-05</b> · Rev. 1.0</span>
  <span>1 / 1</span>
</div>
