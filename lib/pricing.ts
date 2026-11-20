/**
 * India pricing logic. PRD §India pricing logic.
 *
 * price = snap(clamp(typical_format x niche x audience x scope))
 *
 * The model classifies; this code computes. Deterministic by design:
 * the same input always yields the same rupee price, so it is unit-testable
 * and can be swapped for real conversion data without touching a prompt.
 */

export type Format = 'digital' | 'webinar' | 'session' | 'course';
export type Scope = 'small' | 'standard' | 'large';
export type LadderRole = 'entry' | 'core' | 'premium';

/** Seed bands by format (v0 priors, not data). PRD table. */
export const BANDS: Record<Format, { floor: number; typical: number; ceiling: number }> = {
  digital: { floor: 99, typical: 299, ceiling: 999 },
  webinar: { floor: 99, typical: 299, ceiling: 999 },
  session: { floor: 299, typical: 799, ceiling: 2999 },
  course: { floor: 999, typical: 1999, ceiling: 4999 },
};

/** Niche multipliers. Model classifies into this fixed list. */
export const NICHE_MULTIPLIERS: Record<string, number> = {
  students: 0.8, exam_prep: 0.8, hobbies: 0.8,
  fitness: 1.0, food: 1.0, lifestyle: 1.0, beauty: 1.0,
  parenting: 1.0, astrology: 1.0,
  careers: 1.3, business: 1.3, tech_skills: 1.3, money_education: 1.3,
};

export const SCOPE_MULTIPLIERS: Record<Scope, number> = {
  small: 0.7, standard: 1.0, large: 1.5,
};

/** Price points. Snap to the nearest; a tie snaps down. */
export const PRICE_POINTS: readonly number[] = [
  99, 149, 199, 249, 299, 399, 499, 599, 799, 999,
  1299, 1499, 1999, 2499, 2999, 3999, 4999,
];

/** Nothing above this for a first-time seller. PRD rule 4. */
export const MAX_FIRST_TIME_PRICE = 4999;
/** The cheapest product must cost this or less. PRD rule 2. */
export const ENTRY_PRICE_CEILING = 499;
/** Each product costs at least this many times the one below it. PRD rule 3. */
export const LADDER_STEP = 1.5;

export function audienceMultiplier(followers: number | null | undefined): number {
  if (followers == null) return 1.0;       // unknown
  if (followers < 10_000) return 0.9;
  if (followers <= 100_000) return 1.0;
  return 1.15;
}

export function nicheMultiplier(niche: string): number {
  return NICHE_MULTIPLIERS[niche] ?? 1.0;
}

/** Snap to the nearest price point. A tie snaps down. */
export function snap(value: number): number {
  let best = PRICE_POINTS[0];
  let bestDist = Math.abs(PRICE_POINTS[0] - value);
  for (const p of PRICE_POINTS) {
    const d = Math.abs(p - value);
    // strictly-less keeps the lower point on a tie, since the list ascends
    if (d < bestDist) { best = p; bestDist = d; }
  }
  return best;
}

export function clamp(value: number, format: Format): number {
  const { floor, ceiling } = BANDS[format];
  return Math.min(ceiling, Math.max(floor, value));
}

/** The next price point at or above a value. */
export function nextPointAtOrAbove(value: number): number {
  for (const p of PRICE_POINTS) if (p >= value) return p;
  return PRICE_POINTS[PRICE_POINTS.length - 1];
}

/** The next price point at or below a value. */
export function nextPointAtOrBelow(value: number): number {
  for (let i = PRICE_POINTS.length - 1; i >= 0; i--) {
    if (PRICE_POINTS[i] <= value) return PRICE_POINTS[i];
  }
  return PRICE_POINTS[0];
}

export interface PriceInput {
  format: Format;
  niche: string;
  followers: number | null;
  scope: Scope;
}

export interface PricedItem extends PriceInput {
  raw: number;
  price: number;
}

/** Stage 7 for a single product, before the ladder rules run across the set. */
export function basePrice(input: PriceInput): PricedItem {
  const { typical } = BANDS[input.format];
  const raw =
    typical *
    nicheMultiplier(input.niche) *
    audienceMultiplier(input.followers) *
    SCOPE_MULTIPLIERS[input.scope];
  return { ...input, raw, price: snap(clamp(raw, input.format)) };
}

/** Human-readable reason shown beside the price. PRD: one plain line. */
export function priceReason(item: PricedItem, role: LadderRole): string {
  const followers = item.followers;
  const audience =
    followers == null
      ? 'your audience'
      : `a ${item.niche.replace(/_/g, ' ')} audience of about ${formatFollowers(followers)}`;
  if (role === 'entry') return `₹${item.price.toLocaleString('en-IN')}: sized as an easy first purchase for ${audience}.`;
  if (role === 'premium') return `₹${item.price.toLocaleString('en-IN')}: your premium offer, priced for ${audience}.`;
  return `₹${item.price.toLocaleString('en-IN')}: a step up from your first product, for ${audience}.`;
}

function formatFollowers(n: number): string {
  if (n >= 100_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return `${n}`;
}

export interface LadderProduct {
  format: Format;
  niche: string;
  followers: number | null;
  scope: Scope;
  role: LadderRole;
}

export interface LadderResult {
  price: number;
  suggestedPrice: number;   // before ladder adjustment, for calibration data
  raw: number;
  reason: string;
  scope: Scope;             // may be reduced to 'small' by rule 2
}

const ROLE_ORDER: LadderRole[] = ['entry', 'core', 'premium'];

/**
 * Apply the full rule set across a ladder. PRD snap-and-ladder rules 1-4.
 *
 * Rules 5 (creator override) and 6 (rerun on swap) are caller concerns:
 * overrides are never blocked, and the caller reruns this on regeneration.
 *
 * Note: these rules are enforced at GENERATION time only. Creator edits on
 * the review screen are never clamped back - the creator always wins.
 */
export function priceLadder(products: LadderProduct[]): LadderResult[] {
  // Order by ladder role so "working from the cheapest up" is well defined.
  const ordered = [...products].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
  );

  const priced = ordered.map((p) => {
    let item = basePrice(p);
    let scope = p.scope;
    // Rule 2: the cheapest product must be <= 499. Reduce scope if it is not.
    if (p.role === 'entry' && item.price > ENTRY_PRICE_CEILING && scope !== 'small') {
      scope = 'small';
      item = basePrice({ ...p, scope });
    }
    return { input: { ...p, scope }, item, scope, suggested: item.price };
  });

  // Rule 3: working from the cheapest up, each >= 1.5x the one below.
  // If the higher one hits its format ceiling, move the lower one down instead.
  for (let i = 1; i < priced.length; i++) {
    const below = priced[i - 1];
    const here = priced[i];
    const required = below.item.price * LADDER_STEP;
    if (here.item.price >= required) continue;

    // The effective ceiling is the format band capped by rule 4's global max.
    const ceiling = Math.min(BANDS[here.input.format].ceiling, MAX_FIRST_TIME_PRICE);
    const target = nextPointAtOrAbove(required);

    // nextPointAtOrAbove saturates at the top of the table, so verify the
    // target genuinely satisfies the ratio rather than merely fitting under
    // the ceiling. Two courses cannot sit 1.5x apart below the 4,999 cap.
    if (target <= ceiling && target >= required) {
      here.item = { ...here.item, price: target };
    } else {
      // The ceiling always wins: raise the higher one to its ceiling,
      // then move the lower one down until the ratio holds.
      here.item = { ...here.item, price: nextPointAtOrBelow(ceiling) };
      const maxBelow = here.item.price / LADDER_STEP;
      const newBelow = nextPointAtOrBelow(maxBelow);
      below.item = { ...below.item, price: newBelow };
      // Re-check the pair underneath, since the lower one just moved.
      if (i >= 2) {
        const under = priced[i - 2];
        if (below.item.price < under.item.price * LADDER_STEP) {
          under.item = {
            ...under.item,
            price: nextPointAtOrBelow(below.item.price / LADDER_STEP),
          };
        }
      }
    }
  }

  // Rule 4: nothing above 4999 for a first-time seller.
  for (const p of priced) {
    if (p.item.price > MAX_FIRST_TIME_PRICE) {
      p.item = { ...p.item, price: MAX_FIRST_TIME_PRICE };
    }
  }

  // Map back to the caller's original ordering.
  const byRole = new Map(priced.map((p) => [p.input.role, p]));
  return products.map((orig) => {
    const p = byRole.get(orig.role)!;
    return {
      price: p.item.price,
      suggestedPrice: p.suggested,
      raw: p.item.raw,
      reason: priceReason(p.item, orig.role),
      scope: p.scope,
    };
  });
}
