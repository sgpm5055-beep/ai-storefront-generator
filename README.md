# AI Storefront Generator

Turns an Instagram handle — or a few lines about what you teach — into a
ready-to-publish storefront: a bio, 2–4 things you could sell with INR
prices and descriptions, and a shareable mobile page.

Built for the SuperProfile 0→1 PM take-home.

**Live:** _(deployed URL)_

---

## Running it

```bash
npm install
cp .env.example .env.local     # fill in the keys below
npm run dev                    # http://localhost:3000
```

| Variable | What it is |
|---|---|
| `FRIENDLI_TOKEN` | GLM 5.3 via Friendli (all generation) |
| `APIFY_TOKEN` | Instagram scraping — only needed for the handle path |
| `DEEPGRAM_API_KEY` | Reel transcription — only needed for the handle path |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Storage |
| `NEXT_PUBLIC_BASE_URL` | Public origin, used for share links and OG images |

Database schema lives in `supabase/migrations/`. Apply with
`supabase link --project-ref <ref> && supabase db push`.

```bash
npm test                              # 73 unit tests
npm run evals                         # 3-case golden set (real model calls)
npx tsx scripts/seed-samples.mts      # regenerate the demo samples
```

---

## How it works

Nine stages. The two that decide prices and enforce guardrails are
**code, not the model**, so they cannot drift between runs.

| # | Stage | Kind | |
|---|---|---|---|
| 1a | Scrape profile | code | Fetched alone (~10s) so "Found you" isn't blocked |
| 1b | Scrape posts | code | 30 posts, ~40s |
| 2 | Pick posts | code | Over-fetch, then filter on transcript quality |
| 3 | Transcribe | Deepgram | Parallel batches of 4 |
| 4 | Profile | model | Skills, niche, audience, register, evidence quotes |
| 5 | Demand | model | What followers actually ask for, quoted |
| 6 | Products | model | 6–8 candidates with ladder slot and format |
| 6b | Select | **code** | Best per slot; ≥2 formats |
| 7 | **Price** | **code** | Deterministic rule table. Cannot fail |
| 8 | Write | model | Bio, titles, promises, descriptions |
| 9 | Check | code + model | pass / repaired / template |

Routes: `/` → `/build/[id]` → `/edit/[token]` → `/edit/[token]/publish`
→ public page at `/s/[slug]`.

**Measured end to end:** description path **~16s**, handle path **~92s**
(Apify's posts call is 41s of that). Vercel's ceiling is 300s.

---

## Things worth knowing

**Pricing is a rule table, not a model output.** Bands by format,
multipliers by niche and scope, snapped to Indian price points, with six
ladder rules. Every one of the PRD's 12 worked examples is a unit test.
An exhaustive sweep of 44,928 combinations runs inside the suite as a
permanent guard — it found an unsatisfiable case in the original rules
(a course in both the core and premium slot cannot sit 1.5× apart below
the ₹4,999 cap).

**Reasoning tokens come out of the same budget as the answer.** GLM 5.3
spent 12,000–13,500 tokens thinking and a few hundred writing, which
surfaces as HTTP 200 with *empty content* — a silent failure that cannot
be fixed by raising `max_tokens`. Bounding the reasoning
(`reasoning_effort: 'low'`) took the pipeline from 104s and 0/3 runs
succeeding to 16s and 3/3.

**Deepgram fetches media by URL rather than being sent bytes.** A 17MB
reel went from ~25s to 3.9s, and forwarding large files sometimes
returned a silently empty transcript.

**Creator text is quoted data, never instructions.** Everything scraped
or typed is delimiter-fenced before it reaches a prompt, and forged
fences are stripped. The hostile eval case carries an injection
demanding pirate speak and "GUARANTEED 300% RETURNS"; the output ignores
it.

**Guardrails run on hand-typed text too**, not just model output — a
creator typing a guarantee into their own product gets a 422 and a plain
explanation.

**The product stops rather than inventing.** Too little signal and it
says so and offers the description path, instead of writing a plausible
storefront for an expertise nobody claimed.

---

## Deliberately not built

Login, payments, KYC, file delivery, image generation, platforms beyond
Instagram, A/B infrastructure, realtime (polling instead), theme presets.
A creator can take payment by pasting any checkout link into a product.

## Known limits

- Instagram must be public. Private accounts use the description path,
  which is a first-class input, not a fallback.
- Scraping depends on Apify; if it fails the app says so and offers the
  description path, and the seeded samples still render.
- The handle path at ~92s is dominated by Apify's 30-post call.
- `videoPlayCount` is only present in Apify's slower `posts` mode, which
  is why the profile and posts calls are split.
