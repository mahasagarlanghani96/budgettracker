# FinKeep — Test Reporting

> Report formats, locations, and interpretation guide.

## Report Locations

| Report | Format | Location | When Generated |
|---|---|---|---|
| Unit test results | Terminal output | stdout | Every `npm run test:unit` |
| Unit coverage | Istanbul/V8 | `coverage/` | `npm run test:coverage` |
| Playwright HTML | Interactive HTML | `playwright-report/` | Every E2E run |
| Playwright JSON | Machine-readable | `test-results/results.json` | CI only |
| Playwright JUnit | XML | `test-results/junit.xml` | CI only |
| Screenshots | PNG | `test-results/` | On test failure |
| Videos | WebM | `test-results/` | On first retry (CI) |
| Traces | Zip | `test-results/` | On first retry (CI) |

## Test Execution Summary (2026-11-19)

### Unit Tests: 234 passing

| Suite | File | Tests | Status |
|---|---|---|---|
| Financial invariants | `tests/unit/financial-invariants.test.ts` | 16 | ALL PASS |
| Schema boundaries | `tests/unit/schemas-extended.test.ts` | 90 | ALL PASS |
| Ledger operations | `tests/unit/ledger.test.ts` | 11 | ALL PASS |
| Utility functions | `tests/unit/utils-extended.test.ts` | 28 | ALL PASS |
| Balance calculations | `src/lib/calculations/__tests__/balance.test.ts` | 12+ | ALL PASS |
| Other existing | various | ~77 | ALL PASS |

### E2E Tests: 68 passing (Chromium)

| Suite | File | Tests | Status |
|---|---|---|---|
| Auth flows | `tests/e2e/auth.spec.ts` | 30 | ALL PASS |
| PWA compliance | `tests/e2e/pwa.spec.ts` | 10 | ALL PASS |
| Accessibility | `tests/e2e/accessibility.spec.ts` | 8 | ALL PASS |
| Security headers | `tests/e2e/security-headers.spec.ts` | 20 | ALL PASS |

### Total: 302 tests — 302 passing, 0 failing

## Reading the Playwright HTML Report

```bash
npx playwright show-report
```

The report shows:
1. **Summary bar**: Total passed/failed/skipped per project
2. **Test list**: Expandable tree by spec file → describe → test
3. **Timeline**: Duration per test
4. **Failure details**: Screenshot + trace download for failed tests
5. **Retry attempts**: Shows each retry with its own screenshot

### Filtering
- Click a project name (chromium/firefox/webkit) to filter
- Use search to find specific FIN-QA IDs
- Click "Failed" tab to see only failures

## Reading Vitest Output

Vitest prints:
```
✓ tests/unit/financial-invariants.test.ts (16 tests) 342ms
✓ tests/unit/schemas-extended.test.ts (90 tests) 156ms
✓ tests/unit/ledger.test.ts (11 tests) 89ms
✓ tests/unit/utils-extended.test.ts (28 tests) 112ms
```

Property-based test failures include the shrunk counterexample and seed for reproduction.

## CI Artifact Retention

All CI artifacts are retained for **14 days**:
- `unit-test-results` — Vitest output
- `playwright-report` — HTML report from Chromium E2E
- `e2e-test-results` — Screenshots, videos, traces
- `cross-browser-report` — Firefox + WebKit results (main only)

## Defect Tracking

Defects found during testing are tracked in `docs/qa/QUALITY_RISK_REGISTER.md` with IDs `FIN-BUG-XXXX`:
- FIN-BUG-0001: formatCurrency(Infinity) corrupted output — Low severity
- FIN-BUG-0002: PasswordInput missing aria-label — Critical a11y
- FIN-BUG-0003: Offline page color contrast — Medium a11y
