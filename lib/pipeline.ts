/**
 * The nine-stage pipeline. PRD §AI system design.
 *
 * Stages 3, 4, 5, 6 and 8 are model-led; 1, 2, 7 and 9 are code-led, with
 * stage 9 calling a small model only as a judge. Each stage reports
 * progress so the build screen shows real steps rather than a spinner.
 */
import { fetchProfile, fetchPosts, ScrapeError, scrapeMessage } from './scrape';
import { transcribeVideo, extractImageText } from './transcribe';
import {
  rankPosts, buildExtracted, assessSignal, hasEnough,
  TARGET_POSTS, type ExtractedPost, TRANSCRIBE_BATCH } from './select';
import { runDirectionsStage } from './stages/directions';
import { runProfileStage, describeIsUsable } from './stages/profile';
import { runDemandStage } from './stages/demand';
import { runProductsStage, selectProducts } from './stages/products';
import { runCopyStage } from './stages/copy';
import {
  runCodeChecks, runJudge, judgePasses, judgeFeedback, attemptScore,
} from './stages/check';
import { priceLadder, type LadderRole, type Format, type Scope } from './pricing';
import { regulatedNicheFor } from './guardrails';
import { NICHE_MULTIPLIERS } from './pricing';
import { clampCopy, type Profile, type Demand, type Candidate, type Copy, type Direction, type Judge } from './schemas';

export type StageName =
  | 'scrape_profile' | 'scrape_posts' | 'transcribe'
  | 'profile' | 'demand' | 'products' | 'price' | 'copy' | 'check';

export interface ProgressEvent {
  stage: StageName;
  status: 'running' | 'done' | 'failed' | 'skipped';
  detail?: string;
  /**
   * Carried on the scrape_profile 'done' event only. The caller persists
   * it immediately so that EVERY later failure path, including an
   * unexpected throw, can still greet the creator by name. Previously
   * identity was written only on success or on a handled stop, and the
   * paths that forgot to pass it showed "We couldn't finish this one" to
   * someone the product had demonstrably found.
   */
  found?: { name: string | null; avatarUrl: string | null; followers: number | null };
}
export type OnProgress = (e: ProgressEvent) => void | Promise<void>;

export interface BuildInput {
  handle?: string;
  description?: string;
  name?: string;
}

export interface BuiltProduct {
  position: number;
  ladderRole: LadderRole;
  format: Format;
  scope: Scope;
  title: string;
  promise: string;
  description: string;
  points: string[];
  price: number;
  suggestedPrice: number;
  priceReason: string;
  effort: string;
  demandItem: string;
  evidence: string;
  whyThis: string;
}

export interface BuildResult {
  ok: true;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  followers: number | null;
  bio: string;
  niche: string;
  language: string;
  products: BuiltProduct[];
  unusedCandidates: Candidate[];
  validation: 'pass' | 'repaired' | 'template';
  sourceText: string;
  /** Quality scores for the shipped copy. Absent if the judge failed. */
  judge?: Judge;
}

export interface BuildStop {
  ok: false;
  reason: string;
  canDescribe: boolean;
  /**
   * What the scrape found before the stop. A build that identified the
   * creator and then stopped should still greet them by name: throwing
   * this away makes the failure screen look like nothing worked.
   */
  found?: { name: string | null; avatarUrl: string | null; followers: number | null };
}

/**
 * A substantive creator who teaches nothing directly: three speculative
 * drafts instead of a dead end. Separate from BuildResult because these
 * are guesses and must be labelled, stored and chosen between.
 */
export interface BuildDrafts {
  ok: 'directions';
  found: { name: string | null; avatarUrl: string | null; followers: number | null };
  handle: string | null;
  drafts: Array<{ direction: Direction; result: BuildResult }>;
}

/**
 * Whose name goes on the storefront.
 *
 * Instagram's own fullName is ground truth; the model's name_guess is
 * inference from the bio, and it is wrong in a specific, damaging way.
 * Seen on @ankurwarikoo, whose bio opens "Founder: WebVeda": the model
 * guessed "WebVeda" and it replaced the verified "Ankur Warikoo", putting
 * a company name on a real person's storefront.
 *
 * So the scraped name wins whenever we actually have one. The guess is a
 * fallback for the description path, where nothing was scraped, and for a
 * scrape that only echoed the handle back.
 */
export function chooseName(
  nameGuess: string | null | undefined,
  scraped: string,
  handle: string | null,
): string {
  const scrapedName = scraped?.trim() ?? '';
  // A scrape that merely echoes the handle tells us nothing extra.
  const scrapedIsReal = handle
    ? scrapedName.length > 0 && scrapedName.toLowerCase() !== handle.toLowerCase()
    : false;
  if (scrapedIsReal) return scrapedName;

  // A model that cannot find a name sometimes returns a sentence about not
  // finding one. Treat anything that is not name-shaped as absent.
  const guess = nameGuess?.trim() ?? '';
  const guessLooksReal = guess.length > 0 && guess.length <= 40
    && !/\s(the|a|an|is|does|not)\s/i.test(guess);
  return guessLooksReal ? guess : scrapedName;
}

export class PipelineStop extends Error {
  /**
   * `reason` is shown to the creator and must always say what to do next.
   * `diagnosis` is the internal why, kept out of the UI: the model's own
   * wording is accurate but reads as a judgement of the person.
   */
  constructor(
    readonly reason: string,
    readonly canDescribe = true,
    readonly diagnosis?: string,
    readonly found?: { name: string | null; avatarUrl: string | null; followers: number | null },
  ) {
    super(reason);
    this.name = 'PipelineStop';
  }
}

/** Niches the pricing table knows. Anything else prices at 1.0. */
function pricingNiche(niche: string): string {
  return niche in NICHE_MULTIPLIERS ? niche : 'other';
}

export async function runPipeline(
  input: BuildInput,
  onProgress: OnProgress = () => {},
): Promise<BuildResult | BuildStop | BuildDrafts> {
  try {
    return await execute(input, onProgress);
  } catch (err) {
    if (err instanceof PipelineStop) {
      return {
        ok: false, reason: err.reason, canDescribe: err.canDescribe, found: err.found,
      };
    }
    if (err instanceof ScrapeError) {
      return { ok: false, reason: scrapeMessage(err.kind), canDescribe: true };
    }
    throw err;
  }
}

async function execute(
  input: BuildInput, progress: OnProgress,
): Promise<BuildResult | BuildDrafts> {
  const isDescriptionPath = !input.handle;

  let handle: string | null = null;
  let displayName = input.name ?? 'Creator';
  let avatarUrl: string | null = null;
  let followers: number | null = null;
  let bioText = '';
  let extracted: ExtractedPost[] = [];

  if (isDescriptionPath) {
    // PRD §FR1: a description of 40 words or more skips stages 1 to 3.
    if (!input.description || !describeIsUsable(input.description)) {
      throw new PipelineStop(
        'Tell us a bit more: around 40 words about what you teach and who you help.',
        false,
      );
    }
    for (const s of ['scrape_profile', 'scrape_posts', 'transcribe'] as StageName[]) {
      await progress({ stage: s, status: 'skipped' });
    }
  } else {
    handle = input.handle!;

    // Stage 1a — profile on its own, so "Found you" does not wait.
    await progress({ stage: 'scrape_profile', status: 'running', detail: `Reading @${handle}` });
    const prof = await fetchProfile(handle);
    displayName = prof.name || handle;
    avatarUrl = prof.avatarUrl;
    followers = prof.followers;
    bioText = prof.bio;
    await progress({
      stage: 'scrape_profile', status: 'done',
      detail: `Found ${displayName}${followers ? ` · ${followers.toLocaleString('en-IN')} followers` : ''}`,
      found: { name: displayName, avatarUrl, followers },
    });

    // Stage 1b — 30 recent posts. Slow (~75s), hence behind the progress screen.
    await progress({ stage: 'scrape_posts', status: 'running', detail: 'Looking at your recent posts' });
    const posts = await fetchPosts(handle);
    await progress({ stage: 'scrape_posts', status: 'done', detail: `${posts.length} posts` });

    // Stages 2 and 3 — rank, then transcribe until enough posts are usable.
    await progress({ stage: 'transcribe', status: 'running', detail: 'Listening to your top posts' });
    const ranked = rankPosts(posts);

    // Transcribed in parallel batches, not one at a time. Each post costs
    // ~20-25s (download + Deepgram), so five in sequence is ~175s and a
    // measured end-to-end handle build hit 250s against Vercel's 300s
    // ceiling. Batching pays one post's latency per batch instead.
    // Batches rather than all-at-once so the early stop still works:
    // a creator whose first posts are rich does not pay for the rest.
    const readOne = async (p: (typeof ranked)[number]) => {
      try {
        if (p.videoUrl) {
          const t = await transcribeVideo(p.videoUrl);
          return buildExtracted(p, t.text, 'transcript');
        }
        if (p.imageUrls.length) {
          return buildExtracted(p, await extractImageText(p.imageUrls), 'image_text');
        }
        return buildExtracted(p, '', 'transcript');
      } catch {
        // One bad post never fails a build: fall back to its caption.
        return buildExtracted(p, '', 'transcript');
      }
    };

    for (let i = 0; i < ranked.length; i += TRANSCRIBE_BATCH) {
      if (hasEnough(extracted) || extracted.length >= TARGET_POSTS + 3) break;
      const batch = ranked.slice(i, i + TRANSCRIBE_BATCH);
      extracted.push(...await Promise.all(batch.map(readOne)));
      await progress({
        stage: 'transcribe', status: 'running',
        detail: `Read ${extracted.filter((e) => !e.lowSignal).length} of ${TARGET_POSTS} posts`,
      });
    }

    const verdict = assessSignal(extracted);
    // The scrape already found them by this point. Dropping that identity
    // makes the failure screen say "We couldn't finish this one" to a
    // creator we greeted by name three steps earlier.
    if (!verdict.proceed) {
      throw new PipelineStop(verdict.reason!, true, undefined,
        { name: displayName, avatarUrl, followers });
    }
    await progress({ stage: 'transcribe', status: 'done', detail: `${verdict.usable} posts with usable content` });
  }

  // Stage 4 — Profile.
  await progress({ stage: 'profile', status: 'running', detail: 'Working out what you teach' });
  const profile: Profile = await runProfileStage({
    bio: bioText,
    posts: extracted.map((e) => ({ text: e.text, caption: e.post.caption, lowSignal: e.lowSignal })),
    description: input.description,
    followers,
  });
  if (!profile.teachable || profile.stop_reason) {
    const stopCtx: BuildContext = {
      extracted, isDescriptionPath, followers, bioText, displayName, avatarUrl, handle,
    };
    // On the description path the creator's own text is the only source:
    // bioText and extracted are both empty there, so leaving it out made
    // the whole branch unreachable for typed input.
    const sourceForDirections = [
      input.description ?? '', bioText, ...extracted.map((e) => e.text),
    ].filter((t) => t.trim());

    // A creator can be substantive and still teach nothing: a comedian, an
    // actor, a public figure. That is a different state from an empty page,
    // and it used to produce the same dead end. Offer directions instead.
    //
    // Strictly additive: any failure here falls through to the plain stop
    // below, so this path can never break or slow a build beyond its own
    // 20s timeout.
    if (profile.has_substance && sourceForDirections.length > 0) {
      try {
        await progress({
          stage: 'profile', status: 'running', detail: 'Looking for a different angle',
        });
        const directions = await runDirectionsStage({
          profile, sourceText: sourceForDirections, followers,
        });
        if (directions.length >= 2) {
          // The forks share the scrape; only stages 5 to 9 repeat, and they
          // run together so three drafts cost one draft's latency.
          const settled = await Promise.allSettled(directions.map((d) =>
            buildFromProfile(profileFor(profile, d), stopCtx, d.seed, () => {})));
          const drafts = settled.flatMap((r, i) =>
            r.status === 'fulfilled' ? [{ direction: directions[i], result: r.value }] : []);
          if (drafts.length >= 2) {
            await progress({
              stage: 'check', status: 'done', detail: `${drafts.length} directions`,
            });
            return {
              ok: 'directions',
              found: { name: displayName, avatarUrl, followers },
              handle,
              drafts,
            };
          }
        }
      } catch {
        // Fall through to the plain stop.
      }
    }

    // The model's stop_reason is a diagnosis ("a personal diary page with no
    // expertise") and reads as a judgement of the person. The creator gets a
    // fixed, actionable sentence instead; the diagnosis stays in the logs.
    // PRD §States: a stop must always offer the next step.
    throw new PipelineStop(
      input.handle
        ? "We read your posts but couldn't find a skill you teach. Tell us in your own words what you help people with, and we'll build from that."
        : "We couldn't find a skill to build on. Try again with what you teach, who you help, and the question people ask you most.",
      true,
      profile.stop_reason ?? undefined,
      { name: displayName, avatarUrl, followers },
    );
  }
  await progress({ stage: 'profile', status: 'done', detail: profile.niche.replace(/_/g, ' ') });

  const ctx: BuildContext = {
    extracted, isDescriptionPath, followers, bioText, displayName, avatarUrl, handle,
  };
  return buildFromProfile(profile, ctx, input.description ?? '', progress);
}


/**
 * Stages 5 to 9: everything after the profile is known.
 *
 * Extracted verbatim so the directions path can run it once per
 * direction without duplicating the pipeline. The successful path calls
 * it exactly as before; a fork calls it with a synthesised profile and
 * the direction's seed text. Nothing in here knows a fork exists.
 */
async function buildFromProfile(
  profile: Profile,
  ctx: BuildContext,
  seedText: string,
  progress: OnProgress,
): Promise<BuildResult> {
  // Stage 5 — Demand.
  await progress({ stage: 'demand', status: 'running', detail: 'Finding what your ctx.followers ask for' });
  const demand: Demand = await runDemandStage(
    profile, ctx.extracted.map((e) => e.text), ctx.isDescriptionPath,
  );
  await progress({ stage: 'demand', status: 'done', detail: `${demand.items.length} things they ask about` });

  // Stage 6 — Candidates, then code-side selection.
  await progress({ stage: 'products', status: 'running', detail: 'Designing products you could make' });
  let candidates = await runProductsStage(profile, demand);
  let { chosen, unused } = selectProducts(candidates);
  if (chosen.length < 2) {
    // PRD: fewer than 4 valid candidates, rerun once.
    candidates = await runProductsStage(profile, demand);
    ({ chosen, unused } = selectProducts(candidates));
    if (chosen.length < 2) throw new PipelineStop('We could not design products for this profile.', true);
  }
  await progress({ stage: 'products', status: 'done', detail: `${chosen.length} products` });

  // Stage 7 — Price. Deterministic, cannot fail.
  await progress({ stage: 'price', status: 'running', detail: 'Pricing for India' });
  const priced = priceLadder(chosen.map((c) => ({
    format: c.format as Format,
    niche: pricingNiche(profile.niche),
    followers: ctx.followers,
    scope: c.scope as Scope,
    role: c.ladder_slot as LadderRole,
  })));
  await progress({
    stage: 'price', status: 'done',
    detail: priced.map((p) => `₹${p.price.toLocaleString('en-IN')}`).join(' · '),
  });

  // Stage 8 — Write.
  await progress({ stage: 'copy', status: 'running', detail: 'Writing in your voice' });
  const styleExcerpts = ctx.extracted.filter((e) => !e.lowSignal).map((e) => e.text);
  const copy: Copy = clampCopy(await runCopyStage(
    profile,
    chosen.map((c, i) => ({ candidate: c, price: priced[i].price, role: c.ladder_slot })),
    styleExcerpts.length ? styleExcerpts : [seedText],
  ));
  await progress({ stage: 'copy', status: 'done' });

  // Stage 9 — Check.
  await progress({ stage: 'check', status: 'running', detail: 'Checking every claim' });
  const formats = chosen.map((c) => c.format);
  const regulated = regulatedNicheFor(profile.niche);
  let validation: BuildResult['validation'] = 'pass';
  let finalCopy = copy;

  const checks = runCodeChecks(finalCopy, formats, regulated);
  if (!checks.ok) {
    // PRD: one automatic repair attempt with the error fed back.
    validation = 'repaired';
    const problems = [
      ...checks.structure.map((s) => `${s.field}: ${s.problem}`),
      ...checks.policy.filter((p) => p.severity === 'block').map((p) => `${p.field}: banned phrase "${p.match}"`),
    ].join('\n');
    try {
      finalCopy = clampCopy(await runCopyStage(
        profile,
        chosen.map((c, i) => ({ candidate: c, price: priced[i].price, role: c.ladder_slot })),
        styleExcerpts,
        problems,
      ));
      const recheck = runCodeChecks(finalCopy, formats, regulated);
      if (!recheck.ok) validation = 'template';
    } catch {
      validation = 'template';
    }
  }

  const sourceText = ctx.isDescriptionPath
    ? (seedText)
    : [ctx.bioText, ...ctx.extracted.map((e) => e.text)].filter(Boolean).join('\n\n');

  // Stage 9c — the quality gate.
  //
  // The deterministic checks above count characters and match regexes;
  // neither can tell that "15 tested recipes" is a number the creator
  // never gave. Measured on six builds of the same good input, roughly
  // one in three shipped a fabricated detail. The judge catches those.
  //
  // Strictly additive: the whole block is wrapped so that a judge that
  // times out, throttles or returns nonsense leaves the build exactly as
  // it was. runJudge uses a bare callStage with no retry, and the
  // directions path fires three of these at once, so this matters.
  let judge: Judge | undefined;
  try {
    judge = await runJudge(finalCopy, sourceText);

    if (!judgePasses(judge)) {
      await progress({ stage: 'check', status: 'running', detail: 'Rewriting for accuracy' });
      const first = { copy: finalCopy, judge, validation };

      try {
        const retryCopy = clampCopy(await runCopyStage(
          profile,
          chosen.map((c, i) => ({ candidate: c, price: priced[i].price, role: c.ladder_slot })),
          styleExcerpts,
          judgeFeedback(judge),
        ));

        // A retry that breaks structure is worse than a generic store: a
        // 200-character bio renders broken, and products.length must stay
        // aligned with the positional chosen[i] indexing below.
        if (runCodeChecks(retryCopy, formats, regulated).ok) {
          const retryJudge = await runJudge(retryCopy, sourceText);
          // Ship the BEST attempt, not the last. Copy runs at temperature
          // 0.6, so attempt 2 can be worse — a gate that sometimes lowers
          // quality is not a gate.
          if (attemptScore(retryJudge) > attemptScore(first.judge)) {
            finalCopy = retryCopy;
            judge = retryJudge;
            validation = judgePasses(retryJudge) ? 'repaired' : 'template';
          } else {
            validation = judgePasses(first.judge) ? first.validation : 'template';
          }
        } else {
          validation = 'template';
        }
      } catch {
        // The rewrite failed; keep attempt 1 and flag it.
        validation = 'template';
      }
    }
  } catch {
    // The judge is an improvement to the pipeline, never a dependency.
    judge = undefined;
  }

  await progress({ stage: 'check', status: 'done', detail: validation });

  const products: BuiltProduct[] = finalCopy.products.slice(0, chosen.length).map((p, i) => ({
    position: i,
    ladderRole: chosen[i].ladder_slot as LadderRole,
    format: chosen[i].format as Format,
    scope: priced[i].scope,
    title: p.title,
    promise: p.promise,
    description: p.description,
    points: p.points,
    price: priced[i].price,
    suggestedPrice: priced[i].suggestedPrice,
    priceReason: priced[i].reason,
    effort: chosen[i].effort,
    demandItem: chosen[i].demand_item,
    evidence: chosen[i].evidence,
    whyThis: p.why_this,
  }));

  return {
    ok: true,
    name: chooseName(profile.name_guess, ctx.displayName, ctx.handle),
    handle: ctx.handle,
    avatarUrl: ctx.avatarUrl,
    followers: ctx.followers,
    bio: finalCopy.bio,
    niche: profile.niche,
    language: profile.language,
    products,
    unusedCandidates: unused,
    validation,
    sourceText,
    judge,
  };
}

/** Everything stages 5 to 9 need from the scrape. */
interface BuildContext {
  extracted: ExtractedPost[];
  isDescriptionPath: boolean;
  followers: number | null;
  bioText: string;
  displayName: string;
  avatarUrl: string | null;
  handle: string | null;
}

/**
 * The profile a fork builds from: the real creator's voice and language,
 * but the direction's subject and audience. `teachable` is forced true —
 * the creator has not said they teach this, which is exactly why every
 * draft is stored as a guess and labelled as one.
 */
function profileFor(base: Profile, d: Direction): Profile {
  return {
    ...base,
    skills: [d.topic],
    audience: d.audience,
    teachable: true,
    stop_reason: null,
    signal_strength: 'thin',
  };
}

export { runJudge };
