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
  /**
   * Is there a real person with real output here, even if they name no
   * teachable skill? A comedian with 8.6M followers is substantive but
   * not teachable; a reposter is neither. `teachable` alone cannot tell
   * those apart, and conflating them turned a famous creator into a dead
   * end. Only a substantive creator is offered directions.
   */
  has_substance: z.boolean()
    .describe('True when there is a real person with real output, even if they teach nothing'),
  stop_reason: z.string().nullable()
    .describe('Why generation should stop, or null to continue'),
});
export type Profile = z.infer<typeof ProfileSchema>;

/**
 * Stage 4b — Directions. Runs ONLY when Stage 4 found substance but no
 * teachable skill (a comedian, an actor, a public figure).
 *
 * This is the one schema in the system allowed to hold something the
 * evidence does not directly support, so the boundary is structural:
 * a Direction has no price, no title and no ladder role, and therefore
 * cannot be rendered as a product. It is an INPUT to a normal build.
 * Everything downstream still demands evidence in the usual way.
 */
export const DirectionSchema = z.object({
  /** A subject the creator could teach. Not a product title. */
  topic: z.string().describe('A short subject, 2 to 5 words'),
  /**
   * A self-description in the creator's voice, as if they had typed it.
   * This is what the normal pipeline builds from, so the speculative
   * path needs no speculative code.
   */
  seed: z.string().describe('40 to 80 words, first person, as the creator would write it'),
  /** Our inference, shown to the creator as an inference. */
  because: z.string().describe('Why we thought of this, in one sentence'),
  /** Verbatim from the source text. Verified in code, never trusted. */
  quote: z.string().describe('A verbatim quote from the supplied text'),
  audience: z.string().describe('Who would buy this'),
});

export const DirectionsSchema = z.object({
  /**
   * No `.min()`, deliberately. An empty array is a correct answer, and
   * is what the thin case must produce: the grammar must never force an
   * invention when there is nothing to build on.
   */
  directions: z.array(DirectionSchema).max(3),
});

export type Direction = z.infer<typeof DirectionSchema>;
export type Directions = z.infer<typeof DirectionsSchema>;

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

  // Trailing words that cannot end a sentence. Applied repeatedly,
  // because a cut often leaves two of them stacked: "...without any
  // special" (seen live) is a determiner plus an adjective both waiting
  // on a noun that the trim removed.
  const DANGLING =
    /\s+(and|or|but|with|without|for|the|a|an|any|some|every|each|no|your|their|my|our|its|his|her|this|that|these|those|in|on|at|of|to|into|onto|from|by|as|using|just|which|who|plus|more|most|very|really|special|other|another|same|own|new|first|next|last|only|even|still|also)$/i;

  const clean = (x: string) => {
    let out = x.replace(/[\s,;:\u2014\u2013-]+$/, '');
    // Bounded: each pass removes a word, so it cannot loop forever.
    for (let i = 0; i < 4; i++) {
      const next = out.replace(DANGLING, '').replace(/[\s,;:]+$/, '');
      if (next === out) break;
      out = next;
    }
    return out;
  };

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
