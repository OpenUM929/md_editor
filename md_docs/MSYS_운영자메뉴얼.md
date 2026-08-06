<style>
@page { size: A4 portrait; margin: 18mm 16mm; }
@media print {
  .pagebreak { page-break-after: always; }
  img, table, pre { page-break-inside: avoid; }
  h2, h3 { page-break-after: avoid; }
}
body { max-width: 178mm; margin: 0 auto; font-family: "맑은 고딕","Malgun Gothic",sans-serif; font-size: 10.5pt; line-height: 1.6; }
table { width: 100%; border-collapse: collapse; font-size: 9pt; table-layout: fixed; word-break: break-word; }
th, td { border: 1px solid #999; padding: 4px 6px; }
th { background: #eef1f5; text-align: center; }
h1 { font-size: 20pt; text-align: center; border: 2px solid #333; padding: 12px; }
h2 { font-size: 14pt; margin-top: 20px; border-bottom: 2px solid #333; padding-bottom: 4px; }
h3 { font-size: 12pt; border-bottom: 1px solid #aaa; padding-bottom: 2px; }
h4 { font-size: 11pt; }
h5 { font-size: 10.5pt; }
img { max-width: 100%; height: auto; border: 1px solid #ddd; }
pre { font-size: 8.5pt; white-space: pre-wrap; word-break: break-all; background: #f7f7f9; padding: 6px; }
pre.diagram { white-space: pre; word-break: normal; overflow-wrap: normal; font-family: "D2Coding","Consolas",monospace; font-size: 8pt; line-height: 1.25; background: #fafbfc; border: 1px solid #ccc; padding: 8px; }
code { font-size: 8.5pt; word-break: break-all; }
blockquote { margin: 8px 0; padding: 6px 10px; border-left: 3px solid #7a8ba0; background: #f5f7fa; }
</style>


# MSYS 운영자 메뉴얼

<div align="center">

ICT운영처 디지털운영부 · 2026-07-20

</div>

> 본 메뉴얼은 「MSYS 데이터수집·모니터링시스템」의 **운영자 및 인수인계자**를 위한 조작 안내서입니다.
> 시스템의 구축 배경·범위·개발규모는 별도 문서 **`MSYS_구축완료보고서.md`**를 참조합니다.


## 목차

- [1. 빠른 시작](#1-빠른-시작)
- [2. 시스템 개요](#2-시스템-개요)
- [3. 환경 설정](#3-환경-설정)
- [4. 배포 절차](#4-배포-절차)
  - [5.1 대시보드](#51-대시보드)
  - [5.2 실시간 현황](#52-실시간-현황)
  - [5.3 차트분석](#53-차트분석)
  - [5.4 데이터분석](#54-데이터분석)
  - [5.5 수집일정](#55-수집일정)
  - [5.6 데이터명세](#56-데이터명세)
  - [5.7 컬럼매핑](#57-컬럼매핑)
  - [5.8 API키 관리](#58-api키-관리)
  - [5.9 Jandi (수집 히트맵)](#59-jandi-(수집-히트맵))
  - [5.10 원본데이터](#510-원본데이터)
  - [5.11 관리자 메뉴](#511-관리자-메뉴)
  - [5.12 API 테스트](#512-api-테스트)
  - [5.13 외부 링크](#513-외부-링크)
- [6. 관리자 설정](#6-관리자-설정)
- [7. 일상 운영](#7-일상-운영)
- [8. 장애 대응](#8-장애-대응)
- [9. 백업 및 복구](#9-백업-및-복구)
- [부록 A. 명령어 모음](#부록-a-명령어-모음)
- [부록 B. 설정 항목 레퍼런스](#부록-b-설정-항목-레퍼런스)


<div class="pagebreak"></div>

## 1. 빠른 시작

### 1. 시스템 접속

1. 브라우저에서 `http://[서버주소]:18080` 접속
2. 로그인 화면에서 ID/PW 입력
3. 관리자 계정으로 접속 시 전체 메뉴 확인 가능

### 2. 필수 확인 사항

| 항목 | 확인 방법 |
|------|----------|
| 서비스 기동 상태 | `ps -ef \| grep msys` |
| DB 연결 상태 | 대시보드 데이터 로드 여부 |
| 로그 확인 | `/data/external_data_monitoring/log/` |

### 3. 기본 조작 순서

#### 일일 업무
1. 대시보드 접속 → 수집 현황 확인
2. 수집 스케줄 → 이상 작업 확인
3. API 키 관리 → 만료 임박 키 확인

#### 주간 업무
1. 관리자 설정 → 사용자 승인 대기 확인
2. 통계 → 메뉴 접근 현황 확인

---

> 다음 문서: [01-system-overview.md](01-system-overview.md)


<div class="pagebreak"></div>

## 2. 시스템 개요

### 1. 시스템 정의

MSYS(Monitoring System)는 **외부 데이터 수집 현황을 모니터링하고 관리하는 웹 기반 대시보드 시스템**입니다.

### 2. 주요 기능

| 기능 | 설명 |
|------|------|
| 수집 현황 모니터링 | 실시간 수집 작업 상태 확인 |
| 스케줄 관리 | 수집 작업 스케줄 조회 및 관리 |
| API 키 관리 | API 키 등록, 만료 알림, 메일 발송 |
| 데이터 분석 | 차트/리포트 기반 데이터 분석 |
| 사용자 관리 | 계정 승인, 권한 설정, 데이터 접근 제어 |
| 시스템 설정 | 상태 코드, 아이콘, 스케줄 표시 설정 |

### 3. 시스템 아키텍처

```
[사용자] → [Flask Web Server] → [PostgreSQL]
                ↓
            [Redis Cache]
                ↓
            [SMTP Mail]
```

| 구성 요소 | 기술 |
|-----------|------|
| Backend | Python 3 + Flask 3.1.1 |
| Frontend | HTML/Jinja2 + jQuery + JavaScript |
| Database | PostgreSQL |
| Cache | Redis |
| Mail | SMTP |

### 4. 운영 환경

| 환경 | 설명 |
|------|------|
| 운영 서버 | CIB040L5 (Linux) |
| 배포 경로 | `/data/external_data_monitoring/msys/` |
| 로그 경로 | `/data/external_data_monitoring/log/` |
| 타임존 | KST (Asia/Seoul, UTC+9) |

### 5. 주요 테이블

| 테이블 | 설명 |
|--------|------|
| tb_user | 사용자 계정 |
| tb_con_mst | 수집 작업 마스터 |
| tb_con_hist | 수집 이력 |
| tb_api_key_mngr | API 키 관리 |
| tb_mngr_sett | 관리자 설정 |
| tb_menu | 메뉴 정의 |

### 6. 권한 체계

| 권한 | 설명 |
|------|------|
| admin | 전체 관리자 권한 |
| mngr_sett | 관리자 설정 메뉴 접근 |
| api_key_mngr | API 키 관리 메뉴 접근 |
| analysis | 분석 메뉴 접근 |
| data_spec | 데이터 스펙 메뉴 접근 |

---

> 다음 문서: [02-environment-setup.md](02-environment-setup.md)


<div class="pagebreak"></div>

## 3. 환경 설정

### 1. .env 파일 설정

`.env` 파일은 환경별 설정을 관리합니다.

#### 필수 설정 항목

```env
# Database
DB_HOST=localhost
DB_NAME=etl_db_dev
DB_USER=[사용자명]
DB_PASSWORD=[비밀번호]
DB_PORT=5432

# Flask
FLASK_HOST=0.0.0.0
FLASK_PORT=18080
FLASK_DEBUG=False

# Session
ADMIN_SESSION_LIFETIME_DAYS=7
DEFAULT_SESSION_LIFETIME_MINUTES=20

# Mail
MAIL_SERVER=100.1.28.73
MAIL_PORT=25
```

### 2. 로컬 개발 환경 구축

```bash
# 1. 가상환경 생성
python -m venv msys_venv

# 2. 가상환경 활성화
# Windows
msys_venv\Scripts\activate
# Linux
source msys_venv/bin/activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. .env 파일 설정

# 5. 서비스 기동
python msys_app.py
```

### 3. 운영 환경 설정

| 항목 | 경로/값 |
|------|---------|
| 배포 경로 | `/data/external_data_monitoring/msys/` |
| Python 환경 | `/data/external_data_monitoring/.web/bin/activate` |
| 로그 경로 | `/data/external_data_monitoring/log/` |

---

> 다음 문서: [03-deployment.md](03-deployment.md)


<div class="pagebreak"></div>

## 4. 배포 절차

### 1. 배포 전 체크리스트

- [ ] 소스 코드 최신화 (git pull)
- [ ] `.env` 파일 백업
- [ ] DB 마이그레이션 필요 여부 확인
- [ ] 의존성 변경 여부 확인 (`requirements.txt`)

### 2. 배포 절차

```bash
# 1. 기존 프로세스 중지
./kill_data_moni.sh

# 2. 백업 생성
cp -r /data/external_data_monitoring/msys /data/external_data_monitoring/msys_backup_$(date +%Y%m%d)

# 3. 소스 배포
# ZIP 파일을 scp로 전송 후 압축 해제
unzip msys.zip -d /data/external_data_monitoring/msys/

# 4. 권한 설정
chown -R etl_user:etl_user /data/external_data_monitoring/msys

# 5. 가상환경 활성화
source /data/external_data_monitoring/.web/bin/activate

# 6. 의존성 설치 (변경 시)
pip install -r requirements.txt

# 7. 서비스 기동
./start_moni.sh

# 8. 기동 확인
ps -ef | grep msys
tail -f /data/external_data_monitoring/log/external_data_monitoring.log
```

### 3. 롤백 절차

```bash
# 1. 기존 프로세스 중지
./kill_data_moni.sh

# 2. 백업 복원
cp -r /data/external_data_monitoring/msys_backup_YYYYMMDD/* /data/external_data_monitoring/msys/

# 3. 서비스 기동
./start_moni.sh
```

---

> 다음 문서: [04-common-menus/](04-common-menus/)


<div class="pagebreak"></div>


## 5. 일반 메뉴 사용법

> 각 메뉴의 접속 경로·화면 구성·조작 절차를 순서대로 설명합니다.

## 5.1 대시보드

> **핵심 기능**: 수집 작업의 전반적인 현황을 한눈에 모니터링하고, Job ID별 상세 성공률 및 이벤트 로그를 조회합니다.

---

### 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → 대시보드 (또는 `/` 루트 URL)
- **URL**: `/dashboard`
- **필요 권한**: `dashboard`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

### 2. 화면 구성

#### 2.1 전체 화면 구조

<img src="manual_images/dashboard-full.png" width="800" alt="대시보드 전체 화면">

#### 2.2 각 영역 상세 설명

#### 2.2 각 영역 상세 설명

##### ① 날짜 선택 카드 (`date-selection-card`)

| 요소 | ID | 설명 |
|------|-----|------|
| 시작일 | `startDate` | 조회 시작 날짜 (기본값: 올해 1월 1일) |
| 종료일 | `endDate` | 조회 종료 날짜 (기본값: 오늘) |
| 전체 데이터 조회 | `allDataCheckbox` | 체크 시 날짜 선택 없이 전체 기간 조회 |
| 조회 버튼 | - | 데이터를 다시 로드합니다 |
| 실 존재 데이터 기간 | `minDateDisplay` ~ `maxDateDisplay` | DB에 실제로 존재하는 데이터의 최소/최대 날짜 |

**동작 로직:**
- 페이지 진입 시 자동으로 올해 1월 1일 ~ 오늘(KST 기준)로 설정됩니다.
- `전체 데이터 조회` 체크 시 시작일/종료일 입력 필드가 비활성화되고, 전체 기간 데이터를 조회합니다.
- 날짜 변경 또는 체크박스 변경 시 자동으로 `loadDashboardSummary()`가 호출되어 데이터가 갱신됩니다.
- 조회 버튼 클릭 시에도 동일하게 데이터가 갱신됩니다.

**주의사항:**
- 시작일이 종료일보다 늦을 수 없습니다 (백엔드에서 400 에러 반환).
- 종료일은 실제로 `end_date + 1일`로 처리되어 해당 종료일까지의 데이터가 포함됩니다.

---

##### ② 요약 패널 (`dashboard-main-grid`)

###### 2.2.1 총 Job ID 개수 (`totalJobsCount`)

- **표시 내용**: 현재 조회된 데이터에서 활성화된 Job ID의 총 개수
- **계산 로직**: `summaryData.length` (CHRT_DSP_YN='N'으로 숨겨진 Job은 제외)
- **아이콘**: ⚙️ (톱니바퀴)

<img src="manual_images/dashboard-summary-panel.png" width="800" alt="요약 패널">

###### 2.2.2 총 호출 건수 (`totalCollectionsCount`)

- **표시 내용**: 전체 Job의 총 호출(수집 시도) 건수
- **계산 로직**: 모든 Job의 `(성공 + 실패 + 미수집)` 건수 합계
- **포맷**: 한글 단위 변환 (예: 12,345 → 1.2만)
- **아이콘**: 📊 (차트)

###### 2.2.3 기간별 수집 현황

일간/주간/월간/연간 성공률을 표시합니다.

| 기간 | ID | 계산식 | 기본 임계값 |
|------|-----|--------|------------|
| 일간 | `daySuccessRate` | 일간 성공 / (일간 성공 + 일간 실패 + 일간 미수집) × 100 | 95% |
| 주간 | `weekSuccessRate` | 주간 성공 / (주간 성공 + 주간 실패 + 주간 미수집) × 100 | 90% |
| 월간 | `monthSuccessRate` | 월간 성공 / (월간 성공 + 월간 실패 + 월간 미수집) × 100 | 85% |
| 반기 | `halfSuccessRate` | 반기 성공 / (반기 성공 + 반기 실패 + 반기 미수집) × 100 | 80% |
| 연간 | `yearSuccessRate` | 연간 성공 / (연간 성공 + 연간 실패 + 연간 미수집) × 100 | 75% |

**색상 기준:**
- 임계값 이상: `srSuccessColor` (기본 녹색 #28a745)
- 임계값 미만: `srWarningColor` (기본 노란색 #ffc107)

---

##### ③ Job ID별 상세 현황 테이블 (`job-details-card`)

**접이식 동작:** 카드 헤더를 클릭하면 내용이 접히거나 펼쳐집니다.

###### 테이블 컬럼 상세

| 컬럼 | 데이터 | 설명 |
|------|--------|------|
| **Job ID** | `job_id` | 수집 작업 고유 ID. 관리자는 Airflow 링크로 이동 가능 |
| **데이터명** | `cd_nm` | `tb_con_mst`의 코드명 |
| **주기(cron)** | `frequency` | 수집 주기 (cron 표현식). 하단에 해석된 텍스트 표시 |
| **총 호출 건수** | `overall_total` | 성공 + 실패 + 미수집 + 기타 건수 |
| **일간 성공률** | `day_success / day_total` | 오늘 기준 성공률. 아이콘 + 색상 + 툴팁 |
| **주간 성공률** | `week_success / week_total` | 최근 7일 기준 |
| **월간 성공률** | `month_success / month_total` | 최근 30일 기준 |
| **반기 성공률** | `half_success / half_total` | 최근 6개월 기준 |
| **연간 성공률** | `year_success / year_total` | 최근 1년 기준 |

<img src="manual_images/dashboard-job-details.png" width="800" alt="Job ID별 상세 현황 테이블">

###### Job ID 표시 로직

**아이콘 및 색상:**
- `cnn_failr_icon_id` + `cnn_failr_wrd_colr`: 연속 실패(임계값 초과) 시
- `cnn_warn_icon_id` + `cnn_warn_wrd_colr`: 연속 실패(경고 임계값) 시  
- `cnn_sucs_icon_id` + `cnn_sucs_wrd_colr`: 정상 시

**연속 실패 (`fail_streak`):**
- 최근 10회 실행 중 `CD902`(장애) 또는 `CD903`(미수집) 상태인 횟수
- 계산 쿼리: `SELECT COUNT(*) FROM (SELECT status FROM TB_CON_HIST WHERE job_id = ? ORDER BY start_dt DESC LIMIT 10) WHERE status IN ('CD902', 'CD903')`

**임계값 비교:**
- `fail_streak >= cnn_failr_thrs_val` (기본 3회): 위험(빨간색)
- `fail_streak >= cnn_warn_thrs_val` (기본 1회): 경고(노란색)
- 그 외: 정상(녹색)

###### 성공률 표시 로직

**성공률 계산:**
```
성공률 = success / (success + fail + no_data) × 100
```
- `no_data`(CD904, 진행중)는 분모에 포함되지 않음

**아이콘:**
- 임계값 이상: `sucs_rt_sucs_icon_id` (기본 없음)
- 임계값 미만: `sucs_rt_warn_icon_id` (기본 없음)

**하단 툴팁:**
```
(성공건수, 진행중건수, 실패건수/미수집건수/기타건수)
```

###### 검색 및 필터링

- **검색 (`detailTableSearch`)**: Job ID, 데이터명(`cd_nm`), 주기(`frequency`)로 실시간 필터링
- **행 수 (`detailTablePageSize`)**: 5/10/20/50/100개 선택 가능
- **페이징**: 하단 페이지네이션 버튼으로 이동

**필터링 로직:**
```javascript
filteredData = allData.filter(item => 
  item.job_id.toLowerCase().includes(searchTerm) ||
  item.cd_nm.toLowerCase().includes(searchTerm) ||
  item.frequency.toLowerCase().includes(searchTerm)
)
```

<img src="manual_images/dashboard-job-details-search.png" width="800" alt="실시간 검색 결과">

---

##### ④ 이벤트 로그 (`event-log-card`)

**접이식 동작:** 카드 헤더를 클릭하면 내용이 접히거나 펼쳐집니다.

###### 데이터 출처

- **테이블**: `tb_con_hist_evnt_log`
- **컬럼**: `EVNT_CHG_ROW` (JSONB)에서 추출
  - `con_id`: 수집 ID
  - `start_dt`: 시작 시간
  - `end_dt`: 종료 시간
  - `job_id`: Job ID
  - `rqs_info`: 요청 정보
  - `status`: 상태 코드

###### 상태 코드 정의

| 코드 | 의미 | 설명 | 아이콘 |
|------|------|------|--------|
| CD901 | 정상 수집 | 수집 완료 | 관리자 설정 아이콘 또는 🔔 |
| CD902 | 장애 발생 | 실패 | 관리자 설정 아이콘 또는 🔔 |
| CD903 | 미수집 | 데이터 없음 | 관리자 설정 아이콘 또는 🟠 |
| CD904 | 수집중 | 진행 중 | 관리자 설정 아이콘 또는 🔔 |
| AUTH_LOGIN_SUCCESS | 로그인 성공 | 시스템 이벤트 | - |
| AUTH_REGISTER | 가입 신청 | 시스템 이벤트 | - |
| AUTH_APPROVE | 가입 승인 | 시스템 이벤트 | - |
| AUTH_REJECT | 가입 거절 | 시스템 이벤트 | - |
| AUTH_DELETE | 사용자 삭제 | 시스템 이벤트 | - |
| AUTH_RESET_PW | 비밀번호 초기화 | 시스템 이벤트 | - |
| AUTH_CHANGE_PW | 비밀번호 변경 | 시스템 이벤트 | - |

<img src="manual_images/dashboard-event-log.png" width="800" alt="이벤트 로그 (펼침)">

###### 표시 컬럼

| 컬럼 | 내용 | 설명 |
|------|------|------|
| 시간 | `start_dt` | 이벤트 발생 시간 (KST) |
| 아이콘 | 상태별 아이콘 | 관리자 설정 또는 기본 아이콘 |
| Job ID | `job_id` | 작업 ID (시스템 이벤트는 'System') |
| 상태 | `status` → 해석 | CD901 → '정상 수집' 등 |
| 수집 건수 | `rqs_info` 파싱 | "총 요청 수: N, 실패: M"에서 추출 |
| 성공률 | 계산 | 성공 / 총 × 100 |
| 설명 | `status` → 해석 | '수집완료', '실패', '미수집', '진행중' |
| 수집 시간 | `end_dt - start_dt` | 소요 시간 (시간 단위, 소수점 1자리) |

###### 조작 기능

- **시작일/종료일 필터**: 날짜 변경 시 자동 조회
- **검색 (`eventLogSearch`)**: Job ID, 상태, 설명으로 실시간 필터링
- **행 수 (`eventLogPageSize`)**: 5/10/20/50/100개 선택
- **페이징**: 하단 페이지네이션
- **이벤트 로그 저장 버튼** (`save-event-log-btn`):
  - 현재 조회된 전체 이벤트 로그를 서버에 JSON으로 저장
  - API: `POST /api/save-event-log`
  - 저장 완료 시 파일 경로 표시 (2초 후 원래 텍스트로 복귀)

---

### 3. 데이터 흐름 및 처리 로직

#### 3.1 전체 데이터 흐름도

```
[사용자] → [dashboard.html] → [dashboard.js] → [events.js]
                                              ↓
                              [fetchDashboardSummary()]
                                              ↓
                              [GET /api/dashboard/summary]
                                              ↓
                              [DashboardService.get_summary()]
                                              ↓
         ┌────────────────────────────────────┼────────────────────────────────────┐
         ↓                                    ↓                                    ↓
[DashboardMapper]              [CollectionScheduleService]              [MngrSettMapper]
         ↓                                    ↓                                    ↓
[DashboardSQL.get_summary()]   [get_schedule_only()]                   [get_all_settings()]
         ↓                                    ↓                                    ↓
[TB_CON_HIST] (과거 데이터)     [TB_CON_HIST] + [스케줄] (오늘 데이터)      [TB_MNGR_SETT]
         └────────────────────────────────────┼────────────────────────────────────┘
                                              ↓
                              [_combine_historical_and_today_data()]
                                              ↓
                              [_apply_settings_and_filters()] (CHRT_DSP_YN 필터)
                                              ↓
                              [_add_fail_streaks()] (연속 실패 계산)
                                              ↓
                              [JSON 응답] → [updateSummaryCards()] + [renderDashboardSummaryTable()]
```

#### 3.2 오늘 데이터 처리 상세

**CollectionScheduleService.get_schedule_only():**
- 오늘(KST 기준)의 수집 스케줄을 조회
- 상태 코드 분류:
  - `CD901`: 성공
  - `CD902`, `CD903`: 실패
  - `CD904`: 진행 중
  - 기타: 미수집
  - `CD907`: 스케줄 제외 (total_scheduled에서 제외)

**병합 로직:**
- 과거 데이터(`TB_CON_HIST`)와 오늘 데이터를 Job ID 기준으로 병합
- 오늘 데이터는 `day_*` 필드에 저장 (day_success, day_fail_count, day_ing_count, day_no_data_count, day_total_scheduled)
- 과거 데이터는 `week_*`, `month_*`, `half_*`, `year_*` 필드에 저장

#### 3.3 관리자 설정 적용

**`tb_mngr_sett` 설정 항목:**

| 설정 항목 | 컬럼명 | 기본값 | 설명 |
|-----------|--------|--------|------|
| 대시보드 표시 여부 | `CHRT_DSP_YN` | Y | N인 경우 대시보드에서 제외 |
| 연속 실패 임계값(위험) | `cnn_failr_thrs_val` | 3 | 이 횟수 이상 연속 실패 시 빨간색 |
| 연속 실패 임계값(경고) | `cnn_warn_thrs_val` | 1 | 이 횟수 이상 연속 실패 시 노란색 |
| 연속 실패 성공 아이콘 | `cnn_sucs_icon_id` | - | 정상 상태 아이콘 |
| 연속 실패 경고 아이콘 | `cnn_warn_icon_id` | - | 경고 상태 아이콘 |
| 연속 실패 위험 아이콘 | `cnn_failr_icon_id` | - | 위험 상태 아이콘 |
| 일간 성공률 임계값 | `dly_sucs_rt_thrs_val` | 95 | % |
| 주간 성공률 임계값 | `dd7_sucs_rt_thrs_val` | 90 | % |
| 월간 성공률 임계값 | `mthl_sucs_rt_thrs_val` | 85 | % |
| 반기 성공률 임계값 | `mc6_sucs_rt_thrs_val` | 80 | % |
| 연간 성공률 임계값 | `yy1_sucs_rt_thrs_val` | 75 | % |
| 성공률 성공 아이콘 | `sucs_rt_sucs_icon_id` | - | 임계값 이상 아이콘 |
| 성공률 경고 아이콘 | `sucs_rt_warn_icon_id` | - | 임계값 미만 아이콘 |

---

### 4. 조작 방법

#### 4.1 날짜 범위 변경하여 조회

**조작 절차:**
1. `시작일` 입력 필드 클릭 → 날짜 선택
2. `종료일` 입력 필드 클릭 → 날짜 선택
3. `조회` 버튼 클릭 (또는 Enter)
4. 요약 패널과 상세 테이블이 자동 갱신됨

**확인 방법:**
- 요약 패널의 숫자가 변경되는지 확인
- 상세 테이블의 데이터가 갱신되는지 확인
- 상단에 초록색 토스트 메시지 "대시보드 요약 업데이트 완료" 표시

#### 4.2 전체 기간 조회

**조작 절차:**
1. `전체 데이터 조회` 체크박스 클릭
2. 시작일/종료일 필드가 비활성화됨
3. 데이터가 자동으로 갱신됨

#### 4.3 Job ID 검색

**조작 절차:**
1. 상세 테이블 우측 상단 `검색` 입력 필드에 텍스트 입력
2. 입력 즉시(Job ID, 데이터명, 주기 중 하나라도 포함) 필터링됨

#### 4.4 이벤트 로그 조회

**조작 절차:**
1. `이벤트 로그` 카드 펼치기 (헤더 클릭)
2. 시작일/종료일 설정
3. `조회` 버튼 클릭
4. 이벤트 로그 목록 확인

#### 4.5 이벤트 로그 저장

**조작 절차:**
1. 이벤트 로그 조회
2. 좌측 하단 `이벤트 로그 저장` 버튼 클릭
3. `저장 완료: [파일경로]` 메시지 확인

**주의사항:**
- 저장할 데이터가 없으면 "저장할 이벤트 로그 데이터가 없습니다" 경고 표시
- 저장 실패 시 "저장 실패" 표시 (2초 후 원래 텍스트로 복귀)

<img src="manual_images/dashboard-event-log-collapsed.png" width="800" alt="이벤트 로그 (접힘)">

---

### 5. 모니터링 체크리스트

- [ ] **총 Job ID 개수**가 예상 범위 내인지 확인 (보통 100~200개)
- [ ] **총 호출 건수**가 0이 아닌지 확인
- [ ] **일간 성공률**이 95% 이상인지 확인
- [ ] **주간 성공률**이 90% 이상인지 확인
- [ ] **연속 실패**가 3회 이상인 Job(빨간색)이 있는지 확인
- [ ] **이벤트 로그**에 비정상적인 에러가 없는지 확인
- [ ] `전체 데이터 조회` 시에도 데이터가 로드되는지 확인

---

### 6. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 대시보드가 비어있음 (데이터 없음) | 날짜 범위 내 데이터 없음 | 전체 데이터 조회 체크 또는 날짜 범위 확대 |
| 특정 Job이 표시되지 않음 | `CHRT_DSP_YN='N'` 설정됨 | 관리자 설정 → 해당 Job의 대시보드 표시 여부 확인 |
| 성공률이 0%로 표시됨 | 해당 기간 내 수집 이력 없음 | 데이터 수집 스케줄/에이전트 상태 확인 |
| 연속 실패 횟수가 이상함 | 상태 코드 분류 오류 | `tb_sts_cd_mst`의 성공/실패 코드 설정 확인 |
| 이벤트 로그에 AUTH_ 이벤트만 있음 | 비관리자 계정으로 조회 | 관리자 권한 확인 (비관리자는 시스템 이벤트 필터링됨) |
| 이벤트 로그 저장 실패 | 서버 디스크 공간 부족 | 서버 디스크 여유 공간 확인 |

---

### 7. 관련 DB 테이블 및 쿼리

#### 7.1 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `tb_con_hist` | 수집 실행 이력 (Job ID별 성공/실패 상태) |
| `tb_con_hist_evnt_log` | 이벤트 로그 (JSONB 형태로 변경 전/후 데이터 저장) |
| `tb_con_mst` | 수집 작업 마스터 (Job ID, 주기, 데이터명) |
| `tb_mngr_sett` | 관리자 설정 (성공률 임계값, 색상, 아이콘) |
| `tb_icon` | 아이콘 마스터 |
| `tb_user_data_perm_auth_ctrl` | 사용자별 데이터 접근 권한 |

#### 7.2 연속 실패 계산 쿼리

```sql
SELECT COUNT(*) as fail_count
FROM (
    SELECT status
    FROM TB_CON_HIST
    WHERE job_id = ?
    ORDER BY start_dt DESC
    LIMIT 10
) recent_runs
WHERE status IN ('CD902', 'CD903')
```

#### 7.3 이벤트 로그 조회 쿼리

```sql
SELECT
    (EVNT_CHG_ROW ->> 'con_id')::text AS con_id,
    EVNT_OCCR_TIME AS start_dt,
    (EVNT_CHG_ROW ->> 'end_dt')::timestamptz AS end_dt,
    (EVNT_CHG_ROW ->> 'job_id')::text AS job_id,
    (EVNT_CHG_ROW ->> 'rqs_info')::text AS rqs_info,
    (EVNT_CHG_ROW ->> 'status')::text AS status
FROM TB_CON_HIST_EVNT_LOG
WHERE EVNT_OCCR_TIME >= ? AND EVNT_OCCR_TIME <= ?
ORDER BY EVNT_OCCR_TIME DESC
```

---

> 다음 문서: [02-collection-schedule.md](02-collection-schedule.md)


<div class="pagebreak"></div>

## 5.2 실시간 현황

> **핵심 기능**: 수집 작업의 핵심 지표를 카드 형태로 요약하여 한눈에 현황을 파악하고, 표/카드 뷰 전환 및 다양한 표시 옵션을 제공합니다.

---

### 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → 카드 요약
- **URL**: `/card_summary`
- **필요 권한**: `card_summary`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

### 2. 화면 구성

#### 2.1 전체 화면 구조

<img src="manual_images/card-summary-full.png" width="800" alt="카드 요약 전체 화면">

#### 2.2 각 영역 상세 설명

##### ① 수집 요청서 양식 다운로드 버튼

| 요소 | 설명 |
|------|------|
| 버튼 | 우측 상단 `수집 요청서 양식 다운로드` |
| 기능 | Excel 파일(.xlsx) 다운로드 |
| 스타일 | 녹색 배경(#10b981), 흰색 글자 |

##### ② 카드 요약 표시 옵션 (`#cardContainer` 상단)

| 기능 | 요소 | 설명 |
|------|------|------|
| 뷰 모드 토글 | `#viewModeToggle` | 표(테이블) ↔ 콩(카드) 뷰 전환 |
| 검색 | `#cardSearchInput` | Job ID, 데이터명, 상태 등으로 실시간 필터링 |
| 표시 모드 | `#display-mode-selector` | 명칭 / 코드 / 명칭+코드 / 설명 중 선택 |

**표시 모드 상세:**
| 모드 | 값 | 표시 내용 |
|------|-----|----------|
| 명칭 | `name` | Job의 한글 이름 (`cd_nm`)만 표시 |
| 코드 | `code` | Job ID (예: CD101)만 표시 |
| 명칭+코드 | `both` | `코드: 명칭` 형태로 표시 (예: CD101: 기상청예보) |
| 설명 | `desc` | Job 상세 설명 표시 |

##### ③ 카드 컨테이너 (`#cardContainer`)

**카드 구조:**
```
┌──────────────────┐
│ [CD101]          │  ← Job ID (표시 모드에 따라 코드/명칭/둘 다)
│ 기상청 예보 데이터 │  ← 데이터명
│                  │
│ 성공률: 95.5%    │  ← 기간별 성공률
│ 연속실패: 0회    │  ← 연속 실패 횟수
│ 상태: 정상       │  ← 상태 (정상/경고/위험)
│                  │
│ [상세 보기]      │  ← 상세 정보 링크 (있는 경우)
└──────────────────┘
```

**카드 상태별 스타일:**
| 상태 | 조건 | 색상 |
|------|------|------|
| 정상 | 성공률 ≥ 임계값, 연속실패 < 경고 임계값 | 녹색 계열 |
| 경고 | 성공률 < 임계값 또는 연속실패 ≥ 경고 임계값 | 노란색/주황색 계열 |
| 위험 | 연속실패 ≥ 위험 임계값 | 빨간색 계열 |

**데이터 출처:**
- API: `GET /api/card_summary`
- Service: `CardSummaryService.get_summary()`
- Mapper: `CardSummaryMapper`
- SQL: `sql/card_summary/card_summary_sql.py`

---

### 3. 데이터 흐름 및 처리 로직

#### 3.1 전체 데이터 흐름도

```
[사용자] → [card_summary.html] → [card_summary.js]
                                            ↓
                        [fetch('/api/card_summary')]
                                            ↓
                        [card_summary_routes.py]
                                            ↓
                        [CardSummaryService.get_summary()]
                                            ↓
        ┌───────────────────────────────────┼───────────────────────────────────┐
        ↓                                   ↓                                   ↓
[CardSummaryMapper]            [UserMapper]                    [MngrSettMapper]
        ↓                                   ↓                                   ↓
[sql/card_summary/*.sql]       [data_permissions 조회]         [설정 정보]
        ↓                                   ↓                                   ↓
[TB_CON_HIST] 집계            [TB_USER_DATA_PERM_AUTH_CTRL]    [TB_MNGR_SETT]
        └───────────────────────────────────┼───────────────────────────────────┘
                                            ↓
                         [JSON 응답] → [카드 렌더링]
```

#### 3.2 주요 지표 계산

**성공률:**
```
성공률 = (성공 건수 / (성공 건수 + 실패 건수 + 미수집 건수)) × 100
```

**연속 실패:**
```
최근 10회 실행 중 CD902(장애) 또는 CD903(미수집) 상태인 횟수
```

**상태 결정:**
- `tb_mngr_sett`의 임계값 기준
- 성공률 임계값 미만 또는 연속 실패 경고 임계값 이상 → 경고
- 연속 실패 위험 임계값 이상 → 위험

---

### 4. 조작 방법

#### 4.1 뷰 모드 전환

**조작 절차:**
1. `표` 또는 `콩` 토글 클릭

**확인 방법:**
- 카드 형태 ↔ 테이블 형태로 전환됨
- 카드: 직사각형 카드 그리드 배치
- 표: 행/열 테이블 배치

#### 4.2 검색

**조작 절차:**
1. 검색 입력 필드에 텍스트 입력

**확인 방법:**
- 입력 즉시 카드/행이 필터링됨
- Job ID, 데이터명, 상태 등 모든 텍스트 필드 검색

#### 4.3 표시 모드 변경

**조작 절차:**
1. 라디오 버튼 그룹에서 `명칭` / `코드` / `명칭+코드` / `설명` 선택

**확인 방법:**
- 카드/표의 제목 영역이 변경됨
- 예: "CD101" → "기상청예보" → "CD101: 기상청예보"

---

### 5. 모니터링 체크리스트

- [ ] **위험 상태 카드**(빨간색)가 있는지 확인
- [ ] **경고 상태 카드**(노란색)가 과도하게 많지 않은지 확인
- [ ] **성공률**이 전반적으로 90% 이상인지 확인
- [ ] **연속 실패**가 3회 이상인 Job이 있는지 확인
- [ ] **검색**으로 특정 Job을 쉽게 찾을 수 있는지 확인

---

### 6. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 카드가 비어있음 | 데이터 수집 기록 없음 | 날짜 범위 확대 또는 데이터 수집 에이전트 상태 확인 |
| 특정 Job이 보이지 않음 | 사용자 데이터 권한 없음 | 관리자에게 데이터 접근 권한 요청 |
| 성공률이 0%로 표시됨 | 해당 기간 내 수집 이력 없음 | 데이터 수집 스케줄/에이전트 상태 확인 |
| 상태가 모두 위험으로 표시됨 | 임계값 설정 부적절 | 관리자 설정에서 성공률/연속실패 임계값 조정 |
| 검색 결과 없음 | 검색어와 일치하는 Job 없음 | 검색어 변경 또는 전체 목록 확인 |

---

### 7. 관련 DB 테이블 및 쿼리

#### 7.1 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `tb_con_hist` | 수집 실행 이력 (성공/실패 상태, 시간) |
| `tb_con_mst` | 수집 작업 마스터 (Job ID, 데이터명) |
| `tb_mngr_sett` | 관리자 설정 (성공률 임계값, 연속실패 임계값) |
| `tb_user_data_perm_auth_ctrl` | 사용자별 데이터 접근 권한 |

#### 7.2 카드 요약 조회 API

```
GET /api/card_summary
```

**응답 구조:**
```json
[
  {
    "job_id": "CD101",
    "cd_nm": "기상청예보",
    "success_rate": 95.5,
    "fail_streak": 0,
    "status": "normal",
    "color": "#28a745"
  }
]
```

---

> 다음 문서: [07-mapping.md](07-mapping.md)


<div class="pagebreak"></div>

## 5.3 차트분석

> **핵심 기능**: 선택한 기간과 Job ID를 기준으로 수집 성공률 추이와 장애 코드별 비율을 차트로 시각화하여 분석합니다.

---

### 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → 차트 분석
- **URL**: `/chart_analysis`
- **필요 권한**: `analysis`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

### 2. 화면 구성

#### 2.1 전체 화면 구조

<img src="manual_images/chart-analysis-full.png" width="800" alt="차트 분석 전체 화면">

#### 2.2 각 영역 상세 설명

##### ① 날짜 선택 카드 (`#date-selection-card-chart`)

| 요소 | ID | 설명 |
|------|-----|------|
| 시작일 | `#startDate` | 조회 시작 날짜 |
| 종료일 | `#endDate` | 조회 종료 날짜 |
| 실 존재 데이터 기간 | `#chart-min-date` ~ `#chart-max-date` | DB에 실제로 존재하는 데이터의 최소/최대 날짜 |

**동작 로직:**
- 페이지 진입 시 자동으로 올해 1월 1일 ~ 오늘(KST 기준)로 설정됩니다.
- 날짜 변경 시 차트 데이터가 자동으로 갱신됩니다.
- `collapsible_controls.html` 공통 모듈을 사용하여 접이식 동작을 제공합니다.

##### ② 차트 표시 옵션 카드 (`#chart-options-card`)

| 옵션 | 값 | 설명 |
|------|-----|------|
| 라벨 표시 방식 | `name` | Job의 한글 이름 (`cd_nm`) 표시 |
| 라벨 표시 방식 | `code` | Job ID (예: CD101) 표시 |

**동작 로직:**
- 라디오 버튼 변경 시 모든 차트의 범례와 툴팁 라벨이 즉시 변경됩니다.
- `chart_analysis.js`의 `labelDisplayType` 이벤트 리스너에서 처리합니다.

##### ③ Job ID 선택 카드 (`#job-selection-card-chart`)

| 요소 | 설명 |
|------|------|
| 모두 선택 버튼 | 모든 Job ID 체크박스 선택 |
| 모두 해제 버튼 | 모든 Job ID 체크박스 해제 |
| 개별 체크박스 | `#jobCheckboxes` 낸 각 Job ID별 체크박스 |

**동작 로직:**
- 페이지 진입 시 `tb_con_mst`의 모든 Job ID를 체크박스로 로드합니다.
- 사용자 권한(`data_permissions`)에 따라 표시되는 Job이 필터링됩니다.
- 체크박스 변경 시 차트 데이터가 자동으로 갱신됩니다.

<img src="manual_images/chart-analysis-filter-panel.png" width="800" alt="Job ID 선택 및 필터 패널">

##### ④ 기간별 수집 성공률 차트 (`#success-rate-chart-card`)

| 요소 | 설명 |
|------|------|
| 차트 유형 선택 | 라인 차트 / 바 차트 전환 |
| 차트 캔버스 | `#successRateChart` (Chart.js) |
| 범례 영역 | `#successRateLegend` (세로 스크롤 지원, 최대 높이 180px) |

**데이터 출처:**
- API: `GET /api/chart_data` (또는 `/api/analysis/chart`)
- Service: `AnalysisService.get_dynamic_chart_data()`
- Mapper: `AnalysisMapper.get_dynamic_chart_data()`
- SQL: `sql/analytics/analytics_sql.py`

**차트 데이터 구조:**
```json
[
  {
    "job_id": "CD101",
    "date": "2025-01",
    "success_rate": 95.5,
    "success_count": 100,
    "fail_count": 5,
    "total_count": 105
  }
]
```

**색상 및 스타일:**
- 각 Job ID별 고유 색상 자동 할당
- 라인 차트: `tension: 0.3` (부드러운 곡선)
- 바 차트: `barPercentage: 0.7`
- 범례: 하단 세로 스크롤, 가로 배치 (`flex-wrap: wrap`)

##### ⑤ 장애 코드별 비율 차트 (`#trouble-code-chart-card`)

| 요소 | 설명 |
|------|------|
| 차트 유형 선택 | 도넛 차트 / 바 차트 전환 |
| 차트 캔버스 | `#troublePieChart` (Chart.js) |

**데이터 출처:**
- `tb_con_hist`의 `status` 컬럼 집계
- 선택된 기간 및 Job ID 필터 적용

**표시 데이터:**
| 상태 코드 | 의미 | 색상 |
|-----------|------|------|
| CD901 | 정상 수집 | 녹색 계열 |
| CD902 | 장애 발생 | 빨간색 계열 |
| CD903 | 미수집 | 주황색 계열 |
| CD904 | 수집중 | 노란색 계열 |
| 기타 | 기타 상태 | 회색 계열 |

---

### 3. 데이터 흐름 및 처리 로직

#### 3.1 전체 데이터 흐름도

```
[사용자] → [chart_analysis.html] → [chart_analysis.js]
                                              ↓
                          [fetch('/api/chart_data')]
                                              ↓
                          [analysis_routes.py]
                                              ↓
                          [AnalysisService.get_dynamic_chart_data()]
                                              ↓
          ┌───────────────────────────────────┼───────────────────────────────────┐
          ↓                                   ↓                                   ↓
 [AnalysisMapper]              [UserMapper]                    [MstMapper]
          ↓                                   ↓                                   ↓
 [sql/analytics/analytics_sql.py]  [data_permissions 조회]         [Job ID 목록]
          ↓                                   ↓                                   ↓
 [TB_CON_HIST] 집계            [TB_USER_DATA_PERM_AUTH_CTRL]    [TB_CON_MST]
          └───────────────────────────────────┼───────────────────────────────────┘
                                              ↓
                           [JSON 응답] → [Chart.js 렌더링]
```

#### 3.2 성공률 계산 로직

```
성공률 = (성공 건수 / (성공 건수 + 실패 건수 + 미수집 건수)) × 100
```
- `CD904`(진행중)은 분모에 포함되지 않음
- 기간별(월간/주간/일간) 그룹화는 SQL의 `GROUP BY`로 처리

#### 3.3 권한 필터링

**관리자(`mngr_sett`):**
- 모든 Job ID 조회 가능
- 요청된 `job_ids` 파라미터 그대로 사용

**일반 사용자:**
- `TB_USER_DATA_PERM_AUTH_CTRL`에서 허용된 Job ID만 조회
- 요청된 `job_ids`와 교집합(intersection)으로 필터링

---

### 4. 조작 방법

#### 4.1 날짜 범위 변경

**조작 절차:**
1. `시작일` 입력 필드 클릭 → 날짜 선택
2. `종료일` 입력 필드 클릭 → 날짜 선택
3. 차트가 자동으로 갱신됨

**확인 방법:**
- 차트의 X축(날짜 범위)이 변경되는지 확인
- 데이터 포인트 개수가 변경되는지 확인

#### 4.2 Job ID 필터링

**조작 절차:**
1. `Job ID 선택` 카드 펼치기 (헤더 클릭)
2. 체크박스로 표시할 Job ID 선택/해제
3. 또는 `모두 선택` / `모두 해제` 버튼 사용

**확인 방법:**
- 차트에 표시되는 선/막대 개수가 변경됨
- 범례 목록이 변경됨

#### 4.3 차트 유형 전환

**조작 절차:**
1. `기간별 수집 성공률` 또는 `장애 코드별 비율` 카드 펼치기
2. `라인 차트` / `바 차트` 또는 `도넛 차트` / `바 차트` 라디오 버튼 선택

**확인 방법:**
- 차트가 즉시 해당 유형으로 변경됨
- 라인 차트 → 선 그래프, 바 차트 → 막대 그래프, 도넛 차트 → 원형 그래프

#### 4.4 라벨 표시 방식 변경

**조작 절차:**
1. `차트 표시 옵션` 카드 펼치기
2. `명칭` 또는 `코드` 라디오 버튼 선택

**확인 방법:**
- 차트 범례의 Job 이름이 변경됨 (예: "CD101" → "기상청예보")
- 툴팁의 라벨도 동일하게 변경됨

---

### 5. 모니터링 체크리스트

- [ ] **성공률 추이**가 안정적인지 확인 (급격한 하락 여부)
- [ ] **특정 Job**의 성공률이 지속적으로 낮은지 확인
- [ ] **장애 코드 비율**에서 CD902(장애) 비율이 높지 않은지 확인
- [ ] **데이터 기간**이 충분히 넓은지 확인 (최소 3개월 이상 권장)
- [ ] **Job ID 선택**이 너무 많아 차트가 복잡하지 않은지 확인
- [ ] **범례**가 정상적으로 표시되는지 확인 (세로 스크롤 필요 시)

---

### 6. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 차트가 비어있음 | 선택된 Job ID 없음 또는 데이터 없음 | Job ID 선택 확인, 날짜 범위 확대 |
| 성공률이 0%로 표시됨 | 해당 기간 내 수집 이력 없음 | 데이터 수집 스케줄/에이전트 상태 확인 |
| 특정 Job이 보이지 않음 | 사용자 데이터 권한 없음 | 관리자에게 데이터 접근 권한 요청 |
| 범례가 짤려서 보임 | 선택 Job ID가 너무 많음 | 일부 Job만 선택하거나 차트 카드 확대 |
| 차트 로딩이 느림 | 조회 기간이 너무 김 | 시작일/종료일 범위를 좁혀서 조회 |
| 장애 코드가 부정확함 | 상태 코드 분류 오류 | `tb_sts_cd_mst`의 성공/실패 코드 설정 확인 |

---

### 7. 관련 DB 테이블 및 쿼리

#### 7.1 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `tb_con_hist` | 수집 실행 이력 (성공/실패 상태, 시간) |
| `tb_con_mst` | 수집 작업 마스터 (Job ID, 데이터명) |
| `tb_sts_cd_mst` | 상태 코드 마스터 (CD901~CD904 정의) |
| `tb_user_data_perm_auth_ctrl` | 사용자별 데이터 접근 권한 |

#### 7.2 차트 데이터 조회 API

```
GET /api/chart_data?start_date=2025-01-01&end_date=2025-12-31&job_ids=CD101,CD102
```

**응답 구조:**
```json
[
  {
    "job_id": "CD101",
    "cd_nm": "기상청예보",
    "date": "2025-01",
    "success_rate": 95.5,
    "success_count": 100,
    "fail_count": 5,
    "no_data_count": 0,
    "total_count": 105
  }
]
```

---

> 다음 문서: [04-data-analysis.md](04-data-analysis.md)


<div class="pagebreak"></div>

## 5.4 데이터분석

> **핵심 기능**: 수집 데이터의 소요 시간, 성공률, 연속 실패 등 다양한 지표를 분석하여 데이터 품질과 수집 안정성을 평가합니다.

---

### 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → 데이터 분석
- **URL**: `/data_analysis`
- **필요 권한**: `analysis`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

### 2. 화면 구성

#### 2.1 전체 화면 구조

<img src="manual_images/data-analysis-full.png" width="800" alt="데이터 분석 전체 화면">

#### 2.2 각 영역 상세 설명

##### ① 필터 카드 (`#filter-card`)

| 요소 | ID | 설명 |
|------|-----|------|
| 시작일 | `#startDate` | 조회 시작 날짜 |
| 종료일 | `#endDate` | 조회 종료 날짜 |
| Job ID | `#jobIdSelect` | 특정 Job ID 필터 (기본: 전체) |
| 장애코드 | `#errorCodeSelect` | 특정 장애 코드 필터 (기본: 전체) |
| 실 존재 데이터 기간 | `#data-min-date` ~ `#data-max-date` | DB에 실제로 존재하는 데이터의 최소/최대 날짜 |

**동작 로직:**
- 페이지 진입 시 자동으로 올해 1월 1일 ~ 오늘(KST 기준)로 설정됩니다.
- 필터 변경 시 상단 요약 카드와 하단 테이블이 자동으로 갱신됩니다.
- Job ID와 장애코드 드롭다운은 `tb_con_mst` 및 `tb_sts_cd_mst`에서 동적으로 로드됩니다.

##### ② 요약 카드 (3개)

| 카드 | ID | 내용 | 색상 |
|------|-----|------|------|
| 최대/최소 소요 시간 | `#durationRangeCard` | 선택 기간 내 수집 소요 시간의 최대/최소값 | 파란색 |
| 실패 호출 건수 | `#failCountCard` | 상태 코드가 CD902(장애)인 건수 | 빨간색 |
| 중단 횟수 | `#stopCountCard` | 수집이 중단된 건수 | 볼색 |

**계산 로직:**
- 최대/최소 소요 시간: `MAX(end_dt - start_dt)`, `MIN(end_dt - start_dt)`
- 실패 호출 건수: `COUNT(*) WHERE status = 'CD902'`
- 중단 횟수: `COUNT(*) WHERE status IN ('CD903', 'CD905')` (미수집, 중단)

##### ③ Job ID 상세정보 카드 (`#job-info-card`)

| 기능 | 설명 |
|------|------|
| 검색 | `#jobInfoSearch` - Job ID 또는 한글명으로 실시간 필터링 |
| 행 수 | `#jobInfoPageSize` - 5/10/20/50/100개 선택 |
| 테이블 | `#jobInfoTable` - Job ID, 데이터명, 주기(cron), 설명 |
| 페이징 | `#jobInfoPagination` - 페이지 이동 버튼 |

**데이터 출처:**
- `tb_con_mst` - Job 기본 정보
- `tb_mngr_sett` - 추가 설정 정보 (있는 경우)

##### ④ 수집 및 가공 데이터 카드 (`#raw-data-card`)

| 컬럼 | 데이터 | 설명 |
|------|--------|------|
| 날짜 | `start_dt` | 수집 시작 날짜 (KST) |
| Job ID | `job_id` | 수집 작업 ID |
| 장애코드 | `status` | 상태 코드 (CD901~CD904 등) |
| 요일 | `DAYOFWEEK(start_dt)` | 일~토 요일 표시 |
| 수집시간(hr) | `end_dt - start_dt` | 실제 소요 시간 (시간 단위) |
| 예측 수집시간(hr) | `predicted_duration` | ML 또는 통계 기반 예측 소요 시간 |
| 완전성(%) | `completeness` | (실제 수집 건수 / 예상 건수) × 100 |
| 평균소요시간(hr) | `avg_duration` | 전체 기간 평균 소요 시간 |
| 최대/최소 제외 평균(hr) | `trimmed_avg` | 최대/최소값 제외 평균 |
| 최근3회평균(hr) | `recent_3avg` | 최근 3회 실행의 평균 소요 시간 |
| 연속실패 | `fail_streak` | 현재까지 연속 실패 횟수 |
| 이상치 | `is_outlier` | 평균 대비 2표준편차 이상 여부 |
| 성공률변화(%) | `success_rate_change` | 전 기간 대비 성공률 변화량 |
| 누적수집 | `cumulative_count` | 해당 Job의 누적 수집 건수 |

**검색 및 필터링:**
- **검색 (`#rawDataSearch`)**: Job ID 또는 장애코드로 실시간 필터링
- **행 수 (`#rawDataPageSize`)**: 10/20/50/100개 선택
- **페이징 (`#rawPagination`)**: 페이지 이동

**데이터 출처:**
- API: `GET /api/data_analysis` (또는 `/api/analysis/data`)
- Service: `AnalysisService.get_dynamic_chart_data()` 또는 별도 분석 메소드
- Mapper: `AnalysisMapper`
- SQL: `sql/analytics/analytics_sql.py`

---

### 3. 데이터 흐름 및 처리 로직

#### 3.1 전체 데이터 흐름도

```
[사용자] → [data_analysis.html] → [data_analysis.js]
                                            ↓
                        [fetch('/api/data_analysis')]
                                            ↓
                        [analysis_routes.py]
                                            ↓
                        [AnalysisService]
                                            ↓
        ┌───────────────────────────────────┼───────────────────────────────────┐
        ↓                                   ↓                                   ↓
[AnalysisMapper]              [UserMapper]                    [MstMapper]
        ↓                                   ↓                                   ↓
[sql/analytics/analytics_sql.py]  [data_permissions 조회]         [Job ID 목록]
        ↓                                   ↓                                   ↓
[TB_CON_HIST] 집계            [TB_USER_DATA_PERM_AUTH_CTRL]    [TB_CON_MST]
        └───────────────────────────────────┼───────────────────────────────────┘
                                            ↓
                         [JSON 응답] → [테이블 렌더링]
```

#### 3.2 주요 지표 계산 로직

**소요 시간 (Duration):**
```
수집시간(hr) = (end_dt - start_dt)의 시간 단위 변환
```

**완전성 (Completeness):**
```
완전성(%) = (실제 수집 건수 / 예상 수집 건수) × 100
```

**최대/최소 제외 평균 (Trimmed Average):**
```
값이 3개 이상: (전체 합계 - 최대값 - 최소값) / (개수 - 2)
값이 2개 이하: 일반 평균
```

**최근 3회 평균 (Recent 3 Average):**
```
최근 3회 실행의 소요 시간 산술평균
```

**연속 실패 (Fail Streak):**
```
현재까지 연속된 CD902(장애) 또는 CD903(미수집) 횟수
```

**이상치 (Outlier):**
```
|현재값 - 평균값| > 2 × 표준편차 → 이상치(True)
```

**성공률 변화:**
```
성공률변화(%) = (현재 기간 성공률 - 이전 기간 성공률)
```

---

### 4. 조작 방법

#### 4.1 필터 변경하여 조회

**조작 절차:**
1. `시작일` / `종료일` 입력 필드에서 날짜 선택
2. `Job ID` 또는 `장애코드` 드롭다운에서 선택 (선택 사항)
3. 상단 요약 카드와 하단 테이블이 자동 갱신됨

**확인 방법:**
- 요약 카드의 숫자가 변경되는지 확인
- 테이블 데이터가 갱신되는지 확인

#### 4.2 Job ID 상세정보 조회

**조작 절차:**
1. `Job ID 상세정보` 카드 펼치기 (헤더 클릭)
2. 검색어 입력 또는 행 수 변경
3. 페이지네이션으로 추가 항목 확인

#### 4.3 수집 데이터 테이블 조회

**조작 절차:**
1. `수집 및 가공 데이터` 카드 펼치기
2. 검색어 입력 (Job ID 또는 장애코드)
3. 행 수 변경 (10/20/50/100개)
4. 페이지네이션으로 이동

**확인 방법:**
- 총 건수 표시 (`총 1,234건`)
- 각 컬럼 값이 정상적으로 표시되는지 확인
- 이상치 표시 여부 확인

---

### 5. 모니터링 체크리스트

- [ ] **최대/최소 소요 시간**이 예상 범위 내인지 확인
- [ ] **실패 호출 건수**가 급증하지 않는지 확인
- [ ] **중단 횟수**가 0에 가까운지 확인
- [ ] **연속 실패**가 3회 이상인 Job이 있는지 확인
- [ ] **이상치**가 발생한 Job이 있는지 확인
- [ ] **성공률 변화**가 큰 폭으로 하락한 Job이 있는지 확인
- [ ] **완전성**이 100%에 가까운지 확인

---

### 6. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 테이블이 비어있음 | 날짜 범위 내 데이터 없음 | 날짜 범위 확대 또는 필터 초기화 |
| 소요 시간이 0으로 표시됨 | `end_dt`가 `start_dt`와 동일 | 데이터 품질 문제, `tb_con_hist` 확인 |
| 이상치가 너무 많음 | 데이터 품질 저하 또는 기준값 부적절 | 관리자 설정에서 이상치 임계값 조정 |
| 예측 수집시간이 부정확함 | 예측 모델 미학습 또는 데이터 부족 | 충분한 학습 데이터 확보 후 모델 재학습 |
| 완전성이 낮음 | 데이터 유실 또는 수집 누락 | 수집 에이전트 로그 확인 |
| 특정 Job이 보이지 않음 | 사용자 데이터 권한 없음 | 관리자에게 데이터 접근 권한 요청 |

---

### 7. 관련 DB 테이블 및 쿼리

#### 7.1 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `tb_con_hist` | 수집 실행 이력 (소요 시간, 상태, 시간) |
| `tb_con_mst` | 수집 작업 마스터 (Job ID, 데이터명, 주기) |
| `tb_sts_cd_mst` | 상태 코드 마스터 (CD901~CD904 정의) |
| `tb_user_data_perm_auth_ctrl` | 사용자별 데이터 접근 권한 |

#### 7.2 데이터 분석 조회 API

```
GET /api/data_analysis?start_date=2025-01-01&end_date=2025-12-31&job_id=CD101&error_code=CD902
```

**응답 구조:**
```json
[
  {
    "date": "2025-01-15",
    "job_id": "CD101",
    "status": "CD901",
    "day_of_week": "월",
    "duration": 2.5,
    "predicted_duration": 2.3,
    "completeness": 98.5,
    "avg_duration": 2.4,
    "trimmed_avg": 2.35,
    "recent_3avg": 2.45,
    "fail_streak": 0,
    "is_outlier": false,
    "success_rate_change": 0.5,
    "cumulative_count": 1250
  }
]
```

---

> 다음 문서: [05-data-spec.md](05-data-spec.md)


<div class="pagebreak"></div>

## 5.5 수집일정

> **핵심 기능**: 주간/월간 단위로 데이터 수집 작업의 예정 및 실제 실행 상태를 히트맵 형태로 모니터링하고, 그룹별/Job별 상세 현황과 메모를 관리합니다.

---

### 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → 수집 스케줄
- **URL**: `/collection_schedule`
- **필요 권한**: `collection_schedule`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

### 2. 화면 구성

#### 2.1 전체 화면 구조

<img src="manual_images/collection-schedule-full.png" width="800" alt="수집 스케줄 전체 화면">

#### 2.2 각 영역 상세 설명

##### ① 히트맵 컨테이너 (`.heatmap-container`)

| 요소 | 선택자 | 설명 |
|------|--------|------|
| 제목 | `.card-title` | "주간 수집 현황 히트맵" 또는 "월간 수집 현황 히트맵" |
| 요약 통계 | `.summary-stats` | 전체 예정 / 성공 / 실패 / 미수집 건수 |
| 캘린더 그리드 | `#calendar-grid` | 7열(주간) 또는 N열(월간) 그리드 |
| 설정 패널 | `#settings-container` | 그룹화 임계값, 색상 기준 (기본 접힘) |

##### ② 컨트롤 영역 (`.controls`)

| 요소 | ID | 설명 |
|------|-----|------|
| 주간 버튼 | `#weekly-btn` | 주간 뷰로 전환 (기본값) |
| 월간 버튼 | `#monthly-btn` | 월간 뷰로 전환 |
| 이전 주 | `#prev-week-btn` | 한 주 이전으로 이동 |
| 다음 주 | `#next-week-btn` | 한 주 이후로 이동 |
| 이전 달 | `#prev-month-btn` | 한 달 이전으로 이동 |
| 다음 달 | `#next-month-btn` | 한 달 이후로 이동 |

**동작 로직:**
- 버튼 클릭 시 `week_offset` 또는 `month_offset` 값이 증감
- `/api/collection_schedule?week_offset=N` API 호출
- 응답 데이터로 캘린더 그리드 재렌더링

<img src="manual_images/collection-schedule-controls.png" width="800" alt="컨트롤 영역">

##### ③ 캘린더 그리드 (`#calendar-grid`)

**Day 열 구조:**
```
┌──────────────┐
│ 월 01/13     │  ← .day-header (요일 + 날짜)
├──────────────┤
│ [CD101]      │  ← .job-pill (단일 Job)
│ [CD102]      │     상태별 색상: 초록(성공), 빨강(실패), 주황(미수집)
│ [그룹A ▶]    │  ← .group-pill-summary (그룹화된 Job)
│  진행률 ████ │     마우스 오버 시 팝업으로 상세 Job 목록 표시
└──────────────┘
```

**Job 상태별 색상:**
| 상태 | 클래스 | 색상 | 의미 |
|------|--------|------|------|
| 성공 | `.status-success` | 배경: #dcfce7, 글자: #166534 | 수집 완료 |
| 실패 | `.status-fail` | 배경: #fee2e2, 글자: #991b1b | 수집 실패 |
| 미수집 | `.status-nodata` | 배경: #ffedd5, 글자: #9a3412 | 데이터 없음 |
| 진행중 | `.status-inprogress` | 배경: #fef9c3, 글자: #854d0e | 수집 진행 중 |
| 예정 | `.status-scheduled` | 배경: #e5e7eb, 글자: #4b5563 | 아직 실행 전 |

<img src="manual_images/collection-schedule-calendar.png" width="800" alt="캘린더 그리드">

##### ④ 그룹 팝업 (`.popup`)

<img src="manual_images/collection-schedule-group-popup.png" width="600" alt="그룹 팝업">

**표시 조건:** 그룹화된 Job 셀 클릭
**표시 내용:**
- 그룹 내 개별 Job 목록 (페이징 지원)
- 각 Job의 상태별 색상 유지
- 페이지네이션: ← 1 / 3 →

##### ⑤ 표시 모드 선택 (`#display-mode-selector`)

| 모드 | 값 | 표시 내용 |
|------|-----|----------|
| 명칭 | `name` | Job의 한글 이름 (`cd_nm`) |
| 코드 | `code` | Job ID (예: CD101) |
| 설명 | `desc` | Job 상세 설명 |

##### ⑥ 그룹 메모 팝업 (`#memo-popup`)

<img src="manual_images/collection-schedule-memo-popup.png" width="800" alt="그룹 메모 팝업">

**표시 조건:** 그룹 셀의 `+` 버튼 클릭 (관리자만)
**기능:**
- 메모 작성/수정/삭제
- 작성자, 작성일시 표시
- 그룹 ID, 날짜 자동 매핑

##### ⑦ 가이드 버튼 (`#guide-toggle-btn`)

**위치:** 화면 우측 하단 고정 (원형 `?` 버튼)
**표시 내용:**
- 그룹 항목 색상 가이드 (상태별 색상 코드)
- 상세 데이터 상태 가이드

<img src="manual_images/collection-schedule-settings-expanded.png" width="800" alt="설정 패널 (펼침)">

---

### 3. 데이터 흐름 및 처리 로직

#### 3.1 전체 데이터 흐름도

```
[사용자] → [collection_schedule.html] → [collection_schedule.js]
                                              ↓
                           [fetch('/api/collection_schedule')]
                                              ↓
                           [collection_schedule_routes.py]
                                              ↓
                           [CollectionScheduleService.get_schedule_only()]
                                              ↓
          ┌───────────────────────────────────┼───────────────────────────────────┐
          ↓                                   ↓                                   ↓
 [_generate_scheduled_tasks()]    [_fetch_and_group_history_data()]    [MngrSettService]
          ↓                                   ↓                                   ↓
 [cron + tb_con_mst]                [DashboardMapper]                   [tb_mngr_sett]
          ↓                                   ↓                                   ↓
 예정된 스케줄 생성                   TB_CON_HIST 조회 (실제 실행 기록)    그룹화 임계값
          └───────────────────────────────────┼───────────────────────────────────┘
                                              ↓
                           [_match_schedule_with_history()]
                                              ↓
                           날짜별 순차 매칭 → 상태 결정
                                              ↓
                           [JSON 응답] → [캘린더 그리드 렌더링]
```

#### 3.2 주요 처리 단계

**1단계: 스케줄 생성 (`_generate_scheduled_tasks`)**
- `tb_con_mst`의 cron 표현식 기반
- 시작일~종료일 범위 내 예정된 실행 시간 계산
- 사용자 권한에 따른 Job 필터링

**2단계: 히스토리 조회 (`_fetch_and_group_history_data`)**
- `tb_con_hist`에서 실제 수집 기록 조회
- KST 기준 날짜로 그룹화 (`date_key + job_id`)
- 상태 코드: CD901(성공), CD902(실패), CD903(미수집), CD904(진행중)

**3단계: 매칭 (`_match_schedule_with_history`)**
- 날짜별로 스케줄과 히스토리를 시간순 정렬
- 순차 매칭: 예정 시간과 실제 실행 시간 비교
- 5분 허용 시간(Grace Period) 내 실행 → 성공으로 처리
- 자정 경계 문제 해결: 날짜 비교 제거, 시간 차이만 비교

**4단계: 그룹화**
- 관리자 설정의 `grouping_threshold` 기준
- 일정 개수 이상인 Job ID 접두사로 그룹화
- 그룹 진행률 = (성공+진행중) / 전체 × 100

---

### 4. 조작 방법

#### 4.1 주간/월간 뷰 전환

**조작 절차:**
1. `주간` 또는 `월간` 버튼 클릭
2. 캘린더 그리드가 즉시 전환됨

**확인 방법:**
- 버튼 활성화 상태(파란색) 변경
- 제목이 "주간 수집 현황 히트맵" → "월간 수집 현황 히트맵"으로 변경
- 캘린더 열 개수 변경 (7열 → 월 전체)

#### 4.2 날짜 이동

**조작 절차:**
1. `← 지난 주` / `다음 주 →` 버튼 클릭
2. 또는 `← 지난달` / `다음달 →` 버튼 클릭

**확인 방법:**
- Day 헤더의 날짜가 변경됨
- 캘린더 그리드 데이터 갱신

#### 4.3 표시 모드 변경

**조작 절차:**
1. 하단 `표시:` 라디오 버튼 그룹에서 선택
2. 명칭 / 코드 / 설명 중 선택

**확인 방법:**
- Job 셀의 텍스트가 즉시 변경됨

#### 4.4 그룹 상세 보기

**조작 절차:**
1. 그룹화된 셀(예: `[그룹A ▶]`)에 마우스 오버
2. 팝업으로 개별 Job 목록 표시
3. 팝업 내 페이지네이션으로 추가 Job 확인

#### 4.5 그룹 메모 작성 (관리자 전용)

**조작 절차:**
1. 그룹 셀 더블클릭
2. 메모 작성 팝업 표시
3. 텍스트 입력 후 `저장` 버튼 클릭

**확인 방법:**
- 저장 완료 시 토스트 메시지 "메모가 저장되었습니다"
- 메모가 있는 그룹 셀에 시각적 표시

#### 4.6 수집 요청서 양식 다운로드

**조작 절차:**
1. 우측 상단 `수집 요청서 양식 다운로드` 버튼 클릭
2. Excel 파일(.xlsx) 다운로드

---

### 5. 모니터링 체크리스트

- [ ] **전체 예정 건수**가 0이 아닌지 확인
- [ ] **성공률**이 90% 이상인지 확인
- [ ] **미수집 건수**가 급증하지 않는지 확인
- [ ] **특정 Job/그룹**이 연속 실패하는지 확인
- [ ] **그룹 메모**가 최신 상태인지 확인
- [ ] **캘린더 이동** 시 데이터가 정상 로드되는지 확인

---

### 6. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 히트맵이 비어있음 | 데이터 수집 기록 없음 | 날짜 범위 확대 또는 데이터 수집 에이전트 상태 확인 |
| Job이 표시되지 않음 | 사용자 데이터 권한 없음 | 관리자에게 데이터 접근 권한 요청 |
| 그룹 진행률이 이상함 | 그룹화 임계값 부적절 | 관리자 설정에서 `grouping_threshold` 조정 |
| 미수집이 과다함 | 수집 에이전트 장애 또는 스케줄 미등록 | `tb_con_mst`의 cron 설정 및 에이전트 로그 확인 |
| 팝업이 표시되지 않음 | 그룹화되지 않은 단일 Job | 단일 Job은 팝업 없이 직접 상태 표시 |
| 메모 저장 실패 | 관리자 권한 없음 | 관리자 계정으로 로그인 확인 |

---

### 7. 관련 DB 테이블 및 쿼리

#### 7.1 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `tb_con_hist` | 수집 실행 이력 (실제 성공/실패 상태) |
| `tb_con_mst` | 수집 작업 마스터 (Job ID, cron 주기, 그룹 정보) |
| `tb_mngr_sett` | 관리자 설정 (그룹화 임계값, 색상 기준) |
| `tb_grp_memo` | 그룹 메모 (그룹 ID, 날짜, 내용, 작성자) |
| `tb_user_data_perm_auth_ctrl` | 사용자별 데이터 접근 권한 |

#### 7.2 스케줄 조회 API

```
GET /api/collection_schedule?view=weekly&week_offset=0
GET /api/collection_schedule?view=monthly&month_offset=0
```

**응답 구조:**
```json
[
  {
    "job_id": "CD101",
    "date": "2025-12-18",
    "status": "success",
    "scheduled_time": "06:30",
    "is_grouped": false
  },
  {
    "group_id": "GRP_A",
    "date": "2025-12-18",
    "progress": 85,
    "jobs": ["CD201", "CD202"],
    "is_grouped": true
  }
]
```

---

> 다음 문서: [03-chart-analysis.md](03-chart-analysis.md)


<div class="pagebreak"></div>

## 5.6 데이터명세

> **핵심 기능**: 수집 대상 데이터의 명세서를 등록, 조회, 수정, 삭제하고, 메타데이터를 자동으로 채워 넣어 데이터 관리의 효율성을 높입니다.

---

### 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → 데이터 명세서
- **URL**: `/data_spec`
- **필요 권한**: `data_spec`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

### 2. 화면 구성

#### 2.1 전체 화면 구조

<img src="manual_images/data-spec-full.png" width="800" alt="데이터 명세서 전체 화면">

#### 2.2 각 영역 상세 설명

##### ① 메타데이터로 명세서 채우기 카드 (`#metadata-import-card`)

**지원 형식:**
| 형식 | 파일 확장자 | 설명 |
|------|------------|------|
| schema.org(JSON) | `.json` | 공공데이터 포털 메타데이터 JSON |
| DCAT(RDF) | `.xml`, `.rdf` | DCAT 표준 RDF/XML 메타데이터 |

**입력 방법:**
| 방법 | 요소 | 설명 |
|------|------|------|
| 파일로 불러오기 | `#metadata-file-input` | 파일 선택 후 `파일에서 채우기` 버튼 클릭 |
| 붙여넣기로 불러오기 | `#metadata-text-input` | 텍스트 직접 입력 후 `텍스트에서 채우기` 버튼 클릭 |

**동작 로직:**
- 파일 또는 텍스트 입력 후 버튼 클릭
- `data_spec.js`의 파서가 JSON/XML을 파싱
- 파싱된 데이터로 명세서 등록 모달의 폼 필드 자동 채움
- API URL, 데이터 명칭, 제공 기관, 키워드 등 추출

##### ② 명세서 목록 카드 (`#spec-list-card`)

| 기능 | 요소 | 설명 |
|------|------|------|
| 총 건수 | `#spec-total-count` | 전체 명세서 개수 표시 |
| 검색 | `#specSearch` | 데이터명, 기관, 키워드로 실시간 필터링 |
| 행 수 | `#specPageSize` | 10/20/50/100개 선택 |
| 새로 등록 | `#add-new-btn` | 빈 명세서 등록 모달 열기 |
| 테이블 | `#spec-list-body` | 명세서 목록 테이블 |
| 페이징 | `#specPagination` | 페이지 이동 버튼 |

**테이블 컬럼:**
| 컬럼 | 데이터 | 설명 |
|------|--------|------|
| ID | `id` | 명세서 고유 ID |
| 데이터 명칭 | `data_name` | 데이터의 한글 이름 |
| 제공 기관 | `provider` | 데이터 제공 기관명 |
| 키워드 | `keywords` | 검색용 키워드 (쉼표 구분) |
| 등록일 | `created_at` | 명세서 최초 등록일 |
| 참조문서 | `reference_doc_url` | 참고 문서 링크 (있는 경우 아이콘 표시) |

**동작 로직:**
- 행 클릭 시 `#spec-modal` 모달 열림 (상세 조회/수정)
- 검색 입력 시 실시간 필터링
- 페이지네이션으로 대량 데이터 처리

##### ③ 명세서 상세/등록 모달 (`#spec-modal`)

**기본 정보:**
| 필드 | ID | 설명 | 필수 |
|------|-----|------|------|
| 데이터 명칭 | `#data_name` | 데이터의 한글 이름 | ✅ |
| 제공 기관 | `#provider` | 데이터 제공 기관명 | - |
| API URL | `#api_url` | 데이터 수집 API 엔드포인트 | - |
| 참고 문서 URL | `#reference_doc_url` | 참고 문서 링크 | - |
| 비밀번호 | `#password` | 수정/삭제 시 필요한 비밀번호 | ✅ (신규) |
| 키워드 | `#keywords` | 검색용 키워드 | - |
| 상세 설명 | `#description` | 데이터에 대한 상세 설명 | - |

**동적 섹션:**
| 섹션 | 컨테이너 | 설명 |
|------|----------|------|
| 요청 파라미터 | `#request-params-container` | API 호출 시 필요한 파라미터 목록 |
| 응답 파라미터 | `#response-params-container` | API 응답의 파라미터 목록 |

**동작 로직:**
- `저장 후 닫기` 클릭 시 `#save-password-confirm-modal` 열림 (신규 또는 비밀번호 미설정 시)
- `삭제` 클릭 시 `#password-confirm-modal` 열림
- 비밀번호는 4자리 이상 입력 필요
- API URL 입력 후 자동 분석 기능으로 요청/응답 파라미터 추출 가능

##### ④ URL 분석 결과 모달 (`#url-analysis-modal`)

**표시 조건:** API URL 입력 후 자동 분석 또는 수동 분석 버튼 클릭
**표시 내용:**
- URL 유효성 검사 결과
- 요청 파라미터 자동 추출 (query string, path variable)
- 응답 파라미터 자동 추출 (JSON 응답 샘플 기반)
- 데이터 매핑 테이블

**동작:**
- `선택한 정보로 명세서 채우기` 버튼 클릭 시 모달 닫히고 폼 필드 업데이트

---

### 3. 데이터 흐름 및 처리 로직

#### 3.1 전체 데이터 흐름도

```
[사용자] → [data_spec.html] → [data_spec.js]
                                    ↓
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
            [메타데이터 파싱]  [명세서 CRUD]    [URL 분석]
                    ↓               ↓               ↓
            [JSON/XML 파서]   [API 호출]      [HTTP 요청]
                    ↓               ↓               ↓
            [폼 필드 채움]    [DB 저장/조회]   [응답 파싱]
                    ↓               ↓               ↓
            [모달 표시]       [목록 갱신]     [파라미터 추출]
```

#### 3.2 명세서 저장 절차

**신규 등록:**
1. `수동으로 새로 등록` 또는 메타데이터 채우기
2. 모달 폼에 데이터 입력
3. `저장 후 닫기` 클릭
4. 비밀번호 설정 모달 표시 (4자리 이상)
5. `POST /api/data_spec` API 호출
6. 목록 자동 갱신

**수정:**
1. 목록에서 대상 행 클릭
2. 모달 폼에서 데이터 수정
3. `저장 후 닫기` 클릭
4. `PUT /api/data_spec/{id}` API 호출

**삭제:**
1. 목록에서 대상 행 클릭
2. `삭제` 버튼 클릭
3. 비밀번호 확인 모달 표시
4. 비밀번호 입력 후 `확인`
5. `DELETE /api/data_spec/{id}` API 호출
6. 목록 자동 갱신

#### 3.3 메타데이터 파싱 로직

**schema.org(JSON):**
```json
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "데이터 명칭",
  "publisher": {"name": "제공 기관"},
  "keyword": ["키워드1", "키워드2"],
  "distribution": {"contentUrl": "API URL"}
}
```

**DCAT(RDF/XML):**
```xml
<dcat:Dataset>
  <dct:title>데이터 명칭</dct:title>
  <dct:publisher>제공 기관</dct:publisher>
  <dcat:keyword>키워드1</dcat:keyword>
  <dcat:distribution rdf:resource="API URL"/>
</dcat:Dataset>
```

---

### 4. 조작 방법

#### 4.1 메타데이터로 명세서 자동 채우기

**조작 절차 (파일):**
1. `메타데이터로 명세서 채우기` 카드 펼치기
2. `파일로 불러오기` 영역에서 파일 선택 (`.json`, `.xml`, `.rdf`)
3. `파일에서 채우기` 버튼 클릭
4. 명세서 등록 모달이 열리며 필드가 자동으로 채워짐

**조작 절차 (붙여넣기):**
1. `메타데이터로 명세서 채우기` 카드 펼치기
2. `붙여넣기로 불러오기` 텍스트 영역에 메타데이터 내용 입력
3. `텍스트에서 채우기` 버튼 클릭

**확인 방법:**
- 모달의 데이터 명칭, 제공 기관, API URL 등이 채워졌는지 확인

#### 4.2 명세서 직접 등록

<img src="manual_images/data-spec-add-modal.png" width="600" alt="명세서 등록 모달">

**조작 절차:**
1. `명세서 목록` 카드에서 `수동으로 새로 등록` 버튼 클릭
2. 모달 폼에 데이터 입력
3. `저장 후 닫기` 클릭
4. 비밀번호 설정 (4자리 이상)
5. `저장` 클릭

**확인 방법:**
- 목록에 신규 항목이 추가되었는지 확인
- 총 건수가 1 증가했는지 확인

#### 4.3 명세서 조회 및 수정

**조작 절차:**
1. 목록에서 대상 행 클릭
2. 모달에서 내용 확인
3. 필요 시 필드 수정
4. `저장 후 닫기` 클릭

**확인 방법:**
- 목록의 해당 행 내용이 변경되었는지 확인

#### 4.4 명세서 삭제

**조작 절차:**
1. 목록에서 대상 행 클릭
2. 모달 하단의 `삭제` 버튼 클릭
3. 비밀번호 확인 모달에서 등록 시 설정한 비밀번호 입력
4. `확인` 클릭

**확인 방법:**
- 목록에서 해당 행이 사라졌는지 확인
- 총 건수가 1 감소했는지 확인

---

### 5. 모니터링 체크리스트

- [ ] **명세서 총 건수**가 증가하는지 확인 (신규 데이터 수집 시)
- [ ] **API URL**이 유효한지 확인 (404 오류 여부)
- [ ] **참고 문서 URL**이 정상적으로 연결되는지 확인
- [ ] **키워드**가 적절히 등록되어 검색이 용이한지 확인
- [ ] **비밀번호**가 분실되지 않도록 별도 관리
- [ ] **메타데이터 자동 채우기** 실패 시 수동으로 입력 가능한지 확인

---

### 6. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 메타데이터 파싱 실패 | 지원하지 않는 형식 또는 잘못된 데이터 | schema.org 또는 DCAT 표준 형식 확인 |
| API URL이 유효하지 않음 | 잘못된 URL 또는 서비스 종료 | 브라우저에서 URL 직접 접속 테스트 |
| 저장 실패 | 필수 항목(데이터 명칭) 누락 | 데이터 명칭 입력 확인 |
| 삭제 실패 | 비밀번호 불일치 | 등록 시 설정한 비밀번호 확인 |
| 목록이 비어있음 | 등록된 명세서 없음 | 메타데이터 자동 채우기 또는 수동 등록 |
| 검색 결과 없음 | 검색어와 일치하는 항목 없음 | 검색어 변경 또는 키워드 확인 |
| URL 분석 실패 | CORS 오류 또는 서버 응답 없음 | 브라우저 개발자 도구에서 네트워크 오류 확인 |

---

### 7. 관련 DB 테이블 및 쿼리

#### 7.1 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `tb_data_spec` | 데이터 명세서 기본 정보 (ID, 데이터명, 제공기관, API URL 등) |
| `tb_data_spec_parm` | 명세서 파라미터 정보 (요청/응답 파라미터명, 타입, 설명) |
| `tb_user_acs_log` | 메뉴 접근 이력 |

#### 7.2 명세서 API

```
GET    /api/data_spec              # 명세서 목록 조회
POST   /api/data_spec              # 명세서 신규 등록
GET    /api/data_spec/{id}         # 명세서 상세 조회
PUT    /api/data_spec/{id}         # 명세서 수정
DELETE /api/data_spec/{id}         # 명세서 삭제 (비밀번호 필요)
POST   /api/data_spec/parse        # 메타데이터 파싱
POST   /api/data_spec/analyze-url  # URL 분석
```

---

> 다음 문서: [06-card-summary.md](06-card-summary.md)


<div class="pagebreak"></div>

## 5.7 컬럼매핑

> **핵심 기능**: 데이터베이스 테이블 컬럼의 변경 이력을 관리하고, 레거시 코드와 신규 코드 간의 컬럼 매핑 정보를 유지하여 호환성을 보장합니다.

---

### 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → 매핑 관리
- **URL**: `/mapping`
- **필요 권한**: `mapping`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

### 2. 화면 구성

#### 2.1 전체 화면 구조

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

#### 2.2 각 영역 상세 설명

##### ① 매핑되지 않은 신규 컬럼

| 컬럼 | 설명 |
|------|------|
| 테이블명 | 신규 컬럼이 추가된 테이블 이름 |
| 컬럼명 | 매핑되지 않은 신규 컬럼 이름 |
| 작업 | 매핑 추가 버튼 |

**동작 로직:**
- 시스템 startup 시 또는 `새로고침` 버튼 클릭 시 DB 스키마 스캔
- `tb_col_mapp` 테이블에 등록되지 않은 컬럼을 자동으로 감지
- 매핑 추가 버튼 클릭 시 매핑 모달이 열리며 해당 테이블/컬럼명이 자동으로 채워짐

##### ② 매핑 관리 테이블

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

##### ③ 매핑 정보 모달 (`#mapping-modal`)

| 필드 | ID | 설명 | 필수 |
|------|-----|------|------|
| 이전 테이블명 | `#bf-tbl-nm` | 레거시 테이블 이름 | - |
| 이전 컬럼명 | `#bf-col-nm` | 레거시 컬럼 이름 | - |
| 새 테이블명 | `#new-tbl-nm` | 신규 테이블 이름 | ✅ |
| 새 컬럼명 | `#new-col-nm` | 신규 컬럼 이름 | ✅ |
| 설명 | `#expl` | 매핑 설명 | - |

---

### 3. 데이터 흐름 및 처리 로직

#### 3.1 전체 데이터 흐름도

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

#### 3.2 매핑 조회 절차

1. 페이지 진입 시 `GET /api/mappings` API 호출
2. `MappingService`가 `MappingMapper`를 통해 `TB_COL_MAPP` 조회
3. 응답 데이터를 테이블에 렌더링

#### 3.3 매핑 저장 절차

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

#### 3.4 신규 컬럼 감지 로직

```
1. DB 메타데이터 조회 (INFORMATION_SCHEMA.COLUMNS)
2. tb_col_mapp의 모든 (테이블명, 컬럼명) 집합 생성
3. DB 메타데이터와 비교하여 미등록 컬럼 식별
4. 미등록 컬럼을 "매핑되지 않은 신규 컬럼" 테이블에 표시
```

---

### 4. 조작 방법

#### 4.1 매핑 목록 조회

**조작 절차:**
1. 상단 메뉴 → 매핑 관리 클릭
2. 매핑 관리 테이블에서 목록 확인

**확인 방법:**
- 이전/새 테이블명과 컬럼명이 정상적으로 표시되는지 확인

#### 4.2 신규 매핑 등록

**조작 절차:**
1. `신규 매핑 추가` 버튼 클릭
2. 모달 폼에 이전/새 테이블명, 컬럼명 입력
3. 설명 입력 (선택 사항)
4. `저장` 버튼 클릭

**확인 방법:**
- 목록에 신규 항목이 추가되었는지 확인

#### 4.3 기존 매핑 수정

**조작 절차:**
1. 대상 행 클릭
2. 모달 폼에서 필요한 필드 수정
3. `저장` 버튼 클릭

**확인 방법:**
- 목록의 해당 행 내용이 변경되었는지 확인

#### 4.4 매핑 삭제

**조작 절차:**
1. 대상 행의 `삭제` 버튼 클릭
2. 확인 대화상자에서 `확인` 클릭

**확인 방법:**
- 목록에서 해당 행이 사라졌는지 확인

#### 4.5 신규 컬럼 매핑 추가

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

### 5. 모니터링 체크리스트

- [ ] **매핑되지 않은 신규 컬럼**이 지속적으로 증가하지 않는지 확인
- [ ] **이전 테이블명/컬럼명**이 누락된 매핑이 없는지 확인
- [ ] **새 테이블명/컬럼명**이 실제 DB 스키마와 일치하는지 확인
- [ ] **설명**이 명확하게 작성되어 있는지 확인

---

### 6. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 매핑 목록이 비어있음 | 등록된 매핑 정보 없음 | 신규 매핑 추가 또는 DB 스키마 변경 시 자동 감지 대기 |
| 신규 컬럼이 감지되지 않음 | DB 스키마 변경 후 새로고침 미실행 | `새로고침` 버튼 클릭 |
| 저장 실패 | 필수 항목(새 테이블명/컬럼명) 누락 | 필수 필드 입력 확인 |
| 중복 매핑 저장 | 동일한 (새 테이블명, 새 컬럼명)이 이미 존재 | 기존 매핑 수정 또는 중복 여부 확인 |
| 이전 코드 호환성 문제 | 매핑 정보 부정확 또는 누락 | 매핑 테이블의 이전/새 컬럼명 정확성 확인 |

---

### 7. 관련 DB 테이블 및 쿼리

#### 7.1 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `tb_col_mapp` | 컬럼 매핑 정보 (ID, 이전 테이블명, 이전 컬럼명, 새 테이블명, 새 컬럼명, 설명, 수정일) |
| `INFORMATION_SCHEMA.COLUMNS` | DB 메타데이터 (테이블명, 컬럼명 등) |

#### 7.2 매핑 API

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


<div class="pagebreak"></div>

## 5.8 API키 관리

> **핵심 기능**: 데이터 수집에 사용되는 API 키의 등록, 조회, 수정, 삭제 및 만료 알림 메일 스케줄 관리를 수행합니다.

---

### 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → API 키 관리
- **URL**: `/api_key_mngr`
- **필요 권한**: `api_key_mngr`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

### 2. 화면 구성

#### 2.1 전체 화면 구조

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

#### 2.2 각 영역 상세 설명

##### ① 탭 메뉴

| 탭 | ID | 설명 |
|------|-----|------|
| API 키 관리 | `content0` | API 키 목록 조회/등록/수정/삭제 |
| 기간 차트 | `content1` | API 키 유효기간 간트 차트 시각화 |
| 위험군 | `content2` | 1개월 이내 만료 API 키 관리 |
| 설정 | `content3` | 메일 알림 및 스케줄 설정 |

##### ② API 키 관리 탭 (`content0`)

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

##### ③ 기간 차트 탭 (`content1`)

**간트 차트 (Gantt Chart):**
- 각 API 키의 유효기간을 막대 그래프로 시각화
- X축: 시간 (등록일 ~ 만료일)
- Y축: API 키 코드명
- 오늘 날짜 기준 빨간색 세로선 표시
- 상태별 막대 색상: 녹색(정상), 주황(만료임박), 빨강(오버)
- 마우스 오버 시 툴팁으로 상세 정보 표시

##### ④ 위험군 탭 (`content2`)

**정의:** 1개월 이내로 만료되는 API 키

**메일 전송 상태 필터:**
| 필터 | 설명 |
|------|------|
| 전체 | 모든 위험군 키 |
| ✅ 전송완료 | 알림 메일이 성공적으로 전송된 키 |
| ❌ 전송실패 | 알림 메일 전송에 실패한 키 |
| ⏳ 대기중 | 아직 알림 메일이 전송되지 않은 키 |

##### ⑤ 설정 탭 (`content3`)

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

### 3. 데이터 흐름 및 처리 로직

#### 3.1 전체 데이터 흐름도

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

#### 3.2 API 키 상태 분류 기준

| 상태 | 조건 |
|------|------|
| 정상 | 만료일 - 오늘 > 30일 |
| 만료 임박(30일) | 7일 < 만료일 - 오늘 ≤ 30일 |
| 만료 임박(7일) | 0일 < 만료일 - 오늘 ≤ 7일 |
| 오버 | 만료일 - 오늘 ≤ 0일 |

#### 3.3 메일 알림 스케줄

```
1. 스케줄러가 설정된 주기/시간에 실행
2. TB_API_KEY_MNGR에서 대상 키 조회 (30일/7일/당일 기준)
3. 메일 템플릿 변수 치환
4. SMTP 서버 통해 메일 발송
5. 발송 결과를 TB_API_KEY_MNGR_MAIL_LOG에 기록
```

---

### 4. 조작 방법

#### 4.1 API 키 등록

**조작 절차:**
1. `API 키 관리` 탭 선택
2. 테이블 내 `등록` 버튼 클릭 (또는 빈 행 더블클릭)
3. 코드명, 명칭, API값, 책임자 이메일, 기간 입력
4. `저장` 버튼 클릭

**확인 방법:**
- 목록에 신규 항목이 추가되었는지 확인
- 상태가 정상(녹색)으로 표시되는지 확인

#### 4.2 API 키 수정

**조작 절차 (개별):**
1. 대상 행의 `수정` 버튼 클릭
2. 필드 수정
3. `저장` 버튼 클릭

**조작 절차 (일괄):**
1. 체크박스로 다중 선택
2. `일괄 수정` 버튼 클릭
3. 공통 수정 필드 입력
4. `저장` 버튼 클릭

#### 4.3 만료 알림 메일 테스트

**조작 절차:**
1. 대상 행의 `알림 메일 전송` 버튼 클릭
2. 테스트 메일 발송 확인

#### 4.4 메일 알림 설정 변경

**조작 절차:**
1. `설정` 탭 선택
2. `메일 알림 설정` 서브 탭 선택
3. 30일 전 / 7일 전 / 당일 메일 제목/내용 수정
4. `설정 저장` 버튼 클릭

#### 4.5 스케줄 설정 변경

**조작 절차:**
1. `설정` 탭 선택
2. `스케줄 설정` 서브 탭 선택
3. 주기(일), 실행 시간, 활성화 여부 설정
4. `설정 저장` 버튼 클릭

---

### 5. 모니터링 체크리스트

- [ ] **오버 상태 키**가 있는지 확인 (즉시 갱신 필요)
- [ ] **만료 임박(7일)** 키가 있는지 확인
- [ ] **메일 전송 상태**에서 실패 항목이 있는지 확인
- [ ] **위험군** 키에 대해 담당자가 조치했는지 확인
- [ ] **스케줄 설정**이 활성화되어 있는지 확인
- [ ] **메일 알림 템플릿**이 최신 상태인지 확인

---

### 6. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| API 키가 오버로 표시됨 | 만료일이 지남 | 즉시 API 키 갱신 후 등록일/기간 수정 |
| 메일 전송 실패 | SMTP 설정 오류 또는 잘못된 이메일 주소 | 설정 탭의 SMTP 설정 확인, 책임자 이메일 주소 확인 |
| 알림 메일이 가지 않음 | 스케줄 비활성화 또는 주기 설정 부적절 | 설정 탭에서 스케줄 활성화 및 주기 확인 |
| CD 업데이트 후 키가 사라짐 | TB_MNGR_SETT에서 CD가 삭제됨 | TB_CON_MST의 ITEM10 값 확인 |
| 간트 차트가 비어있음 | 등록된 API 키 없음 | API 키 등록 필요 |
| 일괄 수정이 안 됨 | 선택된 항목 없음 | 체크박스로 항목 선택 확인 |

---

### 7. 관련 DB 테이블 및 쿼리

#### 7.1 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `tb_api_key_mngr` | API 키 기본 정보 (코드, 값, 책임자, 등록일, 기간) |
| `tb_api_key_mngr_mail_log` | 메일 발송 이력 (발송일, 상태, 결과) |
| `tb_api_key_mngr_mail_sett` | 메일 알림 설정 (템플릿, 스케줄) |
| `tb_api_key_mngr_mail_schd` | 메일 스케줄 정보 (주기, 시간, 활성화 여부) |
| `tb_con_mst` | 수집 작업 마스터 (CD, ITEM10, UDATE_DT) |
| `tb_mngr_sett` | 관리자 설정 (CD 목록) |

#### 7.2 API 키 관리 API

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


<div class="pagebreak"></div>

## 5.9 Jandi (수집 히트맵)

> **핵심 기능**: 각 Job ID별 수집 활동을 GitHub 잔디(Contribution Graph) 형태의 히트맵으로 시각화하여, 데이터 수집 패턴과 이상 징후를 한눈에 파악합니다.

---

### 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → 잔디
- **URL**: `/jandi`
- **필요 권한**: `jandi`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

### 2. 화면 구성

#### 2.1 전체 화면 구조

<img src="manual_images/jandi-full.png" width="800" alt="잔디 모니터링 전체 화면">

#### 2.2 각 영역 상세 설명

##### ① 날짜 선택 카드 (`#date-selection-card-jandi`)

| 요소 | ID | 설명 |
|------|-----|------|
| 시작일 | `#start-date` | 조회 시작 날짜 |
| 종료일 | `#end-date` | 조회 종료 날짜 |
| 전체 데이터 조회 | `#allDataCheckbox` | 체크 시 전체 기간 조회 |
| 조회 버튼 | `#filter-button` | 데이터 갱신 |

##### ② Job ID 상세정보 카드 (`#job-info-card-jandi`)

- 데이터 분석 메뉴얼의 Job ID 상세정보와 동일한 구조
- `tb_con_mst`의 Job 기본 정보 표시

##### ③ Job ID별 잔디 모니터링 카드 (`#jandi-monitoring-card`)

**정렬 기능:**
| 버튼 | ID | 설명 |
|------|-----|------|
| Job ID 오름차순 | `#sortAsc` | Job ID A→Z 정렬 |
| Job ID 내림차순 | `#sortDesc` | Job ID Z→A 정렬 |

**검색 및 페이징:**
| 기능 | ID | 설명 |
|------|-----|------|
| 검색 | `#jandiSearch` | Job ID 또는 한글명 필터링 |
| 행 수 | `#jandiPageSize` | 5/10/15/20개 선택 |
| 페이징 | `#jandiPagination` | 페이지 이동 |

**히트맵 (`#heatmap-container`):**
- 각 Job ID별로 가로로 펼쳐진 캘린더 히트맵
- X축: 날짜 (월 단위 표시)
- Y축: 요일 (생략 가능)
- 색상 밀도: 해당 날짜의 수집 성공률 또는 수집 횟수
  - 진한 녹색: 높은 성공률/많은 수집
  - 연한 녹색/회색: 낮은 성공률/적은 수집
  - 흰색/비어있음: 수집 없음

**데이터 출처:**
- API: `GET /api/jandi`
- Service: `JandiService`
- Mapper: `JandiMapper`
- SQL: `sql/jandi/jandi_sql.py`
- 테이블: `tb_con_hist`

---

### 3. 데이터 흐름 및 처리 로직

#### 3.1 전체 데이터 흐름도

```
[사용자] → [jandi.html] → [jandi.js]
                                  ↓
              [fetch('/api/jandi')]
                                  ↓
              [jandi_routes.py]
                                  ↓
              [JandiService]
                                  ↓
              [JandiMapper]
                                  ↓
              [sql/jandi/jandi_sql.py]
                                  ↓
              [TB_CON_HIST]
                                  ↓
              [JSON 응답] → [SVG 히트맵 렌더링]
```

#### 3.2 히트맵 데이터 집계

```
집계 단위: 일별 (date)
집계 대상: job_id별
집계 값: 
  - 성공률 = (성공 건수 / 전체 건수) × 100
  - 또는 수집 횟수 (count)

응답 구조:
[
  {
    "job_id": "CD101",
    "cd_nm": "기상청예보",
    "data": [
      {"date": "2025-01-01", "value": 95},
      {"date": "2025-01-02", "value": 100},
      ...
    ]
  }
]
```

#### 3.3 색상 스케일

| 색상 | 조건 |
|------|------|
| 진한 녹색 | 성공률 ≥ 90% 또는 수집 횟수 ≥ 상위 25% |
| 중간 녹색 | 성공률 70~89% 또는 수집 횟수 중간 |
| 연한 녹색 | 성공률 50~69% 또는 수집 횟수 하위 |
| 연한 회색 | 성공률 1~49% 또는 수집 횟수 매우 적음 |
| 흰색/없음 | 수집 없음 (0%) |

---

### 4. 조작 방법

#### 4.1 날짜 범위 변경

**조작 절차:**
1. 시작일/종료일 선택
2. `조회` 버튼 클릭

**확인 방법:**
- 히트맵의 날짜 범위가 변경됨

#### 4.2 Job ID 정렬

**조작 절차:**
1. `Job ID 오름차순` 또는 `Job ID 내림차순` 버튼 클릭

**확인 방법:**
- 히트맵 카드의 순서가 변경됨

#### 4.3 히트맵 해석

**조작 절차:**
1. 히트맵의 특정 셀에 마우스 오버
2. 툴팁으로 해당 날짜의 상세 정보 확인

**확인 내용:**
- 날짜
- 수집 성공률 (%)
- 수집 횟수
- 상태 (성공/실패/미수집)

---

### 5. 모니터링 체크리스트

- [ ] **히트맵에 흰색(비어있는) 구간**이 없는지 확인 (연속 미수집 여부)
- [ ] **특정 Job**의 색상이 전반적으로 연한지 확인 (지속적 낮은 성공률)
- [ ] **주기적 패턴**이 이상한지 확인 (예: 특정 요일마다 실패)
- [ ] **최근 날짜**의 색상이 정상인지 확인

---

### 6. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 히트맵이 비어있음 | 날짜 범위 내 데이터 없음 | 날짜 범위 확대 |
| 특정 Job이 보이지 않음 | 사용자 데이터 권한 없음 | 관리자에게 데이터 접근 권한 요청 |
| 히트맵 색상이 모두 연함 | 해당 기간 내 지속적인 낮은 성공률 | 수집 에이전트 상태 확인 |
| 히트맵에 줄무늬 패턴 | 주기적 실패 (예: 주말) | 스케줄 설정 확인 |
| 툴팁이 표시되지 않음 | 해당 날짜에 데이터 없음 | 다른 날짜 확인 |

---

### 7. 관련 DB 테이블 및 쿼리

#### 7.1 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `tb_con_hist` | 수집 실행 이력 (날짜, 성공/실패 상태) |
| `tb_con_mst` | 수집 작업 마스터 (Job ID, 데이터명) |
| `tb_user_data_perm_auth_ctrl` | 사용자별 데이터 접근 권한 |

#### 7.2 잔디 조회 API

```
GET /api/jandi?start_date=2025-01-01&end_date=2025-12-31
```

**응답 구조:**
```json
[
  {
    "job_id": "CD101",
    "cd_nm": "기상청예보",
    "data": [
      {"date": "2025-01-01", "success_rate": 95, "count": 10},
      {"date": "2025-01-02", "success_rate": 100, "count": 12}
    ]
  }
]
```

---

> 다음 문서: [10-raw-data.md](10-raw-data.md)


<div class="pagebreak"></div>

## 5.10 원본데이터

> **핵심 기능**: 수집된 원본 데이터를 조회하고, 날짜/Job ID 등 다양한 필터로 검색하여 데이터 품질과 수집 상태를 확인합니다.

---

### 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → 원본 데이터
- **URL**: `/raw_data`
- **필요 권한**: `raw_data`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

### 2. 화면 구성

#### 2.1 전체 화면 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  [필터] (접이식)                                                 │
│  시작일: [____]  종료일: [____]  Job ID: [전체▼]  [조회]         │
├─────────────────────────────────────────────────────────────────┤
│  [원본 데이터 테이블]                                            │
│  총 1,234건  [검색] [행 수: 20개▼]                              │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐            │
│  │날짜  │Job ID│상태  │요청  │응답  │소요시간│수집건수│            │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘            │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.2 각 영역 상세 설명

##### ① 필터

| 요소 | 설명 |
|------|------|
| 시작일 | 조회 시작 날짜 |
| 종료일 | 조회 종료 날짜 |
| Job ID | 특정 Job ID 필터 |
| 조회 버튼 | 데이터 갱신 |

##### ② 원본 데이터 테이블

| 컬럼 | 설명 |
|------|------|
| 날짜 | 수집 실행 날짜/시간 |
| Job ID | 수집 작업 ID |
| 상태 | CD901(성공)/CD902(실패)/CD903(미수집) |
| 요청 정보 | API 요청 파라미터 또는 URL |
| 응답 정보 | API 응답 요약 또는 에러 메시지 |
| 소요 시간 | 수집 소요 시간 (ms) |
| 수집 건수 | 실제 수집된 데이터 건수 |

**데이터 출처:** `tb_con_hist`

---

### 3. 조작 방법

#### 3.1 원본 데이터 조회

**조작 절차:**
1. 시작일/종료일 선택
2. Job ID 선택 (선택 사항)
3. `조회` 버튼 클릭

**확인 방법:**
- 테이블에 데이터가 표시되는지 확인
- 총 건수 확인

#### 3.2 상세 데이터 확인

**조작 절차:**
1. 대상 행 클릭
2. 상세 팝업 또는 확장 영역에서 전체 요청/응답 데이터 확인

---

### 4. 모니터링 체크리스트

- [ ] **실패 상태** 데이터가 있는지 확인
- [ ] **소요 시간**이 비정상적으로 긴 경우가 있는지 확인
- [ ] **수집 건수**가 0인 경우가 있는지 확인
- [ ] **특정 기간**에 데이터가 누락되지 않았는지 확인

---

### 5. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 테이블이 비어있음 | 날짜 범위 내 데이터 없음 | 날짜 범위 확대 |
| 상태가 모두 실패 | 수집 에이전트 장애 | 에이전트 로그 확인 |
| 소요 시간이 급증 | 네트워크 지연 또는 대상 서버 과부하 | 대상 서버 상태 확인 |

---

> 다음 문서: [11-admin.md](11-admin.md)


<div class="pagebreak"></div>

## 5.11 관리자 메뉴

> **핵심 기능**: 시스템 사용 현황 통계를 조회하고, 엑셀 템플릿 파일을 관리합니다.

---

### 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → 관리자
- **URL**: `/admin`
- **필요 권한**: `admin`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

### 2. 화면 구성

#### 2.1 전체 화면 구조

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

#### 2.2 각 영역 상세 설명

##### ① 통계 탭

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

##### ② 템플릿 탭

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

### 3. 조작 방법

#### 3.1 통계 조회

**조작 절차:**
1. `통계` 탭 선택
2. 기간/메뉴 선택
3. `조회` 버튼 클릭

#### 3.2 엑셀 템플릿 업로드

**조작 절차:**
1. `템플릿` 탭 선택
2. `파일 선택` 버튼 클릭
3. 엑셀 파일(.xlsx) 선택
4. `업로드` 버튼 클릭

#### 3.3 엑셀 템플릿 다운로드/삭제

**조작 절차:**
1. 대상 행의 `다운로드` 또는 `삭제` 버튼 클릭

---

### 4. 모니터링 체크리스트

- [ ] **메뉴 접근 통계**에서 특정 메뉴의 접근이 급감하지 않았는지 확인
- [ ] **사용자별 접근**에서 비정상적인 접근 패턴이 없는지 확인
- [ ] **템플릿 파일**이 정상적으로 업로드/다운로드되는지 확인

---

### 5. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 통계 데이터가 비어있음 | 접근 이력 없음 | 기간 확대 또는 메뉴 사용 유도 |
| 템플릿 업로드 실패 | 파일 형식 오류 | .xlsx 형식 확인 |
| 차트가 표시되지 않음 | 데이터 부족 | 충분한 기간 선택 |

---

> 다음 문서: [12-api-test.md](12-api-test.md)


<div class="pagebreak"></div>

## 5.12 API 테스트

> **핵심 기능**: 데이터 수집에 사용되는 API를 직접 호출하여, 요청/응답을 테스트하고 유효성을 검증합니다.

---

### 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → API 테스트
- **URL**: `/api_test`
- **필요 권한**: `api_test`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

### 2. 화면 구성

#### 2.1 전체 화면 구조

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

#### 2.2 각 영역 상세 설명

##### ① 요청 패널

| 요소 | 설명 |
|------|------|
| URL | API 엔드포인트 주소 |
| 메서드 | HTTP 메서드 (GET/POST/PUT/DELETE) |
| Content-Type | 요청 본문 형식 (application/json 등) |
| 헤더 | 추가 HTTP 헤더 (키-값 쌍) |
| 바디 | 요청 본문 (JSON/XML/폼 데이터) |
| 실행 버튼 | API 호출 실행 |

##### ② 응답 패널

| 요소 | 설명 |
|------|------|
| 상태 | HTTP 상태 코드 (200, 404, 500 등) |
| 소요시간 | API 호출 소요 시간 (ms) |
| 응답 본문 | API 응답 데이터 (JSON/XML) |

---

### 3. 조작 방법

#### 3.1 API 테스트 실행

**조작 절차:**
1. URL 입력
2. 메서드 선택
3. 필요 시 헤더/바디 입력
4. `실행` 버튼 클릭

**확인 방법:**
- 상태 코드가 200번대인지 확인
- 응답 본문에 예상 데이터가 포함되어 있는지 확인
- 소요 시간이 정상 범위인지 확인

#### 3.2 API 키 테스트

**조작 절차:**
1. URL에 API 키 파라미터 포함
2. `실행` 버튼 클릭
3. 응답 확인

---

### 4. 모니터링 체크리스트

- [ ] **상태 코드**가 200번대인지 확인
- [ ] **응답 시간**이 5초 이내인지 확인
- [ ] **응답 데이터**가 정상적인 형식인지 확인
- [ ] **API 키**가 유효한지 확인

---

### 5. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 404 Not Found | 잘못된 URL | API 명세서 확인 |
| 401 Unauthorized | 잘못된 API 키 | API 키 관리 메뉴에서 키 확인 |
| 500 Internal Server Error | 대상 서버 오류 | 대상 서버 상태 확인 |
| 응답 시간 초과 | 네트워크 지연 | 네트워크 상태 확인 또는 재시도 |
| 응답 데이터 파싱 실패 | 잘못된 JSON 형식 | 응답 본문의 따옴표, 쉼표 확인 |

---

> 다음 문서: [13-external-links.md](13-external-links.md)


<div class="pagebreak"></div>

## 5.13 외부 링크

> **핵심 기능**: MSYS와 연동되는 외부 시스템(Airflow, Kafka UI 등)으로의 빠른 접근 링크를 제공합니다.

---

### 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → Airflow / Kafka UI
- **URL**: 외부 URL (새 창으로 열림)
- **필요 권한**: 해당 메뉴 권한
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

### 2. 외부 시스템 목록

| 메뉴 | 설명 | URL 예시 | 로그인 필요 |
|------|------|----------|------------|
| Airflow | 데이터 수집 워크플로우 스케줄러 및 모니터링 | `http://airflow-server:8080` | 별도 계정 |
| Kafka UI | 메시지 브로커(Kafka) 관리 및 모니터링 | `http://kafka-ui-server:8080` | 별도 계정 |

---

### 3. 주의사항

| 항목 | 설명 |
|------|------|
| 별도 로그인 | 외부 시스템은 MSYS 계정과 별도의 인증이 필요할 수 있습니다. |
| 네트워크 접근 | 외부 시스템 서버에 대한 네트워크 접근 권한이 필요합니다. |
| VPN | 일부 외부 시스템은 VPN 연결이 필요할 수 있습니다. |
| 보안 | 외부 시스템 URL 및 계정 정보는 유출되지 않도록 주의하세요. |

---

### 4. 문제 해결

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 페이지가 열리지 않음 | 네트워크 접근 불가 또는 URL 변경 | 네트워크 상태 확인, 관리자에게 URL 변경 여부 확인 |
| 로그인 실패 | 잘못된 계정 정보 | 해당 시스템의 관리자에게 계정 확인 요청 |
| 403 Forbidden | 접근 권한 없음 | 해당 시스템의 관리자에게 권한 요청 |

---

> 메뉴얼 계속: [05-mngr-sett.md](../05-mngr-sett.md)


<div class="pagebreak"></div>

## 6. 관리자 설정

> ⚠️ **별도 파일**: 본 문서는 관리자 설정 메뉴의 방대한 기능을 다루기 위해 별도 파일로 분리되었습니다.

---

### 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → 관리자 설정
- **URL**: `/mngr_sett`
- **필요 권한**: `mngr_sett`
- **상세 권한**: 관리자 설정 페이지 접근 및 설정 변경 권한

---

### 2. 화면 구성

관리자 설정 화면은 상단의 **탭 11개**로 구성됩니다.

<img src="manual_images/mngr-sett-overview.png" width="800" alt="관리자 설정 탭 구성">

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

### 3. 설정 관리

#### 3.1 Job ID별 설정

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

### 4. 사용자 관리

#### 4.1 사용자 승인

**목적:** 가입 신청한 사용자를 승인합니다.

**조작 절차:**
1. 사용자 탭 선택
2. 상태가 `PENDING`인 사용자 검색
3. 승인 버튼 클릭
4. 확인 다이얼로그에서 확인

**확인 방법:** 사용자 상태가 `APPROVED`로 변경됨

**주의사항:** 승인 시 비밀번호가 ID와 동일하게 초기화됩니다.

#### 4.2 사용자 권한 설정

**목적:** 사용자별 메뉴 접근 권한을 설정합니다.

**조작 절차:**
1. 사용자 탭 선택
2. 대상 사용자 선택
3. 권한 체크박스 그룹에서 메뉴 선택
4. 저장 버튼 클릭

#### 4.3 대량 사용자 추가

**목적:** 여러 사용자를 한 번에 추가합니다.

**조작 절차:**
1. 사용자 탭 → 대량 추가 버튼 클릭
2. 사용자 ID 목록 입력 (쉼표 또는 줄바꿈 구분)
3. 유효성 검사 버튼 클릭
4. 추가 버튼 클릭

**주의사항:** 4-20자 영문, 숫자만 허용됩니다.

---

### 5. 데이터 권한

#### 5.1 Job ID 접근 권한 설정

**목적:** 사용자별로 접근 가능한 Job ID를 제한합니다.

**조작 절차:**
1. 데이터 권한 탭 선택
2. 대상 사용자 선택
3. Job ID 체크박스 선택
4. 저장 버튼 클릭

**확인 방법:** 해당 사용자로 로그인 후 접근 가능한 Job ID만 표시되는지 확인

---

### 6. 상태 코드

> ⚠️ **확인 필요**: 현재 `templates/mngr_sett.html`에 **"상태 코드" 탭이 존재하지 않습니다.** (탭 11개 중 해당 없음)
> 아래 절차의 "상태 코드 탭 선택" 단계는 현재 화면에서 수행할 수 없습니다. 기능 이동·삭제 여부 확인 후 본 장을 정정해야 합니다.

#### 6.1 상태 코드 동기화

**목적:** `tb_con_mst`의 CD900 그룹과 `tb_sts_cd_mst`를 동기화합니다.

**조작 절차:**
1. 상태 코드 탭 선택
2. 동기화 버튼 클릭
3. 결과 메시지 확인

#### 6.2 상태 코드 커스터마이징

**목적:** 상태 코드별 색상, 아이콘, 배경/글자색을 설정합니다.

**조작 절차:**
1. 상태 코드 탭 선택
2. 대상 상태 코드 행 선택
3. 색상 선택기에서 색상 선택
4. 아이콘 드롭다운에서 선택
5. 저장 버튼 클릭

---

### 7. 아이콘 관리

#### 7.1 아이콘 등록/수정

**목적:** 시스템에서 사용할 아이콘을 관리합니다.

**조작 절차:**
1. 아이콘 탭 선택
2. 등록 버튼 클릭
3. 아이콘 코드, 이름, 설명 입력
4. 이미지 업로드
5. 저장 버튼 클릭

#### 7.2 아이콘 가져오기/내보내기

**조작 절차:**
- 내보내기: CSV 버튼 클릭 → `icons.csv` 다운로드
- 가져오기: 파일 선택 → CSV 업로드 → 확인

---

### 8. 스케줄 표시 설정

#### 8.1 그룹 설정

**목적:** 수집 스케줄 화면에서 Job ID 그룹핑 기준을 설정합니다.

#### 8.2 진행률 임계값

**목적:** 진행률 표시 색상 변경 기준을 설정합니다.

---

### 9. 설정 백업/복원

#### 9.1 설정 내보내기

**조작 절차:**
1. 설정 탭 → 내보내기 버튼 클릭
2. `admin_settings.json` 파일 다운로드

#### 9.2 설정 가져오기

**조작 절차:**
1. 설정 탭 → 가져오기 버튼 클릭
2. JSON 파일 선택
3. 확인 메시지 확인 후 업로드

---

### 10. API 관리

> ⚠️ **확인 필요**: `mngr_sett` 화면에 **"API 관리" 탭이 존재하지 않습니다.**
> API 키 관리는 별도 메뉴 **`/api_key_mngr`** 에서 제공되며, 상세 설명은 [`04-common-menus/08-api-key-mngr.md`](04-common-menus/08-api-key-mngr.md)에 있습니다.
> 아래 절차의 "API 관리 탭 선택" 단계는 현재 화면에서 수행할 수 없습니다.

#### 10.1 API 키 목록 조회

**목적:** 등록된 API 키 목록을 조회합니다.

**조작 절차:**
1. API 관리 탭 선택
2. 페이징 또는 검색어 입력
3. 목록 확인

**확인 항목:** 코드, 만료일, 담당자 이메일, 상태

#### 10.2 API 키 등록/수정

**조작 절차:**
1. 등록 버튼 클릭
2. 코드, 만료일, 담당자 이메일 입력
3. 저장 버튼 클릭

**주의사항:** 만료일이 지난 API 키는 알림 대상이 됩니다.

#### 10.3 API 키 삭제

**조작 절차:**
1. 대상 행 선택
2. 삭제 버튼 클릭
3. 확인 다이얼로그에서 확인

#### 10.4 만료 알림 설정

**목적:** API 키 만료 전 메일 알림을 설정합니다.

**알림 기준:**
| 기간 | 발송 시점 |
|------|----------|
| 30일 전 | 1회 발송 |
| 7~1일 전 | 매일 발송 |
| 당일 | 1회 발송 |

#### 10.5 메일 테스트

**조작 절차:**
1. 테스트 메일 발송 버튼 클릭
2. SMTP 연결 및 발송 결과 확인

---

### 11. 모니터링 체크리스트

- [ ] 사용자 승인 대기 목록 매일 확인
- [ ] API 키 만료 30일 이내 항목 주간 확인
- [ ] 상태 코드 동기화 월간 실행
- [ ] 설정 백업 월간 실행

---

### 12. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 사용자 승인 후 로그인 불가 | 비밀번호 초기화 미반영 | 관리자가 비밀번호 재초기화 |
| API 키 알림 미발송 | SMTP 설정 오류 | `.env` 메일 서버 설정 확인 |
| 상태 코드 미동기화 | CD900 그룹 변경 | 수동 동기화 버튼 실행 |

---

> 다음 문서: [06-daily-operations.md](06-daily-operations.md)


<div class="pagebreak"></div>

## 7. 일상 운영

### 1. 정기 점검 항목

#### 일일 점검
| 시간 | 항목 | 방법 |
|------|------|------|
| 09:00 | 서비스 기동 상태 | `ps -ef \| grep msys` |
| 09:00 | 대시보드 정상 표시 | 웹 접속 확인 |
| 17:00 | 에러 로그 확인 | `tail -n 100 external_data_monitoring.log` |

#### 주간 점검
| 요일 | 항목 |
|------|------|
| 월요일 | 사용자 승인 대기 목록 확인 |
| 월요일 | API 키 만료 30일 이내 목록 확인 |
| 금요일 | 디스크 사용량 확인 |

### 2. 로그 확인 방법

```bash
# 실시간 로그 확인
tail -f /data/external_data_monitoring/log/external_data_monitoring.log

# 오늘 로그 확인
tail -n 500 /data/external_data_monitoring/log/external_data_monitoring.log

# 특정 날짜 로그 확인
cat /data/external_data_monitoring/log/external_data_monitoring.log.2026-05-11
```

### 3. 세션 타임아웃

| 사용자 유형 | 세션 유지 시간 |
|------------|--------------|
| 관리자 | 7일 |
| 일반 사용자 | 20분 |

---

> 다음 문서: [07-troubleshooting.md](07-troubleshooting.md)


<div class="pagebreak"></div>

## 8. 장애 대응

### 1. 장애 등급 정의

| 등급 | 기준 | 대응 시간 |
|------|------|----------|
| P1 (심각) | 서비스 전체 중단 | 즉시 |
| P2 (경계) | 주요 기능 장애 | 2시간 이내 |
| P3 (주의) | 일부 기능 이상 | 4시간 이내 |
| P4 (정보) | 경미한 이슈 | 다음 영업일 |

### 2. 자주 발생하는 문제

#### 2.1 서비스 접속 불가

**증상:** 웹 페이지 로딩 안 됨

**원인:**
- Flask 프로세스 중단
- 방화벽 설정 변경
- DB 연결 실패

**해결 방법:**
```bash
# 1. 프로세스 확인
ps -ef | grep msys

# 2. 프로세스가 없으면 기동
./start_moni.sh

# 3. 로그 확인
tail -n 50 /data/external_data_monitoring/log/external_data_monitoring.log
```

#### 2.2 DB 연결 오류

**증상:** 대시보드 데이터 미표시

**해결 방법:**
```bash
# 1. DB 서버 연결 확인
psql -h [DB_HOST] -U [DB_USER] -d [DB_NAME] -c "SELECT 1"

# 2. 설정 확인
cat /data/external_data_monitoring/msys/.env | grep DB_
```

#### 2.3 메일 발송 실패

**증상:** API 키 만료 알림 미발송

**해결 방법:**
- SMTP 서버 연결 확인: `telnet 100.1.28.73 25`
- `.env` 메일 설정 확인
- 관리자 설정 → 메일 테스트 실행

### 3. 긴급 연락처

| 역할 | 연락처 | 비고 |
|------|--------|------|
| 시스템 담당자 | - | - |
| DB 담당자 | - | - |
| 인프라 담당자 | - | - |

---

> 다음 문서: [08-backup-recovery.md](08-backup-recovery.md)


<div class="pagebreak"></div>

## 9. 백업 및 복구

### 1. 백업 전략

| 대상 | 주기 | 방법 | 보관 기간 |
|------|------|------|----------|
| 소스 코드 | 배포 시 | ZIP 백업 | 최근 5개 |
| 설정 파일 | 매일 | `.env` 복사 | 30일 |
| DB 스키마 | 변경 시 | DDL 저장 | 영구 |
| DB 데이터 | 매일 | pg_dump | 7일 |

### 2. 백업 절차

#### 2.1 소스 코드 백업

```bash
# 배포 전 백업
cp -r /data/external_data_monitoring/msys /data/external_data_monitoring/msys_backup_$(date +%Y%m%d)
```

#### 2.2 DB 백업

```bash
# 전체 DB 백업
pg_dump -h [DB_HOST] -U [DB_USER] -d [DB_NAME] > backup_$(date +%Y%m%d_%H%M%S).sql

# 특정 테이블 백업
pg_dump -h [DB_HOST] -U [DB_USER] -d [DB_NAME] -t tb_user > tb_user_backup.sql
```

#### 2.3 설정 백업

```bash
cp /data/external_data_monitoring/msys/.env /data/external_data_monitoring/backup/env_backup_$(date +%Y%m%d)
```

### 3. 복구 절차

#### 3.1 소스 코드 복구

```bash
# 1. 서비스 중지
./kill_data_moni.sh

# 2. 백업 복원
cp -r /data/external_data_monitoring/msys_backup_YYYYMMDD/* /data/external_data_monitoring/msys/

# 3. 서비스 기동
./start_moni.sh
```

#### 3.2 DB 복구

```bash
# 1. DB 연결
psql -h [DB_HOST] -U [DB_USER] -d [DB_NAME]

# 2. 복원
\i backup_YYYYMMDD_HHMMSS.sql
```

---

> 메뉴얼 끝


<div class="pagebreak"></div>

## 부록 A. 명령어 모음

### 서비스 제어

```bash
# 기동
./start_moni.sh

# 중지
./kill_data_moni.sh

# 프로세스 확인
ps -ef | grep msys
```

### 로그 확인

```bash
# 실시간
tail -f /data/external_data_monitoring/log/external_data_monitoring.log

# 오늘 100줄
tail -n 100 /data/external_data_monitoring/log/external_data_monitoring.log

# 오류 검색
grep "ERROR" /data/external_data_monitoring/log/external_data_monitoring.log
```

### DB 명령어

```bash
# 접속
psql -h [DB_HOST] -U [DB_USER] -d [DB_NAME]

# 테이블 목록
\dt

# 사용자 조회
SELECT * FROM tb_user;

# 세션 종료
\q
```

---

> 다음 문서: [config-reference.md](config-reference.md)


<div class="pagebreak"></div>

## 부록 B. 설정 항목 레퍼런스

### .env 설정 항목

| 변수명 | 설명 | 기본값 | 예시 |
|--------|------|--------|------|
| DB_HOST | DB 서버 주소 | localhost | 100.1.28.73 |
| DB_NAME | DB 이름 | - | etl_db_dev |
| DB_USER | DB 사용자 | - | etl_user |
| DB_PASSWORD | DB 비밀번호 | - | [비밀번호] |
| DB_PORT | DB 포트 | 5432 | 5432 |
| FLASK_HOST | 서버 바인드 주소 | 0.0.0.0 | 0.0.0.0 |
| FLASK_PORT | 서버 포트 | 18080 | 18080 |
| FLASK_DEBUG | 디버그 모드 | False | False |
| ADMIN_SESSION_LIFETIME_DAYS | 관리자 세션 유지 일수 | 7 | 7 |
| DEFAULT_SESSION_LIFETIME_MINUTES | 일반 사용자 세션 유지 분 | 20 | 20 |
| MAIL_SERVER | 메일 서버 주소 | - | 100.1.28.73 |
| MAIL_PORT | 메일 서버 포트 | 25 | 25 |

### 사용자 상태 코드

| 상태 | 설명 |
|------|------|
| PENDING | 가입 신청 대기 |
| APPROVED | 승인 완료 |
| DORMANT | 휴면 |
| INACTIVE | 비활성 |
| PENDING_RESET | 비밀번호 초기화 대기 |

---

> 메뉴얼 끝


<div class="pagebreak"></div>
