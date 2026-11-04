import fs from 'node:fs';
import path from 'node:path';

export const ROOT = process.cwd();
export const DOC_DIRS = ['governance', 'playbooks', 'sops', 'references', 'interview', 'templates'];
export const DOC_TYPES = ['governance', 'playbook', 'sop', 'reference', 'interview', 'template'];

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const rel = (abs) => path.relative(ROOT, abs).replaceAll(path.sep, '/');

export function loadRegistries() {
  return {
    taxonomy: readJson('registry/taxonomy.json'),
    standards: readJson('registry/standards.json').standards,
    regulations: readJson('registry/regulations.json').regulations,
    regulationPolicy: readJson('registry/regulations.json').reviewPolicy,
    metrics: readJson('registry/metrics.json').metrics,
    editorial: readJson('registry/editorial-rules.json')
  };
}

export function parseFrontmatter(text, file) {
  const body = text.replaceAll('\r\n', '\n');
  if (!body.startsWith('---\n')) throw new Error(`Missing front matter: ${file}`);
  const end = body.indexOf('\n---\n', 4);
  if (end < 0) throw new Error(`Unclosed front matter: ${file}`);
  const meta = {};
  for (const line of body.slice(4, end).split('\n')) {
    if (!line.trim()) continue;
    const i = line.indexOf(':');
    if (i < 0) throw new Error(`Invalid front matter line in ${file}: ${line}`);
    const value = line.slice(i + 1).trim();
    try { meta[line.slice(0, i).trim()] = JSON.parse(value); } catch { meta[line.slice(0, i).trim()] = value; }
  }
  return { meta, content: body.slice(end + 5) };
}

export function loadCases() {
  const out = [];
  const base = path.join(ROOT, 'cases');
  for (const prefix of fs.readdirSync(base)) {
    const prefixDir = path.join(base, prefix);
    if (!fs.statSync(prefixDir).isDirectory()) continue;
    for (const folder of fs.readdirSync(prefixDir)) {
      const dir = path.join(prefixDir, folder);
      if (!fs.statSync(dir).isDirectory()) continue;
      const jsonPath = path.join(dir, 'case.json');
      const mdPath = path.join(dir, 'case.md');
      const item = { folder: rel(dir), folderName: folder, prefix, jsonPath: rel(jsonPath), mdPath: rel(mdPath), errors: [] };
      try { item.facts = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch (e) { item.errors.push(`case.json 无法解析: ${e.message}`); }
      try { item.narrative = fs.readFileSync(mdPath, 'utf8').replaceAll('\r\n', '\n'); } catch { item.errors.push('缺少 case.md'); item.narrative = ''; }
      item.reviews = fs.readdirSync(dir).filter((f) => /^review-\d{8}\.md$/.test(f));
      out.push(item);
    }
  }
  return out.sort((a, b) => (a.facts?.id || '').localeCompare(b.facts?.id || ''));
}

export function loadDocs() {
  const docs = [];
  for (const dir of DOC_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of fs.readdirSync(abs)) {
      if (!file.endsWith('.md')) continue;
      const p = path.join(abs, file);
      const { meta, content } = parseFrontmatter(fs.readFileSync(p, 'utf8'), rel(p));
      docs.push({ ...meta, path: rel(p), content });
    }
  }
  return docs;
}

export function headlineText(facts, metrics) {
  if (facts.headlineText) return facts.headlineText;
  const h = (facts.metrics || []).find((m) => m.headline);
  if (!h) return '';
  const def = metrics[h.metric] || { label: h.metric, unit: '' };
  const fmt = (v, q) => (v === undefined || v === null ? '—' : `${q || ''}${v}`);
  return `${def.label} ${fmt(h.before)} ➔ ${fmt(h.after, h.afterQualifier)}${def.unit ? ' ' + def.unit : ''}`;
}

export function resolvePath(caseIndex, metrics, ref) {
  const [id, ...parts] = ref.split('.');
  const facts = caseIndex.get(id);
  if (!facts) return undefined;
  if (parts.length === 1 && parts[0] === 'headline') return headlineText(facts, metrics);
  if (parts[0] === 'metrics' && parts.length === 3) {
    const m = (facts.metrics || []).find((x) => x.metric === parts[1]);
    return m ? m[parts[2]] : undefined;
  }
  let cur = facts;
  for (const p of parts) { if (cur == null) return undefined; cur = cur[p]; }
  return cur;
}

export function numberVariants(v) {
  if (typeof v !== 'number') return [String(v)];
  const out = new Set();
  const abs = Math.abs(v);
  const add = (s) => { out.add(s); if (v < 0) { out.add('-' + s); out.add('−' + s); } };
  add(String(abs));
  add(abs.toLocaleString('en-US'));
  if (Number.isInteger(abs)) add(abs.toFixed(1));
  if (abs >= 1e6) { add((abs / 1e6).toFixed(2) + 'M'); add((abs / 1e6).toFixed(1) + 'M'); add(String(abs / 1e6) + 'M'); }
  if (abs >= 1e4) { add(String(abs / 1e4) + ' 万'); add(String(abs / 1e4) + '万'); }
  return [...out].filter((s) => !(v < 0) || s.startsWith('-') || s.startsWith('−'));
}

export const PLACEHOLDER = /\{\{([A-Z]+-\d{3}(?:\.[A-Za-z0-9-]+)+)\}\}/g;
export const LINK = /\]\((case|doc):([A-Z0-9.-]+)\)/g;
