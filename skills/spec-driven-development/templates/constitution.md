# Constitution: <Project Name>

**Version:** 1.0.0
**Ratified:** YYYY-MM-DD
**Last amended:** YYYY-MM-DD

Project-wide principles that every spec, plan, and task must respect. Keep this short. Each principle should change a real implementation or review decision. If removing a line would not change a reasonable decision, delete it.

## Platform

- Language / runtime / framework: <e.g. TypeScript / Node 22 / Next.js 16>
- Package manager and monorepo layout: <e.g. pnpm workspaces, apps/* and packages/*>
- Data stores and external services: <e.g. Postgres via Prisma, Stripe, S3>

## Principles

### P1. <Name>
<One or two sentences stating the rule and why it exists.>

### P2. <Name>
<...>

<!-- Examples of useful principles:
- Every public API change ships with a contract test.
- No direct database access outside the repository layer.
- New UI uses the design system tokens; no raw hex values.
- Feature work behind a flag until verified in staging.
- Secrets come from the secret manager; never from code or fixtures.
-->

## Must not

- <Forbidden dependency, pattern, or boundary crossing that an agent might plausibly introduce>

## Quality gates

The verification sequence every change must pass before review:

```bash
<e.g. pnpm lint && pnpm typecheck && pnpm test && pnpm build>
```

## Governance

- Amending this file requires review from: <team or role>
- Bump the version on every amendment. Major for removed or redefined principles, minor for additions, patch for wording.
