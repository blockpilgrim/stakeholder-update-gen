/**
 * Demo content for when live generation is disabled or for "try demo" functionality.
 * Contains a realistic example input and pre-generated outputs for each audience type.
 */

import type { Audience, UpdateSettings } from './contracts';

export const DEMO_INPUT = `Week of Jan 13-17

shipped:
- v2.0 checkout flow live on prod tuesday, 15% faster load times measured
- payment retry logic finished, deployed to staging
- mobile responsive fixes for cart page

in progress:
- A/B test framework setup (70% done, finishing this week)
- settings redesign - waiting on final design review
- API rate limiting implementation

blocked:
- EU privacy banner copy still pending legal review (2 weeks now)
- need decision on whether to support Safari 14

metrics:
- conversion up 2.3% since checkout launch (was 4.1%, now 4.2%)
- p95 latency 180ms (was 420ms before optimization)
- 0 critical incidents this week

incidents:
- brief outage wed 2pm-2:15pm, root cause was DB connection pool exhaustion
- added alerting for connection pool metrics

next week:
- launch A/B test for pricing page
- start Q1 OKR planning
- security audit prep

asks:
- need design review by friday for settings redesign
- decision needed: Safari 14 support (affects 2% of users)

links:
- figma.com/settings-v2
- notion.so/q1-planning
- grafana/checkout-dashboard`;

const DEMO_OUTPUTS: Record<Audience, string> = {
  Exec: `# Weekly Update

## TL;DR
Strong week: checkout v2.0 shipped with measurable performance gains (+2.3% conversion, 57% latency reduction). One minor outage handled cleanly. Legal blocker on EU privacy banner now at 2 weeks.

## What changed
- **Checkout v2.0 launched** - 15% faster load times, conversion up from 4.1% to 4.2%
- **Performance gains** - p95 latency dropped from 420ms to 180ms
- **Payment retry logic** - completed and in staging

## Risks
- **EU privacy banner** - blocked on legal review for 2 weeks, may delay EU rollout
- **Safari 14 decision needed** - affects 2% of users, blocking mobile work

## Asks
- Decision needed: Safari 14 support (recommend dropping given 2% usage)
- Design review by Friday for settings redesign`,

  'Cross-functional': `# Weekly Update

## Metrics
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Conversion | 4.1% | 4.2% | +2.3% |
| p95 Latency | 420ms | 180ms | -57% |
| Critical incidents | - | 0 | - |

## TL;DR
Checkout v2.0 shipped Tuesday with strong early metrics. Payment retry ready for prod. One minor outage (15 min) handled with improved monitoring. EU banner still blocked on legal.

## Progress / Wins
- Checkout v2.0 live with 15% faster load times
- Payment retry logic complete, deployed to staging
- Mobile cart page responsive fixes shipped
- A/B test framework 70% complete

## Risks / Blockers
- EU privacy banner waiting on legal (2 weeks and counting)
- Safari 14 support decision blocking mobile work
- Settings redesign waiting on design review

## Asks / Decisions needed
- Safari 14: support or drop? (2% of users affected)
- Design review needed by Friday for settings

## Next up
- Launch pricing page A/B test
- Q1 OKR planning kickoff
- Security audit preparation

## Links
- [Settings redesign](https://figma.com/settings-v2)
- [Q1 Planning](https://notion.so/q1-planning)
- [Checkout dashboard](https://grafana/checkout-dashboard)`,

  Engineering: `# Weekly Update

## Summary
Shipped checkout v2.0 to prod. Payment retry in staging. Brief DB outage Wed handled with new alerting. A/B framework at 70%. Blocked on legal for EU banner, need Safari 14 decision.

## Shipped / Done
- Checkout v2.0 deployed to production (Tue)
  - 15% load time improvement
  - p95 latency: 420ms → 180ms
- Payment retry logic - staging deploy complete
- Mobile responsive fixes for cart page
- Post-incident: connection pool alerting added

## In progress
- A/B test framework (70%, ETA: end of week)
- Settings redesign (pending design review)
- API rate limiting implementation

## Blocked / Needs input
- **EU privacy banner**: legal review pending 2 weeks - escalate?
- **Safari 14 support**: need decision (affects ~2% users)
  - Recommendation: drop support, redirect effort to modern browsers

## Next up
- Pricing page A/B test launch
- Q1 OKR planning
- Security audit prep

## Links
- Figma: figma.com/settings-v2
- Planning: notion.so/q1-planning
- Metrics: grafana/checkout-dashboard

## Incident note
Wed 14:00-14:15 UTC: DB connection pool exhaustion caused 15min outage. RCA complete, alerting added.`
};

/**
 * Get demo output for the given settings.
 * Note: We only vary by audience for simplicity - length/tone variations
 * would require many more pre-generated outputs.
 */
export function getDemoOutput(settings: UpdateSettings): string {
  return DEMO_OUTPUTS[settings.audience];
}
