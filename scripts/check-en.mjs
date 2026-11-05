// 英文版检查：中英对照是否逐块对齐、数字是否齐全、英文里是否残留中文、注册表与标签是否有英文。
// 用法：node scripts/check-en.mjs [--strict] [案例ID ...]   不带案例 ID 时检查全部案例。需先运行构建生成 dist/catalog.json。
// 数字缺失默认只报警告（旧译文常写精确值或英文单词）；--strict 时按错误处理，循环新写的案例用 --strict。
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const win = {};
const ctx = vm.createContext({ window: win });
for (const f of ['site/markdown.js', 'site/cases-en.js', 'site/registry-en.js', 'site/i18n.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8').replace(/^﻿/, ''), ctx, { filename: f });
}
const C = JSON.parse(fs.readFileSync(path.join(root, 'dist/catalog.json'), 'utf8'));
const EN = win.__CASES_EN__, REG = win.__REGISTRY_EN__, I = win.I18N;

const strict = process.argv.includes('--strict');
const ids = process.argv.slice(2).filter((a) => a !== '--strict');
const cases = ids.length ? C.cases.filter((c) => ids.includes(c.id)) : C.cases;
const unknown = ids.filter((id) => !C.cases.some((c) => c.id === id));
const errors = [];
const warnings = [];
const E = (where, msg) => errors.push(`${where}: ${msg}`);
const W = (where, msg) => warnings.push(`${where}: ${msg}`);
unknown.forEach((id) => E(id, '不在 dist/catalog.json 中（是否已构建？）'));

const CJK = /[㐀-鿿！-～　-〿]/;
// "68 万" 与英文 "680,000"、"$0.68M" 视为同一个数
const wan = (s) => String(s || '').replace(/(\d+(?:\.\d+)?)\s*万/g, (_, n) => String(Math.round(parseFloat(n) * 10000)));
const mega = (s) => String(s || '').replace(/(\d+(?:\.\d+)?)\s*M\b/g, (_, n) => String(Math.round(parseFloat(n) * 1e6)));
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const words = (s) => String(s || '').replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi, (w) => String(WORDS[w.toLowerCase()]));
const nums = (s) => (mega(wan(s)).replace(/(\d),(\d{3})/g, '$1$2').match(/\d+(?:\.\d+)?/g) || []);
const tally = (a) => a.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {});

for (const c of cases) {
  const e = EN[c.id];
  if (!e) { E(c.id, '缺少英文条目'); continue; }
  for (const k of ['title', 'summary', 'headline', 'product', 'narrative']) if (!e[k]) E(c.id, `英文缺少 ${k}`);
  // 1. 对齐：与站点对照模式使用同一套逻辑
  const html = win.MD.toBilingualHtml(c.narrative, e.narrative || '');
  const sec = (html.match(/bi-sec/g) || []).length, gap = (html.match(/bi-gap/g) || []).length;
  if (sec) E(c.id, `${sec} 个章节段落数不一致（对照模式退回整节对照）`);
  if (gap) E(c.id, `${gap} 个章节只有一种语言有`);
  // 2. 英文里不得残留中文或全角标点
  const enText = JSON.stringify({ t: e.title, s: e.summary, h: e.headline, p: e.product, n: e.narrative, m: e.metricNotes, r: e.reviewNotes, l: e.ledger, d: e.disposition, o: e.order });
  const han = enText.match(new RegExp(CJK.source, 'g'));
  if (han) E(c.id, `英文中有中文或全角字符：${[...new Set(han)].join('')}`);
  // 3. 中文叙述中的每个数字在英文中都出现（英文可多出章节编号等）
  for (const [field, zh, en] of [['narrative', c.narrative, e.narrative], ['summary', c.summary, e.summary]]) {
    const a = tally(nums(zh)), b = tally(nums(words(en)));
    const miss = Object.keys(a).filter((k) => (b[k] || 0) < a[k]).map((k) => `${k}×${a[k] - (b[k] || 0)}`);
    if (miss.length) (strict ? E : W)(c.id, `${field} 英文缺少数字：${miss.join(' ')}`);
  }
  // 4. 结构化字段一一对应
  const zhNotes = [...new Set(c.metrics.filter((m) => m.note).map((m) => m.metric))].sort();
  const enNotes = Object.keys(e.metricNotes || {}).sort();
  if (zhNotes.join() !== enNotes.join()) E(c.id, `metricNotes 与中文指标备注不对应：中文 [${zhNotes}] 英文 [${enNotes}]`);
  if (c.ledger && (!e.ledger || (e.ledger.items || []).length !== c.ledger.items.length)) E(c.id, '英文损失台账缺失或条目数不一致');
  if ((c.disposition || []).length && (!e.disposition || e.disposition.length !== c.disposition.length)) E(c.id, '英文处置决策缺失或条目数不一致');
  // 5. 本案用到的注册表条目与分类都有英文
  for (const m of c.metrics) if (!REG.metrics[m.metric]) E(c.id, `指标 ${m.metric} 在 registry-en.js 中没有英文`);
  for (const s of c.standards) if (!REG.standards[s]) E(c.id, `标准 ${s} 在 registry-en.js 中没有英文`);
  for (const r of [...c.regulations, ...(c.historicalRegulations || [])]) if (!REG.regulations[r]) E(c.id, `法规 ${r} 在 registry-en.js 中没有英文`);
  for (const f of c.failureModes) for (const l of ['zh', 'en']) if (!(I.tIn(l, 'tx.failureModes') || {})[f]) E(c.id, `失效模式 ${f} 在 i18n.js 中缺少 ${l} 名称`);
}
// 注册表里的指标方向都要有显示名称
for (const [k, m] of Object.entries(C.metrics)) for (const l of ['zh', 'en']) if (!(I.tIn(l, 'reg.met.dir') || {})[m.direction]) E(`registry/metrics:${k}`, `方向 ${m.direction} 在 i18n.js 中缺少 ${l} 名称`);

for (const x of warnings) console.log('WARN  ' + x);
for (const x of errors) console.log('ERROR ' + x);
console.log(`\n英文检查：${cases.length} 个案例，${errors.length} 个错误，${warnings.length} 个警告${strict ? '（--strict）' : ''}`);
process.exit(errors.length ? 1 : 0);
