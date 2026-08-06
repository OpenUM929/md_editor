# -*- coding: utf-8 -*-
"""마크다운 <-> 블록

핵심 원칙
    편집은 **블록 안의 텍스트 필드**만 바꾼다. 마크다운 재조립은 블록 종류(kind)마다
    정해진 틀(serialize)로 하므로, HTML 을 통째로 역변환할 때 생기는 구조 손실이 없다.
    왕복하는 서식은 굵게(**), 인라인코드(`), 줄바꿈(<br>) 뿐이다.
"""
import html
import re

# 이름 있는 페이지 표식 — 이게 정식 방식이다
PAGE_NAMED = re.compile(r'^<!--\s*page\s*:\s*(.*?)\s*-->$', re.I)

# 이름 없는 구형 표식 (호환 유지)
PAGEBREAK_PATTERNS = (
    re.compile(r'^<div\s+class="pagebreak"\s*>\s*</div>\s*$', re.I),
    re.compile(r'^<!--\s*pagebreak\s*-->$', re.I),
    re.compile(r'^!newpage$', re.I),
)


def page_marker(line):
    """페이지 표식이면 이름(없으면 '')을, 아니면 None 을 돌려준다"""
    s = line.strip()
    m = PAGE_NAMED.match(s)
    if m:
        return m.group(1)
    if any(p.match(s) for p in PAGEBREAK_PATTERNS):
        return ""
    return None

TAG = re.compile(r"<[^>]+>")


def is_pagebreak(line):
    s = line.strip()
    return any(p.match(s) for p in PAGEBREAK_PATTERNS)


# ── 인라인 마크다운 <-> HTML ────────────────────────────────
def inline(text):
    t = html.escape(text, quote=False)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", t)
    t = t.replace("&lt;br&gt;", "<br>")
    return t


def ed(field, text, cls="", tag="span"):
    """편집 가능한 텍스트 필드"""
    return '<%s class="ed %s" data-f="%d" contenteditable="true">%s</%s>' % (
        tag, cls, field, inline(text), tag)


def _cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


class B(object):
    _seq = 0

    def __init__(self, kind, start, end, src, html_, meta=None, fields=None):
        B._seq += 1
        self.d = dict(id="b%d" % B._seq, kind=kind, start=start, end=end,
                      src=src, html=html_, meta=meta or {}, fields=fields or [])


def parse(md_text):
    lines = md_text.split("\n")
    B._seq = 0
    out = []
    i, n = 0, len(lines)

    def add(kind, s, e, h, meta=None, fields=None):
        out.append(B(kind, s, e, "\n".join(lines[s:e]), h, meta, fields).d)

    if lines and lines[0].strip().startswith("<style>"):
        while i < n and "</style>" not in lines[i]:
            i += 1
        i += 1

    while i < n:
        raw, s = lines[i], lines[i].strip()

        if not s:
            i += 1
            continue

        pname = page_marker(raw)
        if pname is not None:
            add("pagebreak", i, i + 1,
                '<div class="r-pagemark noprint">페이지 — %s</div>'
                % html.escape(pname or "(이름 없음)"),
                meta=dict(name=pname, raw=raw.strip()))
            i += 1
            continue

        if s.startswith("# "):
            t = s[2:].strip()
            add("title", i, i + 1, '<div class="r-title">%s</div>' % ed(0, t), fields=[t])
            i += 1
            continue

        if s.startswith('<div align="right"'):
            st = i
            i += 1
            buf = []
            while i < n and "</div>" not in lines[i]:
                if lines[i].strip():
                    buf.append(lines[i].strip())
                i += 1
            i += 1
            t = " ".join(buf)
            add("byline", st, i, '<div class="r-byline">%s</div>' % ed(0, t), fields=[t])
            continue

        if s.startswith('<div class="headline"'):
            st = i
            i += 1
            buf = []
            while i < n and "</div>" not in lines[i]:
                if lines[i].strip():
                    buf.append(lines[i].strip())
                i += 1
            i += 1
            t = " ".join(buf)
            add("headline", st, i, '<div class="r-headline">%s</div>' % ed(0, t), fields=[t])
            continue

        if s.startswith('<table class="kpi"'):
            st = i
            body = []
            while i < n and "</table>" not in lines[i]:
                body.append(lines[i])
                i += 1
            body.append(lines[i] if i < n else "")
            i += 1
            rows = [re.findall(r"<td[^>]*>(.*?)</td>", r, re.S) for r in body if "<td" in r]
            rows = [[TAG.sub("", c).strip() for c in r] for r in rows]
            cols = list(zip(*rows)) if len(rows) >= 3 else []
            flat, h, k = [], ['<table class="r-kpi"><tr>'], 0
            for c in cols:
                h.append("<td>")
                for cls in ("k-lbl", "k-val", "k-sub"):
                    h.append(ed(k, c[["k-lbl", "k-val", "k-sub"].index(cls)], cls))
                    flat.append(c[["k-lbl", "k-val", "k-sub"].index(cls)])
                    k += 1
                h.append("</td>")
            h.append("</tr></table>")
            add("kpi", st, i, "".join(h), meta=dict(cols=len(cols)), fields=flat)
            continue

        if s.startswith('<span class="att"'):
            m = re.match(r'<span class="att">(.*?)</span>\s*(.*)', s)
            if m:
                a = m.group(1).strip()
                b_ = m.group(2).strip().strip("*")
                add("badge", i, i + 1,
                    '<div class="r-badge"><span class="bg">%s</span>%s</div>'
                    % (inline(a), ed(0, b_, "bt")), meta=dict(badge=a), fields=[b_])
            i += 1
            continue

        if s.startswith("<img"):
            m = re.search(r'src="([^"]+)"', s)
            src = m.group(1) if m else ""
            add("image", i, i + 1,
                '<div class="r-img"><img src="/asset/%s" data-src="%s"></div>'
                % (src, html.escape(src, quote=True)), meta=dict(raw=s))
            i += 1
            continue

        if s.startswith('<p class="cap"'):
            st = i
            buf = []
            while i < n:
                buf.append(lines[i])
                if "</p>" in lines[i]:
                    break
                i += 1
            i += 1
            txt = TAG.sub("", " ".join(buf)).strip()
            parts = [p.strip() for p in re.split("※", txt) if p.strip()]
            h = "".join('<div class="r-note">※ %s</div>' % ed(j, p)
                        for j, p in enumerate(parts))
            add("cap", st, i, h, fields=parts)
            continue

        if s.startswith("<") and not s.startswith("<img"):
            i += 1
            continue

        m = re.match(r"^(#{2,6})\s+(.*)$", s)
        if m:
            lvl, t = len(m.group(1)), m.group(2).strip()
            tag = {2: "h2", 3: "h3"}.get(lvl, "h4")
            cls = {2: "r-sec", 3: "r-sub"}.get(lvl, "r-sub4")
            add("heading", i, i + 1, ed(0, t, cls, tag), meta=dict(level=lvl), fields=[t])
            i += 1
            continue

        if s.startswith("```"):
            st, lang = i, s[3:].strip()
            i += 1
            buf = []
            while i < n and not lines[i].strip().startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1
            body = "\n".join(buf)
            add("code", st, i,
                '<pre class="r-code ed" data-f="0" contenteditable="true">%s</pre>'
                % html.escape(body), meta=dict(lang=lang), fields=[body])
            continue

        if s.startswith("|"):
            st, rows = i, []
            while i < n and lines[i].strip().startswith("|"):
                rows.append(_cells(lines[i]))
                i += 1
            if len(rows) >= 2:
                head, sep, body = rows[0], rows[1], rows[2:]
                al = []
                for c in sep:
                    c = c.strip()
                    al.append("center" if c.startswith(":") and c.endswith(":")
                              else ("right" if c.endswith(":") else "left"))
                w = len(head)
                al = (al + ["left"] * w)[:w]

                # 열 너비 = 구분선의 '-' 개수 비율. 모두 같으면 내용에 맞춰 자동.
                dash = [max(1, c.count("-")) for c in sep][:w]
                dash = (dash + [3] * w)[:w]
                spread = (max(dash) / float(min(dash))) if min(dash) else 1.0
                tot = float(sum(dash))
                if spread > 1.15:
                    cg = "".join('<col style="width:%.3f%%">' % (d * 100.0 / tot) for d in dash)
                    cg = "<colgroup>%s</colgroup>" % cg
                    tcls = "r-tbl fixed"
                else:
                    cg, tcls = "", "r-tbl auto"

                flat, k = [], 0
                h = ['<table class="%s" data-dash="%s">%s<thead><tr>'
                     % (tcls, ",".join(str(d) for d in dash), cg)]
                for c, a in zip(head, al):
                    h.append('<th style="text-align:%s">%s</th>' % (a, ed(k, c)))
                    flat.append(c)
                    k += 1
                h.append("</tr></thead><tbody>")
                for r in body:
                    r = (r + [""] * w)[:w]
                    h.append("<tr>")
                    for c, a in zip(r, al):
                        h.append('<td style="text-align:%s">%s</td>' % (a, ed(k, c)))
                        flat.append(c)
                        k += 1
                    h.append("</tr>")
                h.append("</tbody></table>")
                add("table", st, i, "".join(h),
                    meta=dict(cols=w, align=al, sep=sep), fields=flat)
            continue

        if s.startswith(">"):
            st, buf = i, []
            while i < n and lines[i].strip().startswith(">"):
                buf.append(lines[i].strip().lstrip(">").strip())
                i += 1
            t = " ".join(buf)
            add("note", st, i, '<div class="r-note">※ %s</div>' % ed(0, t), fields=[t])
            continue

        if s in ("---", "***", "___"):
            add("hr", i, i + 1, '<div class="r-hr"></div>', meta=dict(raw=s))
            i += 1
            continue

        st = i
        i += 1
        mk, lvl, t = None, 1, s
        if s[0] in "□▣":
            mk, t = s[0], s[1:].strip()
        elif s[0] in "○●":
            mk, lvl, t = s[0], 2, s[1:].strip()
        elif s.startswith("- [ ]") or s.startswith("- [x]"):
            mk, lvl, t = s[:5], 2, s[5:].strip()
        elif s.startswith("- "):
            mk, lvl, t = "-", 2, s[2:].strip()
        elif re.match(r"^\d+\.\s", s):
            mm = re.match(r"^(\d+)\.\s+(.*)$", s)
            mk, lvl, t = mm.group(1) + ".", 2, mm.group(2)
        elif s.startswith("※"):
            add("note2", st, i, '<div class="r-note">※ %s</div>' % ed(0, s.lstrip("※").strip()),
                fields=[s.lstrip("※").strip()])
            continue

        if mk is None:
            add("para", st, i, '<div class="r-p">%s</div>' % ed(0, t), fields=[t])
        else:
            sym = {"-": "○"}.get(mk, mk)
            if mk.startswith("- ["):
                sym = "□"
            add("bullet", st, i,
                '<div class="r-b%d"><span class="mk">%s</span>%s</div>'
                % (lvl, html.escape(sym), ed(0, t, "tx")),
                meta=dict(mark=mk, level=lvl), fields=[t])

    return out


# ── 블록 -> 마크다운 재조립 ─────────────────────────────────
def serialize(kind, meta, fields):
    f = [x if x is not None else "" for x in fields]
    g = (lambda i: f[i] if i < len(f) else "")

    if kind == "title":
        return "# " + g(0)
    if kind == "byline":
        return '<div align="right">\n\n%s\n\n</div>' % g(0)
    if kind == "headline":
        return '<div class="headline">\n%s\n</div>' % g(0)
    if kind == "badge":
        return '<span class="att">%s</span> **%s**' % (meta.get("badge", "붙임"), g(0))
    if kind == "heading":
        return "#" * int(meta.get("level", 2)) + " " + g(0)
    if kind == "code":
        return "```%s\n%s\n```" % (meta.get("lang", ""), g(0))
    if kind in ("note", "note2"):
        return ("> " if kind == "note" else "※ ") + g(0)
    if kind == "cap":
        return '<p class="cap">%s</p>' % "<br>\n".join("※ " + x for x in f if x.strip())
    if kind == "para":
        return g(0)
    if kind == "bullet":
        mk = meta.get("mark", "□")
        return ("%s %s" % (mk, g(0))) if not mk.startswith("- [") else ("%s %s" % (mk, g(0)))
    if kind == "kpi":
        cols = int(meta.get("cols", 0))
        rows = [[], [], []]
        for c in range(cols):
            for r in range(3):
                rows[r].append(g(c * 3 + r))
        cls = ["lbl", "val", "sub"]
        h = ['<table class="kpi">']
        for r in range(3):
            h.append("<tr>" + "".join('<td class="%s">%s</td>' % (cls[r], x)
                                      for x in rows[r]) + "</tr>")
        h.append("</table>")
        return "\n".join(h)
    if kind == "table":
        w = int(meta.get("cols", 1))
        sep = meta.get("sep") or ["---"] * w
        # 화면에서 열 너비를 끌어 조절했으면 dash 개수로 다시 만든다
        dash = meta.get("dash")
        if dash:
            al = meta.get("align") or ["left"] * w
            sep = []
            for d, a in zip(dash, al):
                body = "-" * max(3, int(d))
                sep.append(":" + body + ":" if a == "center"
                           else (body + ":" if a == "right" else body))
        rows = [f[i:i + w] for i in range(0, len(f), w)]
        if not rows:
            return ""
        out = ["| " + " | ".join(rows[0]) + " |",
               "|" + "|".join(sep) + "|"]
        for r in rows[1:]:
            out.append("| " + " | ".join((r + [""] * w)[:w]) + " |")
        return "\n".join(out)
    if kind == "pagebreak":
        return "<!-- page: %s -->" % (meta.get("name") or "")
    if kind in ("image", "hr"):
        return meta.get("raw", "")
    return g(0)


def insert_before(md_text, start, new_src):
    """지정한 줄 앞에 새 줄을 끼워 넣는다"""
    lines = md_text.split("\n")
    return "\n".join(lines[:start] + new_src.split("\n") + [""] + lines[start:])


def replace_block(md_text, start, end, new_src):
    lines = md_text.split("\n")
    return "\n".join(lines[:start] + new_src.split("\n") + lines[end:])


def delete_block(md_text, start, end):
    """블록을 줄째로 없앤다 (빈 줄이 세 개 이상 겹치면 정리)"""
    lines = md_text.split("\n")
    out = lines[:start] + lines[end:]
    cleaned, blank = [], 0
    for ln in out:
        if ln.strip():
            blank = 0
            cleaned.append(ln)
        else:
            blank += 1
            if blank <= 2:
                cleaned.append(ln)
    return "\n".join(cleaned)
