# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stakeholder Update Generator - A Next.js 15 app that transforms raw product/engineering notes into polished, audience-specific stakeholder updates using AI. The core transformation is: messy notes → structured markdown output tailored by audience, length, and tone.

## Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Run production server
npm run lint       # ESLint with Next.js rules
npm run typecheck  # TypeScript validation (no emit)
```

## Architecture

### Full-Stack Type Safety Pattern
- **Shared contracts** (`src/shared/contracts.ts`): Zod schemas define the client-server boundary
- Request/response types are inferred from schemas with `z.infer<typeof>`
- API routes validate all requests against these schemas before processing

### Key Directories
- `app/` - Next.js App Router (page.tsx is client-side, api/generate/route.ts is the POST endpoint)
- `src/server/` - Server-side logic: prompt building, LLM orchestration, error handling
- `src/client/` - Client utilities (clipboard, markdown download)
- `src/shared/` - Zod contracts shared between client and server

### LLM Integration (`src/server/`)
- `generateUpdate.ts` - Core business logic: prompt construction, output validation, guardrails
- `llm.ts` - Provider abstraction (currently Anthropic-only, extensible)
- `anthropic.ts` - Direct Anthropic API calls via fetch
- `errors.ts` - Custom ApiError class with status codes and error codes

### Prompt Engineering Approach
The system uses audience-driven prompting with:
- Dynamic system prompts that define output structure per audience type
- Token budgets tied to length setting (Short: 450, Standard: 900, Detailed: 1400)
- Guardrails: never invent specifics, use "(unknown)" for missing data, keep scannable
- Output validation checks for expected H2 headings per audience

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...  # Required for live generation
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929  # Optional (default)
LLM_PROVIDER=anthropic  # Optional
```

When API key is missing, the app falls back to stub mode showing template structure.

## Project Tracking

Implementation tracked in Linear under **SUG-MVP** project. At session start, read `stakeholder-update-generator-concept-brief.md` for product context.

## Working in Linear

- When starting work on Linear issues, always check the issue status. If the issue is "In Progress", that may mean that work has already begun on it. In such cases, always read issue comments in addition to the main issue details. Comments may contain context from previous work sessions or other AI agents. If the issue status is "Backlog" or "Todo", and the user has asked you to work on it, then set the issue status to "In Progress". 
- Any time you've conducted work on a Linear issue, add a comment to the issue documenting what you've done, implementation status (e.g. complete, unresolved bugs), along with any important context/notes worth mentioning which AI agents in future sessions may find helpful (for instance, in case there are related sub-issues or other dependencies).

## Git Conventions

- All lowercase, simple and concise messages
- Treat commits as guideposts, not detailed changelogs
- Do not mention AI tools in commits
