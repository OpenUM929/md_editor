---
reportTheme: report
---

# 일상 운영

## 1. 정기 점검 항목

### 일일 점검
| 시간 | 항목 | 방법 |
|------|------|------|
| 09:00 | 서비스 기동 상태 | `ps -ef \| grep msys` |
| 09:00 | 대시보드 정상 표시 | 웹 접속 확인 |
| 17:00 | 에러 로그 확인 | `tail -n 100 external_data_monitoring.log` |

### 주간 점검
| 요일 | 항목 |
|------|------|
| 월요일 | 사용자 승인 대기 목록 확인 |
| 월요일 | API 키 만료 30일 이내 목록 확인 |
| 금요일 | 디스크 사용량 확인 |

## 2. 로그 확인 방법

```bash
# 실시간 로그 확인
tail -f /data/external_data_monitoring/log/external_data_monitoring.log

# 오늘 로그 확인
tail -n 500 /data/external_data_monitoring/log/external_data_monitoring.log

# 특정 날짜 로그 확인
cat /data/external_data_monitoring/log/external_data_monitoring.log.2026-05-11
```

## 3. 세션 타임아웃

| 사용자 유형 | 세션 유지 시간 |
|------------|--------------|
| 관리자 | 7일 |
| 일반 사용자 | 20분 |

---

> 다음 문서: [07-troubleshooting.md](07-troubleshooting.md)
