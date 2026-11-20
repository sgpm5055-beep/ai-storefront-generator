# PRD: AI Storefront Generator (SuperProfile)

Nov 19, 2026 · @Shekhar

## Summary

The bet is that a new creator who is handed a finished draft store will publish it, where the same creator facing an empty store stalls. v1 turns one Instagram handle into an editable storefront and a shareable mobile page, built from what the creator actually says in their posts.

| Decision | Why it matters |
| --- | --- |
| Propose, do not just execute | SuperProfile already has product builders and Super AI. The missing piece is a first draft for creators who do not know what to ask for. |
| Handle first, description as fallback | A scraper reads the public profile, so most creators type nothing else. A typed description covers private accounts and scraper failures. The scraper is prototype-only, and a bio code proves ownership before publish. |
| Listen to the posts, not just the captions | Five posts are transcribed or read for text, because the spoken content carries the expertise and the voice. |
| Demand from their own audience, not a market report | Products come from what followers already ask for in those posts. An ungrounded research report would pull every store towards generic niche ideas. |
| Three products as a ladder | Follows SuperProfile's own first-product advice: an easy first purchase, a step up, then a premium offer. |
| Prices from a rule table, not the model | The same input always gives the same rupee price, with the reason shown, and the table can be replaced by real conversion data. |
| "Notify me" instead of "Buy" | The products do not exist yet. Pre-launch mode is honest and turns AI guesses into demand evidence. |
| Evals gate every release | Four hard gates and a 19-case golden set decide what ships. |

**Out of scope.** Payments, KYC, login, image generation and platforms beyond Instagram.

**How success is read.** In the prototype: build time baselined in the spike and kept under the 300 s function limit, 80% of drafts scoring 4 of 5 on specificity, and ₹15 or less per store. At SuperProfile: 7-day activation, with ghost stores and first-sale rate as counter-metrics.

**What this prototype cannot prove.** Whether creators follow through and sell. Only the A/B test in the experiment plan answers that.

## Problem and evidence

New creators stall because an empty store asks for three expert decisions at once: what to sell, what to charge and what to write. They have the audience and the expertise. What they lack is a first draft.

| Evidence | What it tells us |
| --- | --- |
| The brief: over 2 million creators use SuperProfile, and many new ones sign up, land on an empty store and stall. | The drop happens before a first product exists. It is an activation problem, not a traffic or checkout problem. |
| [BCG, reported by IBEF](https://www.ibef.org/news/india-s-creator-economy-projected-to-influence-over-us-1-trillion-rs-84-58-000-crore-in-consumer-spend-by-2030-bcg-report-to-be-unveiled-at-waves-2025): India has 2 to 2.5 million active creators and only 8 to 10% monetise effectively. | The stall is market-wide, so fixing it is a growth lever and not a niche fix. |
| [SuperProfile's first-product guide](https://superprofile.bio/guides/digital-products-to-sell) tells creators to list what followers already ask for, make the smallest useful version, test it, then sell on Instagram. | The playbook exists, but as an article. A stalled creator must read it, apply it to themselves and then build. |
| [Super AI](https://superprofile.bio/products/super-ai) drafts products on request. It is in public beta for paid plans only. | It executes instructions. A creator who does not know what to sell has no instruction to give, and free-plan creators cannot see it. |
| [Pricing](https://superprofile.bio/pricing): the free Starter plan includes the link-in-bio store, selling needs the paid Creator plan, and commission is 0%. | Revenue comes from upgrades, not transaction fees. A creator who cannot picture their store has no reason to upgrade. |

**The reframe.** SuperProfile already has the tools to build a product. The missing piece is a proposal. The bet is that creators will edit a good draft far more readily than they will fill a blank page.

**What is not known.** The baseline activation rate, the exact step where new creators drop, and how the reasons split between "no idea", "no time" and "not ready to pay". These sit in Open questions and shape the experiment plan.

## Users and jobs to be done

The target user is a new, Instagram-first Indian creator with a real audience who has never sold a digital product and is setting up on a phone.

| Who | Situation | What they need from this |
| --- | --- | --- |
| Primary: the stalled new creator | Signed up in the last 7 days, free plan, on a phone. Teaches something (fitness, exam prep, money basics, design, food, astrology, careers). Follower band assumed at 5K to 100K, to confirm with signup data. | A store that already looks like theirs, with products they could make this week. |
| Secondary: the creator's follower | Taps the link from a bio or story, inside Instagram's in-app browser, often on mobile data. | The offer and the price in one screen, and one thumb to act. |
| Internal: SuperProfile growth | Owns activation and free-to-paid conversion. | A measurable lift, plus edit data showing which suggestions creators keep. |

Established sellers with a catalogue are not the target. They do not stall, and Super AI already serves them.

**Job stories**

1. When my store is empty on day one, I want to see what it could look like with products my audience would pay for, so I can start selling without first designing a business.
2. When I price something for the first time, I want a number I can justify, so I do not fear overcharging or underselling.
3. When I describe a product, I want words that sound like me, so I do not sound like an advert.
4. When a follower taps my link, I want the page to look professional on their phone, so selling raises my standing with them.

**Forces acting on the switch from "not selling" to "selling"**

| Force | What it sounds like | Design response |
| --- | --- | --- |
| Push | "I have 20K followers and earn nothing from them." | Lead with their own profile and numbers, so the store feels earned. |
| Pull | "A store that exists in a minute." | One input, one screen, a finished draft. |
| Anxiety | "What if the price is wrong? What if nobody buys? Will AI make me sound fake?" | Show the reason behind each price. Publish in pre-launch mode to test demand first. Mirror their voice and keep every field editable. |
| Habit | "I will set it up later. For now, DM me." | No signup wall before value. The first result arrives before the urge to postpone. |

## Opportunity solution tree

The generator was chosen because it is the only option that answers all four reasons a new creator stalls, and does so on the free plan.

&#91;embedded content: opportunity solution tree · 1 outcome, 4 needs, 1 chosen solution\]

Read it top down: the outcome SuperProfile wants, the four questions blocking it, the part of the generator that answers each, and the check that shows whether it worked.

| Solution considered | Questions it answers | Why it was not chosen |
| --- | --- | --- |
| Niche template gallery | Sell, write | Generic by design. The creator must still choose, adapt and price. |
| Guides and an onboarding checklist | None directly | The guidance already exists. Reading is not doing. |
| A Super AI prompt on day one | Write | Needs an instruction the creator does not have, and is paid-plan only today. |
| Human onboarding call | All four | Works, but cannot scale to the free tier. Today it is part of the Pro plan. |
| AI Storefront Generator | All four | Chosen. |

## Riskiest assumptions

Eight assumptions sit under the bet. Five are critical, and this prototype can settle three of them. The other two need SuperProfile's traffic, which is why the A/B plan is part of this PRD.

&#91;embedded content: assumption map · 8 assumptions by importance and by where they can be tested\]

The top row decides whether the bet works. The right column is what this assignment can prove. The left column is what only production can.

| Assumption | Critical | Kind | Test | Pass signal |
| --- | --- | --- | --- | --- |
| Decisions cause the stall, not motivation, KYC or the paywall | Yes | Desirability | Funnel analysis of where new creators drop, plus 5 interviews with stalled creators | Most drop before creating a first product |
| Drafts become real products and first sales | Yes | Viability | A/B test with ghost-store and first-sale guardrails | First-sale rate per activated creator does not fall |
| Creators will publish an AI draft under their own name | Yes | Desirability | Hallway tests with 5 creators | 4 of 5 would share with two or fewer edits |
| Five transcribed posts carry enough signal for specific ideas | Yes | Feasibility | Golden set with the swap test | 80% score 4 or above on specificity |
| Output stays faithful and safe | Yes | Feasibility | Hard gates on every run, hard cases in the golden set | 100% on all four gates |
| Seed prices are close enough | No | Viability | Price edits in hallway tests now, price\_changed events later | Fewer than 40% lower the price in any niche |
| The scraper reads public handles reliably | No | Feasibility | Step 1 spike on 10 handles, then read failures in logs | 90% of public handles read on the first try |
| Creators will wait while the draft builds | No | Usability | Timed runs on a mid-range Android over mobile data, in hallway tests | No tester gives up during the build |

## Goals, non-goals and success metrics

Success is a creator going from one handle to a shared storefront on a phone, keeping most of what was generated.

**Goals**

- Creator: get a complete, specific draft store from one input, without writing anything, or from a short description when the handle cannot be read.
- Creator: trust the prices and words enough to publish with light edits.
- Follower: understand the offer and act from a phone in one screen.
- Business: raise new-creator activation, defined as first product published within 7 days of signup.
- Business: give free-plan creators a concrete store worth upgrading for.
- Business: capture keep, edit and reprice data that improves suggestions over time.

**Non-goals**

| Not doing | Why |
| --- | --- |
| Payments, KYC, file delivery | SuperProfile already has them. Rebuilding them proves nothing about the bet. |
| Making the product itself (the ebook, the template) | The stall is the decision, not the production. |
| Accounts and login | Friction and build time that test nothing. A private edit link is enough. |
| Replacing Super AI or the product builders | The generator proposes, then hands off to them. |
| YouTube, LinkedIn and other sources | Instagram is where these creators are. Other platforms wait until this one is proven. |
| AI-generated cover images | Slow, costly and risky around likeness. Typographic covers are instant and consistent. |
| Earnings forecasts | No basis for them, and SuperProfile's own guide warns against fixed-income promises. |

**Prototype scorecard (measurable in this assignment)**

| Metric | Definition | Target |
| --- | --- | --- |
| Time to shareable store (north star) | Median time from handle submitted to published link, in 5 hallway tests with real creators | Baseline set in the hallway tests |
| Live read success | Share of public handles the scraper reads on the first try, in the spike | 90% or more |
| Generation success | Golden-set cases that reach the expected outcome: a valid storefront for 16, a correct stop for 3 | 19 of 19 |
| Draft latency | Handle submitted to full draft on screen | "Found you" and full draft: baselines set in the spike, hard limit 300 s |
| Quality pass rate | Golden-set storefronts scoring 4 of 5 or better on specificity and makeability | 80% or more, with every hard gate at 100% |
| Keep rate | Generated fields published unedited in hallway tests | 70% or more (directional at this sample size) |
| Page speed | Published page on a throttled 4G profile | LCP 2.5 s or less, mobile Lighthouse 90 or more |
| Cost | Scraper, transcription and model spend per storefront, including one regeneration | ₹15 or less |

**Production metrics (the bet at SuperProfile)**

| Level | Metric | Decision rule |
| --- | --- | --- |
| North star | Activated new creators: share of signups publishing a first product within 7 days | Ship if the lift over control is significant. Working hypothesis: 20% relative lift, to be reset once the baseline is known. |
| Inputs | Generator start rate, draft completion rate, publish rate, share rate, field keep rate | Diagnose where the funnel leaks. |
| Downstream | Free-to-paid conversion within 14 days, first sale within 30 days | Must move in the same direction as activation. |
| Counter-metric | Ghost stores: published stores with no real product attached after 14 days | If this rises faster than activation, the lift is cosmetic. |
| Counter-metric | First-sale rate per activated creator | Must not fall. |
| Counter-metric | Banned-claim storefronts published, impersonation reports | Zero tolerated. Either one triggers the kill switch. |
| Calibration | Share of creators who lower a suggested price, by niche | Above 40% in a niche, recalibrate its band. |

## Scope and prioritisation

v1 is the thinnest path that proves the bet: one input, one generated draft, light editing, one published page. The Must rows alone are a complete product.

| Tier | Capability | Why it earns its place | Effort |
| --- | --- | --- | --- |
| Must | The UI: five pages in one Next.js app, deployed on Vercel | It is the product the reviewer touches. Specified under UI pages. | L |
| Must | Input: the Instagram handle first, a typed description as fallback | The handle needs the least typing. The description covers private accounts and scraper failures, and the brief allows either. | S |
| Must | Scraper read of the public profile and recent posts, with a clear retry state | Reaches any public profile and its media. Prototype-only. | M |
| Must | Media understanding: 5 posts (3 most viewed reels, 2 most recent posts). Video is transcribed with Deepgram. Image text is extracted. | The spoken content carries the expertise and the voice. Captions alone are thin. | L |
| Must | Creator profile with quoted evidence (skills, audience, voice) | Specific stores need specific understanding. Evidence stops invention. | M |
| Must | Demand evidence: what followers ask for, quoted from the creator's own posts | The best first product is the one the audience already asks about. | M |
| Must | A ladder of 3 products by default (range 2 to 4), each makeable this week | Follows SuperProfile's own advice: a low-priced first product, then a course or a call. | M |
| Must | Rule-based INR pricing with the reason shown | Prices must be consistent, explainable and testable. | M |
| Must | Bio, titles and descriptions in the creator's voice | Brief requirement. | M |
| Must | Review screen: edit any field, regenerate one item, add or remove within 2 to 4 | Draft then confirm builds trust. Same principle as Super AI's preview cards. | M |
| Must | Ownership check before publish: a short code in the creator's bio, re-read by the scraper | Without it, anyone could publish a store under someone else's handle. | S |
| Must | Publish to a public mobile page with a shareable link and link preview | Brief requirement. | M |
| Must | Cached profile photo and a preview image per store | Instagram's image links expire, and the link preview requires an image. | S |
| Must | Guardrails: schema checks, no invented facts, banned-claim filter, regulated-niche handling | The page carries the creator's name. An error costs them credibility. | M |
| Must | Offline evals on a golden set, plus funnel events | The only honest answer to "how do you know it is good?" | M |
| Should | Pre-launch interest capture: a "Notify me" tap per product, count shown to the creator | Turns AI guesses into audience evidence before anything is built. | S |
| Should | Grounded search for what comparable creators sell and charge | The only form of market input that is not the model's priors. | M |
| Should | Language register: English or Hinglish, defaulting to the creator's own | India-appropriate and cheap, but needs its own eval rows. | S |
| Should | "Why this?" notes on each product, quoting their posts | Trust at the moment of doubt. | S |
| Should | WhatsApp share and seeded sample creators on the landing screen | Lifts share rate, and lets a reviewer try it without a handle. | S |
| Could | Three theme presets | Polish. No effect on the hypothesis. | S |
| Could | Send drafts into a real SuperProfile store through its [MCP server](https://superprofile.bio/mcp) | Would close the loop into the real product. Feasibility for a third-party client is unverified. | L |
| Won't | An ungrounded market research report, checkout, KYC, delivery, login, image generation, other platforms, A/B infrastructure | See Non-goals and the Decision log. |  |

**Rule for changes.** Anything added displaces something of equal size. A Should that slips costs polish. A Must that slips means the product is not done.

The UI (L), the description path (S), the bio-code check (S) and the cached photo and preview image (S) were added after the first estimate, and nothing was displaced. Either re-estimate the 30 hours in the build plan, or cut Shoulds of equal size.

## Experience

The whole journey is one handle, a wait while the store builds, one review and one tap to publish. The wait is the price of building from what the creator actually says, so it is spent showing real progress.

&#91;embedded content: creator flow · 8 steps, 1 decision, 1 retry loop\]

If the profile cannot be read, the creator is told why and can retry or describe themselves instead. Nothing is generated from guesses.

**Screens**

| Screen | What the creator sees | Design rule |
| --- | --- | --- |
| Start | One field for the handle, a link to describe yourself instead, and three sample creators to try | No signup wall. One thumb. |
| Found you | Name, photo or initials, follower count, "Not you? Change" | Recognition before generation builds trust. The build has already started. |
| Building | Named steps with live detail: reading your profile, listening to your top posts, finding what followers ask for, pricing for India. Content arrives section by section. | A real wait needs real steps, not a spinner. |
| Review | Bio, then product cards: title, promise, price with its reason, "Why this?", effort label. Tap to edit. "Try another". | Everything editable. Nothing final until Publish. |
| Published | The link, copy and WhatsApp buttons, and the private edit link with a prompt to save it | Sharing is the last screen, not a buried menu. |
| Public page | Photo or initials, name, bio, product cards with price and "Notify me", a pre-launch label | One column. Readable at 360 px. First product visible without scrolling. |

**States that must not break the flow**

| State | Behaviour |
| --- | --- |
| Private, unknown or unreadable profile | A one-line reason, a retry, and the description path. |
| Scraper or transcription fails | One silent retry, then say so. Never build from partial guesses. |
| Fewer than 3 usable posts | Say so, and offer the description path |
| Music-only reels | Use the caption for those posts and mark them low signal |
| Not a creator profile | Say so |
| Draft fails validation | One silent repair, then a safe niche template, with a note telling the creator it is generic |
| Connection drops while building | The build runs on the server. Reopening the link shows progress or the finished draft. |
| Rate limit reached | A clear message with a retry time |
| No interest taps yet | "Share your link to see what followers want" |

## UI pages

The UI is five pages in one Next.js app on Vercel, designed for a 360 px phone first. It is a Must in scope, because it is the part of the product a reviewer actually touches.

| Page | Route | What it contains | States to design |
| --- | --- | --- | --- |
| Start | `/` | Handle field, "Describe yourself instead" link, three sample creators, one primary button | Empty, invalid handle, rate limited |
| Build progress | `/build/[id]` | "Found you" card, named steps ticking off, sections appearing as they finish | Reading, building, failed read with retry or describe, profile too thin |
| Review and edit | `/edit/[token]` | Bio, product cards with price reason, "Why this?" and effort label, inline editing, "Try another", Publish button | Saving, regenerating, generic-template notice, regeneration cap reached |
| Publish and share | `/edit/[token]/publish` | Bio code step for handle-based stores, then the public link, copy and WhatsApp buttons, and the private edit link | Waiting for code, code not found, published, unpublished |
| Public store | `/[slug]` | Photo or initials, name, bio, product cards with price and "Notify me", pre-launch label, report link, "Self-described" label on description-built stores | Live, unpublished, not found |

Two supporting routes are also needed: the link-preview image and a not-found page.

These pages carry the six screens under Experience: "Found you" is a state of Build progress, and "Published" is a state of Publish and share. Keep the two tables in step, or let Screens point here.

**Shared components**

- Handle input with format hint
- Progress stepper driven by the jobs table
- Product card with a view mode and an edit mode
- Price chip that opens its reason
- Share sheet with copy, WhatsApp and native share
- Toast for save, error and rate-limit messages

**UI rules**

- One column, system fonts, tap targets of 44 px or more, no layout shift.
- Light and dark themes from the same tokens.
- The public store is server-rendered and works with scripts blocked, apart from the "Notify me" tap.
- Typographic product covers generated from the title and theme. No stock or AI images.
- Build and edit pages send no referrer, because their URLs carry the draft id or the edit token. A link followed from them must not pass either one on.
- Build ids are random and unguessable, because the build page shows draft content and drafts are private.
- Store slugs can never be one of the app's own route names, such as build, edit, api or og.

**Acceptance.** Every page is checked at 360 px inside Instagram's in-app browser on Android and iOS. The public store scores 90 or more on mobile Lighthouse.

## Functional requirements and acceptance criteria

Seven requirement groups cover the path from input to shared page. Each criterion can be checked by a script or by a person holding a phone.

**FR1. Input.** The creator gives an Instagram handle. A typed description is the fallback.

- Given "@name", "name" or a full profile link, when submitted, then all three resolve to the same handle.
- Given text that cannot be a handle, when submitted, then an inline hint explains the format and no scrape is started.
- Given a failed profile read, or a tap on "Describe yourself instead", then a description field with three prompts is shown. A description of 40 words or more skips stages 1 to 3 and enters the pipeline at stage 4.
- Given the start screen, then three sample creators can be tapped to see a finished store without typing. Sample stores are read-only: they skip the bio code and cannot be published.

**FR2. Profile read and media understanding.** The store is built from what the creator says in their posts, not only from captions.

- Given a public account, when the handle is submitted, then the profile is fetched on its own first, so "Found you" does not wait for the posts. The time to "Found you" is measured in the spike before any target is set.
- Given the profile is read, then the 30 most recent posts are fetched with view counts, likes and media links.
- Given those posts, then 5 are selected: the 3 most viewed reels, plus the 2 most recent posts not already chosen. With fewer than 3 reels, the most-liked image posts fill the gaps.
- Given a selected video, then the function downloads it and sends the bytes to Deepgram, which transcribes in the language spoken.
- Given a selected image or carousel, then an image-to-text model extracts all visible text.
- Given a video with no speech, then that post's caption is used instead and the post is marked low signal.
- Given a selected post, then it counts as usable when its transcript, image text or caption gives at least 40 words.
- Given a private, unknown or unreadable account, or a scraper failure, then the creator sees the reason in one line and can retry or describe themselves instead. Nothing is generated from guesses.
- Given fewer than 3 usable posts, or a profile with no teachable signal such as a meme or brand page, then the system says so and offers the description path, rather than inventing expertise.
- Given text has been extracted, then the downloaded media is discarded.

**FR3. Generation.** One input produces a complete store. Formats are the four the brief names: digital product, 1:1 session, webinar, course.

- Given any valid input, when generation completes, then the store has one bio of 150 characters or fewer and 2 to 4 products. Each product has a format, a title (60 characters or fewer), a one-line promise (90 or fewer), a description (40 to 80 words), three "what you get" points, a price, a ladder role and an effort label.
- Given the creator's input, then no sentence states a fact about the creator that the input does not contain: no credentials, years, client counts or results.
- Given a generated store, then products use at least two formats, at least one costs ₹499 or less, and prices rise with ladder role.
- Given generation runs longer than 3 s, then named progress steps show and content appears section by section.

**FR4. Review and edit.** The creator stays in control of every word and number.

- Given the draft, when the creator taps any text or price, then it edits inline and saves automatically.
- Given an edited field, when anything is regenerated, then the edited field is never overwritten.
- Given "Try another" on a product, then a replacement for the same ladder slot is drawn from the unused candidates, priced by the rules and written with one short model call. The ladder rules and the two-format rule are rechecked and the other products stay as they are.
- Given a price typed outside the suggested band, then a soft note shows the typical range. It never blocks.
- Given 5 regenerations on one store, then regeneration is disabled with a reason.

**FR5. Publish and share.** Publishing produces a link worth putting in a bio.

- Given a store built from a handle, when the creator taps Publish, then they are shown a short code to place in their Instagram bio. The scraper re-reads the bio and the store publishes only when the code is found. The code can then be removed.
- Given a store built from a description, then it publishes under the name the creator typed, with no Instagram handle or photo shown, and a visible "Self-described, not linked to Instagram" label under the name.
- Given the check has passed, then a public page exists at a readable link, and a private edit link is shown with a prompt to save it.
- Given a product has no checkout link, then its button reads "Notify me" and the page is labelled pre-launch. Given a checkout link is pasted, then the button reads "Get it for ₹X" and opens that link.
- Given the page opens in Instagram's in-app browser at 360 px wide, then nothing scrolls sideways and every tap target is at least 44 px.
- Given the link is pasted into WhatsApp, then the preview shows the creator's name, the bio line and the cached profile photo or the store's preview image.
- Given the edit link, when the creator taps Unpublish, then the public page shows "not available" within a minute.

**FR6. Guardrails.** The page carries a real person's name, so these are release blockers.

- Given a finance creator, then no product offers tips, signals, stock picks or promised returns. Products are educational and say so.
- Given a health or fitness creator, then no copy promises a cure or a guaranteed result, and clinical advice is not offered as a product unless the input shows a qualification.
- Given an exam-prep creator, then no copy promises selection, rank or marks.
- Given a bio or caption that contains instructions aimed at the model, then the output still passes schema and policy checks and the instruction is ignored.
- Given any niche, then copy contains no invented discounts, countdowns, testimonials, buyer counts or income claims.
- Given more than 5 generations from one device in an hour, then further requests are refused with a retry time.

**FR7. Instrumentation.** Every funnel step fires one event carrying a store id and the prompt version. The event list is under Instrumentation.

## AI system design

Nine small stages replace one large prompt. The first three turn a handle into text the creator actually said. Models then read and write, and code does what must be exact: selection, prices and checks.

&#91;embedded content: generation pipeline · 9 stages, 5 model steps, 4 code steps\]

Each stage has one job, one output schema and one eval, so a bad draft can be traced to the stage that caused it. Stages 3, 4, 5, 6 and 8 are model-led. Stages 1, 2, 7 and 9 are code-led, and stage 9 calls a small model only as a judge. Selection is the code half of stage 6, not a tenth stage.

**Stage contracts**

| Stage | Input | Output | If it fails |
| --- | --- | --- | --- |
| 1. Scrape | Handle | Profile first (name, bio, follower count), then the 30 most recent posts with views, likes, captions and media links | Retry once, then a clear reason with retry or describe |
| 2. Pick 5 posts | The 30 recent posts | The 3 most viewed reels and the 2 most recent posts, with image posts ranked by likes filling any gap | Fewer than 3 usable posts: stop and offer the description path |
| 3. Transcribe | Media for the 5 posts | Video: downloaded and sent to Deepgram as bytes. Image: all visible text from an image-to-text model. | No speech or no text: use that post's caption |
| 4. Profile | Bio, captions, transcripts and image text, or the typed description | Skills, niche from a fixed list, target audience, language and register, evidence quotes, signal strength, regulated flag | Low signal: stop and say so |
| 5. Find demand | Stage 4 output and the post text | What followers ask for and struggle with, each item quoted from the posts and ranked by how often it recurs | No evidence: ideate from skills alone, flagged low confidence. A description-built store always lands here, because it has no posts to quote |
| 6. Products | Stages 4 and 5 | 6 to 8 candidates the creator could make this week, each with a ladder slot (entry, core or premium), a demand item, format, scope, working title, and scores for demand, effort and fit | Fewer than 4 valid candidates: rerun once |
| 6, continued: select (code) | Candidates | 3 products: the best score in each ladder slot, with at least two formats. The entry slot is always a digital product or a webinar. The premium slot is always a 1:1 session or a course, so the ladder always fits under the format ceilings. | Not applicable |
| 7. Price | Selected products, follower band | Price, band and reason for each | Deterministic, cannot fail |
| 8. Write | Stage 4 output, priced products | Bio, titles, promises, descriptions, "what you get" points | Retry that item only |
| 9. Check | Full draft and the original post text | Pass, repaired, or template | One repair, then a safe niche template, and the creator is told it is generic |

**Prompt design rules**

- **Structured output everywhere.** Every model stage returns schema-constrained JSON. Niche, format and scope are fixed lists, so code can act on them.
- **Evidence or silence.** Any claim about the creator must carry a quote from their posts. "Unknown" is a valid answer.
- **Demand, not market reports.** No stage writes a market report from the model's priors. Every product idea must point to a quoted demand item from the creator's own posts.
- **Makeable beats unique.** Ideas are scored on whether the creator could ship them this week, not on novelty.
- **Creator text is data.** Bio, captions, transcripts and image text sit inside delimiters and are described to the model as quoted material, never as instructions.
- **Diverge, then converge.** Ask for more ideas than needed at a higher temperature, then select with rules.
- **Voice by example.** The writing stage receives excerpts from the creator's own transcripts as style reference, with the language and register label.
- **Seeded by SuperProfile's playbook.** The 15 product types in its own guide seed the idea examples, so every idea maps to something the platform can sell.
- **Versioned prompts.** Each prompt carries a version id that is logged on every run and tied to its eval scores.

## India pricing logic

Prices come from a rule table, not from the model. The model classifies each product; code computes the number and the reason shown beside it.

**Why rules.** A model choosing freely can drift towards converted dollar prices and can change its answer between runs. A table gives the same price for the same input, can be unit-tested, and can be swapped for SuperProfile's real conversion data without touching a prompt.

```latex
\text{price} = \operatorname{snap}\Big(\operatorname{clamp}\big(\text{typical}_{\text{format}} \times \text{niche} \times \text{audience} \times \text{scope}\big)\Big)
```

**Seed bands by format (v0 priors, not data)**

| Format | Floor | Typical | Ceiling | Basis |
| --- | --- | --- | --- | --- |
| Digital product (guide, template, notes, presets) | ₹99 | ₹299 | ₹999 | [Hostinger's India guide](https://www.hostinger.com/in/tutorials/sell-digital-products/): entry guides and templates at ₹199 to ₹499, templates up to ₹999 |
| Webinar or live workshop (60 to 90 min) | ₹99 | ₹299 | ₹999 | Judgement. First band to calibrate. |
| 1:1 session (30 min) | ₹299 | ₹799 | ₹2,999 | Judgement. First band to calibrate. |
| Course (recorded, structured) | ₹999 | ₹1,999 | ₹4,999 | Same guide: mini-courses at ₹999 to ₹2,999, and above ₹4,999 needs proof of results |

**Multipliers**

| Input | Values | Source of the input |
| --- | --- | --- |
| Niche | 0.8 for students, exam prep, hobbies. 1.0 for fitness, food, lifestyle, beauty, parenting, astrology. 1.3 for careers, business, tech skills, money education. | Model classification into a fixed list |
| Audience | 0.9 under 10K followers. 1.0 for 10K to 100K, or unknown. 1.15 above 100K. | Profile read |
| Scope | 0.7 small, 1.0 standard, 1.5 large | Model classification of the proposed product |

**Snap and ladder rules**

1. Clamp to the format's floor and ceiling, then snap to the nearest of: ₹99, 149, 199, 249, 299, 399, 499, 599, 799, 999, 1,299, 1,499, 1,999, 2,499, 2,999, 3,999, 4,999. A tie snaps down.
2. The cheapest product must cost ₹499 or less. Selection makes this always possible: the entry slot is a digital product or a webinar. If it still lands above ₹499, reduce its scope to small.
3. Working from the cheapest product up, each product must cost at least 1.5 times the one below it. If not, move the higher one up one price point at a time until it does. If it reaches its format ceiling first, move the lower one down instead. The ceiling always wins.
4. Nothing above ₹4,999 for a first-time seller.
5. The creator can override any price. Overrides are logged as calibration data and never blocked.
6. The rules rerun whenever a product is swapped or regenerated.

**Worked examples (these become unit tests)**

| Creator | Product and classification | Calculation | Price |
| --- | --- | --- | --- |
| Fitness, 24K followers | Digital product, small | 299 × 1.0 × 1.0 × 0.7 = 209 | ₹199 |
| Fitness, 24K followers | Webinar, standard | 299 × 1.0 × 1.0 × 1.0 = 299 | ₹299 |
| Fitness, 24K followers | 1:1 session, standard | 799 × 1.0 × 1.0 × 1.0 = 799 | ₹799 |
| Careers, 60K followers | Digital product, standard | 299 × 1.3 = 389 | ₹399 |
| Careers, 60K followers | 1:1 session, standard | 799 × 1.3 = 1,039 | ₹999 |
| Careers, 60K followers | Course, standard | 1,999 × 1.3 = 2,599 | ₹2,499 |
| Exam prep, 8K followers | Digital product, small | 299 × 0.8 × 0.9 × 0.7 = 151 | ₹149 |
| Exam prep, 8K followers | Webinar, standard | 299 × 0.8 × 0.9 = 215, snaps to 199, fails rule 3 | ₹249 |
| Exam prep, 8K followers | 1:1 session, standard | 799 × 0.8 × 0.9 = 575 | ₹599 |
| Fitness, 120K followers | Digital product, large | 299 × 1.0 × 1.15 × 1.5 = 516 | ₹499 |
| Fitness, 120K followers | Webinar, standard | 299 × 1.15 = 344, snaps to 299, fails rule 3, rises to the first point at 1.5 × 499 or more | ₹799 |
| Fitness, 120K followers | 1:1 session, standard (premium slot) | 799 × 1.15 = 919, snaps to 999, fails rule 3, rises to the first point at 1.5 × 799 or more. A digital product here would hit its ₹999 ceiling and never fit. | ₹1,299 |

**What the creator sees.** One plain line per price, for example: "₹199: sized as an easy first purchase for a fitness audience of about 24K."

**How this improves at SuperProfile.** Replace the seed table with median prices from real transactions by format, niche and follower band. Then test price points against conversion. Price endings stay configurable per niche, because 9-endings may not suit every category: astrology may respond better to endings such as ₹501 or ₹1,100. That is a hypothesis to test, not a v1 rule.

## Quality evals and guardrails

No draft reaches a creator unless it passes four hard gates, and no prompt change ships unless the golden set passes. Quality is measured, not eyeballed.

**Golden set: 19 frozen inputs**

| Slice | Cases | What it probes |
| --- | --- | --- |
| Core niches | 8: fitness, exam prep, money education, design, food, astrology, careers, photography | Niche accuracy and specificity |
| Media mix | 3: talking-head reels, text-heavy carousels, music-only reels | Whether transcripts and image text are used, and what happens without speech |
| Thin signal | 2: a creator with five posts, captions that are only emoji and hashtags | Graceful stop instead of invention |
| Language | 2: Hinglish speech, Hindi speech | Transcription quality and register mirroring |
| Hard cases | 3: instructions hidden in a bio or spoken in a reel, a meme or brand page, a health creator making cure claims | Guardrails |
| Description path | 1: a typed description from a creator whose account is private | Entry at stage 4 with no posts, the low-confidence demand path, and the self-described label |

Cases run on saved scrape results and transcripts, so results are repeatable and do not depend on a live scraper. Snapshots are synthetic profiles or the builder's own account, not other people's data. Three cases are expected to stop without a store: the two thin-signal cases and the meme or brand page. They count towards outcome accuracy and are left out of the graded quality scores, which are measured on the other 16.

**Rubric**

| Dimension | Type | How it is checked | Bar |
| --- | --- | --- | --- |
| Structure | Hard gate | Code: schema, field lengths, 2 to 4 products, 2 or more formats | 100% |
| Price rules | Hard gate | Code: unit tests on the pricing table and ladder rules | 100% |
| Faithfulness | Hard gate | Model judge plus manual spot check: every claim about the creator traces to the input | 100% |
| Policy | Hard gate | Code patterns plus model judge: banned claims and regulated-niche rules | 100% |
| Niche accuracy | Graded | Match against the labelled niche | 90% or more |
| Specificity | Graded 1 to 5 | Swap test: could this store sit unchanged on another creator in the same niche? If yes, it fails. | 80% at 4 or above |
| Makeability | Graded 1 to 5 | Could the creator make the cheapest product in a weekend from what they already have? | 80% at 4 or above |
| Voice match | Graded 1 to 5 | Language and register mirror the input, with no advert tone | 70% at 4 or above |
| Copy clarity | Graded 1 to 5 | Outcome clear in the first line, scannable on a phone | 80% at 4 or above |

**Method**

- Code checks run on every live generation. The model judge runs offline on the golden set and on a sample of live traffic.
- Judge calibration: 20 outputs are hand-labelled first. The judge is trusted only once it lands within one point of the human label on 85% of them.
- Regression rule: every prompt or model change reruns the set. It ships only if hard gates stay at 100% and no graded dimension drops by more than 5 points.
- Runtime failure: one automatic repair attempt with the error fed back. If that fails, a safe pre-written niche template is used, the run is flagged, and the creator is told the draft is generic. A broken or unsafe draft is never shown.

**Guardrails**

| Area | Rule | Informed by |
| --- | --- | --- |
| Money and investing | Education only. No tips, signals, stock picks, return promises or recent price data in any product idea. | [SEBI's January 2025 circular](https://www.newsonair.gov.in/sebi-cracks-down-on-finfluencers-selling-stock-tips-in-the-name-of-education): unregistered people cannot give advice or make performance claims, and educators may only use prices at least three months old |
| Health, nutrition, fitness | No cure or guaranteed-result claims. Clinical or diet prescriptions only when the input states a relevant qualification. | [ASCI's influencer guidelines, updated April 2025](https://www.business-standard.com/india-news/influencers-get-leeway-as-ad-body-softens-generic-promotion-rules-125042801046_1.html): technical health advice needs relevant qualifications |
| Exam prep and coaching | No promise of selection, rank or marks. No invented student results. | [CCPA coaching guidelines of 13 November 2024](https://eparlib.sansad.in/bitstream/123456789/2986791/1/AU3841_R2WHvN.pdf): no false claims on selections, ranks or guaranteed selection |
| Every niche | No invented facts about the creator, testimonials, buyer counts, discounts, countdowns or income claims. | The faithfulness gate, and the creator's own credibility |
| Untrusted input | Bio, captions, transcripts and image text are passed as quoted data, never as instructions. The output must still pass schema and policy. | Prompt-injection defence |
| Identity | Drafts are private. Publishing a handle-based store needs a short code placed in the creator's bio, which the scraper re-reads. A store built from a description shows a "Self-described, not linked to Instagram" label and never a handle or photo. Published pages say "pre-launch", never "verified". Unpublish and report links exist. Rate limits apply. | Anyone can type any handle |
| Data | Read the public profile and five selected posts only. Delete downloaded media once its text is extracted. Keep transcripts only for that creator's own store. Delete on request. | Data minimisation |

These are product rules informed by the regulations, not legal advice. Legal review is listed under Open questions.

## Architecture, data model and non-functional requirements

The stack is the one that ships fastest with tools already in hand: Next.js on Vercel, Supabase, Deepgram and one model gateway. The build runs in one long Vercel function, which fits because functions can run for up to 300 s on the Hobby plan.

**Components**

| Layer | Choice | Why |
| --- | --- | --- |
| Web app | Next.js on Vercel. Starts a build job and shows its progress. | One codebase for the builder flow and the public page. |
| Pipeline runner | One Vercel function with a raised maximum duration. The start request returns at once and the build continues through Next's after() or waitUntil, so it survives a closed tab. | A two-minute build fits inside the 300 s limit. A separate worker is only needed if builds grow longer. |
| Progress | Job and stage rows in Supabase, pushed to the client with Supabase Realtime | The build survives a dropped connection, and the progress screen shows real stages. |
| Public store page | Server-rendered at a readable path, cached at the edge, revalidated on edit | Fast first paint on mobile data. Link previews work without client code. |
| Data | Supabase Postgres with row-level security. Supabase Storage for the avatar copy. | Auth-free access through a hashed edit token. |
| Profile and media read | A third-party Instagram scraper API, chosen in the step 1 spike. Returns profile, recent posts, view counts and media links. | Reaches any public profile and its videos. Scrapers can be blocked without notice, and SuperProfile depends on Meta's platform, so it is prototype-only. Production would read the connected account. |
| Audio | The function downloads the video and sends the bytes straight to Deepgram. Supabase Storage is used only if a file is too large to send that way. No audio separation is needed. | Deepgram cannot fetch Instagram media links directly. Nova-3 multilingual covers Hindi with code-switching and handles background noise inside the model, so no noise-reduction step is added. |
| Image text | A vision-capable model through the same gateway | No separate OCR service to run. |
| Model gateway | One module wrapping the provider SDK, with schema-constrained JSON output | Models swap by config and are compared on the golden set. |
| Model choice | A stronger model for profile, demand, products and copy. A small fast one for judging. | The cheapest pairing that clears the quality bars wins. It is an eval result, not a preference. |
| Tracing | LangSmith: prompt version, model, tokens, latency, cost and validation result per stage | Answers "why was this draft bad?" in one click. |
| Abuse control | Per-device and per-IP counters in Postgres | Enough for a prototype. No extra service. |

**Data model**

| Table | Key fields | Purpose |
| --- | --- | --- |
| stores | slug, edit token hash, handle, input type (handle or description), description text, ownership code hash, ownership confirmed at, name, bio, language, status, prompt version, timestamps | One row per storefront |
| jobs | store, current stage, stage status, error, timestamps | Drives the progress screen and retries |
| posts | store, post link, type, views, caption, transcript or image text, signal flag | The evidence every later stage quotes |
| products | store, position, format, title, promise, description, points, price, suggested price, scope, niche, effort, demand item, evidence, checkout link | 2 to 4 rows per store |
| field\_edits | store, field, original, final, action (kept, edited, regenerated, deleted) | Keep rate, and the calibration data for prices and ideas |
| interest | product, hashed device id, timestamp | "Notify me" taps. No personal data. |
| events | store, name, prompt version, timestamp | The funnel |

**Non-functional requirements**

| Area | Requirement |
| --- | --- |
| Speed | "Found you" and full draft times are both baselined in the spike, with 300 s as the hard limit. Public page LCP 2.5 s or less on throttled 4G, under 200 KB before the avatar. |
| Reliability | Scrape and transcription retry once. A failed build ends in a clear message, never a half-built store. Seeded samples keep the demo independent of third parties. |
| Cost | ₹15 or less per storefront across scraper, transcription and models. Hard cap of 5 regenerations. Per-device rate limit. |
| Mobile | Works at 360 px in Instagram's and WhatsApp's in-app browsers, Android Chrome and iOS Safari. Tap targets 44 px or more. System fonts. No layout shift. |
| Accessibility | Text contrast 4.5:1. Labelled inputs. Reduced motion respected. |
| Privacy and security | Edit token is 128-bit random and stored hashed. Public profile data only. Downloaded media is deleted after text extraction. Secrets stay server-side. |
| Language | UTF-8 throughout. Devanagari renders correctly. Prices show the rupee sign with comma grouping, such as ₹1,299. |

## Instrumentation and experiment plan

Fourteen events measure the path from input to follower interest. The same events score the prototype now and would power the A/B test at SuperProfile.

**Events**

| Event | Fires when | Key properties |
| --- | --- | --- |
| input\_submitted | A handle or a description is submitted | Input type (handle or description), valid format or not |
| description\_started | The description field opens | Trigger (tapped, failed read, profile too thin) |
| profile\_read | The scraper returns | Result (ok, private, not found, failed), latency |
| media\_processed | Transcripts and image text are ready | Posts used, seconds of audio, low-signal count, latency |
| generation\_started | The model stages begin | Prompt version |
| generation\_completed | The draft is on screen | Latency, cost, validation result (pass, repaired, template) |
| field\_edited | The creator changes a field | Field, action |
| item\_regenerated | "Try another" or regenerate is tapped | Field |
| price\_changed | A price is edited | Suggested, final, niche, format |
| ownership\_checked | The scraper re-reads the bio for the code | Result (found, not found, read failed), attempt number, seconds since the code was shown |
| store\_published | Publish is tapped | Product count, edit count, seconds since input |
| share\_tapped | A share action is used | Channel (copy, WhatsApp, native) |
| store\_viewed | The public page loads | Referrer class |
| interest\_tapped | "Notify me" is tapped | Product position, format, price |

**Prototype validation (inside this assignment)**

1. Run the golden set and report the rubric table per prompt version.
2. Run 5 hallway tests with Instagram creators who have never sold a digital product. Each enters their own handle on their own phone.
3. Record time to publish, including the bio-code step, and edits made. Ask three questions: would you put this link in your bio today, what would you change first, which product would you actually make?
4. Pass signal: 4 of 5 would share it with two or fewer edits.

**Production experiment (at SuperProfile)**

| Element | Plan |
| --- | --- |
| Design | Randomised A/B at signup, by creator account, 50/50. Control sees today's empty store. Treatment is offered "Build my store from Instagram". |
| Primary metric | 7-day activation |
| Secondary | Free-to-paid within 14 days, first sale within 30 days |
| Guardrails | Ghost-store rate, first-sale rate per activated creator, support contacts, policy flags |
| Sample size | Illustrative: at an assumed 10% baseline and a 2-point minimum lift, about 3,840 creators per arm (5% significance, 80% power). Recompute with the real baseline. |
| Duration | At least two full weeks, to cover weekly cycles and separate novelty from habit |
| Ramp | 5%, then 25%, then 50%, with a kill switch on any zero-tolerance guardrail |
| Pre-registered cuts | Follower band, niche, language |
| Decision rule | Ship if activation rises significantly and no guardrail breaches. If activation rises but first-sale rate per activated creator falls, the lift is cosmetic: fix makeability before widening. |

**Learning loop.** Each week, review field\_edits. Products deleted most often, by niche, change the idea prompts. Price changes, by niche, change the pricing table. Every change reruns the golden set before release.

## Pre-mortem, risks and mitigations

Assume it is three months after launch and the feature has failed. These are the most likely stories, ranked by expected damage, with the prevention already built into v1.

| Failure story | Early signal | Prevention built into v1 |
| --- | --- | --- |
| **The stores were generic.** Creators saw "Fitness ebook, ₹499" and did not recognise themselves. | Low keep rate, high delete rate, swap test failing | Understanding that quotes evidence. Wide idea generation, then selection. Swap test in evals. "Why this?" notes. |
| **Ghost stores.** Activation rose, but nobody made the products. | Published stores with no product attached after 14 days | Effort labels. A cheapest product that fits in a weekend. Interest counts that give a reason to build. Ghost stores as a counter-metric. |
| **A storefront embarrassed a creator.** An invented credential or a banned claim went live. | Any policy flag or report after publish | Hard gates. Nothing publishes without the creator's tap. Kill switch. |
| **The scraper broke.** The provider was blocked or changed, and every new build failed. | Read success below 90% | One retry, a clear failure message, and samples for the demo. In production, read the connected account instead of scraping. |
| **Prices felt wrong.** Creators cut prices in bulk or left at the price step. | More than 40% lowering prices in a niche | Rule table with a visible reason. Weekly calibration. Overrides always allowed. |
| **The wait was too long.** A minute of building on mobile data and people left. | Drop between generation\_started and generation\_completed | "Found you" as early as the profile read allows. Named steps with live detail. The build continues on the server if the tab closes. |
| **Someone built a fake store for a celebrity.** | Reports, or publishes for very large accounts | Private drafts. A bio code before a handle-based store publishes. A "Self-described" label on stores built from a description. Pre-launch label. No payments. Rate limits. Report link. In production the handle is the creator's verified connection. |
| **It blurred the Super AI story.** Two AI entry points confused creators and the team. | Overlapping prompts in onboarding | Clear roles: the generator proposes on day one, Super AI and the builders execute afterwards. |
| **The demo broke live.** A third-party call failed in front of the reviewers. | Not applicable | Seeded sample creators, cached snapshots and a recorded backup run. |

**The risk this PRD does not remove.** The generator can prove that creators publish. It cannot prove that they follow through and sell. Only the production experiment answers that, which is why first-sale rate is a guardrail and not an afterthought.

## Decision log

Seventeen decisions shape the build. Each one names what was rejected, because the rejected option is usually the one a reviewer will ask about.

| Decision | Chose | Rejected | Why |
| --- | --- | --- | --- |
| Entry point | Handle first, with a typed description as fallback | Handle only. Instagram login. | The handle gives the richest input for the least typing. The description stops private accounts and scraper failures from being dead ends, protects the demo, and matches the brief, which allows either. |
| Profile data source | Third-party scraper, prototype-only | Official Business Discovery API | The scraper reaches any public profile and its video files, which transcription needs. A US court found in 2024 that Meta's terms do not bar logged-out scraping of public data, but scrapers can fail without notice and SuperProfile depends on Meta, so production would read the account the creator has connected. |
| What the model reads | Transcripts and image text from 5 posts | Bio and captions only | Captions are often a hook and hashtags. The spoken content carries the expertise and the voice. |
| Which posts | 3 most viewed plus 2 most recent | The 5 most viewed | Top reels are often trend content. Recent posts show what the creator talks about now. |
| Where ideas come from | Demand quoted from the creator's own posts | An LLM market research report, then an opportunity scan | A report without retrieval is the model's priors with invented figures, and it pulls ideas towards the niche in general. |
| What a good idea is | Makeable this week and already asked for | Unique products that fill a market gap | A stalled creator needs a first product they can ship, not a novel one. |
| Number of products | 3 by default, range 2 to 4 | Always 4. Just 1. | Three makes a ladder: a start, a step up, a premium. Four spreads quality thin and adds choice. |
| Who sets the price | Rule table fed by model classification | Model writes the price. One fixed price per format. | Consistent, testable and explainable. Still sensitive to niche and audience. |
| Button on a generated product | "Notify me" in pre-launch mode | "Buy now". A direct UPI payment link. | The product does not exist yet, so a Buy button is a broken promise to the creator's followers. A raw UPI link bypasses KYC, delivery and SuperProfile's checkout. |
| Access | No login, private edit link | OTP or email login | Friction before value. In production the creator is already signed in. |
| Ownership | A short code in the creator's Instagram bio, re-read before a handle-based store publishes | No check. Instagram login. | Anyone can type any handle. A bio code proves control of the account with one extra step and no login. Description-built stores carry a self-described label instead. |
| Pipeline shape | Nine small stages in one long-running function | One large prompt | Each stage gets its own eval and model size, and one product can be regenerated without touching the rest. |
| Idea generation | Generate 6 to 8 candidates, select 3 | Generate exactly 3 | First ideas are the most generic. Unused candidates also power "Try another" with one short write call and no new ideation. |
| Facts policy | Facts about the creator must come from their posts. Product contents are proposals. | Placeholders such as "\[X years\]". Free invention. | Placeholders are not ready to publish. Invention is fabrication under someone's name. |
| Product visuals | Typographic covers from title and theme | AI images. Stock photos. | Instant, consistent, and no likeness or licensing risk. |
| Publishing | Draft, then the creator confirms | Auto-publish after generation | Auto-publish would lift the activation number and cost trust. It also matches Super AI's preview-card rule. |
| Model choice | Cheapest pairing that clears the eval bars | Largest model everywhere. Smallest everywhere. | Cost and latency matter at free-tier scale. Idea quality matters more than either. |

All of these can be reversed cheaply except two: the facts policy and draft-then-confirm. Those are trust rules, and they stay fixed.

## Build plan and demo script

Build in risk order: prove the two uncertain parts first, then the spine, then the polish. The plan is sized for about 30 focused hours and should be rescaled to the deadline in the PDF brief.

**Build order, each step with its exit gate**

1. **Spike the risks.** Scrape 10 handles with two candidate scraper providers. Transcribe 5 reels with Deepgram, including Hinglish speech and a music-only reel. Time the path from download to Deepgram transcript. Gate: 90% of public handles read, and transcripts good enough to quote.
2. **Media pipeline.** Job table, post selection, download, video bytes sent straight to Deepgram, image text. Gate: one handle in, five posts of text out, with the time recorded.
3. **Model stages and evals.** Schemas, prompts for profile, demand, products and copy, pricing table with unit tests, the 19-case golden set, the judge. Gate: hard gates at 100% and specificity at 4 or above on 80%.
4. **Builder flow.** Input screen, live progress, review and edit, autosave, regenerate, "Try another". Gate: one full run on a real phone over mobile data, with the build time recorded.
5. **Publish and share.** Public page, link preview, share actions, unpublish, pre-launch interest. Gate: the page passes the speed and in-app browser checks.
6. **Hardening.** Rate limits, retries, failure states, seeded samples, tracing, events. Gate: block the scraper and the app fails with a clear message while the samples still work.
7. **Hallway tests and write-up.** Five creators, fix the top two issues, record the demo. Gate: 4 of 5 pass, or the miss is documented as a finding.

AI tools in the build: Claude Code for scaffolding and tests, LangSmith for traces and eval runs. The eval report doubles as evidence of how the prompts were iterated.

**Demo script (about five minutes)**

1. The problem in one line, over a screenshot of an empty store.
2. Live on a phone: type a handle you control, watch "Found you" and the draft arrive section by section.
3. Edit one price to show the range note. Tap "Try another". Open a "Why this?" note.
4. Publish, adding the bio code to that account and waiting for the re-read. Paste the link into WhatsApp to show the preview, then open the page inside Instagram.
5. Second run with a private account, to show the description fallback still produces a store.
6. One hard case: a money creator gets education-only products, and an instruction hidden in a bio is ignored.
7. The eval table before and after one prompt change, including a regression the gate blocked.
8. What was cut, and the first three moves at SuperProfile: read the connected account, save drafts into the real product builders, run the A/B.

**Deliverables (assumed, confirm against the PDF)**

- [ ] Live link that works on a phone
- [ ] Repository with a short README
- [ ] This PRD
- [ ] Eval report: golden-set scores by prompt version
- [ ] Hallway test notes from five creators
- [ ] Walkthrough video

## Open questions

Two questions block the build. The rest are for SuperProfile and sharpen the bet without stopping the prototype.

| Question | Who answers | Blocking? |
| --- | --- | --- |
| This PRD was written from the email summary. The full PDF brief was not available. The email allows a handle or a description, and v1 supports both, handle first. Do the PDF's requirements, deadline or scoring criteria change anything here? | Shekhar | Yes |
| Which scraper provider reads public handles and video links reliably and fast enough? | The step 1 spike | Yes |
| What is the activation rate today, and where do new creators drop: before a product, at KYC, or at the paywall? | SuperProfile growth | No |
| Should the generated draft store be visible on the free plan, with the upgrade asked at publish? | SuperProfile product | No |
| Can the generator read the connected Instagram account and Auto-DM data? Comments and DM keywords are the best signal of what followers already ask for. | SuperProfile engineering and legal | No |
| Is there price and conversion data by format, niche and follower band to replace the seed table? | SuperProfile data | No |
| Do the regulated-niche rules and the handling of public profile data hold up under legal review, including the DPDP Act? | Legal | No for the prototype, yes for launch |
| Which language comes first after English: Hinglish, Hindi or a regional language? | SuperProfile data on creator language mix | No |
| Once inside SuperProfile, should "Notify me" collect a contact through the existing lead tools? | Product and legal | No |
| One AI entry point or two: how do the generator and Super AI hand off? | SuperProfile product | No |

## Sources

All pages opened on 19 November 2026.

- SuperProfile: [product overview](https://superprofile.bio/llms.txt), [Super AI](https://superprofile.bio/products/super-ai), [pricing](https://superprofile.bio/pricing), [digital products to sell in India](https://superprofile.bio/guides/digital-products-to-sell), [how to sell digital products in India](https://superprofile.bio/guides/sell-digital-products-india)
- Meta: [Business Discovery documentation](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/business-discovery)
- Market size: [IBEF summary of BCG's "From Content to Commerce"](https://www.ibef.org/news/india-s-creator-economy-projected-to-influence-over-us-1-trillion-rs-84-58-000-crore-in-consumer-spend-by-2030-bcg-report-to-be-unveiled-at-waves-2025)
- Price priors: [Hostinger, how to sell digital products online in India](https://www.hostinger.com/in/tutorials/sell-digital-products/)
- Regulation: [News On Air on SEBI's finfluencer circular](https://www.newsonair.gov.in/sebi-cracks-down-on-finfluencers-selling-stock-tips-in-the-name-of-education), [Business Standard on ASCI's updated influencer guidelines](https://www.business-standard.com/india-news/influencers-get-leeway-as-ad-body-softens-generic-promotion-rules-125042801046_1.html), [Parliamentary answer on the CCPA coaching guidelines](https://eparlib.sansad.in/bitstream/123456789/2986791/1/AU3841_R2WHvN.pdf)

* Feasibility check: [Apify reel scraper fields](https://apify.com/esdrasdw/instagram-reels-scrapy), [Deepgram pre-recorded API](https://developers.deepgram.com/reference/listen-remote), [Deepgram Nova-3 languages](https://developers.deepgram.com/docs/nova-3-language-prompting.md), [Vercel function limits](https://vercel.com/docs/functions/limitations), [Meta v. Bright Data ruling](https://www.jdsupra.com/legalnews/major-decision-affects-law-of-scraping-1470808/)
