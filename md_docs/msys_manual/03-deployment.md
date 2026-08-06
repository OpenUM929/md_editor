---
reportTheme: report
---

# 배포 절차

## 1. 배포 전 체크리스트

- [ ] 소스 코드 최신화 (git pull)
- [ ] `.env` 파일 백업
- [ ] DB 마이그레이션 필요 여부 확인
- [ ] 의존성 변경 여부 확인 (`requirements.txt`)

## 2. 배포 절차

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

## 3. 롤백 절차

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
