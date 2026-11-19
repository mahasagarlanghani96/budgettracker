# FinKeep — Tooling & Installation Inventory

> Recorded 2026-11-19. All versions verified via `npm ls`.

## Runtime

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 22.21.0 | Runtime |
| npm | 10.9.4 | Package manager |

## Test Dependencies (devDependencies)

### Unit / Integration

| Package | Version | Purpose |
|---|---|---|
| vitest | 2.1.9 | Test runner (unit + component) |
| @testing-library/react | 16.1.0 | React component testing |
| @testing-library/jest-dom | 6.6.3 | DOM assertion matchers |
| @testing-library/user-event | 14.5.2 | User interaction simulation |
| jsdom | 25.0.1 | Browser environment for Vitest |
| fast-check | 3.23.2 | Property-based / generative testing |

### E2E / Browser

| Package | Version | Purpose |
|---|---|---|
| @playwright/test | 1.65.1 | E2E browser automation |
| @axe-core/playwright | 4.10.1 | Accessibility (a11y) scanning |

### Build / Lint

| Package | Version | Purpose |
|---|---|---|
| typescript | 5.7.3 | Type checking |
| eslint | 9.17.0 | Linting |
| eslint-config-next | 15.1.0 | Next.js ESLint rules |

## Configuration Files

| File | Purpose |
|---|---|
| `vitest.config.ts` | Unit test configuration — includes `tests/unit/`, `tests/integration/`, `src/**/__tests__/` |
| `vitest.config.component.ts` | Component test configuration — jsdom environment |
| `playwright.config.ts` | E2E configuration — 5 browser projects, reporters, timeouts |
| `.github/workflows/ci.yml` | CI pipeline — lint, unit, component, e2e, cross-browser, security |

## npm Scripts

| Script | Command |
|---|---|
| `test:unit` | `vitest run --config vitest.config.ts` |
| `test:component` | `vitest run --config vitest.config.component.ts` |
| `test:e2e` | `npx playwright test` |
| `test:e2e:chromium` | `npx playwright test --project=chromium` |
| `test:e2e:headed` | `npx playwright test --headed` |
| `test:e2e:debug` | `npx playwright test --debug` |
| `test:e2e:auth` | `npx playwright test tests/e2e/auth.spec.ts` |
| `test:e2e:pwa` | `npx playwright test tests/e2e/pwa.spec.ts` |
| `test:e2e:a11y` | `npx playwright test tests/e2e/accessibility.spec.ts` |
| `test:e2e:security` | `npx playwright test tests/e2e/security-headers.spec.ts` |
| `test:smoke` | `vitest run --config vitest.config.ts && npx playwright test --project=chromium` |
| `test:regression` | `vitest run --config vitest.config.ts && vitest run --config vitest.config.component.ts && npx playwright test` |
| `test:coverage` | `vitest run --config vitest.config.ts --coverage` |
| `test:demo` | `npx playwright test --headed --project=chromium` |

## Playwright Browser Projects

| Project | Browser | Viewport |
|---|---|---|
| chromium | Chromium (latest) | 1280×720 |
| firefox | Firefox (latest) | 1280×720 |
| webkit | WebKit (latest) | 1280×720 |
| mobile-chrome | Chromium (Pixel 5) | 393×851 |
| mobile-safari | WebKit (iPhone 12) | 390×844 |

## Playwright Reporters

### CI Mode
- `github` — GitHub Actions annotations
- `html` — Full HTML report at `playwright-report/`
- `json` — Machine-readable at `test-results/results.json`
- `junit` — JUnit XML at `test-results/junit.xml`

### Local Mode
- `html` — Opens on failure only

## Test Helpers

| File | Purpose |
|---|---|
| `tests/helpers/financial-assertions.ts` | Independent calculation verification functions |
| `tests/helpers/schema-factories.ts` | Test data factory functions for all 11 entity types |
| `tests/helpers/test-ids.ts` | Semantic test-id constants for UI element selectors |

## Installation from Scratch

```bash
# Install all dependencies (includes test tools)
npm ci

# Install Playwright browsers
npx playwright install --with-deps

# Verify unit tests
npm run test:unit

# Verify E2E (requires build first)
npm run build
npm run test:e2e:chromium

# Full regression
npm run test:regression
```
