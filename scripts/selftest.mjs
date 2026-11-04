// 校验器自测：在临时副本中注入典型错误，确认每条治理规则都会触发。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const VALIDATOR = path.join(ROOT, 'scripts', 'validate.mjs');
const SAMPLE = 'cases/HT/HT-001_sateen-bedding-tear-slippage';

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caselib-'));
  fs.cpSync(path.join(ROOT, 'registry'), path.join(dir, 'registry'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'scripts'), path.join(dir, 'scripts'), { recursive: true });
  fs.cpSync(path.join(ROOT, SAMPLE), path.join(dir, SAMPLE), { recursive: true });
  return dir;
}
const run = (dir) => spawnSync(process.execPath, [path.join(dir, 'scripts', 'validate.mjs')], { cwd: dir, encoding: 'utf8' });
const editJson = (dir, fn) => { const p = path.join(dir, SAMPLE, 'case.json'); const f = JSON.parse(fs.readFileSync(p, 'utf8')); fn(f); fs.writeFileSync(p, JSON.stringify(f)); };
const editMd = (dir, fn) => { const p = path.join(dir, SAMPLE, 'case.md'); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };

const cases = [
  ['基线：样例案例零错误', () => {}, null],
  ['引用已撤销标准', (d) => editJson(d, (f) => f.standards.push('ASTM-D434')), '已撤销的标准'],
  ['术语标准当方法', (d) => editJson(d, (f) => f.standards.push('ASTM-D4850')), '术语标准'],
  ['引用已废止法规', (d) => editJson(d, (f) => f.regulations.push('FTC-253')), '已废止的法规'],
  ['未登记指标', (d) => editJson(d, (f) => f.metrics.push({ metric: 'made-up', before: 1, after: 2 })), '未登记的指标'],
  ['等级型指标算 Cpk', (d) => editJson(d, (f) => { f.metrics.find((m) => m.metric === 'dp-grade').cpk = 1.5; }), '不允许计算 Cpk'],
  ['叙述与数字不一致', (d) => editJson(d, (f) => { f.metrics[0].after = 9.87; }), '未在叙述中出现'],
  ['台账加总不符', (d) => editJson(d, (f) => { f.ledger.items.push(['额外', 500000]); }), '加总'],
  ['事故缺少处置', (d) => editJson(d, (f) => { f.disposition = []; }), '必须写处置'],
  ['非法枚举值', (d) => editJson(d, (f) => { f.stage = 'aftersales'; }), 'stage 非法值'],
  ['未评审即 approved', (d) => editJson(d, (f) => { f.review.status = 'approved'; }), '必须有技术评审人'],
  ['真实品牌名', (d) => editMd(d, (t) => t + '\n客户是 Walmart。\n'), '真实企业名'],
  ['绝对化措辞', (d) => editMd(d, (t) => t + '\n上市后零投诉。\n'), '禁用表述'],
  ['失效链接', (d) => editMd(d, (t) => t + '\n见 [x](case:APP-999)。\n'), '链接的案例不存在'],
  ['旧式 .md 路径链接', (d) => editMd(d, (t) => t + '\n见 [x](../foo.md)。\n'), '.md 文件路径'],
  ['缺少必备章节', (d) => editMd(d, (t) => t.replaceAll('处置', '安排')), '必备章节「处置」'],
];

let failed = 0;
for (const [name, mutate, expect] of cases) {
  const dir = sandbox();
  mutate(dir);
  const r = run(dir);
  const out = r.stdout + r.stderr;
  const ok = expect === null ? r.status === 0 : (r.status === 1 && out.includes(expect));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) { failed += 1; console.log(out.split('\n').filter((l) => l.startsWith('ERROR')).slice(0, 5).join('\n')); }
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} 项自测失败` : '\n全部自测通过');
process.exit(failed ? 1 : 0);
