# FinKeep — Requirement ↔ Test Traceability Matrix

> Generated 2026-11-19. Update when adding features or tests.

## Legend

- **REQ**: Requirement / feature area
- **Test ID**: FIN-QA-XXXX identifier
- **File**: Test file location
- **Coverage**: FULL (all paths tested), PARTIAL (key paths), STUB (framework only)

---

## Financial Calculations

| REQ | Description | Test IDs | File | Coverage |
|---|---|---|---|---|
| Balance formula | opening + inflows − outflows | FIN-QA-0001 | `tests/unit/financial-invariants.test.ts` | FULL |
| Balance cross-check | App vs independent calc | FIN-QA-0002 | `tests/unit/financial-invariants.test.ts` | FULL |
| Balance with existing loans | Outstanding receivables add to balance | FIN-QA-0001 | `src/lib/calculations/__tests__/balance.test.ts` | FULL |
| Waiyk profit conservation | profit + bid = total | FIN-QA-0003 | `tests/unit/financial-invariants.test.ts` | FULL |
| Waiyk per-slot profit | profitPerSlot × totalSlots = profitTotal | FIN-QA-0003 | `tests/unit/financial-invariants.test.ts` | FULL |
| Waiyk adjusted payment | adjusted + profit = contribution | FIN-QA-0003 | `tests/unit/financial-invariants.test.ts` | FULL |
| Loan remaining non-negative | Never goes below 0 | FIN-QA-0004 | `tests/unit/financial-invariants.test.ts` | FULL |
| Loan remaining dues | remainingDues calculation | FIN-QA-0004 | `tests/unit/financial-invariants.test.ts` | FULL |
| Decimal precision | Repeating decimals, tiny/huge amounts | FIN-QA-0005–0006 | `tests/unit/financial-invariants.test.ts` | FULL |

## Schema Validation

| REQ | Description | Test IDs | File | Coverage |
|---|---|---|---|---|
| Registration schema | Name 2–100, email, password 8–72, confirm match | FIN-QA-0010–0011 | `tests/unit/schemas-extended.test.ts` | FULL |
| Transaction schema | 15 types, amount > 0, description ≤ 500 | FIN-QA-0012–0013 | `tests/unit/schemas-extended.test.ts` | FULL |
| Account schema | 6 types, opening balance ≥ 0, notes ≤ 500 | FIN-QA-0014 | `tests/unit/schemas-extended.test.ts` | FULL |
| Loan schema | Interest 0–100%, direction enum | FIN-QA-0015 | `tests/unit/schemas-extended.test.ts` | FULL |
| Committee schema | NORMAL/WAIYK, members 2–100, contribution > 0 | FIN-QA-0016 | `tests/unit/schemas-extended.test.ts` | FULL |
| Savings goal schema | Target > 0, target date | FIN-QA-0017 | `tests/unit/schemas-extended.test.ts` | FULL |
| Investment schema | Amount > 0, notes ≤ 1000 | FIN-QA-0018 | `tests/unit/schemas-extended.test.ts` | FULL |
| Plot schema | Total price > 0, area | FIN-QA-0019 | `tests/unit/schemas-extended.test.ts` | FULL |
| Target schema | 5 types, month 1–12, year 2020–2100 | FIN-QA-0020 | `tests/unit/schemas-extended.test.ts` | FULL |
| Person schema | Name 2–100, phone, email, relationship | FIN-QA-0021 | `tests/unit/schemas-extended.test.ts` | FULL |
| Category schema | Name 2–50, INCOME/EXPENSE group | FIN-QA-0022 | `tests/unit/schemas-extended.test.ts` | FULL |
| Sports schema | Team name, match fields | FIN-QA-0023 | `tests/unit/schemas-extended.test.ts` | FULL |

## Ledger Operations

| REQ | Description | Test IDs | File | Coverage |
|---|---|---|---|---|
| Find ledger entry | Linked match, unlinked fallback, null when missing | FIN-QA-0030 | `tests/unit/ledger.test.ts` | FULL |
| Soft delete entry | Marks deleted, no-op when missing | FIN-QA-0031 | `tests/unit/ledger.test.ts` | FULL |
| Recalculate loan | Auto-settle, partial, reopen, floor-at-zero | FIN-QA-0032 | `tests/unit/ledger.test.ts` | FULL |

## Utility Functions

| REQ | Description | Test IDs | File | Coverage |
|---|---|---|---|---|
| formatCurrency | PKR formatting, Decimal.js objects, edge cases | FIN-QA-0040–0043 | `tests/unit/utils-extended.test.ts` | FULL |
| formatCurrencyShort | Lakh/crore thresholds | FIN-QA-0044 | `tests/unit/utils-extended.test.ts` | FULL |
| formatEnum | Enum display formatting | FIN-QA-0046 | `tests/unit/utils-extended.test.ts` | FULL |
| formatDate/DateTime | Date formatting | FIN-QA-0047 | `tests/unit/utils-extended.test.ts` | FULL |
| cn utility | Tailwind class merging | FIN-QA-0050 | `tests/unit/utils-extended.test.ts` | FULL |
| generateId | Uniqueness guarantee | FIN-QA-0051 | `tests/unit/utils-extended.test.ts` | FULL |
| getDateRange | Week/month/year ranges | FIN-QA-0054 | `tests/unit/utils-extended.test.ts` | FULL |

## Authentication & Security

| REQ | Description | Test IDs | File | Coverage |
|---|---|---|---|---|
| Login form | Fields, validation, toggle, autocomplete | FIN-QA-0100 | `tests/e2e/auth.spec.ts` | FULL |
| Registration form | All fields, 5 validation rules | FIN-QA-0105 | `tests/e2e/auth.spec.ts` | FULL |
| Route protection | 15 protected routes redirect | FIN-QA-0110 | `tests/e2e/auth.spec.ts` | FULL |
| API auth enforcement | 15 API endpoints reject unauth | FIN-QA-0400 | `tests/e2e/security-headers.spec.ts` | PARTIAL |
| Auth API endpoints | Register, providers, CSRF, session | FIN-QA-0410 | `tests/e2e/security-headers.spec.ts` | PARTIAL |

## PWA

| REQ | Description | Test IDs | File | Coverage |
|---|---|---|---|---|
| Manifest validity | Schema, icons, display mode | FIN-QA-0200 | `tests/e2e/pwa.spec.ts` | FULL |
| Icon sizes | 192x192, 512x512, maskable | FIN-QA-0200 | `tests/e2e/pwa.spec.ts` | FULL |
| Service worker | Accessible, registered | FIN-QA-0205 | `tests/e2e/pwa.spec.ts` | PARTIAL |
| Offline page | Available at /offline.html | FIN-QA-0210 | `tests/e2e/pwa.spec.ts` | FULL |
| Meta tags | theme-color, manifest link, apple-touch-icon | FIN-QA-0213 | `tests/e2e/pwa.spec.ts` | FULL |

## Accessibility

| REQ | Description | Test IDs | File | Coverage |
|---|---|---|---|---|
| Login page axe scan | WCAG 2.1 AA | FIN-QA-0300 | `tests/e2e/accessibility.spec.ts` | FULL |
| Registration axe scan | WCAG 2.1 AA | FIN-QA-0305 | `tests/e2e/accessibility.spec.ts` | FULL |
| Label associations | htmlFor + id | FIN-QA-0300 | `tests/e2e/accessibility.spec.ts` | FULL |
| Keyboard navigation | Tab order, focus management | FIN-QA-0310 | `tests/e2e/accessibility.spec.ts` | PARTIAL |
| Offline page a11y | Minimal violations | FIN-QA-0315 | `tests/e2e/accessibility.spec.ts` | FULL |

## Cross-cutting

| REQ | Description | Test IDs | File | Coverage |
|---|---|---|---|---|
| Currency (PKR) display | Lakh/crore grouping | FIN-QA-0040–0044 | `tests/unit/utils-extended.test.ts` | FULL |
| Money math precision | Decimal.js, never float | FIN-QA-0005–0006 | `tests/unit/financial-invariants.test.ts` | FULL |

---

## Untested Areas (Gaps)

| Area | Reason | Priority |
|---|---|---|
| Authenticated CRUD flows | No database in test env | HIGH — add when DB seeding available |
| Dashboard charts rendering | Requires authenticated session + data | MEDIUM |
| Transaction creation flow | Full E2E with database | HIGH |
| Committee round management | Complex multi-step flow | MEDIUM |
| File upload/attachment | External storage dependency | LOW |
| Real-time session management | Multi-device test setup | LOW |
| Email verification flow | Email service dependency | LOW |
