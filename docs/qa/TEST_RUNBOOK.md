# FinKeep — Test Runbook

> Procedures for running tests locally and in CI.

## Quick Reference

```bash
# Fast check — run before every commit
npm run test:unit

# Full local regression — run before PR
npm run test:regression

# Headed browser — visual E2E debugging
npm run test:e2e:headed

# Single spec debug — step through with inspector
npx playwright test tests/e2e/auth.spec.ts --debug
```

---

## 1. Unit Tests

### Run all unit tests
```bash
npm run test:unit
```

**Expected**: 234 tests pass in ~3s. Output shows test suites from:
- `tests/unit/financial-invariants.test.ts` — 16 property-based tests
- `tests/unit/schemas-extended.test.ts` — 90 boundary tests
- `tests/unit/ledger.test.ts` — 11 ledger operation tests
- `tests/unit/utils-extended.test.ts` — 28 utility tests
- `src/lib/calculations/__tests__/balance.test.ts` — balance calculation tests
- Other existing test files

### Run with coverage
```bash
npm run test:coverage
```

### Run specific file
```bash
npx vitest run tests/unit/financial-invariants.test.ts
```

### Watch mode (development)
```bash
npx vitest --config vitest.config.ts
```

---

## 2. Component Tests

```bash
npm run test:component
```

Uses `vitest.config.component.ts` with jsdom environment.

---

## 3. E2E Tests

### Prerequisites
1. Playwright browsers installed: `npx playwright install --with-deps`
2. App built: `npm run build`
3. Playwright will auto-start the dev server via `webServer` config

### Run all E2E (all browsers)
```bash
npm run test:e2e
```

### Run Chromium only (fastest)
```bash
npm run test:e2e:chromium
```

### Run with visible browser
```bash
npm run test:e2e:headed
```

### Debug mode (Playwright Inspector)
```bash
npm run test:e2e:debug
```

### Individual suites

| Suite | Command | Tests |
|---|---|---|
| Auth flows | `npm run test:e2e:auth` | 30 tests — login, register, route protection |
| PWA compliance | `npm run test:e2e:pwa` | 10 tests — manifest, SW, offline, meta tags |
| Accessibility | `npm run test:e2e:a11y` | 8 tests — axe scans, keyboard nav |
| Security | `npm run test:e2e:security` | 20 tests — auth enforcement, API protection |

### View HTML report after failure
```bash
npx playwright show-report
```

---

## 4. Full Regression

```bash
npm run test:regression
```

Runs sequentially: unit → component → E2E (all browsers).

---

## 5. Smoke Test (pre-deploy)

```bash
npm run test:smoke
```

Runs: unit + E2E Chromium only. Faster than full regression.

---

## 6. CI Pipeline

The CI pipeline (`.github/workflows/ci.yml`) runs automatically on:
- Push to `main`
- Pull requests targeting `main`

### Pipeline stages

```
┌─ lint-typecheck ──────────────────┐
│  npx tsc --noEmit + npm run lint  │
└───────────┬───────────────────────┘
            │
            ├──→ e2e-tests (Chromium)
            │      needs: lint + unit passing
            │      artifacts: playwright-report/, test-results/
            │
┌─ unit-tests ──────────────────────┤
│  npm run test:unit                │
│  artifacts: test-results/         │
└───────────────────────────────────┘

┌─ component-tests (parallel) ──────┐
│  npm run test:component           │
└───────────────────────────────────┘

┌─ security-audit (parallel) ───────┐
│  npm audit + tsc --noEmit         │
└───────────────────────────────────┘

┌─ e2e-cross-browser (main only) ──┐
│  Firefox + WebKit                 │
│  needs: e2e-tests passing         │
│  artifacts: cross-browser-report/ │
└───────────────────────────────────┘
```

### Downloading CI artifacts
1. Go to Actions tab in GitHub
2. Click the workflow run
3. Download artifacts from the bottom of the run summary

---

## 7. Troubleshooting

### "Cannot find module" in unit tests
Vitest resolves paths from `vitest.config.ts`. Check the `alias` section matches `tsconfig.json` paths.

### E2E tests timeout
- Default timeout: 30s per test, 15s per action, 30s per navigation
- Increase for slow CI: `--timeout 60000`
- Check if `webServer` started correctly in Playwright output

### "browser not found" in Playwright
```bash
npx playwright install --with-deps
```

### E2E auth tests fail with "no error shown"
Expected without DATABASE_URL. The tests verify the user stays on `/login` (auth rejection behavior) rather than requiring specific error messages.

### axe-core reports violations
Known violations documented in `QUALITY_RISK_REGISTER.md`. FIN-BUG-0002 (button-name on PasswordInput) is a known issue.

### Property-based tests flaky
fast-check uses seeded randomness. If a test fails, the seed is printed in the error message. Reproduce with:
```bash
npx vitest run tests/unit/financial-invariants.test.ts
```
The failing seed will be shown for exact reproduction.
