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

  window.MD = { toHtml, esc };
})();
