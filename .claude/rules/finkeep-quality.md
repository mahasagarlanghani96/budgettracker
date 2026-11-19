# FinKeep Quality Standards — Enforced by Claude Code

## Pre-commit checklist (every change)
1. `npm run test:unit` — 0 failures
2. `npx tsc --noEmit` — 0 errors
3. `npm run lint` — 0 errors
4. For UI changes: `npm run test:e2e:a11y` — 0 new critical violations
5. For financial logic: `npm run test:unit -- financial-invariants` — 0 failures

## Test writing standards
- Every test has a stable FIN-QA-XXXX ID
- Financial tests use independently calculated expected values
- Never copy app output as expected value
- Use Decimal.js for all money assertions
- Schema tests cover: valid input, boundary min/max, type rejection, required fields

## Money calculation invariants
- Balance = Opening + Inflows - Outflows (never approximate)
- Waiyk: profit + bid = total (conservation law)
- Loan remaining = max(0, principal - repayments)
- All money stored as Decimal(18,2) in PostgreSQL

## Security requirements
- All 15 feature routes must redirect to /login without auth
- All API routes must reject unauthenticated requests
- No secrets in test fixtures, screenshots, or artifacts
- No production data in tests

## Bug fix protocol
- Create a failing test FIRST that reproduces the bug
- Fix the code
- Verify the test now passes
- Run full regression

## Test file locations
- Unit tests: `tests/unit/` and `src/lib/calculations/__tests__/`
- E2E tests: `tests/e2e/`
- Component tests: `tests/component/`
- Helpers: `tests/helpers/`
- Factories: `tests/helpers/schema-factories.ts`
