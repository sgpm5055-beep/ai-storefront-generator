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
  TARGET_POSTS, type ExtractedPost,
} from './select';
import { runProfileStage, describeIsUsable } from './stages/profile';
import { runDemandStage } from './stages/demand';
import { runProductsStage, selectProducts } from './stages/products';
import { runCopyStage } from './stages/copy';
import { runCodeChecks, runJudge } from './stages/check';
import { priceLadder, type LadderRole, type Format, type Scope } from './pricing';
import { regulatedNicheFor } from './guardrails';
import { NICHE_MULTIPLIERS } from './pricing';
import { clampCopy, type Profile, type Demand, type Candidate, type Copy } from './schemas';

export type StageName =
  | 'scrape_profile' | 'scrape_posts' | 'transcribe'
  | 'profile' | 'demand' | 'products' | 'price' | 'copy' | 'check';

export interface ProgressEvent {
  stage: StageName;
  status: 'running' | 'done' | 'failed' | 'skipped';
  detail?: string;
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
}

export interface BuildStop {
  ok: false;
  reason: string;
  canDescribe: boolean;
}

export class PipelineStop extends Error {
  constructor(readonly reason: string, readonly canDescribe = true) {
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
): Promise<BuildResult | BuildStop> {
  try {
    return await execute(input, onProgress);
  } catch (err) {
    if (err instanceof PipelineStop) {
      return { ok: false, reason: err.reason, canDescribe: err.canDescribe };
    }
    if (err instanceof ScrapeError) {
      return { ok: false, reason: scrapeMessage(err.kind), canDescribe: true };
    }
    throw err;
  }
}

async function execute(input: BuildInput, progress: OnProgress): Promise<BuildResult> {
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
    });

    // Stage 1b — 30 recent posts. Slow (~75s), hence behind the progress screen.
    await progress({ stage: 'scrape_posts', status: 'running', detail: 'Looking at your recent posts' });
    const posts = await fetchPosts(handle);
    await progress({ stage: 'scrape_posts', status: 'done', detail: `${posts.length} posts` });

    // Stages 2 and 3 — rank, then transcribe until enough posts are usable.
    await progress({ stage: 'transcribe', status: 'running', detail: 'Listening to your top posts' });
    const ranked = rankPosts(posts);
    for (const p of ranked) {
      if (hasEnough(extracted) || extracted.length >= TARGET_POSTS + 3) break;
      try {
        if (p.videoUrl) {
          const t = await transcribeVideo(p.videoUrl);
          extracted.push(buildExtracted(p, t.text, 'transcript'));
        } else if (p.imageUrls.length) {
          const t = await extractImageText(p.imageUrls);
          extracted.push(buildExtracted(p, t, 'image_text'));
        } else {
          extracted.push(buildExtracted(p, '', 'transcript'));
        }
      } catch {
        // One bad post never fails a build: fall back to its caption.
        extracted.push(buildExtracted(p, '', 'transcript'));
      }
      await progress({
        stage: 'transcribe', status: 'running',
        detail: `Read ${extracted.filter((e) => !e.lowSignal).length} of ${TARGET_POSTS} posts`,
      });
    }

    const verdict = assessSignal(extracted);
    if (!verdict.proceed) throw new PipelineStop(verdict.reason!, true);
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
    throw new PipelineStop(
      profile.stop_reason ?? "We couldn't find something teachable on this profile.",
      true,
    );
  }
  await progress({ stage: 'profile', status: 'done', detail: profile.niche.replace(/_/g, ' ') });

  // Stage 5 — Demand.
  await progress({ stage: 'demand', status: 'running', detail: 'Finding what your followers ask for' });
  const demand: Demand = await runDemandStage(
    profile, extracted.map((e) => e.text), isDescriptionPath,
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
    followers,
    scope: c.scope as Scope,
    role: c.ladder_slot as LadderRole,
  })));
  await progress({
    stage: 'price', status: 'done',
    detail: priced.map((p) => `₹${p.price.toLocaleString('en-IN')}`).join(' · '),
  });

  // Stage 8 — Write.
  await progress({ stage: 'copy', status: 'running', detail: 'Writing in your voice' });
  const styleExcerpts = extracted.filter((e) => !e.lowSignal).map((e) => e.text);
  const copy: Copy = clampCopy(await runCopyStage(
    profile,
    chosen.map((c, i) => ({ candidate: c, price: priced[i].price, role: c.ladder_slot })),
    styleExcerpts.length ? styleExcerpts : [input.description ?? ''],
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
        { ...profile, register: `${profile.register}. Fix these problems: ${problems}` },
        chosen.map((c, i) => ({ candidate: c, price: priced[i].price, role: c.ladder_slot })),
        styleExcerpts,
      ));
      const recheck = runCodeChecks(finalCopy, formats, regulated);
      if (!recheck.ok) validation = 'template';
    } catch {
      validation = 'template';
    }
  }

  const sourceText = isDescriptionPath
    ? (input.description ?? '')
    : [bioText, ...extracted.map((e) => e.text)].filter(Boolean).join('\n\n');

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

  // A model that cannot find a name sometimes returns a sentence about not
  // finding one. Treat anything that is not name-shaped as absent.
  const nameGuess = profile.name_guess?.trim() ?? '';
  const nameLooksReal = nameGuess.length > 0 && nameGuess.length <= 40 && !/\s(the|a|an|is|does|not)\s/i.test(nameGuess);

  return {
    ok: true,
    name: nameLooksReal ? nameGuess : displayName,
    handle,
    avatarUrl,
    followers,
    bio: finalCopy.bio,
    niche: profile.niche,
    language: profile.language,
    products,
    unusedCandidates: unused,
    validation,
    sourceText,
  };
}

export { runJudge };
