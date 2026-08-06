# -*- coding: utf-8 -*-
"""
표준 보고서 양식 생성 템플릿 (reportlab)
「ICT설비관리시스템」 구축 완료보고 PDF를 실측하여 만든 스타일을 그대로 재현합니다.

사용법:
    from report_template import ReportBuilder

    rb = ReportBuilder("output.pdf", title="「XX시스템」 구축 완료보고",
                        byline="ICT운영처 디지털운영부 차장 홍영동(☎6584)")
    rb.section("1. 구축배경")
    rb.bullet("XX현황 시스템 구축을 통한 업무 효율화")
    rb.note("관련문서 : ...")
    ...
    rb.save()
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import re

# ---------------------------------------------------------------
# 폰트 등록 (Noto Sans CJK KR -> 원본의 맑은고딕류 산세리프 대체)
# ---------------------------------------------------------------
FONT_REG = "NotoSansKR"
FONT_BOLD = "NotoSansKR-Bold"
try:
    pdfmetrics.registerFont(TTFont(
        FONT_REG, "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", subfontIndex=2))
    pdfmetrics.registerFont(TTFont(
        FONT_BOLD, "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc", subfontIndex=2))
except Exception:
    FONT_REG, FONT_BOLD = "Helvetica", "Helvetica-Bold"

# ---------------------------------------------------------------
# 색상 팔레트 (원본 PDF 실측값)
# ---------------------------------------------------------------
NAVY = (0.105882, 0.090196, 0.376471)   # #1B1760  - 붙임 배지
GRAY = (0.94902, 0.94902, 0.94902)      # #F2F2F2  - 제목박스 / 표 헤더
BLACK = (0, 0, 0)
WHITE = (1, 1, 1)

PAGE_W, PAGE_H = A4
L_MARGIN = 59.5
R_MARGIN = PAGE_W - 59.5
CONTENT_W = R_MARGIN - L_MARGIN

LINE_GAP = 27          # 본문 줄간격(pt)
SECTION_GAP_BEFORE = 40  # 섹션 헤더 앞 여백


class ReportBuilder:
    def __init__(self, filepath, title=None, byline=None):
        self.c = canvas.Canvas(filepath, pagesize=A4)
        self.y = PAGE_H - 53.9  # 제목 박스 시작 top 기준
        self.filepath = filepath
        if title:
            self.title_box(title)
        if byline:
            self.byline(byline)

    # ---------- 내부 유틸 ----------
    def _set_fill(self, rgb):
        self.c.setFillColorRGB(*rgb)

    def _set_stroke(self, rgb):
        self.c.setStrokeColorRGB(*rgb)

    def new_page(self):
        self.c.showPage()
        self.y = PAGE_H - 40

    def _ensure_space(self, needed):
        if self.y - needed < 40:
            self.new_page()

    # ---------- 1. 제목 박스 ----------
    def title_box(self, text, size=22):
        box_w, box_h = 475.9, 44.5
        box_x = (PAGE_W - box_w) / 2
        box_top = PAGE_H - 53.9
        box_bottom = box_top - box_h

        # 배경
        self._set_fill(GRAY)
        self.c.rect(box_x, box_bottom, box_w, box_h, fill=1, stroke=0)

        # 이중 테두리 (위/왼쪽 얇게, 아래/오른쪽 굵게 -> 입체감)
        self._set_stroke(BLACK)
        self.c.setLineWidth(0.7)
        self.c.line(box_x, box_top, box_x + box_w, box_top)          # top
        self.c.line(box_x, box_bottom, box_x, box_top)                # left
        self.c.setLineWidth(1.4)
        self.c.line(box_x, box_bottom, box_x + box_w, box_bottom)     # bottom
        self.c.line(box_x + box_w, box_bottom, box_x + box_w, box_top)  # right

        # 텍스트 (가운데 정렬)
        self._set_fill(BLACK)
        self.c.setFont(FONT_BOLD, size)
        tw = self.c.stringWidth(text, FONT_BOLD, size)
        ty = box_bottom + (box_h - size) / 2 + 3
        self.c.drawString(box_x + (box_w - tw) / 2, ty, text)

        self.y = box_bottom - 22  # byline 자리

    # ---------- 2. 담당자 정보 ----------
    def byline(self, text, size=12):
        self._set_fill(BLACK)
        self.c.setFont(FONT_REG, size)
        tw = self.c.stringWidth(text, FONT_REG, size)
        self.c.drawString(R_MARGIN - tw, self.y, text)
        self.y -= 30

    # ---------- 3. 섹션 헤더 ----------
    def section(self, text, size=17):
        self._ensure_space(SECTION_GAP_BEFORE + LINE_GAP)
        self.y -= SECTION_GAP_BEFORE if self.y < PAGE_H - 120 else 0
        self._set_fill(BLACK)
        self.c.setFont(FONT_BOLD, size)
        self.c.drawString(L_MARGIN - 2.9, self.y, text)
        self.y -= LINE_GAP

    # ---------- 붙임 배지 헤더 ----------
    def badge_header(self, badge_text, title_text, size=18):
        self._ensure_space(60)
        box_w, box_h = 63.4, 32
        box_x = L_MARGIN - 2.5
        box_top = self.y + 10
        box_bottom = box_top - box_h

        self._set_fill(NAVY)
        self.c.rect(box_x, box_bottom, box_w, box_h, fill=1, stroke=0)

        self._set_fill(WHITE)
        self.c.setFont(FONT_BOLD, size)
        tw = self.c.stringWidth(badge_text, FONT_BOLD, size)
        self.c.drawString(box_x + (box_w - tw) / 2, box_bottom + (box_h - size) / 2 + 3, badge_text)

        self._set_fill(BLACK)
        self.c.setFont(FONT_BOLD, size)
        self.c.drawString(box_x + box_w + 10, box_bottom + (box_h - size) / 2 + 3, title_text)

        self.y = box_bottom - 25

    # ---------- 본문 개조식 텍스트 (자동 줄바꿈 지원) ----------
    def _wrap(self, text, font, size, max_w):
        words = list(text)  # 한글은 글자 단위로 줄바꿈
        lines, cur = [], ""
        for ch in words:
            test = cur + ch
            if self.c.stringWidth(test, font, size) > max_w and cur:
                lines.append(cur)
                cur = ch
            else:
                cur = test
        if cur:
            lines.append(cur)
        return lines

    def bullet(self, text, level=1, bold_prefix=None, size=15):
        """level 1 = □ , level 2 = ○"""
        self._ensure_space(LINE_GAP)
        mark = "□" if level == 1 else "○"
        indent = 46 if level == 1 else 30
        x = L_MARGIN + indent
        self._set_fill(BLACK)
        self.c.setFont(FONT_REG, size)
        self.c.drawString(L_MARGIN, self.y, mark)

        max_w = R_MARGIN - x
        lines = self._wrap(text, FONT_REG, size, max_w)
        for i, ln in enumerate(lines):
            self._ensure_space(LINE_GAP)
            self.c.setFont(FONT_REG, size)
            self.c.drawString(x, self.y, ln)
            self.y -= LINE_GAP

    def note(self, text, size=15):
        """※ 참고 각주"""
        self._ensure_space(LINE_GAP)
        x = L_MARGIN + 18
        self._set_fill(BLACK)
        self.c.setFont(FONT_REG, size)
        self.c.drawString(L_MARGIN, self.y, "※")
        max_w = R_MARGIN - x
        lines = self._wrap(text, FONT_REG, size, max_w)
        for ln in lines:
            self._ensure_space(LINE_GAP)
            self.c.drawString(x, self.y, ln)
            self.y -= LINE_GAP

    def spacer(self, h=10):
        self.y -= h

    # ---------- 표 ----------
    def table(self, headers, rows, col_widths=None, size=11, row_h=22):
        n = len(headers)
        if col_widths is None:
            col_widths = [CONTENT_W / n] * n
        x0 = L_MARGIN
        self._ensure_space(row_h * (len(rows) + 1) + 10)

        # 헤더
        x = x0
        top = self.y
        self._set_fill(GRAY)
        self.c.rect(x0, top - row_h, sum(col_widths), row_h, fill=1, stroke=0)
        self._set_stroke(BLACK)
        self.c.setLineWidth(0.6)
        self.c.rect(x0, top - row_h, sum(col_widths), row_h, fill=0, stroke=1)
        self._set_fill(BLACK)
        self.c.setFont(FONT_BOLD, size)
        for h, w in zip(headers, col_widths):
            tw = self.c.stringWidth(h, FONT_BOLD, size)
            self.c.drawString(x + (w - tw) / 2, top - row_h + (row_h - size) / 2 + 2, h)
            self.c.line(x, top, x, top - row_h)
            x += w
        self.c.line(x, top, x, top - row_h)
        self.y = top - row_h

        # 데이터 행
        self.c.setFont(FONT_REG, size)
        for row in rows:
            self._ensure_space(row_h)
            top = self.y
            x = x0
            self._set_stroke(BLACK)
            self.c.setLineWidth(0.5)
            self.c.rect(x0, top - row_h, sum(col_widths), row_h, fill=0, stroke=1)
            for val, w in zip(row, col_widths):
                s = str(val)
                tw = self.c.stringWidth(s, FONT_REG, size)
                self.c.drawString(x + (w - tw) / 2, top - row_h + (row_h - size) / 2 + 2, s)
                self.c.line(x, top, x, top - row_h)
                x += w
            self.c.line(x, top, x, top - row_h)
            self.y = top - row_h

        self.y -= 15

    # ---------- 저장 ----------
    def save(self):
        self.c.save()
        return self.filepath
