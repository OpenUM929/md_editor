#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
HWPX 생성기 — 공인 라이브러리(python-hwpx)의 저수준 API 로 표준 §1-2 양식을 직접 조립한다.

과거 수제 OWPML 은 한글에서 "파일 손상"으로 거부됐고, python-hwpx 의 고수준 builder
프리셋은 우리 §1-2(제목 네이비 박스·H2 좌측 강조바·□/○ 글머리·글자 크기)와 색·크기가
달랐다. 그래서 여기서는 ensure_run_style(글자속성)·ensure_border_fill(테두리/배경)·
ensure_paragraph_format(문단속성)·ensure_numbering(글머리) 로 §1-2 를 그대로 구현한다.
저장 직후 validate_editor_open_safety 로 한글 열림을 검증한다(fail-closed).

stdin: UTF-8 JSON plan (hwpx-plan.ts 규약). stdout: {"ok":true,"path":...}.
run: {text, bold?, italic?, strike?, code?}
"""
import os
import sys
import json

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except Exception:
        pass

from hwpx import HwpxDocument
import hwpx
from hwpx.oxml.namespaces import HP as _HP

# 표준 §1-2 값(docs/a4-authoring-guide.md). 크기 단위 pt.
FONT = "맑은 고딕"
CODE_FONT = "D2Coding"
GRAY = "#F2F2F2"        # 제목박스·표 머리행 배경
QUOTE_BAR = "#7A8BA0"   # 인용 좌측 바
_ZWSP = "​"


def _safe(text):
    """python-hwpx 는 '{{ ... }}' 를 계산필드로 해석해 예외 → 폭0 공백으로 무력화."""
    if not text:
        return text
    return text.replace("{{", "{" + _ZWSP + "{").replace("}}", "}" + _ZWSP + "}")


def _add_line_break(p, char_pr_id_ref):
    """<hp:t> 안에 원시 개행문자를 넣는 방식은 한글이 줄바꿈으로 인식하지 않는다
    (스펙상 줄바꿈은 <hp:lineBreak/> 전용 요소). run 을 만든 뒤 빈 <hp:t> 를
    <hp:lineBreak/> 로 바꿔치기해 실제 줄바꿈을 심는다."""
    run = p.add_run("", char_pr_id_ref=char_pr_id_ref)
    for child in list(run.element):
        run.element.remove(child)
    run.element.append(run.element.makeelement(f"{_HP}lineBreak", {}))


def _add_run_text(p, text, char_pr_id_ref):
    """평문 안에 "\\n"(marked 의 <br> → 우리 run 표현)이 섞여 있으면 각 조각을
    별도 run 으로 넣고 그 사이에 실제 lineBreak 요소를 끼운다."""
    parts = (text or "").split("\n")
    for i, part in enumerate(parts):
        if i > 0:
            _add_line_break(p, char_pr_id_ref)
        if part:
            p.add_run(_safe(part), char_pr_id_ref=char_pr_id_ref)


def build(doc, data):
    accent = data.get("accent") or "#1B1760"
    header = doc._root.headers[0]

    # 페이지: A4 + 프리셋 여백(mm).
    m = data.get("margins") or {}
    try:
        doc.set_page_setup(
            paper_size="A4",
            margins_mm={
                "left": float(m.get("left", 20)), "right": float(m.get("right", 20)),
                "top": float(m.get("top", 20)), "bottom": float(m.get("bottom", 20)),
            },
        )
    except Exception:
        pass

    # --- 글자속성(charPr) ---
    CS = {
        "body": doc.ensure_run_style(font=FONT, size=12),
        "bold": doc.ensure_run_style(font=FONT, size=12, bold=True),
        "italic": doc.ensure_run_style(font=FONT, size=12, italic=True),
        "bolditalic": doc.ensure_run_style(font=FONT, size=12, bold=True, italic=True),
        "strike": doc.ensure_run_style(font=FONT, size=12, strike=True),
        "h1": doc.ensure_run_style(font=FONT, size=20, bold=True),
        "h2": doc.ensure_run_style(font=FONT, size=15, bold=True, color=accent),
        "h3": doc.ensure_run_style(font=FONT, size=13, bold=True),
        "h4": doc.ensure_run_style(font=FONT, size=11.5, bold=True),
        "code": doc.ensure_run_style(font=CODE_FONT, size=9, color="#333333"),
        "tblh": doc.ensure_run_style(font=FONT, size=10.5, bold=True),
        "tbl": doc.ensure_run_style(font=FONT, size=10.5),
    }

    def run_style(r):
        if r.get("code"):
            return CS["code"]
        b, i = bool(r.get("bold")), bool(r.get("italic"))
        if b and i:
            return CS["bolditalic"]
        if b:
            return CS["bold"]
        if i:
            return CS["italic"]
        if r.get("strike"):
            return CS["strike"]
        return CS["body"]

    # --- 테두리/배경(borderFill) ---
    def border(bf, pad_v="120", pad_h="200"):
        return {"borderFillIDRef": bf, "offsetLeft": pad_h, "offsetRight": pad_h,
                "offsetTop": pad_v, "offsetBottom": pad_v, "connect": "0", "ignoreMargin": "0"}
    bf_h1 = doc.ensure_border_fill(fill_color=GRAY, border_color="#000000", border_width="0.12 mm",
                                   active_borders=("left", "right", "top", "bottom"))
    bf_h2 = doc.ensure_border_fill(border_color=accent, border_width="0.5 mm", active_borders=("left",))
    bf_quote = doc.ensure_border_fill(border_color=QUOTE_BAR, border_width="0.4 mm", active_borders=("left",))

    # --- 문단속성(paraPr) ---
    def pfmt(**kw):
        try:
            return header.ensure_paragraph_format(**kw)
        except Exception:
            return None
    # heading=OUTLINE 은 붙이지 않는다 — 붙이면 한글이 "가./나." 자동번호를 덧그려
    # §1-2(본문에 이미 "1. …" 수동번호)와 중복된다.
    PP = {
        "body": pfmt(alignment="JUSTIFY", line_spacing_percent=190),
        "h1": pfmt(alignment="CENTER", line_spacing_percent=150, border=border(bf_h1)),
        "h2": pfmt(alignment="LEFT", line_spacing_percent=160, border=border(bf_h2, pad_h="300")),
        "h3": pfmt(alignment="LEFT", line_spacing_percent=150),
        "h4": pfmt(alignment="LEFT", line_spacing_percent=150),
        "quote": pfmt(alignment="LEFT", line_spacing_percent=150, border=border(bf_quote, pad_h="300")),
        "code": pfmt(alignment="LEFT", line_spacing_percent=130),
        "pagebreak": pfmt(break_setting={"page_break_before": True}),
    }

    # --- 글머리표 □/○/– ---
    try:
        bullets = doc.ensure_numbering(kind="bullet", levels=[{"char": "□"}, {"char": "○"}, {"char": "–"}])
    except Exception:
        bullets = []
    try:
        ordered = doc.ensure_numbering(kind="number", levels=[{}, {}, {}])
    except Exception:
        ordered = []

    # 표 총폭 = 사용가능 폭(용지 210 - 좌우 여백)mm → HWP 단위(1/7200 inch).
    usable_mm = 210.0 - float(m.get("left", 20)) - float(m.get("right", 20))
    usable_w_units = max(1, round(usable_mm * 7200.0 / 25.4))

    heading_char = {1: CS["h1"], 2: CS["h2"], 3: CS["h3"], 4: CS["h4"]}
    heading_pp = {1: "h1", 2: "h2", 3: "h3", 4: "h4"}

    for b in data.get("blocks") or []:
        t = b.get("type")
        if t == "heading":
            lvl = max(1, min(int(b.get("level", 1)), 4))
            p = doc.add_paragraph("", para_pr_id_ref=PP.get(heading_pp[lvl]), include_run=False)
            _add_run_text(p, "".join(r.get("text", "") for r in b.get("runs") or []), heading_char[lvl])
        elif t == "paragraph":
            runs = b.get("runs") or []
            p = doc.add_paragraph("", para_pr_id_ref=PP.get("body"), include_run=False)
            if not runs:
                p.add_run("", char_pr_id_ref=CS["body"])
            for r in runs:
                _add_run_text(p, r.get("text", ""), run_style(r))
        elif t == "bullet":
            lvl = min(int(b.get("level", 0)), 2)
            pp = bullets[lvl] if bullets and lvl < len(bullets) else PP.get("body")
            for item in b.get("items") or []:
                p = doc.add_paragraph("", para_pr_id_ref=pp, include_run=False)
                _add_run_text(p, item, CS["body"])
        elif t == "ordered":
            lvl = min(int(b.get("level", 0)), 2)
            pp = ordered[lvl] if ordered and lvl < len(ordered) else PP.get("body")
            for item in b.get("items") or []:
                p = doc.add_paragraph("", para_pr_id_ref=pp, include_run=False)
                _add_run_text(p, item, CS["body"])
        elif t == "table":
            _add_table(doc, b, CS, usable_w_units)
        elif t == "blockquote":
            p = doc.add_paragraph("", para_pr_id_ref=PP.get("quote"), include_run=False)
            runs = b.get("runs") or []
            if not runs:
                p.add_run("", char_pr_id_ref=CS["italic"])
            for r in runs:
                _add_run_text(p, r.get("text", ""), CS["italic"])
        elif t == "code":
            for line in (b.get("text", "") or "").split("\n"):
                p = doc.add_paragraph("", para_pr_id_ref=PP.get("code"), include_run=False)
                p.add_run(_safe(line) if line else " ", char_pr_id_ref=CS["code"])
        elif t == "pagebreak":
            doc.add_paragraph("", para_pr_id_ref=PP.get("pagebreak") or PP.get("body"), include_run=False)


def _add_table(doc, b, CS, width_units):
    header = [_safe(x) for x in (b.get("header") or [])]
    rows = [[_safe(x) for x in row] for row in (b.get("rows") or [])]
    ncol = len(header) if header else max((len(r) for r in rows), default=0)
    if ncol == 0:
        return
    has_header = bool(header)
    nrow = (1 if has_header else 0) + len(rows)
    if nrow == 0:
        return
    # 표 폭을 페이지 사용가능 폭으로 지정(기본 ~101mm 라 표가 좁아 글자가 세로로 쪼개짐).
    try:
        tbl = doc.add_table(nrow, ncol, width=width_units)
    except Exception:
        tbl = doc.add_table(nrow, ncol)
    r0 = 0
    if has_header:
        for c in range(ncol):
            tbl.set_cell_text(0, c, header[c] if c < len(header) else "")
            try:
                tbl.set_cell_shading(0, c, GRAY)
            except Exception:
                pass
        r0 = 1
    for ri, row in enumerate(rows):
        for c in range(ncol):
            tbl.set_cell_text(r0 + ri, c, row[c] if c < len(row) else "")
    # 셀 글자 10.5pt(머리행 굵게) — 실패해도 표 자체는 유효하므로 무시.
    try:
        for c in range(ncol):
            if has_header:
                _style_cell_runs(tbl.cell(0, c), CS["tblh"])
        for ri in range(len(rows)):
            for c in range(ncol):
                _style_cell_runs(tbl.cell(r0 + ri, c), CS["tbl"])
    except Exception:
        pass
    try:
        tbl.set_column_widths([1] * ncol)
    except Exception:
        pass


def _style_cell_runs(cell, char_id):
    for para in getattr(cell, "paragraphs", []) or []:
        for run in getattr(para, "runs", []) or []:
            run.char_pr_id_ref = char_id


def main():
    data = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    out_path = data["out"]
    doc = HwpxDocument.new()
    build(doc, data)

    tmp_path = out_path + ".tmp"
    doc.save_to_path(tmp_path)
    report = hwpx.validate_editor_open_safety(tmp_path)
    if not getattr(report, "ok", False):
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        sys.stderr.write(
            "editor-open-safety FAILED: %s | pkg=%r | doc=%r\n"
            % (getattr(report, "summary", "?"), getattr(report, "blocking_package_errors", None),
               getattr(report, "document_validation_error", None))
        )
        sys.exit(3)
    os.replace(tmp_path, out_path)
    sys.stdout.write(json.dumps({"ok": True, "path": out_path}, ensure_ascii=False))


if __name__ == "__main__":
    main()
