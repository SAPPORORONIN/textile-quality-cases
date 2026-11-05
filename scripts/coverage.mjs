// 案例覆盖情况：各领域的案例数、案例类型、产品、失效模式、已用指标，以及每个前缀的下一个可用编号。
// 用途：选题前查空白、去重。用法：node scripts/coverage.mjs [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCases } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tx = JSON.parse(fs.readFileSync(path.join(root, 'registry/taxonomy.json'), 'utf8'));
const cases = loadCases().filter((c) => c.facts).map((c) => c.facts).filter((f) => f.review?.status !== 'retired');

const prefixOf = { apparel: 'APP', 'home-textile': 'HT', 'raw-material': 'RM', systemic: 'SYS' };
const out = {};
for (const d of Object.keys(tx.domains)) {
  const list = cases.filter((c) => c.domain === d).sort((a, b) => a.id.localeCompare(b.id));
  const maxNo = Math.max(0, ...list.map((c) => parseInt(c.id.split('-')[1], 10)));
  const count = (key) => list.flatMap((c) => [].concat(c[key] || [])).reduce((m, k) => ((m[k] = (m[k] || 0) + 1), m), {});
  out[d] = {
    total: list.length,
    nextId: `${prefixOf[d]}-${String(maxNo + 1).padStart(3, '0')}`,
    caseTypes: count('caseType'),
    stages: count('stage'),
    failureModes: count('failureModes'),
    unusedFailureModes: Object.keys(tx.failureModes).filter((k) => !list.some((c) => c.failureModes.includes(k))),
    cases: list.map((c) => `${c.id} [${c.caseType}/${c.stage}] ${c.product}｜${c.failureModes.join(',')}｜${c.metrics.map((m) => m.metric).join(',')}`),
  };
}
if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
for (const [d, o] of Object.entries(out)) {
  console.log(`\n=== ${d}（${o.total} 个，下一个编号 ${o.nextId}）`);
  console.log('类型:', JSON.stringify(o.caseTypes), ' 阶段:', JSON.stringify(o.stages));
  console.log('失效模式:', JSON.stringify(o.failureModes));
  console.log('本领域未用过的失效模式:', o.unusedFailureModes.join(', ') || '—');
  o.cases.forEach((l) => console.log('  ' + l));
}
