(() => {
  const esc = (v = '') => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

  const inline = (value) => esc(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const h = href.trim();
      const internal = h.match(/^(case|doc):([A-Z0-9.-]+)$/);
      if (internal) return `<a href="#${internal[1]}=${encodeURIComponent(internal[2])}">${label}</a>`;
      const safe = /^(?:javascript|data|vbscript):/i.test(h) ? '#' : h;
      return `<a href="${esc(safe)}" target="_blank" rel="noopener">${label}</a>`;
    });

  const toHtml = (markdown) => {
    const lines = String(markdown || '').replaceAll('\r\n', '\n').split('\n');
    const out = [];
    let para = [], listType = null, table = null, inCode = false, code = [];
    const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
    const closeList = () => { if (listType) out.push(`</${listType}>`); listType = null; };
    const flushTable = () => {
      if (!table) return;
      const [head, ...rows] = table;
      out.push(`<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c.trim())}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c.trim())}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      table = null;
    };
    for (const line of lines) {
      if (inCode) {
        if (/^```/.test(line.trim())) { out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); inCode = false; code = []; }
        else code.push(line);
        continue;
      }
      if (/^```/.test(line.trim())) { flushPara(); closeList(); flushTable(); inCode = true; continue; }
      if (/^\|.*\|$/.test(line.trim())) {
        flushPara(); closeList();
        const cells = line.trim().slice(1, -1).split('|');
        if (/^\s*:?-{3,}:?\s*$/.test(cells[0] || '')) continue;
        if (!table) table = [cells]; else table.push(cells);
        continue;
      }
      flushTable();
      const h = line.match(/^(#{1,6})\s+(.+)$/);
      if (h) { flushPara(); closeList(); const lv = Math.min(h[1].length + 1, 6); out.push(`<h${lv}>${inline(h[2])}</h${lv}>`); continue; }
      if (/^---+$/.test(line.trim())) { flushPara(); closeList(); out.push('<hr>'); continue; }
      const q = line.match(/^>\s?(.*)$/);
      if (q) { flushPara(); closeList(); if (!/^\[!/.test(q[1])) out.push(`<blockquote>${inline(q[1])}</blockquote>`); continue; }
      const ul = line.match(/^\s*[-*+]\s+(.+)$/);
      const ol = line.match(/^\s*\d+\.\s+(.+)$/);
      if (ul || ol) {
        flushPara();
        const t = ul ? 'ul' : 'ol';
        if (listType !== t) { closeList(); listType = t; out.push(`<${t}>`); }
        out.push(`<li>${inline((ul || ol)[1].replace(/^\[( |x)\]\s*/, (m, x) => (x === 'x' ? '☑ ' : '☐ ')))}</li>`);
        continue;
      }
      if (!line.trim()) { flushPara(); closeList(); continue; }
      para.push(line.trim());
    }
    flushPara(); closeList(); flushTable();
    if (inCode) out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
    return out.join('\n');
  };

  // ---------- Bilingual alignment ----------
  // Split markdown into blocks: each heading is its own block, code fences stay whole,
  // everything else is separated by blank lines.
  const splitBlocks = (markdown) => {
    const lines = String(markdown || '').replaceAll('\r\n', '\n').split('\n');
    const blocks = []; let cur = []; let inCode = false;
    const flush = () => { if (cur.length) { blocks.push(cur.join('\n')); cur = []; } };
    for (const line of lines) {
      if (inCode) { cur.push(line); if (/^```/.test(line.trim())) { inCode = false; flush(); } continue; }
      if (/^```/.test(line.trim())) { flush(); cur.push(line); inCode = true; continue; }
      if (/^#{1,6}\s+/.test(line)) { flush(); blocks.push(line); continue; }
      if (!line.trim()) { flush(); continue; }
      cur.push(line);
    }
    flush();
    return blocks;
  };
  // Section number as a comparable key: "3.8", "一、" → "1", "D4:" → "D4"; '' when unnumbered.
  const cnNum = (s) => { const d = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }; if (s === '十') return 10; const m = s.match(/^([一二三四五六七八九])?十([一二三四五六七八九])?$/); return m ? (m[1] ? d[m[1]] : 1) * 10 + (m[2] ? d[m[2]] : 0) : d[s]; };
  const headInfo = (b) => {
    const m = b.match(/^(#{1,6})\s+(.*)$/);
    if (!m) return null;
    const txt = m[2].trim();
    const n = txt.match(/^(D\d+|\d+(?:\.\d+)*)\b/) || txt.match(/^第?([一二三四五六七八九十]+)[、.．章节部分]/);
    return { level: m[1].length, num: n ? (/^[一二三四五六七八九十]+$/.test(n[1]) ? String(cnNum(n[1])) : n[1]) : '' };
  };
  const toSections = (blocks) => {
    const out = []; let cur = { head: null, blocks: [] };
    for (const b of blocks) {
      const h = headInfo(b);
      if (h) { if (cur.head || cur.blocks.length) out.push(cur); cur = { head: h, blocks: [b] }; } else cur.blocks.push(b);
    }
    if (cur.head || cur.blocks.length) out.push(cur);
    return out;
  };
  // Same level, and same number when both sides are numbered.
  const sameSection = (a, b) => (!a.head && !b.head) || (a.head && b.head && a.head.level === b.head.level && (!a.head.num || !b.head.num || a.head.num === b.head.num));
  // Longest-common-subsequence alignment so a section that exists in only one language
  // (e.g. a newly added "3.8") doesn't shift everything after it.
  const alignSections = (A, B) => {
    const n = A.length, m = B.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = sameSection(A[i], B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const pairs = []; let i = 0, j = 0;
    while (i < n && j < m) {
      if (sameSection(A[i], B[j])) pairs.push([A[i++], B[j++]]);
      else if (dp[i + 1][j] >= dp[i][j + 1]) pairs.push([A[i++], null]);
      else pairs.push([null, B[j++]]);
    }
    while (i < n) pairs.push([A[i++], null]);
    while (j < m) pairs.push([null, B[j++]]);
    return pairs;
  };

  // Render two markdown documents side by side, aligned block-by-block where the
  // structure matches and section-by-section where it doesn't.
  const toBilingualHtml = (primary, secondary, opts = {}) => {
    const { pLang = '', sLang = '', pLabel = '', sLabel = '' } = opts;
    const row = (a, b, cls = '') => `<div class="bi-row${cls}"><div class="bi-col" lang="${esc(pLang)}">${a}</div><div class="bi-col bi-alt" lang="${esc(sLang)}">${b}</div></div>`;
    const out = [];
    for (const [a, b] of alignSections(toSections(splitBlocks(primary)), toSections(splitBlocks(secondary)))) {
      if (a && b && a.blocks.length === b.blocks.length) {
        a.blocks.forEach((blk, k) => out.push(row(toHtml(blk), toHtml(b.blocks[k]), headInfo(blk) ? ' bi-head' : '')));
      } else {
        out.push(row(a ? toHtml(a.blocks.join('\n\n')) : '', b ? toHtml(b.blocks.join('\n\n')) : '', a && b ? ' bi-sec' : ' bi-gap'));
      }
    }
    return `<div class="bi"><div class="bi-row bi-legend"><div>${esc(pLabel)}</div><div>${esc(sLabel)}</div></div>${out.join('\n')}</div>`;
  };

  window.MD = { toHtml, toBilingualHtml, esc };
})();
