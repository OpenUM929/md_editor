# -*- coding: utf-8 -*-
"""rp_gen — 보고서 생성기 서버

    python app.py            ->  http://localhost:5055
"""
import io
import os
import re
import sys

from flask import (Flask, jsonify, render_template, request,
                   send_from_directory, abort)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))     # D:\dev\msys
sys.path.insert(0, HERE)

import md_blocks                                            # noqa: E402
import export_pdf                                           # noqa: E402

PORT = 5055
app = Flask(__name__, static_folder="static", template_folder="templates")

# 템플릿·정적파일 캐시 끄기.
# debug=False 이면 Jinja 가 템플릿을 메모리에 캐싱해, 서버 재시작 전까지 옛 화면이 나간다.
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0
app.jinja_env.auto_reload = True


@app.after_request
def no_cache(resp):
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp

# 편집 대상 문서 (프로젝트 루트의 산출물 md)
DOC_GLOB = ("MSYS_구축완료보고서.md", "MSYS_운영자메뉴얼.md",
            "MSYS_FP_종합분석표.md", "MSYS_FP_내부검토의견.md")


# ── 공통 ────────────────────────────────────────────────────
def safe_path(rel):
    """ROOT 밖으로 나가지 못하게 한다"""
    p = os.path.abspath(os.path.join(ROOT, rel.replace("/", os.sep)))
    if not p.startswith(ROOT):
        abort(403)
    return p


def read_md(path):
    with io.open(path, encoding="utf-8") as f:
        return f.read()


def find_missing(blocks):
    miss = []
    for b in blocks:
        if b["kind"] != "image":
            continue
        m = re.search(r'data-src="([^"]+)"', b["html"])
        if m and not os.path.exists(safe_path(m.group(1))):
            miss.append(m.group(1))
    return miss


# ── 화면 ────────────────────────────────────────────────────
def asset_ver():
    """정적파일 변경 시각 -> 캐시 무효화용 버전 문자열"""
    latest = 0
    for name in ("app.js", "paginate.js", "report.css"):
        p = os.path.join(HERE, "static", name)
        if os.path.exists(p):
            latest = max(latest, int(os.path.getmtime(p)))
    return str(latest)


@app.route("/")
def index():
    return render_template("index.html", ver=asset_ver())


@app.route("/print")
def print_view():
    """헤드리스 브라우저가 인쇄할 페이지 — 미리보기와 동일한 CSS/JS 사용"""
    path = request.args.get("path", "")
    md = read_md(safe_path(path))
    blocks = md_blocks.parse(md)
    return render_template("print.html", blocks=blocks, ver=asset_ver())


@app.route("/asset/<path:rel>")
def asset(rel):
    p = safe_path(rel)
    if not os.path.exists(p):
        abort(404)
    return send_from_directory(os.path.dirname(p), os.path.basename(p))


# ── API ─────────────────────────────────────────────────────
@app.route("/api/docs")
def api_docs():
    docs = []
    for name in DOC_GLOB:
        p = os.path.join(ROOT, name)
        if os.path.exists(p):
            docs.append(dict(name=name, path=name,
                             kb=round(os.path.getsize(p) / 1024.0, 1)))
    return jsonify(docs=docs)


@app.route("/api/doc")
def api_doc():
    return jsonify(md=read_md(safe_path(request.args.get("path", ""))))


@app.route("/api/parse", methods=["POST"])
def api_parse():
    md = request.json.get("md", "")
    blocks = md_blocks.parse(md)
    return jsonify(blocks=blocks, missing=find_missing(blocks))


@app.route("/api/replace", methods=["POST"])
def api_replace():
    d = request.json
    return jsonify(md=md_blocks.replace_block(
        d["md"], int(d["start"]), int(d["end"]), d["src"]))


@app.route("/api/insert", methods=["POST"])
def api_insert():
    d = request.json
    return jsonify(md=md_blocks.insert_before(d["md"], int(d["start"]), d["src"]))


@app.route("/api/delete", methods=["POST"])
def api_delete():
    d = request.json
    return jsonify(md=md_blocks.delete_block(d["md"], int(d["start"]), int(d["end"])))


@app.route("/api/edit", methods=["POST"])
def api_edit():
    """화면에서 고친 텍스트 필드 -> 블록 마크다운 재조립 -> 전체 md 갱신"""
    d = request.json
    src = md_blocks.serialize(d["kind"], d.get("meta") or {}, d.get("fields") or [])
    md = md_blocks.replace_block(d["md"], int(d["start"]), int(d["end"]), src)
    return jsonify(md=md, src=src)


@app.route("/api/save", methods=["POST"])
def api_save():
    d = request.json
    p = safe_path(d["path"])
    md = d["md"]
    with io.open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(md)
    return jsonify(ok=True, bytes=len(md.encode("utf-8")))


@app.route("/api/pdf", methods=["POST"])
def api_pdf():
    d = request.json
    rel = d["path"]
    p = safe_path(rel)

    # 저장하지 않은 편집분이 있으면 임시 파일로 인쇄한다
    tmp_rel = None
    if d.get("md"):
        tmp_rel = "temp/rp_gen/_preview.md"
        with io.open(safe_path(tmp_rel), "w", encoding="utf-8", newline="\n") as f:
            f.write(d["md"])
        target = tmp_rel
    else:
        target = rel

    out = os.path.splitext(p)[0] + ".pdf"
    url = "http://127.0.0.1:%d/print?path=%s" % (PORT, target.replace("\\", "/"))
    try:
        export_pdf.html_to_pdf(url, out)
    except Exception as e:
        return (str(e), 500)
    finally:
        if tmp_rel:
            try:
                os.remove(safe_path(tmp_rel))
            except OSError:
                pass

    return jsonify(pdf=os.path.basename(out),
                   pages=export_pdf.page_count(out),
                   kb=round(os.path.getsize(out) / 1024.0, 1))


if __name__ == "__main__":
    print("rp_gen  ->  http://localhost:%d" % PORT)
    print("문서 루트: %s" % ROOT)
    app.run(host="127.0.0.1", port=PORT, debug=False, threaded=True)
