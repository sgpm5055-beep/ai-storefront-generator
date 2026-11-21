/**
 * Stage 9 — Check. PRD: pass, repaired, or template. Code checks run on
 * every live generation; the model judge runs offline on the golden set
 * and on a sample of live traffic.
 */
import { callStage, quoteCreatorText } from '../llm';
import { JudgeSchema, type Judge, type Copy, wordCount } from '../schemas';
import { checkDraft, hasBlockingViolation, type RegulatedNiche, type PolicyViolation } from '../guardrails';

export interface StructureProblem { field: string; problem: string }

/**
 * The structure hard gate. PRD §Rubric: schema, field lengths, 2 to 4
 * products, 2 or more formats. Code only, 100% required.
 */
export function checkStructure(copy: Copy, formats: string[]): StructureProblem[] {
  const out: StructureProblem[] = [];
  if (!copy.bio?.trim()) out.push({ field: 'bio', problem: 'missing' });
  if (copy.bio && copy.bio.length > 150) out.push({ field: 'bio', problem: `${copy.bio.length} chars, max 150` });
  if (copy.products.length < 2 || copy.products.length > 4) {
    out.push({ field: 'products', problem: `${copy.products.length} products, need 2 to 4` });
  }
  if (new Set(formats).size < 2) {
    out.push({ field: 'products', problem: 'needs at least two formats' });
  }
  copy.products.forEach((p, i) => {
    if (p.title.length > 60) out.push({ field: `products[${i}].title`, problem: `${p.title.length} chars, max 60` });
    if (p.promise.length > 90) out.push({ field: `products[${i}].promise`, problem: `${p.promise.length} chars, max 90` });
    const w = wordCount(p.description);
    if (w < 40 || w > 80) out.push({ field: `products[${i}].description`, problem: `${w} words, need 40 to 80` });
    if (p.points.length !== 3) out.push({ field: `products[${i}].points`, problem: `${p.points.length} points, need 3` });
  });
  return out;
}

export interface CheckOutcome {
  ok: boolean;
  structure: StructureProblem[];
  policy: PolicyViolation[];
}

/** The two code-run hard gates, together. */
export function runCodeChecks(
  copy: Copy,
  formats: string[],
  niche: RegulatedNiche,
): CheckOutcome {
  const structure = checkStructure(copy, formats);
  const policy = checkDraft(copy, niche);
  return {
    ok: structure.length === 0 && !hasBlockingViolation(policy),
    structure,
    policy,
  };
}

const JUDGE_SYSTEM = `You audit a generated storefront against the creator's own words.

- faithful: false if ANY claim about the creator is not supported by the source text. Credentials, experience, results and client counts are the usual offenders.
- policy_ok: false if the copy promises outcomes, guarantees results, invents social proof, or gives regulated advice (investment tips, medical claims, exam guarantees).
- specificity: 1 means this store could sit unchanged on any other creator in the same niche. 5 means it could only belong to this one.
- makeability: could this creator make the cheapest product in a weekend from what they already have?
- voice_match: does the copy sound like the source text, or like an advertisement?

Be strict. You are the last check before a real person's name goes on this page.`;

/** The faithfulness and policy judge. PRD: a small fast model as judge. */
export async function runJudge(copy: Copy, sourceText: string): Promise<Judge> {
  const draft = [
    `BIO: ${copy.bio}`,
    ...copy.products.map((p, i) =>
      `PRODUCT ${i + 1}: ${p.title}\n  promise: ${p.promise}\n  description: ${p.description}\n  points: ${p.points.join(' | ')}`),
  ].join('\n\n');

  const r = await callStage({
    stage: 'judge',
    system: JUDGE_SYSTEM,
    user: [
      quoteCreatorText('source_text', sourceText.slice(0, 8000)),
      '',
      'GENERATED STOREFRONT:',
      draft,
      '',
      'Audit the storefront against the source text.',
    ].join('\n'),
    schema: JudgeSchema,
    schemaName: 'quality_judgement',
    temperature: 0,
    maxTokens: 1000,
  });
  return r.data;
}

/**
 * The quality gate. PRD §Rubric sets the bars; these are one point below
 * the aggregate bars, deliberately.
 *
 * The PRD asks for specificity >= 4 on 80% of the golden set. That is an
 * AGGREGATE bar: 20% scoring 3 is acceptable. Gating every individual
 * store at 4 would assert 100% on a dimension set at 80%, and retry on
 * roughly one store in five for a coin-flip improvement.
 */
export const GATE = {
  /** Hard. A fabricated claim on a real person's public page. */
  faithful: true,
  /** Hard. A phrasing the deterministic regexes did not catch. */
  policy_ok: true,
  /** The swap test. Below 3 the store could belong to anyone. */
  specificity: 3,
  makeability: 3,
  /** Loosest: the least calibrated dimension, and the most subjective. */
  voice_match: 2,
} as const;

/**
 * Per-dimension, never a composite average: a store with specificity 1
 * and voice 5 averages 3 and would pass a mean-based gate, which is the
 * exact failure the swap test exists to catch.
 */
export function judgePasses(j: Judge): boolean {
  return j.faithful
    && j.policy_ok
    && j.specificity >= GATE.specificity
    && j.makeability >= GATE.makeability
    && j.voice_match >= GATE.voice_match;
}

/**
 * Rank two attempts. Hard gates dominate, so a faithful store always
 * beats an unfaithful one whatever its graded scores. Specificity is
 * weighted above the rest because it is the product's stated claim.
 */
export function attemptScore(j: Judge): number {
  return (j.faithful ? 1000 : 0)
    + (j.policy_ok ? 1000 : 0)
    + j.specificity * 10
    + j.makeability * 2
    + j.voice_match;
}

/**
 * What the rewrite is told. Quoting the offending strings is what makes
 * attempt 2 an improvement rather than a reroll: generic feedback
 * ("be more specific") produces generic output.
 */
export function judgeFeedback(j: Judge): string {
  const lines: string[] = [];

  if (!j.faithful && j.unfaithful_claims.length) {
    lines.push(
      'These claims are NOT supported by the creator\'s own words. Remove them, '
      + 'or replace them with something the source text actually says:',
      ...j.unfaithful_claims.map((c) => `  - ${c}`),
    );
  }
  if (!j.policy_ok && j.policy_problems.length) {
    lines.push(
      'These break the rules on promises and proof. Rewrite them as plain '
      + 'description of what the buyer gets, with no promised outcome:',
      ...j.policy_problems.map((p) => `  - ${p}`),
    );
  }
  if (j.specificity < GATE.specificity) {
    lines.push(
      `Specificity scored ${j.specificity} of 5: this copy could sit unchanged on `
      + 'any other creator in this niche. Rewrite so it could only belong to THIS '
      + 'creator. Use the specific objects, places, words and problems that appear '
      + 'in the style reference above, not the generic version of them.',
    );
  }
  if (j.makeability < GATE.makeability) {
    lines.push(
      `Makeability scored ${j.makeability} of 5. Describe the cheapest product as `
      + 'something this creator could put together in a weekend from material they '
      + 'already have.',
    );
  }
  if (j.voice_match < GATE.voice_match) {
    lines.push(
      `Voice scored ${j.voice_match} of 5: this reads like an advertisement rather `
      + 'than like the creator. Match the sentence length, language mix and register '
      + 'of the style reference.',
    );
  }
  return lines.join('\n');
}
