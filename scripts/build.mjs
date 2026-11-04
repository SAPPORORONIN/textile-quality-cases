import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadRegistries, loadCases, loadDocs, headlineText, resolvePath, PLACEHOLDER } from './lib.mjs';
import { validate } from './validate.mjs';

const reg = loadRegistries();
const cases = loadCases().filter((c) => c.facts);
const docs = loadDocs();
const caseIndex = new Map(cases.map((c) => [c.facts.id, c.facts]));
const render = (text) => text.replace(PLACEHOLDER, (_, ref) => {
  const v = resolvePath(caseIndex, reg.metrics, ref);
  return v === undefined ? `{{${ref}}}` : (typeof v === 'number' ? v.toLocaleString('en-US') : String(v));
});

// 生成的 STAR 索引文档（不手工维护，避免数字重复）
const domainOrder = Object.keys(reg.taxonomy.domains);
const starLines = ['# 案例 STAR 讲稿索引', '', '> 本页由构建脚本根据各案例的 `case.json` 自动生成，数字与案例保持一致。使用前请先阅读 [面试使用规范](doc:GOV-08)：示例案例用于学习结构与思路，不能当作本人经历讲述。', ''];
for (const d of domainOrder) {
  const list = cases.filter((c) => c.facts.domain === d && c.facts.review.status !== 'retired');
  if (!list.length) continue;
  starLines.push(`## ${reg.taxonomy.domains[d]}`, '', '| 案例 | 类型 | 阶段 | 关键结果 | 损失口径 |', '| :--- | :--- | :--- | :--- | :--- |');
  for (const { facts: f } of list) {
    const loss = f.ledger ? `${f.ledger.basis} $${f.ledger.totalUsd.toLocaleString('en-US')}` : '—';
    starLines.push(`| [${f.id} ${f.title}](case:${f.id}) | ${reg.taxonomy.caseTypes[f.caseType].label} | ${reg.taxonomy.stages[f.stage].label} | ${headlineText(f, reg.metrics)} | ${loss} |`);
  }
  starLines.push('');
}
docs.push({ id: 'INT-STAR-INDEX', title: '案例 STAR 讲稿索引', docType: 'interview', status: 'generated', version: 'auto', path: '(generated)', content: starLines.join('\n') + '\n' });

const result = validate();
const unverified = (obj) => Object.entries(obj).filter(([, v]) => !v.verifiedAt).map(([id]) => id);
const refCount = {};
for (const c of cases) for (const r of c.facts.regulations || []) refCount[r] = (refCount[r] || 0) + 1;

const catalog = {
  schemaVersion: 2,
  libraryVersion: JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version,
  builtAt: new Date().toISOString(),
  taxonomy: reg.taxonomy,
  standards: reg.standards,
  regulations: reg.regulations,
  metrics: reg.metrics,
  cases: cases.map((c) => ({ ...c.facts, headline: headlineText(c.facts, reg.metrics), folder: c.folder, narrative: render(c.narrative), reviewRecords: c.reviews })),
  docs: docs.map((d) => ({ ...d, content: render(d.content) })),
  health: {
    errors: result.errors,
    warnings: result.warnings,
    reviewStatus: Object.fromEntries(Object.keys(reg.taxonomy.reviewStatuses).map((s) => [s, cases.filter((c) => c.facts.review.status === s).length])),
    unverifiedRegulations: unverified(reg.regulations).map((id) => ({ id, citation: reg.regulations[id].citation, referencedBy: refCount[id] || 0 })),
    unverifiedStandards: unverified(reg.standards).length,
    totalStandards: Object.keys(reg.standards).length,
    totalRegulations: Object.keys(reg.regulations).length,
    regulationOwnerAssigned: Boolean(reg.regulationPolicy.owner)
  }
};

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(ROOT, 'dist', 'catalog.js'), `window.__CATALOG__ = ${JSON.stringify(catalog)};\n`, 'utf8');
console.log(`Built dist/catalog (${catalog.cases.length} cases, ${catalog.docs.length} docs, ${result.errors.length} errors, ${result.warnings.length} warnings)`);
