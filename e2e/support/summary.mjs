#!/usr/bin/env node
// Vat een flowtest-run samen in gewone taal, voor de melding en de QA-flow-agent.
//
//   node e2e/support/summary.mjs [baseline-map]
//
// Leest e2e/.results/report.json (Playwright) en e2e/.results/metrics/*.json
// (tikken/velden/schermen per flow). Met een baseline-map (metrics van de vorige
// groene run) meldt het ook flows die complexer werden, ook binnen het budget.
// Schrijft e2e/.results/summary.json en print één regel per bevinding.
// Exit code: 0 = alles groen, 1 = een flow werkt niet, 2 = groen maar te complex.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '.results');
const baselineDir = process.argv[2];

const report = JSON.parse(fs.readFileSync(path.join(root, 'report.json'), 'utf8'));
const tests = [];
const walk = (suite, file) => {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) {
      const last = t.results[t.results.length - 1] ?? {};
      tests.push({
        file: spec.file ?? file,
        title: spec.title,
        status: last.status ?? 'skipped',
        error: (last.errors ?? []).map((e) => (e.message ?? '').replace(/\u001b\[[0-9;]*m/g, '').split('\n').slice(0, 6).join('\n')).join('\n'),
        annotations: t.annotations ?? [],
        attachments: (last.attachments ?? []).filter((a) => a.path).map((a) => path.relative(process.cwd(), a.path)),
      });
    }
  }
  for (const s of suite.suites ?? []) walk(s, s.file ?? file);
};
for (const s of report.suites ?? []) walk(s, s.file);

const metricsDir = path.join(root, 'metrics');
const metrics = fs.existsSync(metricsDir)
  ? fs.readdirSync(metricsDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(metricsDir, f), 'utf8')))
  : [];

const broken = tests.filter((t) => t.status !== 'passed' && t.status !== 'skipped');
const tooComplex = metrics.filter((m) => m.overBudget.length).map((m) => ({ flow: m.flow, over: m.overBudget, path: m.screens }));
const grew = [];
if (baselineDir && fs.existsSync(baselineDir)) {
  for (const m of metrics) {
    const f = path.join(baselineDir, `${m.flow}.json`);
    if (!fs.existsSync(f)) continue;
    const b = JSON.parse(fs.readFileSync(f, 'utf8'));
    const d = [];
    if (m.taps > b.taps) d.push(`${b.taps}→${m.taps} tikken`);
    if (m.fields > b.fields) d.push(`${b.fields}→${m.fields} velden`);
    if (m.screens.length > b.screens.length) d.push(`${b.screens.length}→${m.screens.length} schermen`);
    if (d.length) grew.push({ flow: m.flow, change: d, before: b.screens, after: m.screens });
  }
}
const noise = tests.flatMap((t) =>
  t.annotations.filter((a) => a.type === 'console-error' || a.type === 'server-error').map((a) => ({ test: t.title, ...a })),
);

const summary = {
  total: tests.length,
  passed: tests.filter((t) => t.status === 'passed').length,
  broken,
  tooComplex,
  grew,
  noise,
};
fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify(summary, null, 2));

let headline;
if (broken.length) headline = `✗ ${broken.length} van ${tests.length} flowtests werken niet meer`;
else if (tooComplex.length || grew.length) headline = `✓ ${tests.length} flowtests OK, maar ${tooComplex.length + grew.length} flow(s) complexer`;
else headline = `✓ Alle ${tests.length} flowtests OK`;
console.log(headline);
for (const t of broken) console.log(`  ✗ ${t.title} (${t.file})`);
for (const c of tooComplex) console.log(`  ⚠ te complex: ${c.flow}: ${c.over.join(', ')}`);
for (const g of grew) console.log(`  ⚠ complexer geworden: ${g.flow}: ${g.change.join(', ')}`);

process.exit(broken.length ? 1 : tooComplex.length || grew.length ? 2 : 0);
