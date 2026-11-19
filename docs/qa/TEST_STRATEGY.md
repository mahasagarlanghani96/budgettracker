# FinKeep — Test Strategy

> Version 1.0 — 2026-11-19

## 1. Scope

This strategy covers all automated testing for the FinKeep personal finance PWA. It applies to every code change that enters `main`.

## 2. Test Pyramid

```
            ┌─────────┐
            │  E2E    │  68 tests — Playwright (Chromium/Firefox/WebKit)
           ┌┴─────────┴┐
           │ Component  │  (placeholder — jsdom via vitest)
          ┌┴───────────┴┐
          │    Unit      │  234 tests — Vitest + fast-check
         └──────────────┘
```

| Level | Tool | Config | Focus |
|---|---|---|---|
| Unit | Vitest 2.1 | `vitest.config.ts` | Financial calculations, Zod schema validation, utility functions, property-based invariants |
| Component | Vitest + jsdom | `vitest.config.component.ts` | React component rendering, form state, conditional UI |
| E2E | Playwright 1.65 | `playwright.config.ts` | Auth flows, route protection, PWA compliance, accessibility, security headers |

## 3. Financial Calculation Testing Philosophy

Financial software demands **independent verification**:

1. Every expected value is computed from first principles in the test, never copied from app output
2. Property-based tests (fast-check) generate random inputs and assert invariants:
   - Balance conservation: `opening + inflows - outflows = balance`
   - Waiyk profit conservation: `profit + bid = total`
   - Loan remaining is non-negative
   - Decimal precision is never lost
3. Cross-implementation: `tests/helpers/financial-assertions.ts` contains a completely separate implementation of core formulas

## 4. Schema Boundary Testing

Every Zod schema gets:
- Valid input acceptance
- Minimum boundary (e.g., name exactly 2 chars)
- Maximum boundary (e.g., name exactly 100 chars)
- Below-minimum rejection
- Above-maximum rejection
- Type coercion rejection (string where number expected)
- Required field omission
- Enum exhaustiveness (every valid enum value accepted)

## 5. E2E Strategy

### 5.1 Auth & Security
- Login form rendering and validation
- Registration with client-side validation
- 15 protected route redirect enforcement
- API endpoint auth enforcement
- Security header presence

### 5.2 PWA
- Manifest validity and installability (192x192, 512x512 icons)
- Service worker accessibility
- Offline page availability
- Meta tags (theme-color, apple-touch-icon)

### 5.3 Accessibility
- axe-core scans on login, register, offline pages
- Keyboard navigation verification
- Form label association

### 5.4 Cross-browser
- Chromium: Every PR (CI required)
- Firefox + WebKit: Main branch only (CI optional gate)
- Mobile viewports: Chrome 390x844, Safari 375x812

## 6. Test Identification

Every test has a stable ID: `FIN-QA-XXXX`

| Range | Category |
|---|---|
| 0001–0009 | Financial invariants (property-based) |
| 0010–0029 | Schema boundary tests |
| 0030–0039 | Ledger operations |
| 0040–0059 | Utility function tests |
| 0100–0119 | Auth E2E |
| 0200–0215 | PWA E2E |
| 0300–0319 | Accessibility E2E |
| 0400–0419 | Security E2E |

## 7. Test Data Management

- **Factories**: `tests/helpers/schema-factories.ts` — deterministic factory functions for all 11 entity types
- **No production data**: All test data is synthetic
- **No shared state**: Each test creates its own data; E2E tests are isolated per browser context
- **Financial assertions**: `tests/helpers/financial-assertions.ts` — independent math helpers

## 8. CI/CD Integration

See `.github/workflows/ci.yml` for the full pipeline:

```
lint-typecheck ──┐
                 ├──→ e2e-tests (Chromium) ──→ e2e-cross-browser (main only)
unit-tests ──────┘
component-tests (parallel)
security-audit (parallel)
```

- E2E tests gate on lint + unit passing
- Cross-browser gates on Chromium E2E passing
- All test artifacts uploaded with 14-day retention
- Security audit runs npm audit + typecheck

## 9. Local Execution

```bash
# Unit tests (fast — no browser needed)
npm run test:unit

# E2E with visible browser
npm run test:e2e:headed

# E2E debug mode (step through)
npm run test:e2e:debug

# Specific test suite
npm run test:e2e:auth
npm run test:e2e:pwa
npm run test:e2e:a11y
npm run test:e2e:security

# Full regression
npm run test:regression
```

## 10. Known Gaps (Automation Backlog)

| Gap | Reason | Mitigation |
|---|---|---|
| Authenticated E2E flows | No DATABASE_URL in CI for real login | Auth tests verify form UI + redirect behavior |
| API integration tests | Need seeded database | Schema validation tests cover input boundaries |
| Component tests | Minimal; framework ready | vitest.config.component.ts configured |
| Visual regression | Not implemented | Manual review + a11y automation |
| Performance/load | Out of scope for MVP | Lighthouse CI can be added |

## 11. Defect Documentation

All bugs found during testing are documented in `docs/qa/QUALITY_RISK_REGISTER.md` with IDs `FIN-BUG-XXXX`.
