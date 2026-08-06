# -*- coding: utf-8 -*-
"""헤드리스 브라우저로 인쇄 → PDF

미리보기와 같은 HTML·CSS·JS 를 같은 엔진으로 인쇄하므로 화면과 결과가 어긋나지 않는다.
"""
import glob
import os
import subprocess
import time

CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
]


def find_browser():
    for p in CANDIDATES:
        if os.path.exists(p):
            return p
    for pat in (r"C:\Program Files*\**\chrome.exe", r"C:\Program Files*\**\msedge.exe"):
        hit = glob.glob(pat, recursive=True)
        if hit:
            return hit[0]
    raise RuntimeError(
        "Chrome 또는 Edge 를 찾지 못했습니다. PDF 출력에는 크로미움 계열 브라우저가 필요합니다.\n"
        "찾아본 경로:\n  " + "\n  ".join(CANDIDATES))


def html_to_pdf(url, out_path, wait_ms=12000, timeout=120):
    browser = find_browser()
    profile = os.path.join(os.environ.get("TEMP", "/tmp"), "rp_gen_profile")
    cmd = [
        browser,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--no-first-run",
        "--disable-extensions",
        "--user-data-dir=" + profile,
        "--virtual-time-budget=%d" % wait_ms,
        "--run-all-compositor-stages-before-draw",
        "--no-pdf-header-footer",
        "--print-to-pdf-no-header",
        "--print-to-pdf=" + out_path,
        url,
    ]
    if os.path.exists(out_path):
        try:
            os.remove(out_path)
        except OSError:
            pass

    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                       timeout=timeout)
    for _ in range(20):
        if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
            break
        time.sleep(0.25)

    if not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
        raise RuntimeError(
            "PDF 가 생성되지 않았습니다.\n브라우저: %s\n출력:\n%s"
            % (browser, (p.stdout or b"").decode("utf-8", "replace")[-1500:]))
    return out_path


def page_count(pdf_path):
    """의존성 없이 PDF 쪽수를 센다"""
    try:
        data = open(pdf_path, "rb").read()
        n = data.count(b"/Type /Page") + data.count(b"/Type/Page")
        n -= data.count(b"/Type /Pages") + data.count(b"/Type/Pages")
        return max(n, 0)
    except Exception:
        return 0
