/**
 * Golden-set runner. `npm run evals`
 *
 * Three cases, chosen to cover the three ways this product fails:
 *   happy   — output too generic to be worth publishing
 *   thin    — invents an expertise the creator never claimed
 *   hostile — follows an injected instruction, or promises a return
 *
 * These make REAL model calls. The brief requires it, and a mocked eval
 * would not catch the failures that actually happen.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// Load .env.local the same way the scratch probes do: this runs outside Next.
for (const line of readFileSync(join(here, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const { runPipeline } = await import('../lib/pipeline.js');

interface Case {
  name: string;
  why: string;
  input: { description?: string; handle?: string };
  expect: {
    niche?: string;
    validation?: string[];
    minProducts?: number;
    minFormats?: number;
    mustMention?: string[];
    mustNotMention?: string[];
    stops?: boolean;
    stopReasonMentions?: string[];
    noInjectionEcho?: string;
    /** Directions offered instead of a dead end. */
    offersDirections?: boolean;
    minDirections?: number;
    maxDirections?: number;
    directionsMustNotMention?: string[];
  };
}

interface Check { ok: boolean; label: string; detail?: string }

function runChecks(c: Case, result: Awaited<ReturnType<typeof runPipeline>>): Check[] {
  const out: Check[] = [];
  const e = c.expect;

  const isDirections = result.ok === 'directions';
  const dirs = isDirections ? result.drafts : [];

  // A case that must offer directions: substance, but nothing taught.
  if (e.offersDirections) {
    out.push({
      ok: isDirections,
      label: 'offers directions instead of a dead end',
      detail: isDirections ? `${dirs.length} drafts` : (result.ok ? 'built a normal store' : 'plain stop'),
    });
    if (isDirections) {
      if (e.minDirections) {
        out.push({
          ok: dirs.length >= e.minDirections,
          label: `>= ${e.minDirections} directions`, detail: String(dirs.length),
        });
      }
      // The guarantee: every direction quotes the real input.
      const src = (c.input.description ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, '');
      const unquoted = dirs.filter((d) => {
        const q = d.direction.quote.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        return q.length < 10 || !src.includes(q);
      });
      out.push({
        ok: unquoted.length === 0,
        label: 'every direction quotes the input',
        detail: unquoted.length ? `${unquoted.length} unverifiable` : undefined,
      });
      // Each draft is stored as a guess, never as a read of the account.
      out.push({
        ok: dirs.every((d) => d.result.validation === 'template'
          || d.result.validation === 'pass' || d.result.validation === 'repaired'),
        label: 'drafts built cleanly',
        detail: dirs.map((d) => d.result.validation).join(', '),
      });
      if (e.directionsMustNotMention) {
        const blob = dirs.map((d) =>
          `${d.direction.topic} ${d.direction.because} ${d.direction.seed}`).join(' ').toLowerCase();
        const bad = e.directionsMustNotMention.filter((w) => blob.includes(w.toLowerCase()));
        out.push({
          ok: bad.length === 0, label: 'no credential claims',
          detail: bad.length ? `FOUND: ${bad.join(', ')}` : undefined,
        });
      }
      for (const d of dirs) {
        out.push({
          ok: true, label: `  direction: ${d.direction.topic}`,
          detail: d.result.products.map((p) => `Rs.${p.price}`).join(' '),
        });
      }
    }
    return out;
  }

  if (e.stops) {
    out.push({
      ok: !result.ok,
      label: 'stops instead of inventing',
      detail: result.ok === 'directions'
        ? `offered ${dirs.length} directions anyway`
        : result.ok ? `built ${result.products.length} products anyway` : undefined,
    });
    // Gibberish must stop with NOTHING. This assertion is what defends
    // the evidence guarantee against the directions feature.
    if (e.maxDirections !== undefined) {
      out.push({
        ok: dirs.length <= e.maxDirections,
        label: `<= ${e.maxDirections} directions`,
        detail: String(dirs.length),
      });
    }
    if (result.ok === false && e.stopReasonMentions) {
      const r = result.reason.toLowerCase();
      out.push({
        ok: e.stopReasonMentions.some((w) => r.includes(w.toLowerCase())),
        label: 'stop reason is actionable',
        detail: result.reason,
      });
    }
    return out;
  }

  out.push({
    ok: result.ok === true, label: 'builds',
    detail: result.ok === true ? undefined
      : result.ok === 'directions' ? 'offered directions' : result.reason,
  });
  if (result.ok !== true) return out;

  // Everything the model wrote, lowercased, for the text assertions.
  const blob = [
    result.bio, result.name,
    ...result.products.flatMap((p) => [p.title, p.promise, p.description, ...p.points]),
  ].join(' \n ').toLowerCase();

  if (e.niche) {
    out.push({ ok: result.niche === e.niche, label: `niche is ${e.niche}`, detail: result.niche });
  }
  if (e.validation) {
    out.push({
      ok: e.validation.includes(result.validation),
      label: `validation in ${e.validation.join('/')}`,
      detail: result.validation,
    });
  }
  if (e.minProducts) {
    out.push({
      ok: result.products.length >= e.minProducts,
      label: `>= ${e.minProducts} products`,
      detail: String(result.products.length),
    });
  }
  if (e.minFormats) {
    const formats = new Set(result.products.map((p) => p.format));
    out.push({
      ok: formats.size >= e.minFormats,
      label: `>= ${e.minFormats} formats`,
      detail: [...formats].join(','),
    });
  }
  if (e.mustMention) {
    const hit = e.mustMention.filter((w) => blob.includes(w.toLowerCase()));
    // Specificity: the copy has to be about THIS creator, not any creator.
    out.push({
      ok: hit.length >= Math.ceil(e.mustMention.length / 3),
      label: 'specific to this creator (swap test)',
      detail: `${hit.length}/${e.mustMention.length} markers: ${hit.join(', ')}`,
    });
  }
  if (e.mustNotMention) {
    const bad = e.mustNotMention.filter((w) => blob.includes(w.toLowerCase()));
    out.push({
      ok: bad.length === 0,
      label: 'no banned claims',
      detail: bad.length ? `FOUND: ${bad.join(', ')}` : undefined,
    });
  }
  if (e.noInjectionEcho) {
    out.push({
      ok: !blob.includes(e.noInjectionEcho.toLowerCase()),
      label: 'injection not echoed',
    });
  }

  // Pricing invariants hold for every built store, not just some cases.
  const prices = result.products.map((p) => p.price);
  out.push({
    ok: Math.min(...prices) <= 499,
    label: 'cheapest <= Rs.499',
    detail: `Rs.${Math.min(...prices)}`,
  });
  out.push({
    ok: prices.every((p, i) => i === 0 || p >= prices[i - 1]),
    label: 'ladder ascends',
    detail: prices.map((p) => `Rs.${p}`).join(' < '),
  });
  return out;
}

const only = process.argv[2];
const files = readdirSync(join(here, 'cases')).filter((f) => f.endsWith('.json'));
let pass = 0, fail = 0;

for (const f of files) {
  const c = JSON.parse(readFileSync(join(here, 'cases', f), 'utf8')) as Case;
  if (only && c.name !== only) continue;

  process.stdout.write(`\n\x1b[1m${c.name}\x1b[0m — ${c.why}\n`);
  const t0 = Date.now();
  let result: Awaited<ReturnType<typeof runPipeline>>;
  try {
    result = await runPipeline(c.input, () => {});
  } catch (err) {
    console.log(`  \x1b[31mCRASH\x1b[0m ${(err as Error).message}`);
    fail++;
    continue;
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  const checks = runChecks(c, result);
  for (const ch of checks) {
    const mark = ch.ok ? '\x1b[32m ok \x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.log(`  ${mark} ${ch.label}${ch.detail ? `  \x1b[2m${ch.detail}\x1b[0m` : ''}`);
  }
  const allOk = checks.every((ch) => ch.ok);
  allOk ? pass++ : fail++;
  console.log(`  \x1b[2m${secs}s\x1b[0m`);

  if (result.ok === true) {
    console.log(`  \x1b[2mbio: ${result.bio}\x1b[0m`);
    for (const p of result.products) {
      console.log(`  \x1b[2m  [${p.ladderRole}/${p.format}] Rs.${p.price} ${p.title}\x1b[0m`);
    }
  } else if (result.ok === 'directions') {
    for (const d of result.drafts) {
      console.log(`  \x1b[2m${d.direction.topic} — "${d.direction.quote.slice(0, 60)}"\x1b[0m`);
      for (const p of d.result.products) {
        console.log(`  \x1b[2m    [${p.format}] Rs.${p.price} ${p.title}\x1b[0m`);
      }
    }
  }
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
