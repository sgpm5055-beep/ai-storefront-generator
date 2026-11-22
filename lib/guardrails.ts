/**
 * Guardrails. PRD §Quality evals and guardrails.
 *
 * The page carries a real person's name, so these are release blockers.
 * Code patterns run on every live generation; a model judge runs offline
 * on the golden set. These are product rules informed by regulation,
 * not legal advice.
 */

export type RegulatedNiche = 'money' | 'health' | 'exam' | null;

export interface PolicyViolation {
  rule: string;
  severity: 'block' | 'warn';
  match: string;
  field: string;
}

/** Niches that carry extra rules. Model sets the flag; code enforces. */
export function regulatedNicheFor(niche: string): RegulatedNiche {
  if (['money_education', 'business'].includes(niche)) return 'money';
  if (['fitness', 'health', 'nutrition'].includes(niche)) return 'health';
  if (['exam_prep', 'students'].includes(niche)) return 'exam';
  return null;
}

interface Rule {
  id: string;
  /** null means the rule applies to every niche. */
  niche: RegulatedNiche | 'any';
  pattern: RegExp;
  severity: 'block' | 'warn';
}

/**
 * SEBI Jan 2025: unregistered people cannot advise or claim performance.
 * ASCI Apr 2025: technical health advice needs relevant qualifications.
 * CCPA Nov 2024: no claims of selection, rank or guaranteed results.
 */
const RULES: Rule[] = [
  // Money and investing — education only.
  { id: 'money.tips',      niche: 'money', severity: 'block', pattern: /\b(stock|share|equity|crypto|intraday)\s+(tip|tips|pick|picks|call|calls|signal|signals)\b/i },
  { id: 'money.returns',   niche: 'money', severity: 'block', pattern: /\b(guaranteed|assured|fixed|promised)\s+(return|returns|profit|profits|income)\b/i },
  { id: 'money.multiply',  niche: 'money', severity: 'block', pattern: /\b(double|triple|10x|multiply)\s+(your\s+)?(money|capital|investment|portfolio)\b/i },
  { id: 'money.advisory',  niche: 'money', severity: 'block', pattern: /\b(buy|sell)\s+(now|this\s+stock|recommendation)\b/i },

  // Health, nutrition, fitness — no cures or guarantees.
  { id: 'health.cure',     niche: 'health', severity: 'block', pattern: /\b(cure|cures|heal|heals|reverse|reverses)\s+(your\s+)?(diabetes|pcos|thyroid|cancer|disease|illness)\b/i },
  { id: 'health.guarantee',niche: 'health', severity: 'block', pattern: /\b(guaranteed|assured)\s+(weight\s*loss|results?|transformation)\b/i },
  { id: 'health.kgclaim',  niche: 'health', severity: 'block', pattern: /\blose\s+\d+\s*(kg|kgs|kilos|pounds|lbs)\b/i },
  { id: 'health.medical',  niche: 'health', severity: 'warn',  pattern: /\b(prescription|prescribe|diagnose|diagnosis|treatment\s+plan)\b/i },

  // Exam prep and coaching — no promises of outcome.
  { id: 'exam.selection',  niche: 'exam', severity: 'block', pattern: /\b(guaranteed|assured|100%)\s+(selection|success|rank|result|admission)\b/i },
  { id: 'exam.rank',       niche: 'exam', severity: 'block', pattern: /\b(top\s+\d+\s+rank|rank\s+under\s+\d+|air\s+\d+)\s+(guaranteed|assured|promised)\b/i },
  { id: 'exam.marks',      niche: 'exam', severity: 'block', pattern: /\b(score|scoring)\s+\d+\+?\s*(marks|percentile)\s+(guaranteed|assured)\b/i },

  // Every niche — no invented social proof or urgency.
  { id: 'any.testimonial', niche: 'any', severity: 'block', pattern: /\b\d[\d,]*\+?\s*(students|clients|customers|people)\s+(have\s+)?(enrolled|joined|bought|trusted|transformed)\b/i },
  { id: 'any.income',      niche: 'any', severity: 'block', pattern: /\b(earn|make)\s+(₹|rs\.?|inr)\s*[\d,]+\s*(per|\/)\s*(day|week|month)\b/i },
  { id: 'any.discount',    niche: 'any', severity: 'block', pattern: /\b(\d{1,2}%\s+off|limited\s+time|offer\s+ends|hurry)\b/i },
  { id: 'any.scarcity',    niche: 'any', severity: 'block', pattern: /\b(only|last|just)\s+\d+\s+(\w+\s+)?(left|remaining|seats?|spots?|slots?)\b/i },
  { id: 'any.countdown',   niche: 'any', severity: 'block', pattern: /\b(ends\s+(today|tonight|in\s+\d+)|\d+\s+hours?\s+left)\b/i },
  { id: 'any.rating',      niche: 'any', severity: 'block', pattern: /\b\d(\.\d)?\s*(star|\/\s*5)\s+(rated|rating)\b/i },
];

/** Scan one field. Rules for other niches are skipped. */
/**
 * Check one field.
 *
 * `allNiches` ignores the niche filter and runs every rule. Use it for
 * text the CREATOR TYPED, where the stored niche says nothing about what
 * they might write: a food creator can type "guaranteed returns, 10x your
 * money" into their bio, and the money rules would be skipped because the
 * niche is 'food'. Found by publishing a real store and typing exactly
 * that — it saved with HTTP 200 and went live.
 *
 * Generated copy keeps the niche filter: there the niche is known to match
 * the content, and running every rule on it would reject safe phrasings
 * (a fitness coach legitimately saying "results" is not a SEBI problem).
 */
export function checkField(
  field: string,
  text: string,
  niche: RegulatedNiche,
  allNiches = false,
): PolicyViolation[] {
  if (!text) return [];
  const out: PolicyViolation[] = [];
  for (const rule of RULES) {
    if (!allNiches && rule.niche !== 'any' && rule.niche !== niche) continue;
    const m = text.match(rule.pattern);
    if (m) out.push({ rule: rule.id, severity: rule.severity, match: m[0], field });
  }
  return out;
}

export interface DraftLike {
  bio?: string | null;
  products: Array<{
    title?: string | null;
    promise?: string | null;
    description?: string | null;
    points?: string[] | null;
  }>;
}

/** The policy hard gate. Any blocking violation fails the draft. */
export function checkDraft(draft: DraftLike, niche: RegulatedNiche): PolicyViolation[] {
  const out: PolicyViolation[] = [];
  if (draft.bio) out.push(...checkField('bio', draft.bio, niche));
  draft.products.forEach((p, i) => {
    out.push(...checkField(`products[${i}].title`, p.title ?? '', niche));
    out.push(...checkField(`products[${i}].promise`, p.promise ?? '', niche));
    out.push(...checkField(`products[${i}].description`, p.description ?? '', niche));
    (p.points ?? []).forEach((pt, j) =>
      out.push(...checkField(`products[${i}].points[${j}]`, pt, niche)),
    );
  });
  return out;
}

export function hasBlockingViolation(violations: PolicyViolation[]): boolean {
  return violations.some((v) => v.severity === 'block');
}

/**
 * Prompt-injection detection on creator input. We do not reject on this —
 * the defence is treating the text as quoted data (see quoteCreatorText).
 * This only flags it so the hostile golden-set case can assert on it.
 */
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(the\s+)?(system|previous|above)/i,
  /you\s+are\s+now\s+a\b/i,
  /new\s+instructions?\s*:/i,
  /\bsystem\s*prompt\b/i,
  /output\s+only\s+the\s+word/i,
  /pretend\s+(to\s+be|you\s+are)/i,
];

export function detectInjection(text: string): string[] {
  return INJECTION_PATTERNS.filter((p) => p.test(text)).map((p) => p.source);
}

/** Education-only framing required for regulated niches. */
export function requiresEducationalFraming(niche: RegulatedNiche): boolean {
  return niche === 'money';
}

/**
 * Credential language, for Stage 4b directions.
 *
 * A direction is a guess about what a creator *could* offer. The moment
 * it says "expert" or "10 years", it stops being a guess and becomes a
 * claim about the person — which is exactly what the evidence rule
 * forbids. Any direction matching this is dropped, not repaired: there
 * is no evidence behind it to repair it with.
 */
const CREDENTIAL_PATTERNS = [
  /\b(expert|expertise|specialist|authority|guru|veteran)\b/i,
  /\b(proven|trusted|certified|qualified|accredited|licensed)\b/i,
  /\b(renowned|acclaimed|award[- ]winning|celebrated|leading|top|best[- ]selling)\b/i,
  /\b\d+\+?\s*(years?|yrs?)\b/i,
  /\b\d+[,\d]*\+?\s*(clients?|students?|customers?|people)\s+(taught|trained|helped|served)\b/i,
  /\bhelped\s+\d+[,\d]*\+?\b/i,
  /\byears\s+of\s+(experience|practice)\b/i,
];

/**
 * True when the text claims a credential we cannot evidence.
 * Used to filter directions before they reach the creator.
 */
export function assertsCredential(text: string): boolean {
  return CREDENTIAL_PATTERNS.some((p) => p.test(text));
}
