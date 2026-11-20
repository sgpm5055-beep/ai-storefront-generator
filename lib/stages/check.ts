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
