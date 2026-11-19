# FinKeep — Quality Risk Register

> Updated 2026-11-19. Tracks known defects, risks, and mitigations.

## Known Defects

### FIN-BUG-0001: `formatCurrency(Infinity)` produces corrupted output

- **Severity**: Low (edge case — Infinity should not reach this function in normal flow)
- **Location**: `src/lib/utils.ts` → `formatCurrency()`
- **Observed**: `formatCurrency(Infinity)` returns `"Rs. Infin,ity.undefined"` instead of a sensible fallback
- **Root cause**: The lakh/crore regex grouping splits the string "Infinity" as if it were digits, then `.toFixed(2)` on Infinity returns `"Infinity"` which the decimal split produces `undefined`
- **Test**: `tests/unit/utils-extended.test.ts` FIN-QA-0040 — asserts the broken output with documentation
- **Fix**: Add a guard: `if (!isFinite(num)) return 'Rs. —';` or similar
- **Status**: OPEN

### FIN-BUG-0002: PasswordInput toggle button missing `aria-label`

- **Severity**: Critical (accessibility — WCAG 2.1 AA failure, screen readers cannot identify the button)
- **Location**: `src/components/ui/password-input.tsx`
- **Observed**: axe-core reports `button-name` violation — the eye/eye-off toggle `<button>` has no accessible name
- **Test**: `tests/e2e/accessibility.spec.ts` FIN-QA-0300, FIN-QA-0305 — documents known violations
- **Fix**: Add `aria-label="Toggle password visibility"` to the toggle button
- **Status**: OPEN

### FIN-BUG-0003: Offline page color-contrast issue

- **Severity**: Medium (accessibility — text may be hard to read for low-vision users)
- **Location**: `public/offline.html`
- **Observed**: axe-core reports color-contrast violation on offline fallback page
- **Test**: `tests/e2e/accessibility.spec.ts` FIN-QA-0315
- **Fix**: Increase text/background contrast ratio to 4.5:1 minimum
- **Status**: OPEN

---

## Quality Risks

### RISK-001: No authenticated E2E test coverage

- **Likelihood**: High (tests run without DATABASE_URL)
- **Impact**: High (CRUD operations untested end-to-end)
- **Mitigation**: Schema validation covers input boundaries; unit tests cover calculation logic; route protection tests verify auth redirect behavior
- **Resolution**: Set up test database seeding in CI or use Playwright auth state fixtures with a test user

### RISK-002: Floating-point money calculations

- **Likelihood**: Medium (Decimal.js is used consistently in app code)
- **Impact**: Critical (money math errors accumulate)
- **Mitigation**: Property-based tests verify Decimal.js precision invariants; balance tests use independent calculations
- **Resolution**: Continuous — ensure no `Number` arithmetic on money values enters the codebase

### RISK-003: Missing API-level validation tests

- **Likelihood**: Medium
- **Impact**: Medium (API could accept malformed data if Zod schema not applied)
- **Mitigation**: Schema boundary tests cover all Zod schemas; E2E tests verify redirect behavior
- **Resolution**: Add integration tests that POST to API endpoints with invalid data and verify 400 responses

### RISK-004: Cross-browser E2E runs only on main pushes

- **Likelihood**: Low (most issues caught by Chromium)
- **Impact**: Medium (Firefox/WebKit-specific bugs could reach users)
- **Mitigation**: Cross-browser job runs on every push to main; Playwright config includes mobile viewports
- **Resolution**: Consider running Firefox on PRs for critical paths

### RISK-005: Component test coverage minimal

- **Likelihood**: Medium
- **Impact**: Low (E2E tests cover rendered output; unit tests cover logic)
- **Mitigation**: vitest.config.component.ts is configured and ready; E2E covers auth form behavior
- **Resolution**: Add component tests for high-risk interactive components (committee forms, transaction forms)

### RISK-006: Service worker behavior untestable in Playwright

- **Likelihood**: Low
- **Impact**: Low (SW mostly handles caching, not critical business logic)
- **Mitigation**: sw.js accessibility verified; manifest validated; offline page confirmed
- **Resolution**: Manual testing or Puppeteer with real Chrome for SW lifecycle tests

### RISK-007: Rate limiting not tested end-to-end

- **Likelihood**: Low (rate-limit.ts exists and is used)
- **Impact**: Medium (brute force protection untested)
- **Mitigation**: Rate limiting code is imported in auth routes
- **Resolution**: Integration test that fires 11 rapid requests and verifies the 11th is rejected

---

## Risk Scoring

| Risk | Likelihood × Impact | Priority |
|---|---|---|
| RISK-001 | HIGH | P1 — First to address |
| RISK-002 | MEDIUM | P1 — Continuous vigilance |
| RISK-003 | MEDIUM | P2 |
| RISK-004 | LOW | P3 |
| RISK-005 | LOW | P3 |
| RISK-006 | LOW | P4 |
| RISK-007 | LOW | P3 |
