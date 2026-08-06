# -*- coding: utf-8 -*-
"""
간단한 구조화 markdown -> 표준양식 PDF 변환기

지원 문법 (예시 report_example.md 참고):
    # 「제목」 텍스트
    @byline: 부서 직급 이름(☎번호)

    ## 1. 구축배경
    - 내용 (□ 불릿)
      - 하위 내용 (○ 불릿)
    > 참고 각주 (※)

    !badge[붙임1] 제목 텍스트     -> 붙임 배지 헤더
    !newpage                     -> 페이지 나눔

    표는 마크다운 표 문법 사용:
    | 헤더1 | 헤더2 |
    |---|---|
    | 값1 | 값2 |
"""
import sys
import re
from report_template import ReportBuilder


def parse_and_build(md_path, pdf_path):
    with open(md_path, encoding="utf-8") as f:
        lines = f.read().splitlines()

    rb = None
    i = 0
    table_buf = []

    def flush_table():
        nonlocal table_buf
        if table_buf:
            headers = table_buf[0]
            rows = table_buf[2:] if len(table_buf) > 2 else []
            rb.table(headers, rows)
            table_buf = []

    while i < len(lines):
        line = lines[i].rstrip()
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        # 표 라인 감지
        if stripped.startswith("|"):
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            table_buf.append(cells)
            i += 1
            continue
        else:
            flush_table()

        if stripped.startswith("# "):
            title = stripped[2:].strip()
            rb = ReportBuilder(pdf_path, title=title)
        elif stripped.startswith("@byline:"):
            rb.byline(stripped.split(":", 1)[1].strip())
        elif stripped.startswith("## "):
            rb.section(stripped[3:].strip())
        elif stripped.startswith("!badge["):
            m = re.match(r"!badge\[(.*?)\]\s*(.*)", stripped)
            if m:
                rb.badge_header(m.group(1), m.group(2))
        elif stripped == "!newpage":
            rb.new_page()
        elif stripped.startswith("- "):
            # 들여쓰기로 레벨 판단
            indent = len(line) - len(line.lstrip(" "))
            level = 2 if indent >= 2 else 1
            rb.bullet(stripped[2:].strip(), level=level)
        elif stripped.startswith("> "):
            rb.note(stripped[2:].strip())
        else:
            # 일반 문단은 1단계 불릿과 동일하게 처리
            rb.bullet(stripped, level=1)

        i += 1

    flush_table()
    rb.save()
    print(f"생성 완료: {pdf_path}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("사용법: python md_to_report.py input.md output.pdf")
        sys.exit(1)
    parse_and_build(sys.argv[1], sys.argv[2])
