(() => {
  const C = window.__CATALOG__;
  const { esc, toHtml } = window.MD;
  const { t, setLang, getLang, init: i18nInit } = window.I18N;
  const $ = (id) => document.getElementById(id);
  if (!C) { document.querySelector('main').innerHTML = `<p>${t('no.catalog')}</p>`; return; }

  const T = C.taxonomy;
  const caseById = new Map(C.cases.map((c) => [c.id, c]));
  const docById = new Map(C.docs.map((d) => [d.id, d]));
  const reviewClass = { approved: 'ok', draft: 'warn', 'technical-review': 'accent', 'compliance-review': 'accent', retired: 'bad' };
  const fmt = (v) => (v === undefined || v === null || v === '' ? '—' : typeof v === 'number' ? v.toLocaleString('en-US') : esc(v));
  const tx = (cat, key) => { const m = t('tx.' + cat); return (m && m[key]) || key; };
  const EN = window.__CASES_EN__ || {};
  const cl = (c, field) => (getLang() === 'en' && EN[c.id] && EN[c.id][field]) || c[field];
  const REG = window.__REGISTRY_EN__ || {};
  const DOCS_EN = window.__DOCS_EN__ || {};
  const rl = (section, id, field) => { const r = REG[section]; return (getLang() === 'en' && r && r[id] && r[id][field]) || undefined; };
  const docTitle = (d) => (getLang() === 'en' && DOCS_EN[d.id] && DOCS_EN[d.id].title) || (getLang() === 'en' && REG.docs && REG.docs[d.id] && REG.docs[d.id].title) || d.title;
  const docContent = (d) => (getLang() === 'en' && DOCS_EN[d.id] && DOCS_EN[d.id].content) || d.content;
  const unitMap = { '条': 'pcs', '吨': 'tonnes', '件': 'pcs', '米': 'm', '套': 'sets', '片': 'panels', '张': 'sheets' };
  const tu = (u) => (getLang() === 'en' && unitMap[u]) || u;

  const updateBuildInfo = () => {
    $('buildInfo').textContent = t('build.info', C.libraryVersion, C.builtAt.slice(0, 10), C.cases.length);
  };

  // ---------- i18n ----------
  i18nInit();
  updateBuildInfo();

  $('langToggle').addEventListener('click', () => {
    setLang(getLang() === 'zh' ? 'en' : 'zh');
    updateBuildInfo();
    renderFilters();
    renderCases();
    renderRegistry();
    renderHealth();
    renderDocs();
  });

  // ---------- Tabs and routing ----------
  const showTab = (name) => {
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab').forEach((s) => { s.hidden = s.id !== `tab-${name}`; });
  };
  $('tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) location.hash = `tab=${b.dataset.tab}`; });

  const route = () => {
    const h = decodeURIComponent(location.hash.slice(1));
    const [k, v] = h.split('=');
    if (k === 'case' && caseById.has(v)) return openCase(v);
    if (k === 'doc' && docById.has(v)) return openDoc(v);
    closeReader(false);
    showTab(k === 'tab' && v ? v : 'cases');
  };
  window.addEventListener('hashchange', route);

  // ---------- Case list ----------
  const fill = (id, label, entries) => {
    $(id).innerHTML = `<option value="">${t('filter.all', label)}</option>` + entries.map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join('');
  };
  const renderFilters = () => {
    fill('fDomain', t('filter.domain'), Object.keys(T.domains).map((k) => [k, tx('domains', k)]));
    fill('fStage', t('filter.stage'), Object.keys(T.stages).map((k) => [k, tx('stages', k)]));
    fill('fType', t('filter.type'), Object.keys(T.caseTypes).map((k) => [k, tx('caseTypes', k)]));
    const usedFailures = [...new Set(C.cases.flatMap((c) => c.failureModes))];
    fill('fFailure', t('filter.failure'), usedFailures.map((k) => [k, tx('failureModes', k)]));
    fill('fReview', t('filter.review'), Object.keys(T.reviewStatuses).map((k) => [k, tx('reviewStatuses', k)]));
  };
  renderFilters();

  const card = (c) => `
    <button class="card" data-case="${c.id}">
      <div class="badges">
        <span class="badge accent">${c.id}</span>
        <span class="badge">${esc(tx('domains', c.domain))}</span>
        <span class="badge">${esc(tx('stages', c.stage))}</span>
        <span class="badge">${esc(tx('caseTypes', c.caseType))}</span>
        <span class="badge ${reviewClass[c.review.status] || ''}">${esc(tx('reviewStatuses', c.review.status))}</span>
      </div>
      <h3>${esc(cl(c, 'title'))}</h3>
      <div class="headline">${esc(cl(c, 'headline'))}</div>
      <p>${esc(cl(c, 'summary'))}</p>
    </button>`;

  const renderCases = () => {
    const q = $('q').value.trim().toLowerCase();
    const f = { domain: $('fDomain').value, stage: $('fStage').value, caseType: $('fType').value, failure: $('fFailure').value, review: $('fReview').value };
    const list = C.cases.filter((c) => (!f.domain || c.domain === f.domain) && (!f.stage || c.stage === f.stage) && (!f.caseType || c.caseType === f.caseType)
      && (!f.failure || c.failureModes.includes(f.failure)) && (!f.review || c.review.status === f.review)
      && (!q || [c.id, c.title, c.summary, c.product, ...c.standards, ...c.failureModes.map((x) => tx('failureModes', x))].join(' ').toLowerCase().includes(q)));
    $('caseGrid').innerHTML = list.map(card).join('') || `<p class="muted">${t('no.match')}</p>`;
    $('caseCount').textContent = `${list.length} / ${C.cases.length}`;
  };
  ['q', 'fDomain', 'fStage', 'fType', 'fFailure', 'fReview'].forEach((id) => $(id).addEventListener('input', renderCases));
  $('caseGrid').addEventListener('click', (e) => { const b = e.target.closest('[data-case]'); if (b) location.hash = `case=${b.dataset.case}`; });

  // ---------- Reader ----------
  let lastTab = 'cases';
  const openReader = (meta, title, html) => {
    $('readerMeta').innerHTML = meta; $('readerTitle').textContent = title; $('readerBody').innerHTML = html;
    $('reader').hidden = false; $('readerBody').scrollTop = 0; document.body.style.overflow = 'hidden';
  };
  const closeReader = (updateHash = true) => {
    if ($('reader').hidden) return;
    $('reader').hidden = true; document.body.style.overflow = '';
    if (updateHash) location.hash = `tab=${lastTab}`;
  };
  $('readerClose').addEventListener('click', () => closeReader());
  $('reader').addEventListener('click', (e) => { if (e.target.id === 'reader') closeReader(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeReader(); });

  const factsHtml = (c) => {
    const e = EN[c.id] || {};
    const m = C.metrics;
    const isEn = getLang() === 'en';
    const mth = t('fact.metrics.th');
    const rows = c.metrics.map((x) => {
      const d = m[x.metric] || { label: x.metric, unit: '' };
      const mLabel = rl('metrics', x.metric, 'label') || d.label;
      const mNote = (isEn && e.metricNotes && e.metricNotes[x.metric]) || x.note;
      const show = (k) => fmt(x.display?.[k] ?? (k === 'after' && x.afterQualifier ? x.afterQualifier + ' ' + x[k] : x[k]));
      const mUnit = rl('metrics', x.metric, 'unit') || d.unit;
      return `<tr><td>${esc(mLabel)}${x.headline ? ' ★' : ''}</td><td>${show('baseline')}</td><td>${show('before')}</td><td>${show('after')}</td><td>${fmt(x.target)}</td><td>${esc(mUnit)}</td><td>${fmt(mNote)}</td></tr>`;
    }).join('');
    const cProduct = (isEn && e.product) || c.product;
    const cOrderUnit = (isEn && e.order && e.order.unit) || tu((c.order && c.order.unit) || '');
    const std = c.standards.map((s) => { const r = C.standards[s]; return `<span class="badge ${r.status === 'withdrawn' ? 'bad' : r.verifiedAt ? 'ok' : ''}" title="${esc(rl('standards', s, 'title') || r.title)}">${esc(r.code.startsWith(r.org) ? r.code : r.org + ' ' + r.code)}</span>`; }).join('') || '<span class="muted">—</span>';
    const regs = [...c.regulations, ...(c.historicalRegulations || [])].map((s) => { const r = C.regulations[s]; const rTitle = (isEn && REG.regulations && REG.regulations[s] && REG.regulations[s].title) || r.title; return `<span class="badge ${r.status === 'rescinded' ? 'bad' : r.verifiedAt ? 'ok' : 'warn'}" title="${esc(rTitle)}">${esc(r.citation)}${r.status === 'rescinded' ? ` (${t('reg.status.rescinded')})` : r.verifiedAt ? '' : ` (${t('reg.toVerify')})`}</span>`; }).join('') || '<span class="muted">—</span>';
    let html = `<div class="facts">
      <div class="factline"><span>${t('fact.product')}：${esc(cProduct)}</span>${c.order ? `<span>${t('fact.order')}：${fmt(c.order.quantity)} ${esc(cOrderUnit)}${c.order.fobUsd ? ` · FOB $${c.order.fobUsd}` : ''}</span>` : ''}<span>${t('fact.provenance')}：${esc(tx('provenance', c.provenance))}</span><span>${t('fact.version')} ${esc(c.version)} · ${t('fact.updated')} ${esc(c.updatedAt)}</span></div>
      <div class="factline"><span>${t('fact.failureModes')}：</span>${c.failureModes.map((x) => `<span class="badge">${esc(tx('failureModes', x))}</span>`).join('')}</div>
      <div class="factline"><span>${t('fact.standards')}：</span>${std}</div>
      <div class="factline"><span>${t('fact.regulations')}：</span>${regs}</div>
      <h2>${t('fact.metrics.title')}</h2>
      <div class="table-wrap"><table><thead><tr>${mth.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
    if (c.ledger) {
      const eLedger = (isEn && e.ledger) || {};
      const lBasis = eLedger.basis || c.ledger.basis;
      const lItems = eLedger.items || c.ledger.items;
      const lAlloc = eLedger.allocation || c.ledger.allocation;
      html += `<h2>${t('fact.ledger')}（${esc(lBasis)}）</h2><div class="table-wrap"><table><tbody>${lItems.map(([k, v]) => `<tr><td>${esc(k)}</td><td>$${fmt(v)}</td></tr>`).join('')}<tr><th>${t('fact.ledger.total')}</th><th>$${fmt(c.ledger.totalUsd)}</th></tr></tbody></table></div><p class="muted">${t('fact.ledger.borne')}：${esc(lAlloc || '—')}</p>`;
    }
    if (c.disposition?.length) {
      const dth = t('fact.disposition.th');
      const eDisp = (isEn && e.disposition) || [];
      html += `<h2>${t('fact.disposition')}</h2><div class="table-wrap"><table><thead><tr>${dth.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${c.disposition.map((d, i) => `<tr><td>${esc((eDisp[i] && eDisp[i].scope) || d.scope)}</td><td>${fmt(d.quantity)} ${esc(tu(d.unit))}</td><td>${esc(tx('dispositionDecisions', d.decision))}</td><td>${esc((eDisp[i] && eDisp[i].rationale) || d.rationale)}</td></tr>`).join('')}</tbody></table></div>`;
    }
    const r = c.review;
    const rNotes = (isEn && e.reviewNotes) || r.notes || '';
    html += `<p class="muted">${t('fact.review')}：${esc(tx('reviewStatuses', r.status))}；${t('fact.techReviewer')}：${fmt(r.technicalReviewer)}；${t('fact.compReviewer')}：${fmt(r.complianceReviewer)}；${esc(rNotes)}</p></div><hr>`;
    return html;
  };

  function openCase(id) {
    const c = caseById.get(id);
    const meta = `<span class="badge accent">${c.id}</span> <span class="badge">${esc(tx('domains', c.domain))}</span> <span class="badge">${esc(tx('stages', c.stage))}</span> <span class="badge">${esc(tx('caseTypes', c.caseType))}</span> <span class="badge warn">${t('case.illustrative')}</span>`;
    const eCase = EN[c.id] || {};
    const narrative = (getLang() === 'en' && eCase.narrative) || c.narrative;
    openReader(meta, cl(c, 'title'), factsHtml(c) + toHtml(narrative));
  }
  function openDoc(id) {
    const d = docById.get(id);
    const body = docContent(d).replace(/^#\s+.+\n/, '');
    openReader(`<span class="badge accent">${esc(d.id)}</span> <span class="badge">${esc(d.docType)}</span> <span class="badge ${d.status === 'approved' ? 'ok' : 'warn'}">${esc(d.status)}</span> <span class="muted">${esc(d.path)}</span>`, docTitle(d), toHtml(body));
  }
  document.querySelectorAll('#tabs button[data-tab]').forEach((b) => b.addEventListener('click', () => { lastTab = b.dataset.tab; }));

  // ---------- Registries ----------
  let regView = 'standards';
  const renderRegistry = () => {
    const q = $('regQ').value.trim().toLowerCase();
    const match = (o) => !q || JSON.stringify(o).toLowerCase().includes(q);
    const usedStd = {}; const usedReg = {};
    C.cases.forEach((c) => { c.standards.forEach((s) => { usedStd[s] = (usedStd[s] || 0) + 1; }); c.regulations.forEach((s) => { usedReg[s] = (usedReg[s] || 0) + 1; }); });
    let html = '';
    if (regView === 'standards') {
      const th = t('reg.std.th');
      html = `<div class="table-wrap"><table><thead><tr>${th.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${Object.entries(C.standards).filter(([k, v]) => match([k, v])).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v.org)} ${esc(v.code)}</td><td>${esc(rl('standards', k, 'title') || v.title)}</td><td>${esc(rl('standards', k, 'kind') || v.kind)}</td><td><span class="badge ${v.status === 'withdrawn' ? 'bad' : 'ok'}">${v.status === 'withdrawn' ? t('reg.status.withdrawn', v.withdrawnYear) : t('reg.status.active')}</span></td><td>${v.verifiedAt ? (v.sourceUrl ? `<a href="${esc(v.sourceUrl)}" target="_blank" rel="noopener">${esc(v.verifiedAt)}</a>` : esc(v.verifiedAt)) : `<span class="badge warn">${t('reg.unverified')}</span>`}</td><td>${usedStd[k] || 0}</td><td>${fmt(rl('standards', k, 'notes') || v.notes)}</td></tr>`).join('')}</tbody></table></div>`;
    } else if (regView === 'regulations') {
      const th = t('reg.regs.th');
      html = `<div class="table-wrap"><table><thead><tr>${th.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${Object.entries(C.regulations).filter(([k, v]) => match([k, v])).map(([k, v]) => { const re = REG.regulations && REG.regulations[k]; const rTitle = (getLang() === 'en' && re && re.title) || v.title; const rApplies = (getLang() === 'en' && re && re.appliesTo) || v.appliesTo; const rReqs = (getLang() === 'en' && re && re.requirements) || v.requirements; return `<tr><td>${esc(v.citation)}<br><span class="muted">${esc(k)} · ${esc(v.agency)}</span></td><td>${esc(rTitle)}</td><td>${esc(rApplies)}</td><td><ul>${rReqs.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>${(v.sources || []).map((s) => `<a href="${esc(s)}" target="_blank" rel="noopener">${t('reg.regs.source')}</a>`).join(' ')}</td><td><span class="badge ${v.status === 'rescinded' ? 'bad' : 'ok'}">${v.status === 'rescinded' ? t('reg.status.rescinded') : t('reg.status.inforce')}</span></td><td>${v.verifiedAt ? esc(v.verifiedAt) : `<span class="badge warn">${t('reg.toVerify')}</span>`}</td><td>${usedReg[k] || 0}</td></tr>`; }).join('')}</tbody></table></div>`;
    } else {
      const th = t('reg.met.th');
      const dir = t('reg.met.dir');
      html = `<div class="table-wrap"><table><thead><tr>${th.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${Object.entries(C.metrics).filter(([k, v]) => match([k, v])).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(rl('metrics', k, 'label') || v.label)}</td><td>${esc(rl('metrics', k, 'unit') || v.unit)}</td><td>${esc(v.type)}</td><td>${dir[v.direction]}</td><td>${v.cpkAllowed ? t('reg.met.cpk.yes') : `<span class="badge warn">${t('reg.met.cpk.no')}</span>`}</td><td>${esc(rl('metrics', k, 'definition') || v.definition)}</td></tr>`).join('')}</tbody></table></div>`;
    }
    $('regBody').innerHTML = html;
  };
  document.querySelectorAll('[data-reg]').forEach((b) => b.addEventListener('click', () => {
    regView = b.dataset.reg; document.querySelectorAll('[data-reg]').forEach((x) => x.classList.toggle('active', x === b)); renderRegistry();
  }));
  $('regQ').addEventListener('input', renderRegistry);

  // ---------- Governance health ----------
  const translateMsg = (msg) => {
    if (getLang() !== 'en') return msg;
    return msg
      .replace(/没有来源链接（([^）]+)）/, 'No source link ($1)')
      .replace(/所引用法规 (.+?) 未核实或已超过 (\d+) 天/, 'Referenced regulation $1 unverified or older than $2 days');
  };
  const translateCitation = (c) => {
    if (getLang() !== 'en') return c;
    const re = REG.regulations;
    if (re) { for (const [k, v] of Object.entries(re)) { if (C.regulations[k] && C.regulations[k].citation === c && v.title) return v.title; } }
    const citMap = { '各州填充物法规': 'State Stuffed Article Laws' };
    return citMap[c] || c;
  };
  const renderHealth = () => {
    const H = C.health;
    const unverStd = H.unverifiedStandards;
    const uvth = t('health.unverified.th');
    $('health').innerHTML = `
      <h2>${t('health.title')}</h2>
      <div class="stats">
        <div class="stat"><span class="muted">${t('health.errors')}</span><b>${H.errors.length}</b></div>
        <div class="stat"><span class="muted">${t('health.warnings')}</span><b>${H.warnings.length}</b></div>
        <div class="stat"><span class="muted">${t('health.approved')}</span><b>${H.reviewStatus.approved || 0} / ${C.cases.length}</b></div>
        <div class="stat"><span class="muted">${t('health.unreg')}</span><b>${H.unverifiedRegulations.length} / ${H.totalRegulations}</b></div>
        <div class="stat"><span class="muted">${t('health.unstd')}</span><b>${unverStd} / ${H.totalStandards}</b></div>
        <div class="stat"><span class="muted">${t('health.owner')}</span><b>${H.regulationOwnerAssigned ? t('health.owner.yes') : t('health.owner.no')}</b></div>
      </div>
      <h3>${t('health.unverified.title')}</h3>
      <div class="table-wrap"><table><thead><tr>${uvth.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${H.unverifiedRegulations.filter((r) => r.referencedBy).sort((a, b) => b.referencedBy - a.referencedBy).map((r) => `<tr><td>${esc(translateCitation(r.citation))}</td><td>${r.referencedBy}</td></tr>`).join('') || `<tr><td colspan="2">${t('health.unverified.none')}</td></tr>`}</tbody></table></div>
      <details><summary>${t('health.warnings.summary', H.warnings.length)}</summary><ul class="warnlist">${H.warnings.map((w) => `<li><code>${esc(w.where)}</code> ${esc(translateMsg(w.msg))}</li>`).join('')}</ul></details>
      ${H.errors.length ? `<h3>${t('health.errors.title')}</h3><ul class="warnlist">${H.errors.map((w) => `<li><code>${esc(w.where)}</code> ${esc(translateMsg(w.msg))}</li>`).join('')}</ul>` : ''}`;
  };
  renderHealth();

  const docCard = (d) => `<button class="card" data-doc="${esc(d.id)}"><div class="badges"><span class="badge accent">${esc(d.id)}</span><span class="badge ${d.status === 'approved' ? 'ok' : 'warn'}">${esc(d.status)}</span></div><h3>${esc(docTitle(d))}</h3></button>`;
  const byType = (...types) => C.docs.filter((d) => types.includes(d.docType)).sort((a, b) => a.id.localeCompare(b.id));
  const renderDocs = () => {
    $('govList').innerHTML = byType('governance').map(docCard).join('');
    $('pbList').innerHTML = byType('playbook', 'sop', 'reference', 'template').map(docCard).join('');
    $('intList').innerHTML = byType('interview').map(docCard).join('');
  };
  renderDocs();
  document.querySelectorAll('.doclist').forEach((el) => el.addEventListener('click', (e) => { const b = e.target.closest('[data-doc]'); if (b) location.hash = `doc=${b.dataset.doc}`; }));

  renderCases(); renderRegistry(); route();
})();
