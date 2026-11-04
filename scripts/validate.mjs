import { loadRegistries, loadCases, loadDocs, numberVariants, resolvePath, PLACEHOLDER, LINK, DOC_TYPES } from './lib.mjs';
import { pathToFileURL } from 'node:url';

const TODAY = new Date();
const daysSince = (d) => (d ? Math.floor((TODAY - new Date(d)) / 86400000) : Infinity);
const GENERATED_DOCS = ['INT-STAR-INDEX'];

export function validate() {
  const reg = loadRegistries();
  const cases = loadCases();
  const docs = loadDocs();
  const errors = [];
  const warnings = [];
  const E = (where, msg) => errors.push({ where, msg });
  const W = (where, msg) => warnings.push({ where, msg });
  const tx = reg.taxonomy;
  const caseIndex = new Map();
  const docIds = new Set([...docs.map((d) => d.id), ...GENERATED_DOCS]);

  // ---------- 注册表 ----------
  for (const [id, s] of Object.entries(reg.standards)) {
    for (const k of ['org', 'code', 'title', 'kind', 'status']) if (!s[k]) E(`registry/standards:${id}`, `缺少字段 ${k}`);
    if (!['active', 'withdrawn'].includes(s.status)) E(`registry/standards:${id}`, `status 非法: ${s.status}`);
    if (s.verifiedAt && !s.sourceUrl) W(`registry/standards:${id}`, '已标记核实但没有 sourceUrl');
  }
  for (const [id, r] of Object.entries(reg.regulations)) {
    for (const k of ['jurisdiction', 'agency', 'citation', 'title', 'status']) if (!r[k]) E(`registry/regulations:${id}`, `缺少字段 ${k}`);
    if (!['in-force', 'rescinded'].includes(r.status)) E(`registry/regulations:${id}`, `status 非法: ${r.status}`);
    if (!r.sources?.length) W(`registry/regulations:${id}`, '没有来源链接（GOV-04）');
  }
  for (const [id, m] of Object.entries(reg.metrics)) {
    for (const k of ['label', 'type', 'direction', 'definition']) if (m[k] === undefined) E(`registry/metrics:${id}`, `缺少字段 ${k}`);
    if (m.type === 'ordinal' && m.cpkAllowed) E(`registry/metrics:${id}`, '等级型指标不得允许 Cpk');
  }

  // ---------- 案例 ----------
  const seenLegacy = new Set();
  for (const c of cases) {
    const where = c.folder;
    c.errors.forEach((e) => E(where, e));
    const f = c.facts;
    if (!f) continue;
    if (!/^(APP|HT|RM|SYS)-\d{3}$/.test(f.id || '')) E(where, `ID 格式错误: ${f.id}`);
    if (caseIndex.has(f.id)) E(where, `ID 重复: ${f.id}`);
    caseIndex.set(f.id, f);
    if (!c.folderName.startsWith(f.id + '_')) E(where, '目录名必须以 ID 开头');
    if (!c.folderName.startsWith(c.prefix + '-')) E(where, `目录前缀 ${c.prefix} 与 ID 不一致`);
    if (f.legacyId) { if (seenLegacy.has(f.legacyId)) E(where, `legacyId 重复 ${f.legacyId}`); seenLegacy.add(f.legacyId); }
    for (const k of ['title', 'summary', 'domain', 'product', 'stage', 'caseType', 'provenance', 'review', 'version', 'updatedAt']) if (!f[k]) E(where, `缺少字段 ${k}`);
    const en = (field, value, set) => { if (!(value in set)) E(where, `${field} 非法值: ${value}`); };
    en('domain', f.domain, tx.domains); en('stage', f.stage, tx.stages); en('caseType', f.caseType, tx.caseTypes);
    en('provenance', f.provenance, tx.provenance); en('review.status', f.review?.status, tx.reviewStatuses);
    (f.failureModes || []).forEach((v) => en('failureModes', v, tx.failureModes));
    (f.disciplines || []).forEach((v) => en('disciplines', v, tx.disciplines));
    (f.tools || []).forEach((v) => { if (!tx.tools.includes(v)) E(where, `tools 非法值: ${v}`); });
    if (!f.failureModes?.length) E(where, 'failureModes 至少一项');

    for (const s of f.standards || []) {
      const st = reg.standards[s];
      if (!st) E(where, `引用了未登记的标准 ${s}`);
      else if (st.status === 'withdrawn') E(where, `引用了已撤销的标准 ${s}（${st.withdrawnYear}）`);
      else if (st.kind === 'terminology') E(where, `${s} 是术语标准，不能作为方法引用`);
    }
    for (const r of f.regulations || []) {
      const rg = reg.regulations[r];
      if (!rg) { E(where, `引用了未登记的法规 ${r}`); continue; }
      if (rg.status === 'rescinded') E(where, `引用了已废止的法规 ${r}，请移入 historicalRegulations`);
      if (daysSince(rg.verifiedAt) > reg.regulationPolicy.maxAgeDays) W(where, `所引用法规 ${r} 未核实或已超过 ${reg.regulationPolicy.maxAgeDays} 天`);
    }
    for (const r of f.historicalRegulations || []) if (!reg.regulations[r]) E(where, `historicalRegulations 未登记: ${r}`);

    // 指标
    const ms = f.metrics || [];
    if (!ms.length) E(where, 'metrics 至少一项');
    const heads = ms.filter((m) => m.headline);
    if (heads.length > 1) E(where, '只能有一个 headline 指标');
    if (!heads.length && !f.headlineText) E(where, '需要一个 headline 指标或 headlineText');
    for (const m of ms) {
      const def = reg.metrics[m.metric];
      if (!def) { E(where, `未登记的指标 ${m.metric}`); continue; }
      if (m.cpk !== undefined && !def.cpkAllowed) E(where, `${m.metric} 不允许计算 Cpk（GOV-03）`);
      for (const field of ['baseline', 'before', 'after']) {
        if (m[field] === undefined || m[field] === null) continue;
        const display = m.display?.[field];
        const variants = display ? [display] : numberVariants(m[field]);
        if (!variants.some((v) => c.narrative.includes(v))) E(where, `指标 ${m.metric}.${field}=${display || m[field]} 未在叙述中出现（数字不一致？）`);
      }
    }

    // 台账与处置
    const type = tx.caseTypes[f.caseType] || {};
    if (type.requiresLedger && !f.ledger) E(where, '质量事故必须有损失台账 ledger');
    if (f.ledger) {
      const L = f.ledger;
      if (!['FOB', '实际成本', '实际支出', '净损失'].includes(L.basis)) E(where, `ledger.basis 非法: ${L.basis}`);
      const sum = (L.items || []).reduce((a, [, v]) => a + v, 0);
      if (Math.abs(sum - L.totalUsd) > L.totalUsd * reg.editorial.numberChecks.ledgerSumTolerance) E(where, `损失台账加总 ${sum} ≠ 合计 ${L.totalUsd}`);
      if (!L.allocation) W(where, '损失台账未写承担方 allocation');
      if (!numberVariants(L.totalUsd).some((v) => c.narrative.includes(v))) W(where, `损失合计 ${L.totalUsd} 未在叙述中出现`);
    }
    if (type.requiresDisposition && !(f.disposition || []).length) E(where, '质量事故必须写处置 disposition');
    for (const d of f.disposition || []) {
      if (!(d.decision in tx.dispositionDecisions)) E(where, `处置决策非法: ${d.decision}`);
      if (!d.rationale) E(where, `处置缺少理由: ${d.scope}`);
    }
    if (f.order?.quantity && !numberVariants(f.order.quantity).some((v) => c.narrative.includes(v))) W(where, `订单数量 ${f.order.quantity} 未在叙述中出现`);

    // 叙述结构与措辞
    const markerLines = c.narrative.split('\n').filter((l) => l.startsWith('#') || l.includes('**'));
    for (const mk of type.requiredMarkers || []) if (!markerLines.some((l) => l.includes(mk))) E(where, `叙述缺少必备章节「${mk}」（GOV-02）`);
    scanText(where, c.narrative + '\n' + JSON.stringify(f), reg, E, W, true);

    // 评审
    if (f.review?.status === 'approved') {
      if (!f.review.technicalReviewer) E(where, 'approved 案例必须有技术评审人');
      if ((f.regulations || []).length && !f.review.complianceReviewer) E(where, '引用法规的 approved 案例必须有合规评审人');
      if (!c.reviews.length) E(where, 'approved 案例必须有评审记录文件 review-YYYYMMDD.md');
    }
  }

  // ---------- 文档 ----------
  const seenDoc = new Set();
  for (const d of docs) {
    for (const k of ['id', 'title', 'docType', 'status', 'version']) if (!d[k]) E(d.path, `front matter 缺少 ${k}`);
    if (seenDoc.has(d.id)) E(d.path, `文档 ID 重复 ${d.id}`); seenDoc.add(d.id);
    if (!DOC_TYPES.includes(d.docType)) E(d.path, `docType 非法 ${d.docType}`);
    const h1 = d.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
    if (h1 !== d.title) E(d.path, 'title 与 H1 不一致');
    if (d.docType !== 'governance') scanText(d.path, d.content, reg, E, W, false);
  }

  // ---------- 引用 ----------
  const all = [...cases.map((c) => ({ where: c.mdPath, text: c.narrative })), ...docs.map((d) => ({ where: d.path, text: d.content }))];
  for (const { where, text } of all) {
    for (const m of text.matchAll(LINK)) {
      if (m[1] === 'case' && !caseIndex.has(m[2])) E(where, `链接的案例不存在 case:${m[2]}`);
      if (m[1] === 'doc' && !docIds.has(m[2])) E(where, `链接的文档不存在 doc:${m[2]}`);
    }
    for (const m of text.matchAll(PLACEHOLDER)) if (resolvePath(caseIndex, reg.metrics, m[1]) === undefined) E(where, `占位符无法解析 {{${m[1]}}}`);
    if (/\]\([^)]*\.md\)/.test(text)) E(where, '仍有指向 .md 文件路径的链接，请改用 case:/doc: 语法');
  }

  return { errors, warnings, stats: { cases: cases.length, docs: docs.length } };
}

function scanText(where, text, reg, E, W, isCase) {
  for (const rule of reg.editorial.bannedPhrases) {
    const m = text.match(new RegExp(rule.pattern));
    if (m) (rule.severity === 'error' ? E : W)(where, `禁用表述「${m[0]}」：${rule.reason}`);
  }
  if (isCase) {
    const bw = reg.editorial.brandWatchlist;
    for (const name of bw.names) {
      const re = new RegExp(`(^|[^A-Za-z])${name.replace(/[.*+?^${}()|[\]\\']/g, '\\$&')}([^A-Za-z]|$)`);
      if (re.test(text)) E(where, `出现真实企业名「${name}」：${bw.reason}`);
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { errors, warnings, stats } = validate();
  for (const w of warnings) console.log(`WARN  ${w.where}: ${w.msg}`);
  for (const e of errors) console.log(`ERROR ${e.where}: ${e.msg}`);
  console.log(`\n${stats.cases} cases, ${stats.docs} docs — ${errors.length} errors, ${warnings.length} warnings`);
  process.exit(errors.length ? 1 : 0);
}
