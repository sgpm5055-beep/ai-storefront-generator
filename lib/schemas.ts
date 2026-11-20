/**
 * Stage output schemas. PRD §Prompt design rules: structured output
 * everywhere, with niche, format and scope as fixed lists so code can act
 * on them. Friendli treats these as a grammar, so output always conforms.
 */
import { z } from 'zod';

/** Fixed niche list. Drives the pricing multiplier and the regulated flag. */
export const NICHES = [
  'fitness', 'exam_prep', 'money_education', 'design', 'food', 'astrology',
  'careers', 'photography', 'beauty', 'parenting', 'lifestyle', 'business',
  'tech_skills', 'students', 'hobbies', 'other',
] as const;
export const NicheEnum = z.enum(NICHES);

/** The four formats the brief names. */
export const FORMATS = ['digital', 'webinar', 'session', 'course'] as const;
export const FormatEnum = z.enum(FORMATS);

export const ScopeEnum = z.enum(['small', 'standard', 'large']);
export const LadderRoleEnum = z.enum(['entry', 'core', 'premium']);
export const LanguageEnum = z.enum(['en', 'hinglish', 'hi']);
export const EffortEnum = z.enum(['an afternoon', 'a weekend', 'a week']);

/** Stage 4 — Profile. Evidence or silence: claims carry a quote. */
export const ProfileSchema = z.object({
  name_guess: z.string().describe('Display name as the creator presents it'),
  niche: NicheEnum,
  skills: z.array(z.string()).min(1).max(5)
    .describe('What this creator can teach, in their own terms'),
  audience: z.string()
    .describe('Who follows them and what those people want'),
  language: LanguageEnum,
  register: z.string()
    .describe('How they speak: formal, casual, direct, warm'),
  evidence: z.array(z.object({
    claim: z.string(),
    quote: z.string().describe('Verbatim from the supplied text'),
  })).min(1).max(5),
  signal_strength: z.enum(['strong', 'adequate', 'thin']),
  teachable: z.boolean()
    .describe('False for meme pages, brand accounts and reposters'),
  stop_reason: z.string().nullable()
    .describe('Why generation should stop, or null to continue'),
});
export type Profile = z.infer<typeof ProfileSchema>;

/** Stage 5 — Demand. Products come from what followers already ask for. */
export const DemandSchema = z.object({
  items: z.array(z.object({
    want: z.string().describe('What followers ask for or struggle with'),
    quote: z.string().describe('Verbatim evidence, or "" when inferred'),
    recurrence: z.enum(['repeated', 'mentioned', 'inferred']),
  })).min(1).max(6),
  confidence: z.enum(['high', 'medium', 'low']),
});
export type Demand = z.infer<typeof DemandSchema>;

/** Stage 6 — Candidates. Diverge: ask for more than needed, select with rules. */
/**
 * Note on lengths: Friendli's grammar enforces structure and types, not
 * maxLength, so a hard .max() here turns a slightly long string into a
 * failed stage. Internal working fields are therefore unbounded and the
 * creator-visible ones are normalised after parsing (see clampCopy).
 */
export const CandidateSchema = z.object({
  working_title: z.string(),
  format: FormatEnum,
  scope: ScopeEnum,
  ladder_slot: LadderRoleEnum,
  demand_item: z.string().describe('Which demand item this answers'),
  evidence: z.string().describe('The quote that justifies it'),
  what_it_is: z.string(),
  effort: EffortEnum.describe('How long it takes the creator to make'),
  score_demand: z.number().min(1).max(5),
  score_effort: z.number().min(1).max(5).describe('5 = easiest to make'),
  score_fit: z.number().min(1).max(5),
});
export const CandidatesSchema = z.object({
  candidates: z.array(CandidateSchema).min(4).max(8),
});
export type Candidate = z.infer<typeof CandidateSchema>;

/** Stage 8 — Copy. Written in the creator's voice, against priced products. */
export const CopySchema = z.object({
  bio: z.string().describe('150 characters or fewer'),
  products: z.array(z.object({
    title: z.string().describe('60 characters or fewer'),
    promise: z.string().describe('One line, 90 characters or fewer: the outcome'),
    description: z.string().describe('40 to 80 words'),
    points: z.array(z.string()).min(3).max(3).describe('What you get, 3 items'),
    why_this: z.string().describe('Why this product, quoting their posts'),
  })).min(2).max(4),
});
export type Copy = z.infer<typeof CopySchema>;

/** Stage 9 — Judge. Faithfulness is a hard gate. */
export const JudgeSchema = z.object({
  faithful: z.boolean().describe('Every claim about the creator traces to the input'),
  unfaithful_claims: z.array(z.string()).max(5),
  policy_ok: z.boolean(),
  policy_problems: z.array(z.string()).max(5),
  specificity: z.number().min(1).max(5)
    .describe('Could this store sit unchanged on another creator in the niche? If yes, 1.'),
  makeability: z.number().min(1).max(5),
  voice_match: z.number().min(1).max(5),
});
export type Judge = z.infer<typeof JudgeSchema>;

/** Word count used by the usability threshold and the description path. */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Trim creator-visible copy to the published limits. The model is asked
 * for these lengths and usually respects them; this guarantees it without
 * failing a whole stage over a few characters. Trimming happens on a word
 * boundary so nothing reads as cut off mid-word.
 */
function trimTo(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;

  const clean = (x: string) =>
    x.replace(/[\s,;:\u2014\u2013-]+$/, '')
     .replace(/\s+(and|or|but|with|for|the|a|an|in|on|of|to|using|just|from|that|which|plus)$/i, '')
     .replace(/[\s,;:]+$/, '');

  // 1. A clause boundary (colon or dash) that leaves a usable head.
  //    "Name: Subtitle" keeps "Name", which reads as a finished title.
  //    Takes the LAST usable boundary, not the first: a title like
  //    "1:1 Physics Doubt Audit: Find Where You Lose Marks" has a colon at
  //    index 1 that is too short to use, and stopping there would skip the
  //    real boundary and fall through to a mid-sentence word cut.
  const boundaries = [...t.slice(0, max + 1)
    .matchAll(/\s*[:\u2014\u2013]|\s[-]\s/g)]
    .map((m) => m.index!)
    .filter((i) => i >= 12);
  if (boundaries.length) return clean(t.slice(0, boundaries[boundaries.length - 1]));

  // 2. The last sentence or list break before the limit.
  const punct = Math.max(
    t.lastIndexOf('. ', max), t.lastIndexOf(', ', max), t.lastIndexOf('; ', max),
  );
  if (punct >= max * 0.55) return clean(t.slice(0, punct));

  // 3. Last resort: cut on a word boundary and drop any dangling word.
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return clean(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut);
}

export function clampCopy(copy: Copy): Copy {
  return {
    bio: trimTo(copy.bio, 150),
    products: copy.products.map((p) => ({
      title: trimTo(p.title, 60),
      promise: trimTo(p.promise, 90),
      description: p.description.trim(),
      points: p.points.slice(0, 3).map((pt) => trimTo(pt, 90)),
      why_this: trimTo(p.why_this, 200),
    })),
  };
}
