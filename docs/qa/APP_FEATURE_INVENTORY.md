# FinKeep — Application Feature Inventory

> Generated from source code audit on 2026-11-19. Update when features change.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.7 |
| UI | React 18, Radix UI, TailwindCSS, Recharts |
| Auth | NextAuth 4 (Credentials provider, JWT sessions) |
| Database | PostgreSQL via Prisma 6.1 |
| Validation | Zod 3.24 |
| Money math | Decimal.js (precision 20, DB column `Decimal(18,2)`) |
| PWA | Custom service worker (`public/sw.js`), Web App Manifest |
| Deployment | Vercel (finkeep-app.vercel.app) |

## Features by Module

### 1. Authentication & Sessions

| Feature | Route / File | Evidence |
|---|---|---|
| Login (credentials) | `/login` → `src/app/(auth)/login/page.tsx` | Email + password, NextAuth signIn |
| Registration | `/register` → `src/app/(auth)/register/page.tsx` | Name, email, password, confirm password, optional profile photo |
| Password visibility toggle | `src/components/ui/password-input.tsx` | Eye/EyeOff icons |
| Rate limiting | `src/lib/rate-limit.ts` | Per-IP (10 req/60s), per-email lockout (5 failures/15 min) |
| Session management | `src/lib/auth.ts`, `src/app/api/sessions/route.ts` | JWT strategy, 7-day max age, device tracking, session revocation |
| Profile photo | `src/app/api/profile-photo/route.ts` | Upload via API |
| Email verification | `src/app/api/auth/verify-email/route.ts` | Endpoint exists |
| Password reset | `src/app/api/auth/reset-password/route.ts` | Endpoint exists |
| Active sessions | `src/components/shared/active-sessions.tsx` | View/revoke sessions |
| Security middleware | `src/middleware.ts` | X-Frame-Options, CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy |

### 2. Accounts / Wallets

| Feature | Route / File | Evidence |
|---|---|---|
| List accounts | `/accounts` → `src/app/(dashboard)/accounts/page.tsx` | |
| Account detail | `/accounts/[id]` → `src/app/(dashboard)/accounts/[id]/page.tsx` | |
| Create/edit account | API: `src/app/api/accounts/route.ts`, `[id]/route.ts` | |
| Account types | CASH, BANK, WALLET, CREDIT_CARD, SAVINGS_ACCOUNT, OTHER | Schema enum |
| Opening balance | `Decimal(18,2)`, default 0, non-negative | |
| Currency | Default PKR, stored per account | |
| Shared accounts | `isShared` flag | |
| Balance calculation | `src/lib/calculations/balance.ts` | Opening + inflows − outflows |
| Soft deactivation | `isActive` flag | |

### 3. Transactions (Ledger)

| Feature | Route / File | Evidence |
|---|---|---|
| List transactions | `/transactions` → `src/app/(dashboard)/transactions/page.tsx` | |
| New transaction | `/transactions/new` → page.tsx | |
| Edit transaction | `/transactions/[id]/edit` → page.tsx | |
| 16 transaction types | INCOME, EXPENSE, TRANSFER, LOAN_GIVEN, LOAN_REPAYMENT_RECEIVED, LOAN_TAKEN, LOAN_REPAYMENT_MADE, COMMITTEE_CONTRIBUTION, COMMITTEE_RECEIVING, SAVINGS_DEPOSIT, SAVINGS_WITHDRAWAL, INVESTMENT, INVESTMENT_RETURN, PLOT_PAYMENT, SPORTS_FEE_RECEIVED, SPORTS_EXPENSE, OTHER | Schema enum |
| Soft delete | `isDeleted` / `deletedAt` | |
| Historical flag | `isHistorical` — excluded from balance | |
| Tax tracking | `taxAmount`, `taxPercent`, `expectedAmount` | |
| Privacy flag | `isPrivate` default true | |
| Attachments | `src/app/api/attachments/` | File upload/download per transaction |
| Ledger reconciliation | `src/lib/ledger.ts` | Link fields for loan/committee/savings/investment/plot/sports |

### 4. Loans & Repayments

| Feature | Route / File | Evidence |
|---|---|---|
| List loans | `/loans` → page.tsx | |
| Loan detail | `/loans/[id]` → page.tsx | |
| Create loan | API: `src/app/api/loans/route.ts` | |
| Loan directions | GIVEN (receivable), TAKEN (payable) | |
| Statuses | ACTIVE, SETTLED, WRITTEN_OFF, CANCELLED | |
| Remaining amount | `remainingAmount` — authoritative, recalculated on repayment changes | |
| Auto-settle | When remaining hits 0, status → SETTLED | |
| Auto-reopen | If auto-settled and repayment removed, status → ACTIVE | |
| Repayments | `src/app/api/loans/[id]/repayments/route.ts` | Nested CRUD |
| Interest rate | 0–100%, optional | |
| Due date | Optional, validated as today or future | |
| Outstanding receivables/payables | `getOutstandingReceivables()`, `getOutstandingPayables()` | Dashboard aggregation |

### 5. Committees (Normal & Waiyk)

| Feature | Route / File | Evidence |
|---|---|---|
| List committees | `/committees` → page.tsx | |
| Committee detail | `/committees/[id]` → page.tsx | |
| New committee | `/committees/new` → page.tsx | |
| Types | NORMAL, WAIYK (bidding-based) | |
| Statuses | ACTIVE, COMPLETED, CANCELLED | |
| Members | `src/app/api/committees/[id]/members/route.ts` | Name, person link, slots, isUser |
| Entries/slots | `CommitteeEntry` — user slots with isTaken tracking | |
| Rounds | `src/app/api/committees/[id]/rounds/route.ts` | Round number, date, winning bid (Waiyk) |
| Contributions | `src/app/api/committees/[id]/contributions/route.ts` | Expected vs actual, profit deduction |
| Receivings | `src/app/api/committees/[id]/receivings/route.ts` | Payout tracking |
| Waiyk profit calculation | `src/lib/calculations/waiyk.ts` | profitTotal, profitPerSlot, adjustedPayment, memberProfit, remainingDues |
| Contributions section UI | `src/components/committees/ContributionsSection.tsx` | |

### 6. Savings Goals

| Feature | Route / File | Evidence |
|---|---|---|
| List savings | `/savings` → page.tsx | |
| Savings detail | `/savings/[id]` → API route | |
| Create goal | API: `src/app/api/savings/route.ts` | Name, target amount, target date |
| Transactions | `src/app/api/savings/[id]/transactions/route.ts` | DEPOSIT, WITHDRAWAL |
| Progress tracking | Target amount vs deposited − withdrawn | |

### 7. Investments

| Feature | Route / File | Evidence |
|---|---|---|
| List investments | `/investments` → page.tsx | |
| Investment detail | `/investments/[id]` → API route | |
| Types | stocks, property, business, mutual_fund, gold, crypto, other | Free text |
| Profit/loss recording | `src/app/api/investments/[id]/profit/route.ts` | Gross, tax, net amounts |
| Close investment | `src/app/api/investments/[id]/close/route.ts` | Return amount with tax |
| Historical flag | Tracking-only investments | |

### 8. Plots / Property

| Feature | Route / File | Evidence |
|---|---|---|
| List plots | `/plots` → page.tsx | |
| Plot detail | `/plots/[id]` → API route | |
| Payments | `src/app/api/plots/[id]/payments/route.ts` | Amount, date, due date |
| Total price tracking | `Decimal(18,2)` | |

### 9. Financial Targets

| Feature | Route / File | Evidence |
|---|---|---|
| List targets | `/targets` → page.tsx | |
| Target types | MAX_EXPENSE, MAX_TOTAL_EXPENSE, MIN_SAVINGS, MIN_INCOME, CUSTOM | |
| Month/year scoping | month 1–12, year 2020–2100 | |
| Category-specific | Optional categoryId for category-level targets | |

### 10. People / Contacts

| Feature | Route / File | Evidence |
|---|---|---|
| List people | `/people` → page.tsx | |
| Person detail | `/people/[id]` → page.tsx | |
| Fields | Name, phone (validated), email, relationship, notes | |
| Linked user | Optional `linkedUserId` for registered-user linking | |

### 11. Categories

| Feature | Route / File | Evidence |
|---|---|---|
| List categories | `/categories` → page.tsx | |
| Category detail | `/categories/[id]` → page.tsx | |
| Groups | INCOME, EXPENSE | |
| System categories | `isSystem` flag, null userId | |
| Icon support | Optional icon field | |

### 12. Sports Management

| Feature | Route / File | Evidence |
|---|---|---|
| Sports page | `/sports` → page.tsx | |
| Teams | `src/app/api/sports/teams/route.ts` | Name, sport (default Cricket) |
| Team detail | `/sports/teams/[id]` → page.tsx | |
| Players | `src/app/api/sports/teams/[id]/players/route.ts` | Name, person link, role, matchFee |
| Matches | `src/app/api/sports/matches/route.ts` | Opponent, venue, date |
| Match detail | `/sports/matches/[id]` → page.tsx | |
| Match expenses | `src/app/api/sports/matches/[id]/expenses/route.ts` | Description, amount, account |
| Match fees | `src/app/api/sports/matches/[id]/fees/route.ts` | Per-player fee tracking, paid status |

### 13. Dashboard & Reports

| Feature | Route / File | Evidence |
|---|---|---|
| Dashboard | `/dashboard` → page.tsx with layout | Summary cards, charts |
| Dashboard API | `src/app/api/dashboard/route.ts` | Aggregated data |
| Reports | `/reports` → page.tsx | |
| Reports API | `src/app/api/reports/route.ts` | |

### 14. Search

| Feature | Route / File | Evidence |
|---|---|---|
| Search page | `/search` → page.tsx | |
| Search API | `src/app/api/search/route.ts` | Query parameter `q` |

### 15. Settings

| Feature | Route / File | Evidence |
|---|---|---|
| Settings page | `/settings` → page.tsx | |
| Settings API | `src/app/api/settings/route.ts` | |
| Theme toggle | `src/components/shared/theme-toggle.tsx` | next-themes |

### 16. Shared Access

| Feature | Route / File | Evidence |
|---|---|---|
| Share resources | `src/app/api/shared-access/route.ts` | |
| Access levels | VIEW, EDIT, ADMIN | |
| Shared access UI | `src/components/shared-access/SharedAccessSection.tsx` | |

### 17. PWA

| Feature | File | Evidence |
|---|---|---|
| Manifest | `public/manifest.json` | name, icons (72–512px + maskable), standalone display |
| Service worker | `public/sw.js` | Custom SW, versioned via `sw-version.js` |
| Offline page | `public/offline.html` | Fallback page |
| Install prompt | `src/hooks/use-pwa-install.ts`, `src/components/shared/pwa-install.tsx` | |
| Icons | 8 sizes + 8 maskable variants | |

### 18. Cross-cutting

| Feature | File | Evidence |
|---|---|---|
| Pakistani currency formatting | `src/lib/utils.ts` | Lakh/crore grouping (Rs. 1,23,456.00) |
| Short currency (Lac/Cr) | `formatCurrencyShort()` | Dashboard cards |
| Pagination | `src/components/shared/list-pagination.tsx` | |
| Confirmation dialogs | `src/hooks/use-confirm.tsx` | |
| Toast notifications | `src/hooks/use-toast.ts`, Radix Toast | |
| Photo upload | `src/components/shared/photo-upload.tsx` | |
| Form field component | `src/components/forms/FormField.tsx` | |
| Advanced sections | `src/components/forms/AdvancedSection.tsx` | |
| Error boundaries | `src/app/(dashboard)/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx` | |
| Image utilities | `src/lib/image-utils.ts`, `src/lib/photo-validation.ts` | |
| User agent parsing | `src/lib/user-agent.ts` | |

## Data Models (Prisma)

20 models: User, UserSession, SharedAccess, Account, Category, Person, Transaction, Attachment, Loan, LoanRepayment, Committee, CommitteeMember, CommitteeEntry, CommitteeRound, CommitteeContribution, CommitteeReceiving, SavingsGoal, SavingsTransaction, Investment, Plot, PlotPayment, FinancialTarget, SportsTeam, SportsPlayer, SportsMatch, SportsExpense, SportsMatchFee.

## API Routes Summary

~40 API route files under `src/app/api/`, covering CRUD for all models plus specialized operations (profit recording, investment closing, loan repayment, committee rounds, sports fees).
