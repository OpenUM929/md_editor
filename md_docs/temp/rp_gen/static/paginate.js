/* A4 페이지 분할 엔진
   추정하지 않는다. 실제로 그려서 getBoundingClientRect() 로 잰다. */
(function (global) {
  "use strict";

  var MM = null;                       // 1mm 가 몇 px 인지 (브라우저 확대율 반영)
  function mm(v) {
    if (MM === null) {
      var p = document.createElement("div");
      p.style.cssText = "position:absolute;visibility:hidden;width:100mm";
      document.body.appendChild(p);
      MM = p.getBoundingClientRect().width / 100;
      document.body.removeChild(p);
    }
    return v * MM;
  }

  function makeRuler() {
    var r = document.getElementById("__ruler");
    if (r) { r.innerHTML = ""; return r; }
    r = document.createElement("div");
    r.id = "__ruler";
    r.className = "page";
    r.style.cssText =
      "position:absolute;left:-99999px;top:0;height:auto;padding:0;margin:0;" +
      "box-shadow:none;width:" + mm(168) + "px";
    document.body.appendChild(r);
    return r;
  }

  /** 표를 remaining 높이에 맞춰 앞부분/뒷부분으로 쪼갠다. 못 쪼개면 null */
  function splitTable(el, ruler, remaining) {
    var head = el.querySelector("thead");
    var rows = Array.prototype.slice.call(el.querySelectorAll("tbody > tr"));
    if (rows.length < 2) return null;

    var probe = el.cloneNode(true);
    var pBody = probe.querySelector("tbody");
    while (pBody.firstChild) pBody.removeChild(pBody.firstChild);
    ruler.appendChild(probe);

    var fit = 0;
    for (var i = 0; i < rows.length; i++) {
      pBody.appendChild(rows[i].cloneNode(true));
      if (probe.getBoundingClientRect().height > remaining) { break; }
      fit = i + 1;
    }
    ruler.removeChild(probe);
    if (fit < 1 || fit >= rows.length) return null;   // 최소 1행은 남겨야 의미가 있다

    var first = el.cloneNode(true);
    var fb = first.querySelector("tbody");
    while (fb.firstChild) fb.removeChild(fb.firstChild);
    rows.slice(0, fit).forEach(function (r) { fb.appendChild(r.cloneNode(true)); });

    var rest = el.cloneNode(true);
    var rb = rest.querySelector("tbody");
    while (rb.firstChild) rb.removeChild(rb.firstChild);
    rows.slice(fit).forEach(function (r) { rb.appendChild(r.cloneNode(true)); });
    if (head) { /* 헤더는 clone 에 이미 포함 → 다음 쪽에서 반복된다 */ }

    return [first, rest];
  }

  /**
   * blocks: [{id, kind, html}]
   * host  : 페이지들이 들어갈 컨테이너
   */
  function paginate(blocks, host) {
    var ruler = makeRuler();
    var PAGE_H = mm(255);
    host.innerHTML = "";

    // 문서에 페이지 표식이 하나라도 있으면 '이름 페이지' 방식.
    // 표식으로만 나누고, 넘쳐도 임의로 쪼개지 않는다.
    var named = blocks.some(function (b) { return b.kind === "pagebreak"; });

    var pages = [];
    var cur = null;

    function newPage(name, bid) {
      var label = document.createElement("div");
      label.className = "page-label noprint";
      var page = document.createElement("div");
      page.className = "page";
      host.appendChild(label);
      host.appendChild(page);
      cur = { el: page, label: label, name: name || "", used: 0, bid: bid || null };
      pages.push(cur);
      return cur;
    }

    function measure(node) {
      ruler.appendChild(node);
      var h = node.getBoundingClientRect().height;
      ruler.removeChild(node);
      return h;
    }

    newPage(named ? "" : null);

    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];

      if (b.kind === "pagebreak") {
        var nm = (b.meta && b.meta.name) || "";
        // 첫 표식이 문서 맨 앞이면 비어 있는 1쪽을 재사용한다
        if (cur.used === 0 && pages.length === 1) { cur.name = nm; cur.bid = b.id; }
        else newPage(nm, b.id);
        continue;
      }

      var wrap = document.createElement("div");
      wrap.className = "blk";
      wrap.dataset.bid = b.id;
      wrap.innerHTML = b.html;
      var h = measure(wrap);

      if (!named) {
        // 표식이 없는 문서는 종전대로 높이에 따라 자동 분할
        if ((b.kind === "heading" || b.kind === "badge") &&
            cur.used + h + mm(22) > PAGE_H && cur.used > 0) newPage();

        if (cur.used + h > PAGE_H) {
          var table = wrap.querySelector("table.r-tbl");
          var remaining = PAGE_H - cur.used;
          if (table && remaining > mm(28)) {
            var parts = splitTable(table, ruler, remaining - mm(4));
            if (parts) {
              var w1 = document.createElement("div");
              w1.className = "blk"; w1.dataset.bid = b.id; w1.dataset.part = "1";
              w1.appendChild(parts[0]);
              cur.el.appendChild(w1);
              newPage();
              var w2 = document.createElement("div");
              w2.className = "blk"; w2.dataset.bid = b.id; w2.dataset.part = "2";
              w2.appendChild(parts[1]);
              cur.el.appendChild(w2);
              cur.used = measure(w2.cloneNode(true));
              continue;
            }
          }
          if (cur.used > 0) newPage();
        }
      }

      // 한 쪽보다 큰 이미지는 축소해서라도 담는다
      if (h > PAGE_H) {
        var img = wrap.querySelector("img");
        if (img) {
          img.style.maxHeight = (PAGE_H - mm(6)) + "px";
          img.style.width = "auto";
          h = measure(wrap);
        }
      }

      cur.el.appendChild(wrap);
      cur.used += h;
    }

    // 쪽번호 · 이름표 · 넘침 표시
    var over = [];
    pages.forEach(function (p, idx) {
      var no = idx + 1;
      var n = document.createElement("div");
      n.className = "pno";
      n.textContent = "- " + no + " -";
      p.el.appendChild(n);

      var excess = p.used - PAGE_H;
      var warn = "";
      if (excess > 1) {
        var mmOver = Math.round(excess / mm(1));
        p.el.classList.add("over");
        p.label.classList.add("over");
        warn = ' <span class="pl-warn">⚠ ' + mmOver + "mm 넘침</span>";
        over.push({ no: no, name: p.name, mm: mmOver });
      }
      // 쪽 이름은 여기서 바로 고칠 수 있다 (표식이 있는 쪽만)
      var nameHtml = p.bid
        ? '<span class="pl-name ed-page" data-bid="' + p.bid +
          '" contenteditable="true" spellcheck="false">' +
          (p.name || "이름 없음") + "</span>"
        : '<span class="pl-none">표식 없음</span>';
      p.label.innerHTML = '<span class="pl-no">' + no + "쪽</span> · " + nameHtml + warn;
    });

    return { count: pages.length, over: over, named: named };
  }

  global.Paginator = { paginate: paginate, mm: mm };
})(window);
