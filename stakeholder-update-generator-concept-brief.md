# Concept Brief — Stakeholder Update Generator

## 1) One-liner
Turn messy product/engineering notes into a polished stakeholder update (tailored to audience + length + tone) in under 2 minutes.

## 2) Problem
As a PM/PO, you constantly translate raw information (standups, Slack threads, Jira churn, ad‑hoc notes, incidents, demos) into stakeholder-friendly updates. This is repetitive, time-consuming, and easy to get wrong:

- Updates vary in structure and quality week to week.
- Different audiences need different framing (exec vs Eng vs Sales/CS).
- Important context gets lost (what changed, why it matters, what’s blocked, what’s needed).
- Writing takes longer than it should, especially when you’re tired or context-switching.

## 3) Target user
Primary: Individual PM/PO using it for their own weekly/daily updates.

Secondary (nice-to-have): Eng leads / TPMs / founders who send project updates.

## 4) Value proposition
“Paste your raw notes → instantly get a clear, structured update you can send.”

Key outcomes:
- **Speed**: reduce update drafting from ~20–40 minutes to ~2–8 minutes (including edits).
- **Consistency**: reusable structure, predictable sections, fewer omissions.
- **Audience fit**: the same facts framed differently depending on who’s reading.

## 5) Core UX flow (MVP)
1. **Paste** raw notes (freeform text, bullets, links).
2. Choose:
   - Audience: `Exec / Cross-functional / Engineering`
   - Format: `Weekly update / Daily update / Launch update / Incident update` (start with Weekly)
   - Length: `Short / Standard / Detailed`
   - Tone: `Neutral / Crisp / Friendly`
3. Click **Generate**.
4. **Edit** output inline.
5. **Copy/Export** (Markdown + “Slack-ready” formatting).
6. (Optional) **Save** the update to history.

## 6) What makes this portfolio-worthy
This app demos extremely well because the transformation is visible:

- Side-by-side **Before → After** view.
- One-click **audience switching** that meaningfully changes emphasis.
- Clean export modes (Slack vs Email vs Markdown).
- Lightweight “history” with diffs (optional stretch) to show what changed week to week.

## 7) MVP scope (weekend build)

### Must-have features
- Single-page app with:
  - Raw notes input
  - Controls: audience, length, tone
  - Output editor (rich textarea/markdown)
  - Copy-to-clipboard + download `.md`
- Opinionated output template:
  - `TL;DR`
  - `Progress / Wins`
  - `Metrics` (optional if present)
  - `Risks / Blockers`
  - `Asks / Decisions needed`
  - `Next up`
  - `Links`
- “Quality guardrails” in prompting/logic:
  - Prefer concrete nouns and numbers when available
  - Flag unknowns rather than inventing details
  - Keep items scannable (bullets, short lines)

### Nice-to-have (stretch)
- Saved history (local-first) + search
- Templates: custom sections, saved presets (e.g., “Exec weekly”)
- “Diff mode”: compare last update vs current
- “Redaction toggle”: attempt to remove customer names / sensitive identifiers

### Explicit non-goals (for MVP)
- Automatic ingestion from Jira/Slack/Calendar
- Multi-user collaboration, approvals, permissions
- Org/workspace administration

## 8) Key user stories
- As a PM, I can paste a brain dump and get a **sendable weekly update**.
- As a PM, I can switch to **Exec mode** and the update becomes shorter and more outcome-focused.
- As a PM, I can export in **Slack formatting** without reformatting manually.
- As a PM, I can quickly edit the draft before sending.

## 9) Output templates (examples)

### Exec (short)
- **TL;DR:** {1–2 bullets on outcomes + timeline}
- **What changed:** {top 2–4 bullets}
- **Risks:** {0–2 bullets}
- **Asks:** {0–2 bullets}

### Engineering (standard)
- **Summary**
- **Shipped / Done**
- **In progress**
- **Blocked / Needs input**
- **Next up**
- **Links**

## 10) Data model (minimal)
- `UpdateDraft`
  - `id`
  - `createdAt`
  - `rawInput`
  - `settings` (audience, length, tone, template)
  - `output`

Store locally (browser storage) by default for privacy.

## 11) Technical approach (implementation options)

### Option A: LLM-backed (highest “wow”)
- Frontend: Next.js/React + simple UI
- Server route calls an LLM API with a structured prompt and returns markdown
- Benefits: best output quality, strongest demo
- Risk: requires API key handling and cost control

### Option B: Rules + lightweight summarization (lowest friction)
- Heuristic sectioning + rewrite rules (bullets, heading assignment)
- Benefits: no API keys, fully offline
- Risk: quality ceiling; less impressive transformation

Recommendation: **Option A** for portfolio impact, with a clear privacy note and “no storage” default.

## 12) Privacy & safety
- Default: **do not persist** raw input or output unless user clicks Save.
- If using an LLM API: warn users not to paste secrets; optionally add a “redact common patterns” pre-pass.

## 13) Success criteria (personal + demo)
- Draft quality: user can send with **≤ 3 minutes of edits**.
- Time-to-first-draft: **≤ 10 seconds** after clicking Generate (excluding model latency).
- User trust: output never fabricates specifics; it asks/flags when data is missing.

## 14) Weekend execution plan (high level)
- Day 1: UI + templates + copy/export + (optional) local history
- Day 2: LLM prompt iteration + edge cases + polish + deployment

## 15) Open questions
- Do you want a single default template (Weekly) or a small template picker?
- Should “Metrics” be always present, or only when the input includes numbers/metric keywords?
- Do you want citations/traceability (show which input lines informed each bullet), or is that out-of-scope?

## 16) Hosting recommendation + operational guardrails (public portfolio demo)

### Goal
Host a public demo that makes **real LLM calls** while keeping setup time, ongoing maintenance, and surprise costs low.

### Recommended hosting
**Vercel (Next.js) with a server-side API route** (e.g., `/api/generate`) calling your LLM provider.

Why this is the easiest path:
- One-click deploy from GitHub, good defaults, solid uptime.
- Server-side environment variables keep your LLM API key off the client.
- Simple to add edge/serverless middleware for request validation and abuse controls.

### Minimal architecture
- **Frontend**: Next.js app (UI + templates + editor).
- **Backend**: a single serverless endpoint that:
  - validates request (size, required fields)
  - enforces guardrails (bot check, rate limit, caps)
  - calls the LLM provider
  - returns markdown

### Guardrails (strongly recommended)

#### 1) Bot protection
Add a challenge on the **Generate** action (e.g., Cloudflare Turnstile).
- Prevents casual abuse and scripted traffic.
- Verify the token server-side before calling the LLM.

#### 2) Rate limiting
Enforce limits at the API route to avoid being botted and to bound spend.

Suggested defaults (tune as needed):
- Per IP: `10 requests / 10 minutes`
- Global: `500 requests / day`

Implementation note: serverless is stateless, so use a tiny external counter store (e.g., Upstash Redis / Vercel KV) to track rate-limit buckets.

#### 3) Hard caps
Cap request and response sizes to bound latency and cost:
- Max raw input size (e.g., `8,000–20,000` characters)
- Max output tokens (e.g., `500–1,000` tokens)
- Reject empty/near-empty inputs

#### 4) Budget kill switch + graceful fallback
Add a “kill switch” that disables generation when you hit a threshold.

Two layers:
- **Provider-side**: set usage limits/budgets and rate limits in your LLM provider console.
- **App-side**: daily request cap (stored in your counter store).

When disabled, fall back to **Demo mode**:
- show preloaded example inputs
- show cached/sample outputs
- allow audience/length/tone toggles to keep the demo compelling

#### 5) Minimal logging (privacy-first)
For a public demo:
- Do **not** log raw notes or generated outputs.
- Only log what you need for ops: timestamp, request size, response time, token counts, and a hashed identifier for rate limiting.

### Security notes
- Never ship the LLM API key to the browser.
- Add a short UI warning: “Don’t paste secrets.”
- If you later add persistence, make it opt-in and clearly labeled.

### If you later turn this into SaaS
Keep the codebase “SaaS-ready” without adding complexity now:
- Put LLM calls behind a single provider-agnostic service layer (swap providers later).
- Keep generation stateless (no required DB) so adding auth/billing later is additive.
- Use feature flags for future: auth, shared templates, history/search, org presets.
