# FinKeep — Change Impact Log

> Records what changed, what tests were affected, and what regression was run.

## Format

Each entry records:
- **Date**: When the change was made
- **Change**: What was modified
- **Files touched**: Source files changed
- **Tests added/modified**: Test files affected
- **Regression result**: What was run and the outcome

---

## 2026-11-19 — SDET Automation Framework Implementation

### Change Summary
Complete test automation framework: 302 tests (234 unit + 68 E2E) covering financial calculations, schema validation, ledger operations, utilities, authentication, PWA, accessibility, and security.

### Source Files Modified
| File | Change |
|---|---|
| `vitest.config.ts` | Added `src/**/__tests__/**/*.test.ts` to include pattern |
| `playwright.config.ts` | Complete rewrite — 5 browser projects, enhanced reporters, timeouts |
| `package.json` | Added 12+ test scripts |
| `.gitignore` | Added coverage/, allure-*, *.har exclusions |
| `src/lib/calculations/__tests__/balance.test.ts` | Fixed stale mocks (amount/repayments → remainingAmount) |

### Test Files Added
| File | Tests | Category |
|---|---|---|
| `tests/unit/financial-invariants.test.ts` | 16 | Property-based financial calculations |
| `tests/unit/schemas-extended.test.ts` | 90 | Zod schema boundary testing |
| `tests/unit/ledger.test.ts` | 11 | Ledger find/delete/recalculate |
| `tests/unit/utils-extended.test.ts` | 28 | Utility function edge cases |
| `tests/e2e/auth.spec.ts` | 30 | Login, register, route protection |
| `tests/e2e/pwa.spec.ts` | 10 | Manifest, SW, offline, meta tags |
| `tests/e2e/accessibility.spec.ts` | 8 | axe-core scans, keyboard nav |
| `tests/e2e/security-headers.spec.ts` | 20 | Auth enforcement, API protection |

### Test Helpers Added
| File | Purpose |
|---|---|
| `tests/helpers/financial-assertions.ts` | Independent calculation verification |
| `tests/helpers/schema-factories.ts` | 11 entity type factories |
| `tests/helpers/test-ids.ts` | Semantic UI test-id constants |

### Infrastructure Added
| File | Purpose |
|---|---|
| `.github/workflows/ci.yml` | 5-job CI pipeline with artifact upload |
| `.claude/rules/finkeep-quality.md` | Claude Code quality enforcement rules |
| `CLAUDE.md` | Project-level quality requirements |

### QA Documentation Added
| File | Purpose |
|---|---|
| `docs/qa/APP_FEATURE_INVENTORY.md` | Full feature audit of 18 modules |
| `docs/qa/TEST_STRATEGY.md` | Test pyramid, philosophy, CI integration |
| `docs/qa/REQUIREMENT_TEST_TRACEABILITY.md` | REQ ↔ test mapping with gap analysis |
| `docs/qa/QUALITY_RISK_REGISTER.md` | 3 defects, 7 risks with mitigations |
| `docs/qa/TOOLING_AND_INSTALLATION.md` | Tool versions, scripts, installation |
| `docs/qa/TEST_RUNBOOK.md` | How to run every test type |
| `docs/qa/TEST_REPORTING.md` | Report locations, interpretation, results |
| `docs/qa/CHANGE_IMPACT_LOG.md` | This file |

### Defects Found
- FIN-BUG-0001: `formatCurrency(Infinity)` → corrupted string
- FIN-BUG-0002: PasswordInput toggle missing aria-label
- FIN-BUG-0003: Offline page color-contrast violation

### Pre-existing Bugs Fixed
- Balance test stale mocks: Tests used `{amount, repayments}` but code reads `loan.remainingAmount`
- `fc.float` 32-bit constraint: Replaced with `fc.double` for valid ranges

### Regression Result
```
Unit:  234 tests — 234 passed, 0 failed
E2E:    68 tests —  68 passed, 0 failed
Total: 302 tests — ALL PASSING
```

---

## Template for Future Entries

```markdown
## YYYY-MM-DD — Brief description

### Change Summary
What and why.

### Source Files Modified
| File | Change |

### Tests Added/Modified
| File | Tests | Category |

### Regression Result
Unit: X passed, Y failed
E2E: X passed, Y failed
```
