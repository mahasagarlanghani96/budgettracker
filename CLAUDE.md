# FinKeep — Development & Quality Standards

## Project Overview
FinKeep is a Next.js 14 PWA for personal finance management (Pakistani Rupee / PKR).
Stack: TypeScript, React 18, Prisma (PostgreSQL), NextAuth, Zod, Decimal.js, TailwindCSS, Radix UI.

## Quality Requirements (Mandatory)

### Every code change MUST:
1. **Run unit tests**: `npm run test:unit` — all must pass
2. **Run E2E smoke**: `npm run test:e2e:chromium` — all must pass
3. **Type check**: `npx tsc --noEmit` — no errors
4. **Lint**: `npm run lint` — no errors

### Financial calculation changes MUST additionally:
- Add or update tests in `tests/unit/financial-invariants.test.ts`
- Verify with independently calculated expected values (never copy app output into tests)
- Use `Decimal.js` for all money math — never bare floating-point

### Schema/validation changes MUST:
- Update tests in `tests/unit/schemas.test.ts` and `tests/unit/schemas-extended.test.ts`
- Cover positive, negative, and boundary cases

### Auth/security changes MUST:
- Verify route protection tests in `tests/e2e/security-headers.spec.ts`
- Verify all 15 protected routes redirect to /login

### UI changes MUST:
- Run accessibility tests: `npm run test:e2e:a11y`
- Fix any new critical/serious axe violations before merging

### Bug fixes MUST:
- Include a regression test that fails before the fix and passes after

## Test Commands
```bash
npm run test:unit          # Vitest unit + integration tests
npm run test:e2e:chromium  # Playwright E2E (Chromium only)
npm run test:e2e:headed    # E2E in visible browser
npm run test:e2e:ui        # Playwright UI mode
npm run test:smoke         # Quick unit + E2E smoke
npm run test:regression    # Full regression (unit + component + E2E)
```

## Known Defects
- FIN-BUG-0001: ~~`formatCurrency(Infinity)` produces corrupted output~~ — FIXED: guard for non-finite values returns `Rs. 0`
- FIN-BUG-0002: ~~Password toggle button has no `aria-label`~~ — FIXED: added `aria-label` to `PasswordInput`
- FIN-BUG-0003: ~~Offline page has color-contrast issue~~ — FIXED: darkened paragraph text `#64748b` to `#475569`
- FIN-BUG-0004: ~~PhotoUpload overlay button has no accessible name~~ — FIXED: added `aria-label` to overlay button and file input

## Architecture Notes
- Money uses `Decimal(18,2)` in DB, `Decimal.js` in calculations — never `number` for currency
- Balance = Opening + SUM(inflows) - SUM(outflows), derived from transaction ledger
- All API routes require auth via `requireAuth()` + NextAuth middleware
- Transaction types classified as INFLOW/OUTFLOW in `src/lib/calculations/balance.ts`
- Waiyk committee profit: `(totalAmount - winningBid) / totalSlots`
