/* rp_gen — 워드처럼 직접 편집 · 미리보기 · 저장
   화면에서 고치는 것은 "블록 안의 텍스트 필드"뿐이고,
   마크다운은 블록 종류마다 정해진 틀로 서버에서 재조립한다. */
(function () {
  "use strict";

  var BUILD = "named-pages-6";      // 화면 우측 상단에 표시된다. 이 값이 안 보이면 옛 파일이다.
  console.log("[rp_gen] app.js build =", BUILD);

  var $ = function (id) { return document.getElementById(id); };

  // 요소가 없어도 나머지 배선이 죽지 않게 한다.
  // (하나가 null 이면 그 뒤 addEventListener 가 전부 등록되지 않아 편집이 통째로 먹통이 됐다)
  var MISSING = [];
  function on(id, ev, fn, opt) {
    var el = $(id);
    if (!el) { MISSING.push(id); return null; }
    el.addEventListener(ev, fn, opt);
    return el;
  }
  function safe(id, dflt) {
    var el = $(id);
    if (el) return el;
    if (MISSING.indexOf(id) < 0) MISSING.push(id);
    return dflt || { style: {}, classList: { add: function () {}, remove: function () {} },
                     textContent: "", value: "", disabled: false,
                     appendChild: function () {}, querySelectorAll: function () { return []; } };
  }
  var state = { path: null, md: "", orig: "", blocks: {}, dirtyBlock: null };
  var reflow = null;
  var queue = Promise.resolve();     // 편집 반영은 순서대로. 겹쳐서 유실되지 않게.

  function msg(t, warn) {
    var m = safe("msg");
    m.textContent = t || "";
    m.style.color = warn ? "#ffb4b4" : "#9fb0c4";
  }

  function fail(where, e) {
    var text = where + ": " + (e && e.message ? e.message : e);
    console.error("[rp_gen]", where, e);
    var bar = safe("err");
    bar.textContent = text;
    bar.style.display = "block";
  }

  function clearFail() { safe("err").style.display = "none"; }

  function api(url, opt) {
    return fetch(url, opt).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(t || ("HTTP " + r.status)); });
      return r.json();
    });
  }

  function setDirty() {
    var clean = (state.md === state.orig);
    safe("save").disabled = clean;
    safe("dirty").style.display = clean ? "none" : "inline";
  }

  // ── 인라인 HTML -> 마크다운 (닫힌 집합만) ─────────────────
  function inlineToMd(el) {
    var out = "";
    (function walk(node) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var c = node.childNodes[i];
        if (c.nodeType === 3) { out += c.nodeValue; continue; }
        if (c.nodeType !== 1) continue;
        var tag = c.tagName.toLowerCase();
        if (tag === "br") { out += "\n"; continue; }
        if (tag === "strong" || tag === "b") { out += "**"; walk(c); out += "**"; continue; }
        if (tag === "code") { out += "`"; walk(c); out += "`"; continue; }
        walk(c);   // 그 외 태그는 벗겨내고 내용만
      }
    })(el);
    return out.replace(/ /g, " ").replace(/\*\*\s*\*\*/g, "").trim();
  }

  // ── 렌더 ──────────────────────────────────────────────────
  function render(keepFocusId) {
    return api("/api/parse", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ md: state.md })
    }).then(function (res) {
      state.blocks = {};
      res.blocks.forEach(function (b) { state.blocks[b.id] = b; });
      var pg = Paginator.paginate(res.blocks, $("view"));
      safe("pages").textContent = pg.count + " 쪽" + (pg.named ? " (이름 페이지)" : " (자동)");

      var w = [];
      if ((res.missing || []).length) w.push("이미지 누락 " + res.missing.length + "건");
      if (pg.over.length) w.push("넘침 " + pg.over.length + "쪽");
      safe("warn").textContent = w.join(" · ");

      if (pg.over.length) {
        fail("A4 넘침", new Error(
          pg.over.map(function (o) {
            return o.no + "쪽" + (o.name ? "(" + o.name + ")" : "") + " — " + o.mm + "mm 초과";
          }).join("\n") +
          "\n내용을 줄이거나 페이지 표식을 추가하세요. (자동으로 나누지 않습니다)"));
      }
      markMissing(res.missing || []);
      attachGrips();
      attachTools();
      if (!pg.over.length) clearFail();
      diagnose(res.blocks.length);
      if ($("src").offsetParent) $("src").value = state.md;
      if (keepFocusId) {
        var el = document.querySelector('[data-bid="' + keepFocusId + '"] .ed');
        if (el) placeCaretEnd(el);
      }
    }).catch(function (e) { fail("렌더", e); });
  }

  // ── 페이지 표식 ───────────────────────────────────────────
  function renamePage(el) {
    var b = state.blocks[el.dataset.bid];
    if (!b) return;
    var name = (el.textContent || "").trim();
    if (name === "이름 없음") name = "";
    if (name === (b.meta.name || "")) return;
    queue = queue.then(function () {
      return api("/api/edit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          md: state.md, start: b.start, end: b.end,
          kind: "pagebreak", meta: { name: name }, fields: []
        })
      }).then(function (res) { state.md = res.md; setDirty(); return render(); });
    }).catch(function (e) { fail("쪽 이름", e); queue = Promise.resolve(); });
  }

  function insertPageBreak() {
    var blk = state.lastBlock;
    if (!blk || !state.blocks[blk.dataset.bid]) {
      alert("페이지를 시작할 위치의 본문을 먼저 클릭해 주세요.\n" +
            "그 블록 바로 앞에서 새 쪽이 시작됩니다.");
      return;
    }
    var b = state.blocks[blk.dataset.bid];
    var name = prompt("새 페이지 이름", "");
    if (name === null) return;
    queue = queue.then(function () {
      return api("/api/insert", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ md: state.md, start: b.start,
                               src: "<!-- page: " + name.trim() + " -->" })
      }).then(function (res) { state.md = res.md; setDirty(); return render(); });
    }).catch(function (e) { fail("페이지 삽입", e); queue = Promise.resolve(); });
  }

  // ── 자가 진단 ─────────────────────────────────────────────
  function diagnose(nBlocks) {
    var v = $("view");
    var ed = v ? v.querySelectorAll(".ed").length : 0;
    var ce = v ? v.querySelectorAll('[contenteditable="true"]').length : 0;
    var line = "build " + BUILD + " · 블록 " + nBlocks + " · 편집필드 " + ed + " / ce " + ce;
    console.log("[rp_gen] " + line);
    var el = $("build");
    if (el) el.textContent = line;

    if (ed > 0 && ce === 0) {
      fail("편집 불가", new Error(
        "편집 필드는 " + ed + "개 있는데 contenteditable 이 0개입니다. " +
        "서버가 옛 md_blocks.py 를 쓰고 있습니다 — 서버를 재시작하세요."));
    } else if (ed === 0 && nBlocks > 0) {
      fail("편집 불가", new Error(
        "편집 필드가 하나도 없습니다. 브라우저가 옛 화면을 캐시 중입니다 — Ctrl+F5 하세요."));
    }
  }

  // ── 블록 도구 (삭제) ──────────────────────────────────────
  var KIND_KO = {
    title: "제목", byline: "담당자", headline: "헤드라인", kpi: "지표 카드",
    badge: "붙임 배지", heading: "제목줄", table: "표", image: "이미지",
    code: "코드", note: "각주", cap: "캡션", bullet: "항목", para: "문단",
    hr: "구분선", pagebreak: "페이지 나눔"
  };

  function attachTools() {
    Array.prototype.forEach.call($("view").querySelectorAll(".blk"), function (blk) {
      if (blk.querySelector(":scope > .blk-tools")) return;
      var b = state.blocks[blk.dataset.bid];
      if (!b) return;

      var bar = document.createElement("div");
      bar.className = "blk-tools noprint";
      bar.contentEditable = "false";

      var del = document.createElement("button");
      del.className = "bt-del";
      del.type = "button";
      del.textContent = "✕";
      del.title = (KIND_KO[b.kind] || b.kind) + " 블록 통째로 삭제";
      del.addEventListener("mousedown", function (e) {
        e.preventDefault(); e.stopPropagation();
        deleteBlock(blk);
      });

      bar.appendChild(del);
      blk.appendChild(bar);
    });
  }

  function deleteBlock(blk) {
    var b = state.blocks[blk.dataset.bid];
    if (!b) return;
    var label = KIND_KO[b.kind] || b.kind;
    var peek = (b.src || "").replace(/\s+/g, " ").slice(0, 40);
    if (!confirm(label + " 블록을 삭제합니다.\n\n" + peek +
                 "\n\n되돌리려면 상단 [되돌리기] 를 누르세요.")) return;

    queue = queue.then(function () {
      return api("/api/delete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ md: state.md, start: b.start, end: b.end })
      }).then(function (res) {
        state.md = res.md;
        setDirty();
        return render();
      });
    }).catch(function (e) {
      fail("블록 삭제", e);
      queue = Promise.resolve();
    });
  }

  // ── 열 너비 끌어 조절 ─────────────────────────────────────
  function attachGrips() {
    Array.prototype.forEach.call($("view").querySelectorAll("table.r-tbl"), function (tb) {
      var ths = tb.querySelectorAll("thead th");
      for (var i = 0; i < ths.length - 1; i++) {
        (function (idx) {
          var g = document.createElement("div");
          g.className = "colgrip";
          g.contentEditable = "false";
          ths[idx].appendChild(g);
          g.addEventListener("mousedown", function (e) {
            e.preventDefault(); e.stopPropagation();
            startDrag(tb, idx, e.clientX, g);
          });
        })(i);
      }
    });
  }

  function startDrag(tb, idx, x0, grip) {
    var blk = tb.closest(".blk");
    var b = state.blocks[blk.dataset.bid];
    if (!b) return;
    var n = b.meta.cols;
    var dash = (tb.dataset.dash || "").split(",").map(Number);
    if (dash.length !== n || dash.some(isNaN)) {
      var ths = tb.querySelectorAll("thead th");
      dash = [];
      for (var i = 0; i < n; i++) dash.push(Math.max(3, Math.round(ths[i].offsetWidth / 6)));
    }
    var total = tb.offsetWidth, sum = dash.reduce(function (a, c) { return a + c; }, 0);
    var a0 = dash[idx], b0 = dash[idx + 1];
    grip.classList.add("on");
    document.body.style.cursor = "col-resize";

    function move(e) {
      var d = Math.round((e.clientX - x0) / total * sum);
      var na = a0 + d, nb = b0 - d;
      if (na < 3 || nb < 3) return;
      dash[idx] = na; dash[idx + 1] = nb;
      var cols = tb.querySelectorAll("colgroup col");
      if (cols.length === n) {
        for (var i = 0; i < n; i++) cols[i].style.width = (dash[i] * 100 / sum) + "%";
      }
    }
    function up() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      grip.classList.remove("on");
      document.body.style.cursor = "";
      tb.dataset.dash = dash.join(",");
      pushEdit(blk, true, { dash: dash });
    }
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }

  function markMissing(list) {
    if (!list.length) return;
    var set = {};
    list.forEach(function (s) { set[s] = 1; });
    Array.prototype.forEach.call(document.querySelectorAll("#view .r-img img"), function (img) {
      if (set[img.dataset.src]) {
        var d = img.parentNode;
        d.classList.add("missing");
        d.textContent = "이미지 없음: " + img.dataset.src;
      }
    });
  }

  function placeCaretEnd(el) {
    el.focus();
    var r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  // ── 편집 반영 ─────────────────────────────────────────────
  function collect(blkEl) {
    var b = state.blocks[blkEl.dataset.bid];
    if (!b) return null;
    var fields = b.fields.slice();
    Array.prototype.forEach.call(blkEl.querySelectorAll(".ed"), function (el) {
      var i = parseInt(el.dataset.f, 10);
      fields[i] = (b.kind === "code") ? el.textContent : inlineToMd(el);
    });
    return { b: b, fields: fields };
  }

  function pushEdit(blkEl, reflowAfter, metaOverride) {
    var c = collect(blkEl);
    if (!c) return Promise.resolve();
    var meta = c.b.meta;
    if (metaOverride) {
      meta = JSON.parse(JSON.stringify(meta));
      for (var k in metaOverride) meta[k] = metaOverride[k];
    }
    // 앞선 반영이 끝난 뒤에 이어서 보낸다 (겹치면 유실되던 문제)
    queue = queue.then(function () {
      return api("/api/edit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          md: state.md, start: c.b.start, end: c.b.end,
          kind: c.b.kind, meta: meta, fields: c.fields
        })
      }).then(function (res) {
        state.md = res.md;
        setDirty();
        clearFail();
        if (reflowAfter) return render();
      });
    }).catch(function (e) {
      fail("편집 반영", e);
      queue = Promise.resolve();
    });
    return queue;
  }

  // ── 문서 ──────────────────────────────────────────────────
  function loadDocs() {
    return api("/api/docs").then(function (res) {
      var sel = $("docs"); sel.innerHTML = "";
      res.docs.forEach(function (d) {
        var o = document.createElement("option");
        o.value = d.path; o.textContent = d.name + "  (" + d.kb + " KB)";
        sel.appendChild(o);
      });
      if (res.docs.length) loadDoc(res.docs[0].path);
    });
  }

  function loadDoc(path) {
    return api("/api/doc?path=" + encodeURIComponent(path)).then(function (res) {
      state.path = path; state.md = res.md; state.orig = res.md;
      $("src").value = res.md;
      setDirty(); msg("");
      return render();
    });
  }

  function save() {
    api("/api/save", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: state.path, md: state.md })
    }).then(function (res) {
      state.orig = state.md; setDirty();
      msg("저장됨 (" + res.bytes + " bytes)");
    }).catch(function (e) { msg("저장 실패: " + e.message, true); });
  }

  function savePdf() {
    var btn = $("pdf");
    btn.disabled = true; btn.textContent = "생성 중…";
    var dirty = state.md !== state.orig;
    api("/api/pdf", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: state.path, md: dirty ? state.md : null })
    }).then(function (res) {
      msg("PDF 저장됨: " + res.pdf + " (" + res.pages + "쪽, " + res.kb + " KB)");
    }).catch(function (e) {
      msg("PDF 실패: " + e.message, true);
      alert("PDF 생성 실패\n\n" + e.message);
    }).then(function () { btn.disabled = false; btn.textContent = "PDF로 저장"; });
  }

  // ── 배선 ──────────────────────────────────────────────────
  function afterType() {
    var el = document.activeElement;
    if (!el || !el.classList || !el.classList.contains("ed")) return;
    var blk = el.closest(".blk");
    if (!blk) return;
    state.dirtyBlock = blk;
    clearTimeout(reflow);
    reflow = setTimeout(function () { pushEdit(blk, false); }, 400);
  }

  function boldCmd() { document.execCommand("bold", false, null); afterType(); }

  document.addEventListener("DOMContentLoaded", function () {
    // ① 편집 배선을 가장 먼저 — 툴바에 문제가 있어도 편집은 살아 있어야 한다
    on("view", "input", afterType);

    on("view", "keydown", function (e) {
      var el = e.target;
      if (!el.classList || !el.classList.contains("ed")) return;
      if (e.key === "Enter" && el.tagName !== "PRE") {
        e.preventDefault();
        document.execCommand("insertLineBreak");
      }
    });

    on("view", "paste", function (e) {
      var el = e.target;
      if (!el.classList || !el.classList.contains("ed")) return;
      e.preventDefault();
      var t = (e.clipboardData || window.clipboardData).getData("text/plain");
      document.execCommand("insertText", false, t);
    });

    // 마지막으로 만진 블록 기억 (페이지 표식 삽입 위치)
    on("view", "focusin", function (e) {
      var blk = e.target.closest ? e.target.closest(".blk") : null;
      if (blk) state.lastBlock = blk;
    });
    on("view", "click", function (e) {
      var blk = e.target.closest ? e.target.closest(".blk") : null;
      if (blk) state.lastBlock = blk;
    });

    // 쪽 이름표 편집
    on("view", "focusout", function (e) {
      if (e.target.classList && e.target.classList.contains("ed-page")) renamePage(e.target);
    });
    on("view", "keydown", function (e) {
      if (e.target.classList && e.target.classList.contains("ed-page") && e.key === "Enter") {
        e.preventDefault(); e.target.blur();
      }
    });

    on("view", "focusout", function (e) {
      var el = e.target;
      if (!el.classList || !el.classList.contains("ed")) return;
      var blk = el.closest(".blk");
      clearTimeout(reflow);
      setTimeout(function () {
        if (document.activeElement && document.activeElement.closest &&
            document.activeElement.closest(".blk") === blk) return;
        pushEdit(blk, true);
      }, 60);
    });

    document.addEventListener("keydown", function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      var k = (e.key || "").toLowerCase();
      if (k === "b") { e.preventDefault(); boldCmd(); }
      if (k === "s") { e.preventDefault(); save(); }
    });

    // ② 툴바
    on("docs", "change", function () { loadDoc(this.value); });
    on("save", "click", save);
    on("pdf", "click", savePdf);
    on("reload", "click", function () { render(); });
    on("revert", "click", function () { state.md = state.orig; setDirty(); render(); });
    on("bold", "mousedown", function (e) { e.preventDefault(); boldCmd(); });
    on("newpage", "click", insertPageBreak);

    on("toggle-src", "click", function () {
      var l = safe("left");
      var show = (l.style.display === "none" || !l.style.display);
      l.style.display = show ? "flex" : "none";
      this.textContent = show ? "소스 숨기기" : "소스 보기";
      if (show) safe("src").value = state.md;
      clearTimeout(reflow);
      reflow = setTimeout(render, 250);
    });

    on("src", "input", function () {
      clearTimeout(reflow);
      reflow = setTimeout(function () {
        state.md = safe("src").value; setDirty(); render();
      }, 500);
    });

    if (MISSING.length) {
      fail("화면 요소 누락", new Error(
        MISSING.join(", ") + " — 브라우저가 옛 화면을 캐시하고 있을 수 있습니다. " +
        "Ctrl+F5 로 강력 새로고침 해 주세요."));
    }

    // ③ 문서 적재
    loadDocs();
  });
})();
