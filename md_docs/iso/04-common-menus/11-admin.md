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
  <td class="doctitle" colspan="2">관리자 (통계/템플릿)</td>
  <td><span class="label">문서번호</span><span class="val">MSYS-OPS-04-11</span></td>
</tr>
<tr>
  <td><span class="label">분류</span><span class="val">운영 매뉴얼</span></td>
  <td><span class="label">개정번호</span><span class="val">Rev. 1.0</span></td>
  <td><span class="label">시행일</span><span class="val">2026-07-22</span></td>
</tr>
<tr>
  <td colspan="2"><span class="label">적용 범위</span><span class="val">공통 메뉴 - 사용자 관리</span></td>
  <td><span class="label">승인</span><span class="val">운영팀장</span></td>
</tr>
</table>

# 관리자 (통계/템플릿)

> **핵심 기능**: 시스템 사용 현황 통계를 조회하고, 엑셀 템플릿 파일을 관리합니다.

---

## 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → 관리자
- **URL**: `/admin`
- **필요 권한**: `admin`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

## 2. 화면 구성

### 2.1 전체 화면 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  [통계 탭] [템플릿 탭]                                           │
├─────────────────────────────────────────────────────────────────┤
│  [통계 탭 내용]                                                  │
│  기간: [____] ~ [____]  메뉴: [전체▼]  [조회]                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    접근 통계 차트                         │  │
│  │  [막대/선/파이 차트로 메뉴 접근 횟수 시각화]              │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌────────┬────────┬────────┬────────┐                         │
│  │메뉴    │접근횟수│사용자수│평균체류│                         │
│  └────────┴────────┴────────┴────────┘                         │
├─────────────────────────────────────────────────────────────────┤
│  [템플릿 탭 내용]                                                │
│  [파일 선택] [업로드]                                           │
│  ┌────────┬────────┬────────┬────────┐                         │
│  │파일명  │크기    │등록일  │작업    │                         │
│  └────────┴────────┴────────┴────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 각 영역 상세 설명

#### ① 통계 탭

**필터:**
| 요소 | 설명 |
|------|------|
| 기간 | 조회 시작일/종료일 |
| 메뉴 | 특정 메뉴 필터 (전체/대시보드/수집스케줄 등) |
| 조회 | 데이터 갱신 |

**차트:**
- 메뉴 접근 횟수 추이 (막대/선 차트)
- 사용자별 접근 비율 (파이 차트)
- 시간대별 접근 분포 (히트맵)

**테이블:**
| 컬럼 | 설명 |
|------|------|
| 메뉴 | 메뉴 이름 |
| 접근횟수 | 해당 기간 내 접근 횟수 |
| 사용자수 | 고유 사용자 수 |
| 평균체류 | 평균 체류 시간 |

**데이터 출처:** `tb_user_acs_log`

#### ② 템플릿 탭

**파일 업로드:**
| 요소 | 설명 |
|------|------|
| 파일 선택 | 업로드할 엑셀 템플릿 파일 선택 |
| 업로드 | 선택된 파일 업로드 |

**파일 목록 테이블:**
| 컬럼 | 설명 |
|------|------|
| 파일명 | 템플릿 파일 이름 |
| 크기 | 파일 크기 |
| 등록일 | 업로드 일시 |
| 작업 | 다운로드/삭제 버튼 |

---

## 3. 조작 방법

### 3.1 통계 조회

**조작 절차:**
1. `통계` 탭 선택
2. 기간/메뉴 선택
3. `조회` 버튼 클릭

### 3.2 엑셀 템플릿 업로드

**조작 절차:**
1. `템플릿` 탭 선택
2. `파일 선택` 버튼 클릭
3. 엑셀 파일(.xlsx) 선택
4. `업로드` 버튼 클릭

### 3.3 엑셀 템플릿 다운로드/삭제

**조작 절차:**
1. 대상 행의 `다운로드` 또는 `삭제` 버튼 클릭

---

## 4. 모니터링 체크리스트

- [ ] **메뉴 접근 통계**에서 특정 메뉴의 접근이 급감하지 않았는지 확인
- [ ] **사용자별 접근**에서 비정상적인 접근 패턴이 없는지 확인
- [ ] **템플릿 파일**이 정상적으로 업로드/다운로드되는지 확인

---

## 5. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 통계 데이터가 비어있음 | 접근 이력 없음 | 기간 확대 또는 메뉴 사용 유도 |
| 템플릿 업로드 실패 | 파일 형식 오류 | .xlsx 형식 확인 |
| 차트가 표시되지 않음 | 데이터 부족 | 충분한 기간 선택 |

---

> 다음 문서: [12-api-test.md](12-api-test.md)

<div class="doc-footer">
  <span><b>MSYS-OPS-04-11</b> · Rev. 1.0</span>
  <span>1 / 1</span>
</div>
