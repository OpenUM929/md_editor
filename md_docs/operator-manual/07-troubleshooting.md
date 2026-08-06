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
  <td class="doctitle" colspan="2">장애 대응</td>
  <td><span class="label">문서번호</span><span class="val">MSYS-OPS-07</span></td>
</tr>
<tr>
  <td><span class="label">분류</span><span class="val">운영 매뉴얼</span></td>
  <td><span class="label">개정번호</span><span class="val">Rev. 1.0</span></td>
  <td><span class="label">시행일</span><span class="val">2026-07-22</span></td>
</tr>
<tr>
  <td colspan="2"><span class="label">적용 범위</span><span class="val">장애 대응 및 문제 해결</span></td>
  <td><span class="label">승인</span><span class="val">운영팀장</span></td>
</tr>
</table>

# 장애 대응

## 1. 장애 등급 정의

| 등급 | 기준 | 대응 시간 |
|------|------|----------|
| P1 (심각) | 서비스 전체 중단 | 즉시 |
| P2 (경계) | 주요 기능 장애 | 2시간 이내 |
| P3 (주의) | 일부 기능 이상 | 4시간 이내 |
| P4 (정보) | 경미한 이슈 | 다음 영업일 |

## 2. 자주 발생하는 문제

### 2.1 서비스 접속 불가

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

### 2.2 DB 연결 오류

**증상:** 대시보드 데이터 미표시

**해결 방법:**
```bash
# 1. DB 서버 연결 확인
psql -h [DB_HOST] -U [DB_USER] -d [DB_NAME] -c "SELECT 1"

# 2. 설정 확인
cat /data/external_data_monitoring/msys/.env | grep DB_
```

### 2.3 메일 발송 실패

**증상:** API 키 만료 알림 미발송

**해결 방법:**
- SMTP 서버 연결 확인: `telnet 100.1.28.73 25`
- `.env` 메일 설정 확인
- 관리자 설정 → 메일 테스트 실행

## 3. 긴급 연락처

| 역할 | 연락처 | 비고 |
|------|--------|------|
| 시스템 담당자 | - | - |
| DB 담당자 | - | - |
| 인프라 담당자 | - | - |

---

> 다음 문서: [08-backup-recovery.md](08-backup-recovery.md)

<div class="doc-footer">
  <span><b>MSYS-OPS-07</b> · Rev. 1.0</span>
  <span>1 / 1</span>
</div>
