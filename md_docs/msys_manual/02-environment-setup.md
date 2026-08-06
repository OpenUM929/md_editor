---
reportTheme: report
---

# 환경 설정

## 1. .env 파일 설정

`.env` 파일은 환경별 설정을 관리합니다.

### 필수 설정 항목

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

## 2. 로컬 개발 환경 구축

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

## 3. 운영 환경 설정

| 항목 | 경로/값 |
|------|---------|
| 배포 경로 | `/data/external_data_monitoring/msys/` |
| Python 환경 | `/data/external_data_monitoring/.web/bin/activate` |
| 로그 경로 | `/data/external_data_monitoring/log/` |

---

> 다음 문서: [03-deployment.md](03-deployment.md)
