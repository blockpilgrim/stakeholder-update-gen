# Stakeholder Update Generator

Transform messy engineering/product notes into polished, audience-specific stakeholder updates — powered by Claude.

## What It Does

Every PM and engineering lead writes the same weekly update in slightly different ways for different audiences. Executives want outcomes and risks. Engineers want shipped items and blockers. Cross-functional partners want progress and dependencies.

This tool takes one set of raw notes and generates structured, scannable updates tailored by **audience** (Exec, Cross-functional, Engineering), **length** (Short, Standard, Detailed), and **tone** (Neutral, Crisp, Friendly). The output is clean Markdown ready for Slack, email, or docs.

The prompt engineering is opinionated: it enforces per-audience section schemas, uses token budgets tied to length settings, validates output structure against expected headings, and includes guardrails to prevent the LLM from inventing specifics that aren't in the source notes.

## Tech Stack

- **Next.js 15** (App Router) with **React 19** — single-page app with server-side API route
- **TypeScript** (strict mode) with **Zod** schemas defining the client-server contract
- **Anthropic Claude API** (Claude Sonnet) — direct `fetch` calls, no SDK dependency
- **Privacy-safe telemetry** — IP hashing via Web Crypto, structured JSON logging, no content stored
- **Guardrails layer** — per-IP rate limiting (sliding window), global daily caps, kill switch, demo mode fallback

## Architecture

```
app/page.tsx          → Client UI (before/after editor panels)
app/api/generate/     → POST endpoint (validation → guardrails → generation → response)
src/shared/           → Zod contracts shared between client and server
src/server/           → Prompt construction, LLM orchestration, rate limiting, telemetry
src/client/           → Export utilities (clipboard, Slack formatting, .md download)
```

Key design decisions:

- **Full-stack type safety**: Zod schemas in `src/shared/contracts.ts` define the exact request/response shape. The API route validates against these schemas before processing; the client validates the response before rendering. No `any` at the boundary.
- **Audience-driven prompting**: Each audience type has its own section schema, length budgets, and framing instructions. The system prompt enforces output structure, and a post-generation validator checks that headings match the expected schema.
- **Graceful degradation**: When no API key is configured, the app falls back to stub mode — generating template Markdown that shows the expected structure. This lets anyone run the app locally without credentials.

## Getting Started

```bash
npm install
npm run dev
```

To enable live AI generation, create a `.env.local` file:

```
ANTHROPIC_API_KEY=your-key-here
```

Without the key, the app runs in stub mode with template output.

## Status

MVP — built as a focused product experiment exploring LLM-powered content transformation with structured output validation. The core generation pipeline, prompt engineering, and guardrails are production-grade. No database or auth (stateless by design — nothing is saved).
