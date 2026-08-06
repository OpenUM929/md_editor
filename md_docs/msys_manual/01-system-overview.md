---
reportTheme: report
---

# MSYS 시스템 개요

## 1. 시스템 정의

MSYS(Monitoring System)는 **외부 데이터 수집 현황을 모니터링하고 관리하는 웹 기반 대시보드 시스템**입니다.

## 2. 주요 기능

| 기능 | 설명 |
|------|------|
| 수집 현황 모니터링 | 실시간 수집 작업 상태 확인 |
| 스케줄 관리 | 수집 작업 스케줄 조회 및 관리 |
| API 키 관리 | API 키 등록, 만료 알림, 메일 발송 |
| 데이터 분석 | 차트/리포트 기반 데이터 분석 |
| 사용자 관리 | 계정 승인, 권한 설정, 데이터 접근 제어 |
| 시스템 설정 | 상태 코드, 아이콘, 스케줄 표시 설정 |

## 3. 시스템 아키텍처

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

## 4. 운영 환경

| 환경 | 설명 |
|------|------|
| 운영 서버 | CIB040L5 (Linux) |
| 배포 경로 | `/data/external_data_monitoring/msys/` |
| 로그 경로 | `/data/external_data_monitoring/log/` |
| 타임존 | KST (Asia/Seoul, UTC+9) |

## 5. 주요 테이블

| 테이블 | 설명 |
|--------|------|
| tb_user | 사용자 계정 |
| tb_con_mst | 수집 작업 마스터 |
| tb_con_hist | 수집 이력 |
| tb_api_key_mngr | API 키 관리 |
| tb_mngr_sett | 관리자 설정 |
| tb_menu | 메뉴 정의 |

## 6. 권한 체계

| 권한 | 설명 |
|------|------|
| admin | 전체 관리자 권한 |
| mngr_sett | 관리자 설정 메뉴 접근 |
| api_key_mngr | API 키 관리 메뉴 접근 |
| analysis | 분석 메뉴 접근 |
| data_spec | 데이터 스펙 메뉴 접근 |

---

> 다음 문서: [02-environment-setup.md](02-environment-setup.md)
