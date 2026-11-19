# FinKeep — Enterprise SDET Automation & Continuous Quality Engineering

> **Instructions for Claude Code:** Open the FinKeep repository root in Claude Code, add this file at `docs/qa/FINKEEP_SDET_AUTOMATION_MASTER_PROMPT.md`, and then tell Claude Code: **"Execute the instructions in `docs/qa/FINKEEP_SDET_AUTOMATION_MASTER_PROMPT.md` against this repository. Inspect first, then implement and verify. Do not stop at a plan."**
>
> This is an execution brief, not an assertion that the framework already exists. You must inspect the actual code, install appropriate dependencies, implement tests/workflows, run them, and report factual results. Never claim that you executed or installed something unless you did.

## 1. Role and non-negotiable mission

Act as FinKeep's **Principal SDET, Quality Architect, PWA Test Specialist, DevSecOps Engineer, and CI/CD Owner**, applying standards appropriate for a financial/budget-tracking application. Design, build, execute, validate, document, and continuously maintain a production-grade automation framework **inside the existing FinKeep repository**. Think like an engineer who is accountable for detecting defects before release, rather than an engineer trying to maximize passing-test counts.

The objective is the broadest *defensible* automated verification of FinKeep's real requirements, behavior, code, and risks: UI/UX, functional, nonfunctional, business calculations, positive/negative/boundary tests, APIs, integration, contract, workflows, end-to-end, system, regression, security, accessibility, PWA/offline, performance, reliability, compatibility, installation, unit, and component tests. Discover and test every implemented feature and state; do **not** pretend undiscovered or nonexistent features are present.

**Coverage truth policy:** No testing approach can honestly promise to exercise every conceivable state, data combination, device, browser version, environmental failure, or future defect. Do not claim "100% bug-free" or "all possible scenarios covered." Aim for **100% traceability of discovered requirements and critical business invariants**, ambitious verified code coverage, high mutation-test strength, and explicit documentation of residual risks and uncovered cases. Quality and meaningful assertions matter more than the number of tests. Never manufacture millions of duplicate/no-op cases just to increase totals.

**Execution, not just documentation:** After auditing the repository, actively implement the framework and begin writing/running real tests. If the work is too large for one run, deliver verified functionality in prioritized increments and leave an exact status and actionable backlog. Do not stop after delivering a proposal. Do not promise background work or claim that the AI stays running automatically; CI, hooks, and scripts provide automation between Claude Code sessions.

## 2. Understand the real app before making assumptions

Start with a thorough, read-only reconnaissance of the existing repository:

1. Inspect README, product docs, feature descriptions, changelog, source code, route and component structure, forms, validation, state management, authentication/authorization, database schema and migrations, ORM/query layer, API functions/routes, middleware, serverless functions, configuration, PWA manifest, service workers, caching/storage, import/export, and deployment configuration.
2. Inspect package-manager and runtime versions (`package.json`, lockfile, runtime configuration), existing test runners/test directories, CI/CD pipelines, lint/typecheck/build scripts, environment variable examples, deployment provider, and existing instrumentation. Respect the project's existing stack, package manager, conventions, and workflows. Do not migrate frameworks unnecessarily.
3. Identify each implemented FinKeep feature and subfeature by walking the actual UI and tracing frontend-to-backend data flows. Review responsive layouts, loading/error/empty states, form constraints, navigation, user/session flows, PWA capabilities, stored data, generated reports, and all available settings. Test production-like behavior against a safe dedicated test environment.
4. Identify which functionality is client-only, server-backed, third-party-dependent, or not yet implemented. Distinguish intended requirements from observed behavior and potential defects. Do not define incorrect behavior as "expected" just because the existing UI does it.
5. Determine whether FinKeep uses a hosted database or authentication provider, whether it has user-level data isolation, whether it supports multi-currency, and whether sensitive financial data or personally identifiable information is handled. Do not infer answers.
6. Run existing install/check/build/test commands safely to determine the baseline; capture their **actual exit codes and results**, existing failures, and constraints. Avoid changing production databases or accounts.

Create and continuously update:

- `docs/qa/APP_FEATURE_INVENTORY.md` — real features, pages, forms, data models, APIs, business rules, dependencies, and implementation evidence.
- `docs/qa/TEST_STRATEGY.md` — scope, test pyramid, suite types, priorities, risk, environments, devices, browsers, thresholds, and exclusions.
- `docs/qa/REQUIREMENT_TEST_TRACEABILITY.md` — feature/requirement → risk → test IDs → layers → last result → uncovered gaps.
- `docs/qa/QUALITY_RISK_REGISTER.md` — unsupported, uncertain, deferred, flaky, manually tested, or uncovered risks, with owners and next action.

If business rules are ambiguous, inspect their code and related docs, create a documented assumption for verification, and mark ambiguities as `NEEDS_PRODUCT_CONFIRMATION`. Do not silently invent requirements.

## 3. Architecture: choose tools based on the actual stack

Prefer **TypeScript-first** automation if FinKeep is a JavaScript/TypeScript PWA, while preserving any well-established existing language/tooling. Select only needed tools; avoid overlapping frameworks and unnecessary dependencies. Justify selections in `docs/qa/TOOLING_AND_INSTALLATION.md`.

Candidate tooling, conditional on repository fit:

| Purpose | Preferred approach | Decision rule |
|---|---|---|
| Browser UI, cross-browser, E2E, PWA | Playwright Test | Preferred for web PWA; run Chromium, Firefox, WebKit where technically compatible; mobile viewport/touch emulation and real-device follow-up |
| Unit and component | Existing runner, otherwise Vitest + supported component testing library | Avoid duplicate runner and preserve framework ecosystem |
| API/integration | Playwright APIRequestContext, current runner, and isolated integration DB | Test real contracts/business logic with deterministic fixtures |
| Accessibility | `@axe-core/playwright`, keyboard/focus/screen-reader-assisted manual checklist | Automated axe checks cannot prove all accessibility requirements |
| Visual regression | Playwright screenshot assertions | Baseline review/approval; stable fonts, viewport, animations and data |
| Property/model-based | `fast-check` | Financial invariants, decimals, stateful sequences, boundary generation |
| Mutation quality | StrykerJS when compatible | Prove tests detect wrong code, not merely run it |
| Web quality/performance | Lighthouse CI and application instrumentation | Use repeatable budgets and historical trends; recognize CI variance |
| API/load/soak | k6 or existing compatible performance tool | Safe test-only endpoints, defined load profiles and budgets |
| Static security & supply chain | Existing SAST/CodeQL/Semgrep, dependency audit, secrets scanning | Follow platform/language fit; avoid duplicate pipelines |
| Dynamic security | OWASP ZAP **baseline/passive** scan | Only on authorized local/isolated test instances; active attacks require separate authorization |
| Reporting | Playwright HTML + JSON/JUnit + readable custom CI summary; optional Allure if justified | Reports must include verifiable expected/actual evidence, not just raw counts |
| CI/CD | Existing CI provider; GitHub Actions if repository hosted on GitHub | PR/push gates, scheduled deep suites, build artifacts, branch protection guidance |

Verify official documentation and current compatible versions **at implementation time**. Pin/reproducibly resolve versions in the lockfile; do not paste unverified "latest" versions. Prefer built-in capabilities over dependency inflation. Keep tests in clearly separated directories (adapt as necessary): `tests/unit`, `tests/component`, `tests/api`, `tests/integration`, `tests/contract`, `tests/e2e`, `tests/pwa`, `tests/accessibility`, `tests/visual`, `tests/security`, `tests/performance`, with reusable `fixtures`, `factories`, `helpers`, and `reporters`.

Use typed models, robust fixtures, central config, semantic selectors (`getByRole`, `getByLabel`, stable test IDs where warranted), reusable but thin page/feature objects, consistent test isolation, and data factories. Do not build an overengineered abstraction that hides what an assertion is validating.

## 4. Exhaustive test design — discover, enumerate, and prioritize

**For every discovered feature, page, API, data entity, user action, and important state**, enumerate and automate applicable cases across these dimensions. Maintain positive, negative, boundary, and state-transition scenarios. If a dimension cannot be automated reliably, record why and the manual/device follow-up.

### 4A. Functional UI and UX

- Navigation, links, routing, back/forward, deep links, browser refresh, page titles, active states, breadcrumbs, modals/drawers, nested menus, keyboard shortcuts, dialogs, confirmations, notifications/toasts, pagination, filters, sorting, search, graphs, dashboards, totals, tooltips, date pickers, dropdowns, select controls, tables, and forms **if they exist**.
- Inputs: required vs optional; valid/invalid/empty/whitespace-only; leading/trailing spaces; min/max; exact boundaries; very long values; special/Unicode characters; pasted values; numeric signs; decimal separators; duplicate submissions; rapid multi-click; invalid state; disabled/enabled; dirty/unsaved changes; cancel/reset; success/error feedback; preservation of data after validation failure.
- Every loading, empty, success, warning, failure, no-permission, not-found, offline, stale-data, and recovery state. Avoid only testing the sunny-day flow.
- Responsive behavior at meaningful breakpoints; mobile touch, scrolling, keyboard overlap, safe areas, orientation if supported; contrast, spacing, text clipping, overflow, alignment, overlay order, tap targets, focus and hover behavior.
- Accessibility to the degree automatable: axe/WCAG 2.2 AA-oriented checks where supported, full keyboard paths, focus order and trapping, visible focus, labels/names, error identification, accessible status updates, zoom/reflow, motion reduction and contrast. Maintain a manual screen-reader checklist and do not equate zero axe violations with full WCAG compliance.
- Visual regression for stable critical screens and states, with reviewed golden baselines. Avoid silently accepting new snapshots.
- Browser compatibility on supported Chromium/Firefox/WebKit; explicitly label browser engine emulation vs actual installed Chrome/Edge/Safari/mobile devices. Do not misrepresent emulator results as real-device results.

### 4B. FinKeep's financial/domain correctness — CRITICAL

Inspect FinKeep's real business logic. Where implemented, test:

- Amount creation/edit/delete, credits vs debits, transaction type, category assignment, dates, balances, summary cards, budget allocations, available-to-spend, expense totals, planned vs actual, rollover, recurring budgets/transactions, savings goals, limits/alerts, imports/exports, charts, filtering/grouping, and account transfers; **only create test suites for features that exist**.
- Mathematical invariants across every relevant operation: totals consistent across list/detail/dashboard/analytics/export/database/API; recalculation after edits/deletes/undo; no phantom/double charges; stable rounding and fractional-unit precision; negative/zero/large amounts; extremely small decimals; integer overflow; unexpected NaN/Infinity; currency conversions only if supported; no double-counting between date ranges/categories/accounts; no accidental mutability or stale derived totals.
- Independently derived, auditable expected values rather than copying app-calculated outputs back into tests. For example, if an implementation supports two expenses of 125.50 and 74.25 in one budget, independently assert 199.75 spent and the correct remaining amount based on the configured budget. Use the app's actual currency, precision, and business rules; money calculations should use appropriate decimal/integer-minor-unit logic, not unsafe binary floating-point assumptions.
- Boundaries and time: month-end/year-end, leap days, timezone changes, DST when relevant, user locale and calendar behavior, date filtering inclusive/exclusive rules, events exactly at midnight, backdated entries, future dates, and recurring scheduling if supported.
- Data consistency: duplicate requests, network retries, optimistic UI rollback, eventual consistency, offline writes and sync conflicts, simultaneous sessions/tabs, atomicity, idempotency, partial failures, persistence after reload, reload during mutations, and multi-user isolation.
- If an import/export/backup/restore feature exists: schema/version compatibility, round-trip equality, malformed files, duplicate records, CSV injection safeguards, escaping/encoding, huge files, unexpected rows, partial imports, and integrity checks.

**Financial correctness, privacy, permissions, and durable persistence are release-blocking areas.** Prioritize these even if decorative UI tests remain uncovered.

### 4C. API, contracts, integration, unit, and system

- Unit tests for utilities, validators, reducers, services, hooks, calculations, date/amount formatting, state transitions, parsers, and custom business logic.
- Component tests for rendering, all prop/state variants, semantic interaction, validation, failure handling, accessibility, and dependency boundaries.
- API tests for every existing endpoint/method/status: payload schemas, authentication, authorization, ownership, CRUD invariants, duplicate/idempotent operations, numeric/date edge cases, pagination/filter/sort, error codes/messages, malformed payloads, rate limits where present, and meaningful response-time budget checks.
- Contract and integration tests for actual browser ↔ API ↔ backend ↔ database paths, schema/migration compatibility, remote-service fallbacks, data integrity, and transaction/rollback behaviors.
- True E2E tests for highest-value real-user workflows against an isolated seeded test backend. Reserve mocks for narrowly scoped failure simulation and unit/component testing. Never present an entirely mocked workflow as real integration coverage.
- Property-based and model-based tests for invariants and long state-transition sequences; preserve random seeds and minimal failing counterexamples. Mutation tests on calculation/validation/auth logic to reveal missing assertions.
- Negative and adversarial use cases: rapid repeated submissions, invalid navigation, interrupted writes, duplicate IDs, empty datasets, partial outages, stale auth, expired session, corrupt local state, and inconsistent server responses.

### 4D. PWA, reliability, compatibility, and offline

- Validate manifest, installability requirements, icons, display modes, start URL, scope, appropriate service-worker registration and lifecycle, navigation and asset caching, cache invalidation, update prompts, post-update state, offline launch, offline browsing, allowed/blocked offline writes, reconnection, queue replay/sync only if supported, stale-version behavior, and preservation of finance data across app version upgrades.
- Verify network drops during requests, high latency, throttling, intermittent connectivity, repeated reconnect, app reload and tab closure, browser storage constraints, storage errors/corruption, cookies/session persistence, cross-tab data consistency, and expected fallback UI.
- Remember: service workers can affect request interception. Run PWA behavior tests with real service workers enabled and use separate request-mocking configurations where service workers must be blocked; document the distinction.
- Test realistic mobile/touch responsive behavior in automated emulation, then maintain a clearly labelled manual test checklist for platform/browser-specific native PWA install prompts, push notifications, background behavior, storage eviction, and iOS/Android differences that cannot be proven in normal CI browsers.

### 4E. Security and privacy (strict authorization and isolation)

- Static and dependency checks, secret detection, injection-safety validation, unsafe rendering/XSS checks, authentication/authorization boundaries, user-to-user data separation/IDOR prevention, session expiry, data exposure, input validation, insecure configuration, cookie/security headers, transport expectations, sensitive information in error logs, client bundles and caches, CSRF where relevant, API rate limiting where configured, and safe export/download handling.
- If the app uses a managed backend/database with row-level access controls, write negative authorization tests proving that user A cannot read, mutate, export, or enumerate user B's data. Use two disposable test identities and separate authorization contexts.
- Run **passive** ZAP baseline checks only on local, owned, or explicitly approved isolated testing environments. Do not launch active scanning, exploit payloads, brute force, fuzz destructive production endpoints, or scan third-party providers without separate authorization.
- Prevent leaks of tokens, emails, passwords, bank information, financial datasets, and connection strings in logs, artifacts, videos, HAR files, traces, PR comments, screenshots, or test fixtures. Sanitize and redact. No production data should be copied into tests or public dashboards.
- Track findings by severity and evidence; do not label a potential vulnerability verified without a reproducer.

### 4F. Nonfunctional performance and operational quality

- Lighthouse CI on key pages/views under controlled conditions; collect performance metrics, accessibility/web quality signals, and trends. Establish measurable thresholds from a justified baseline and product goals; avoid arbitrary universal claims and account for CI noise.
- Measure initial route load, interaction responsiveness, key workflow latency, heavy lists/charts, memory growth, resource size, network utilization, offline cache cost, JS errors, web vitals where meaningful, and progressive degradation on lower-end emulation.
- Load/stress/spike/soak tests against an authorized, disposable environment only; defined traffic profile, p50/p95/p99 where appropriate, error rates, throughput, bottleneck evidence, and cleanup. Keep aggressive tests outside production and separate slower deep-load suites from normal push gates if runtime makes that necessary; never conceal that separation.
- Reliability: retry/idempotency, recovery after backend errors, corrupt data handling, reconnect storms, data loss and reconciliation, timeouts, and safe observability.

## 5. Test case model and traceability

Every meaningful automated scenario must have a persistent ID (`FIN-QA-0001`, etc.), discoverable feature/requirement, test layer, category, test type, priority (`P0`/`P1`/`P2`), expected behavior, test data/preconditions, observed verification/assertions, and a source file link. Use tags so test runs can be filtered by `smoke`, `regression`, `critical`, `unit`, `api`, `e2e`, `pwa`, `a11y`, `security`, `performance`, `positive`, `negative`, `boundary`, etc. Tag conventions must match actual runner support. Do not multiply one scenario into dozens of empty wrapper tests.

For each feature and changed code area, maintain a **traceability matrix** identifying:

- Requirement/business rule or screen/endpoint and its implementation location.
- The risk and business criticality.
- Positive, negative, boundary, state-transition, accessibility, security, and integration tests that apply.
- Unique test IDs/links, current automation/manual status, last executed commit/build, and evidence link.
- Known coverage gaps, limitations, and next steps.

Prioritize **P0 money correctness, ownership/auth, data durability, and essential end-to-end flows**. Establish meaningful statement/branch/function coverage targets from baseline, with progressively stronger gates, including near-total critical business-logic coverage where practical. Declare denominators and exclusions. Do not represent 100% line coverage as 100% behavioral assurance.

## 6. Test determinism and evidence integrity

- Provide dedicated testing environment, seeded/disposable users, isolated data per worker, reset/cleanup between tests, reproducible database fixtures/migrations, reliable clock control, and explicit management of external dependencies. Do not test using actual customer financial data.
- Avoid `waitForTimeout`/arbitrary sleeps, brittle CSS selectors, execution-order dependence, shared accounts, hardcoded secrets, unconditional retries, or swallowing exceptions. Use semantic waits and precise assertions.
- Use parallelism and sharding *only after* isolation is correct. Quarantine flaky tests visibly with issue reference, owner, impact, and resolution deadline; never silently skip, auto-fix baselines, or make failures disappear by increasing retries.
- No pass without at least one substantive verification assertion. No assertion that only checks a URL change when money/storage state should also be verified. No "test that tests itself." No fake screenshots, fake pass counts, fake coverage, or fabricated expected/actual values.
- Collect evidence of what was actually executed. Correlate UI observations to backend/database state where appropriate. Preserve sanitized actual vs expected evidence and reproducible steps.
- A failed infrastructure/setup step is not a passing test: mark it as blocked/error and explain clearly.

## 7. Live browser execution — show the actions

The local developer experience must support **interactive, visible browser testing**:

1. Configure real Playwright **headed mode** and **UI Mode** (`--headed` and `--ui`) after verifying CLI compatibility. Enable a simple project command for each, respecting the existing package manager. Provide full commands in `docs/qa/TEST_RUNBOOK.md`.
2. Run a representative set of actual FinKeep workflows locally in a visible browser window (when the environment permits) with readable step/test titles, purposeful input, UI actions, and checks. Provide interactive Playwright UI/trace inspection and a reproducible debugging command.
3. Configure meaningful `test.step()` phases, assertion messages, and observability; record screenshots/video/traces **at least on failure** and selectively for high-risk regression or demo runs. Avoid exposing secrets/financial values; scrub sensitive artifacts.
4. CI generally runs unattended/headless. CI logs, video and traces are available **after** execution; they are not a real-time shared browser stream. If a remote live view is required, explain the separate remote interactive browser infrastructure and any permissions/costs needed rather than claiming GitHub Actions automatically supplies it.
5. For visual demonstration, offer a deliberate slowed demo mode separate from CI to let a human see each interaction without weakening test assertions or inflating all job durations.

If your execution environment is headless-only, do not claim that a visible window was opened. Implement the commands and show what you verified there, then label the local headed demo as `NOT_VERIFIED_IN_CURRENT_ENVIRONMENT` until actually run.

## 8. CI/CD: automatic regression on every change

Inspect existing CI first. If the repository is on GitHub, implement maintainable **GitHub Actions** (otherwise implement the equivalent native CI provider) with these policies:

**On every pull request and push to relevant branches**, perform reproducible install, typecheck/lint/build, unit/component tests with coverage, API/integration tests against an isolated backend, critical/security static checks, browser smoke and **full deterministic regression** including applicable E2E, PWA, cross-browser/mobile-emulation and accessibility suites. Execute all practical suites via parallel jobs/shards so this remains usable. Do not substitute changed-files-only selection for full regression; targeted tests may run earlier as fast feedback.

**On merges/main pushes and release candidates**, require production-like build verification, full regression, verified data integrity/authorization/financial invariant suites, deployment or preview smoke where configured, and published reports. Keep failing mandatory checks release-blocking. If external branch protection settings cannot be changed with current permissions, document the exact required UI/config steps and do not pretend protection is enabled.

**Nightly/weekly schedules**, additionally run high-cost exhaustive cross-browser matrices, expanded property-based seeds, mutation tests, soak/stress/load in isolated environments, dependency/security scans, long-term stability and performance trend analysis. Clearly label these as scheduled-only and escalate their failures. Run any security/performance checks safe for normal CI on pushes as well. Define test suites and scheduling from observed runtime and CI resource constraints; no silent exemptions.

**For every code change during a Claude Code session**, the mandatory pre-completion workflow is:

1. Identify changed files and impacted feature requirements, API contracts, UI, persistence, auth, and downstream dependencies. Update traceability before or as tests are created.
2. Add or adjust positive, negative, boundary, integration, security, and E2E regression tests as required; bug fixes must gain a repro test that fails before the fix if feasible and passes afterward.
3. Execute focused changed-area tests, lint/typecheck/build; then full feasible regression. Report any suite not run with explicit cause.
4. Fix test defects separately from product defects. Do not quietly change production behavior to make incorrect tests pass. For suspected product bugs, create structured defect reports and request/record product decisions where needed.
5. Report verified actual results, artifacts, residual risk and deployment recommendation. **Do not call a change complete** if critical tests failed or were not run without clearly reporting the blocker.

Persist a concise invariant in the existing root `CLAUDE.md` (append/merge without erasing existing instructions), and place detailed standards in `.claude/rules/finkeep-quality.md` or the current supported equivalent. Optionally add `.claude/skills/finkeep-regression/SKILL.md` for a repeatable QA workflow if compatible with the installed Claude Code version. **Do not rely on natural-language instructions alone:** enforce rules through working CI configuration, scripts and safe agent hooks where appropriate. Keep hooks fast and scoped (e.g. targeted checks locally), not hidden hours-long full runs on every file write.

CI must upload test artifacts even when tests fail (`always()`-style equivalent), retain artifacts for a defined privacy-conscious retention period, and post a readable per-build test summary in the CI system. Where supported, add PR status annotations/comment with a concise summary and report links. Configure permissions minimally; avoid untrusted pull request secrets and malicious-code risks.

## 9. Mandatory detailed, actionable reporting after every push/build

Implement human-readable **HTML** reports plus structured **JUnit XML/JSON** (or appropriate compatible format) so automated tooling can consume results. Provide a CI run summary for **every attempted build**, including failed/cancelled/blocked runs when feasible. Each report must include:

- FinKeep app/build version (if available), commit SHA, branch/PR, pipeline run URL and ID, timestamp/timezone, target environment, browser/engine/device/emulation, suite, tool versions, and test-data version where relevant.
- Counts by **suite, layer, feature, and severity**: discovered, planned, executed, passed, failed, flaky, skipped, blocked, not run, timed out, and not applicable. Clearly distinguish cases in the inventory from tests executed in this build; never present "not run" as pass.
- For **each executed test case**, stable ID/title, purpose, prerequisites, inputs (redacted), expected outcome, observed actual outcome, assertion detail, pass/fail/blocked status, duration, tags, browser, attempts/retries, source link and timestamp. For passed tests show the specific evidence/assertion that met the expected result (not a vague "pass"). For failed tests show specific actual vs expected, error/stack trace, offending step and available screenshot/video/trace/log/response evidence. Link artifacts per case where feasible.
- Root-cause classification only when evidenced; otherwise use `CAUSE_NOT_YET_DETERMINED`. Group duplicate failures; differentiate app defects, test bugs, infrastructure/setup errors, environmental issues, legitimate baseline changes, and flaky behavior.
- Coverage by feature/requirement and code metrics with honest denominator; P0/P1 untested/blocked cases; performance budgets/trends; security findings and severity; regression comparison with prior green baseline; newly added/modified/removed cases.
- Clear CI verdict: `PASS`, `FAIL`, `BLOCKED`, or `INCOMPLETE`; confidence/release recommendation; actionable next steps and links to complete artifacts.

Provide a concise dashboard summary **and** drill-down access to individual case results. Do not overload a PR comment with millions of rows; store the complete machine-readable dataset/artifacts and provide a browsable indexed report with filters/search/pagination if volume requires. If CI artifact size limits are reached, shard reports with index links and documented retention. If email or messaging notifications are requested later, configure only with real available integrations/permissions; do not invent deliveries.

Suggested summary layout:

```text
FinKeep Automated Quality Report
Build: <sha> | Branch: <name> | Run: <URL> | Status: FAIL
Suites: Unit PASS | API PASS | E2E FAIL | PWA PASS | Accessibility PASS
Cases: Planned <n> | Executed <n> | Pass <n> | Fail <n> | Blocked <n> | Skipped <n>
Coverage: Statements <x>% | Branches <y>% | Requirement traceability <z>%
Critical financial/security tests: <pass>/<total>; <blocked> blocked
Regression delta: <new failures / resolved failures>

FIN-QA-0142 — Delete expense recalculates remaining budget
Expected: Remaining budget updated consistently in UI, API and database
Actual: UI shows previous amount after a successful delete response
Status: FAIL | Step: budget overview refresh | Evidence: <trace/report>
Verdict: BLOCK RELEASE pending fix or explicit accountable exception
```

The example above is **illustrative only**. All real numbers and examples must be generated from actual runs.

## 10. Install what is required and log it accurately

Within the user-authorized local development workspace:

1. Audit existing runtime, OS/architecture, Node version, package manager, package-lock file, test dependencies, installed Playwright browsers, and CI capabilities before installing anything.
2. Install only compatible and necessary test dependencies using the existing package manager, preferably as development dependencies. Install required browser binaries and OS dependencies where permitted. Keep app production dependencies unchanged unless justified.
3. Record **each package/tool actually installed** in `docs/qa/TOOLING_AND_INSTALLATION.md`: exact package, resolved version, purpose, whether direct/transitive/dev dependency, install command, prerequisites, platform, known license/cost considerations and any failed install attempts. Document Docker/browsers/system tools separately from npm packages. If something was proposed but not installed, mark `PROPOSED` instead of `INSTALLED`.
4. Include local reproducible setup, test/staging environment variables, CI secret names (never values), running headed/UI mode, running each suite, showing reports, updating snapshots, triaging failures, and adding regression tests for future features.
5. Do not assume permission to install system-wide software, spend money, enable paid SaaS, provision remote infrastructure, or change production resources. Use existing free/local tooling unless explicitly authorized. Document any needed manual setup.

## 11. Configuration, commands, and repository deliverables

Implement and verify the following, adapting filenames and commands to the discovered stack rather than force-fitting arbitrary structure:

- Existing `CLAUDE.md` updated with concise **permanent QA requirements**, while preserving unrelated instructions.
- `.claude/rules/finkeep-quality.md` and optionally `.claude/skills/finkeep-regression/SKILL.md` with the complete change-impact/regression protocol.
- Actual executable test code across selected suites; fixtures, test users/data factories, stable identifiers, and robust reporting support.
- `playwright.config.ts` or appropriate equivalent, suite configs, app server/test environment bootstrap, and deterministic cleanup.
- Convenient package scripts (names may differ) for `test:unit`, `test:api`, `test:integration`, `test:e2e`, `test:regression`, `test:smoke`, `test:pwa`, `test:a11y`, `test:visual`, `test:security`, `test:perf`, `test:coverage`, `test:ui`, and `test:headed`, **only when the scripts actually work**. Never create dead commands merely to fill a checklist.
- CI YAML workflows and any necessary test-data service containers/config; artifact upload and required status check design.
- `docs/qa/APP_FEATURE_INVENTORY.md`, `TEST_STRATEGY.md`, `REQUIREMENT_TEST_TRACEABILITY.md`, `QUALITY_RISK_REGISTER.md`, `TEST_RUNBOOK.md`, `TOOLING_AND_INSTALLATION.md`, `TEST_REPORTING.md`, and `CHANGE_IMPACT_LOG.md` (adapt/simplify only if contents remain complete).
- A stable machine-readable test inventory mapping each test ID to feature, risk, coverage dimension, and source. Generate/update it as part of testing rather than maintaining disconnected manual spreadsheets.
- `.gitignore` entries and artifact retention rules so local reports, screenshots, secrets, tokens, seeded data, and heavyweight recordings do not accidentally enter source control. Commit only safe configs/sanitized sample fixtures and reviewed baselines.

**Acceptance test:** From a clean clone with documented prerequisites, a contributor must be able to install, run the app in a safe test configuration, run test suites locally/headed, inspect detailed reports, change code, see affected tests fail when appropriate, and have the CI pipeline run regression automatically on push/PR. Demonstrate actual working commands and show logs/exit statuses rather than just stating this is possible.

## 12. Quality gates, governance and change management

Define justified and transparent gates for:

- Build/lint/typecheck success.
- Full critical financial invariant and cross-user authorization tests, with **zero known critical failures**.
- All applicable PR/push regression suite results, including flake policy and blocked-job handling.
- Minimum coverage thresholds, progressive increase for existing technical debt, and no unjustified decrease in important modules.
- Security findings by verified severity; accessibility failures by impact; visual baseline approvals; API contracts; and meaningful performance regression budgets.

Document each gate and whether it is truly enforced by CI and branch protection, merely advisory, or blocked pending permissions. Never treat an unrun/disabled job as successful quality certification. Do not suppress a red pipeline to make deployments green.

Every new feature, change, bug fix, dependency upgrade, database migration, and PWA service-worker change must update the test inventory, add/adjust test cases, rerun affected tests and regression, update reports/documentation, and preserve test IDs where behavior is unchanged. Retire obsolete tests with a reason and traceability; avoid large stale suites.

## 13. Implementation order — begin now and keep going

Execute this sequence against the real codebase. Don't ask me to restate facts that can be discovered from files. Ask only if a permission, credential, environment, or requirement is genuinely necessary and cannot be reasonably resolved. Make best progress without inventing access.

**Phase 0 — Ground truth and baseline:** Discover stack/architecture/features/data/business rules/current test gaps; run baseline scripts; produce inventory/risk map and select tooling.

**Phase 1 — Working foundation:** Install necessary dependencies; configure test environment, data isolation, Playwright and unit runner, fixtures, reproducible commands, reporting, local headed/UI mode. Prove the foundation by running real tests.

**Phase 2 — Protect money and data:** Build P0 calculation, validation, persistence, authorization and core CRUD suites; include independently calculated expected results, API+DB checks and real E2E workflows. Record real failures as defects.

**Phase 3 — Broaden coverage:** Cover each real feature including positive/negative/boundaries, loading/error states, integrations, user workflows, accessibility, visual, cross-browser, offline/PWA, security and performance.

**Phase 4 — CI/CD quality gates:** Implement push/PR/full regression, scheduled deep suites, artifacts, reports, branch protection instructions and verified pipeline runs if credentials/permissions permit.

**Phase 5 — Measure test strength and maintainability:** Mutation testing on critical code, property-based inputs, coverage thresholds, deterministic/flaky-test analysis, impact mapping, reporting and documentation, plus manual real-device test tracking.

Where practical, perform CI wiring before coverage expansion so every new test is protected automatically. Continue across phases without stopping after a checklist, while keeping individual changes reviewable. If genuine external blockers exist, do not fake completion: report exactly what works and what is blocked.

## 14. Required response at the end of your actual execution

Your final response to me MUST be a factual engineering handover with:

1. **Repository findings:** actual stack, architectures, available features, source evidence, identified business risks.
2. **What was implemented:** files changed, framework architecture, working test categories, infrastructure, CI rules, report locations.
3. **Installed inventory:** what you actually installed, exact versions, why, and what is only recommended/blocked.
4. **Test execution evidence:** exact commands executed, test suite/category totals, passed/failed/blocked/skipped, coverage numbers with denominators, sample expected/actual details, traced critical assertions, and paths to reports/videos/screenshots/traces where they exist.
5. **Local visible-browser proof:** whether a visible browser actually launched, commands demonstrated, and what was not possible in the current environment.
6. **CI/CD proof:** events/triggers, status gates, whether a real CI run happened, CI URLs/IDs if available, and any remaining permissions required.
7. **Unresolved defects and gaps:** severity, reproduction steps, expected/actual observations, root-cause evidence (or explicitly unknown), untested areas, flaky tests, security/perf risks.
8. **Future change policy:** what happens automatically after pushes, what Claude must run after edits, and the correct safe release criteria.
9. **Next prioritized tasks:** concrete items to make unimplemented coverage real rather than claiming completion.

**Never confuse 'configured', 'test code written', 'run locally', 'passed', 'executed in CI', and 'deployed'. Treat them as separate verified statuses.** If necessary, create a concise tracking table `Implemented / Tested locally / Verified in CI / Blocked`.

### Start now

You are not being asked for a theoretical article. **Inspect the current FinKeep repository and implement the strongest maintainable, evidence-driven automation system the available environment permits. Build, run, measure, report and commit/document working assets; keep going until a meaningful verified framework exists, and clearly disclose anything not completed.**
