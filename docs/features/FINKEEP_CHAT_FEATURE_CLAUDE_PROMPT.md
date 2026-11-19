# FinKeep — Production-Grade In-App Chat Feature
## Master implementation prompt for Claude Code

You are acting as a **Principal Full-Stack Engineer, Realtime Systems Architect, Product Designer, Security Engineer, and Senior SDET**. You are working inside my existing **FinKeep** Progressive Web App (PWA), a budget-tracking application. Your responsibility is to **design, build, integrate, test, secure, deploy, and maintain** a new first-party chat experience that allows registered FinKeep users to find and chat with one another.

This is a request for **working production-quality software**, not a mockup, prototype, generic tutorial, or theoretical implementation plan. Inspect the actual repository and connected deployment before making architectural decisions. Preserve all existing financial-tracker features, data, authentication, design system, user accounts, CI/CD, and PWA behavior.

## 1. Non-negotiable cost and architecture requirements

**My requirement: the entire chat feature must operate without a paid chat library, paid SaaS chat provider, paid API, paid subscription, paid integration, or mandatory payment card.** My application already uses free tools/platforms; first reuse the auth, database, file storage, deployment, and real-time capabilities that already exist in the repository/project. Only select additional dependencies if they are truly free, production-appropriate, maintained, and their licenses permit my intended use (prefer MIT, Apache-2.0, BSD, or appropriate platform-native functionality).

- Do **not** integrate paid chat providers such as Sendbird, Stream, Twilio Conversations, or any provider that requires a paid plan for essential chat functionality.
- Do **not** silently enroll the project in trials, enable metered billing, supply a credit card, or assume that “free to install” means “free to operate.”
- Verify the **current** free-tier usage limits, applicable terms (including commercial-use restrictions), bandwidth, file-storage caps, real-time connections/messages, outbound traffic, and deployment limitations from official provider documentation. Report the date checked and link each source.
- Do not promise infinite free usage. Establish sensible quotas and warn when free-tier capacity may become insufficient. Enforce limits server-side, not just with UI.
- Prefer **first-party implementation using my existing stack** over introducing another platform. If my current backend does not support real-time events, assess a compatible free-tier approach and explain the tradeoffs; do not introduce an always-on server on a serverless platform that cannot support it.
- If no feasible fully-free approach satisfies a particular requirement, **do not substitute a paid service**. Implement the best free, secure fallback and clearly document what cannot be provided without extra capacity/approval.
- **Do not replace or migrate existing production services** without a concrete, reversible plan and explicit authorization for destructive changes.

## 2. Audit the real application before coding

Inspect and record:

1. Application framework, language, routing, component library, CSS/theme, PWA/service worker architecture, API structure, tests, and existing error-handling conventions.
2. Existing sign-up/sign-in/session/auth flows, identity provider, user/profile table(s), and existing role/permission rules.
3. Database schema, migrations, RLS or other access controls, existing storage buckets, environment variables, secrets handling, real-time event infrastructure, and data deletion patterns.
4. Git repository, branch strategy, workflows, Vercel or other deployment integration, configuration, quotas, and production-vs-preview environments.
5. Whether the project already contains chat/messaging code, a notification system, reusable components, or a search feature.
6. Security, accessibility, browser support, offline patterns, and data classification, especially separation of private financial data from chat.

Create `docs/chat/ARCHITECTURE_AND_FREE_TIER_AUDIT.md` with evidence-based findings, decisions, constraints, alternatives considered, and a dependency/cost matrix. **Never invent repository facts.** If any access, credential, or project-level setup is unavailable, document the exact blocker and finish all work that is possible without it.

## 3. Functional scope: real user-to-user chat

### A. User discovery and profile

- Add a polished, accessible **Chats / Messages** destination to the existing FinKeep navigation, consistent with desktop, mobile, dark/light modes, and installed-PWA layouts.
- Authenticate users through existing FinKeep accounts: no separate chat login or account.
- Enable searching **other registered FinKeep users** by unique handle and/or display name, with fast debounced results, loading/empty/error states, pagination, keyboard navigation, and avatar/initial fallback.
- If usernames do not exist, add a safe migration and UI for unique, normalized, case-insensitive handles; don't expose account emails, phone numbers, finance data, or internal IDs in search results. Respect profile visibility and opt-out from discoverability.
- Search must exclude banned/deactivated users, respect blocks, be rate limited, and avoid enabling easy enumeration of the entire membership directory.
- Clicking a user opens the existing one-to-one conversation or creates one through a race-safe operation. Prevent duplicate conversations for the same pair, including concurrent initiation.
- Design friendly profile previews with display name, handle, avatar, and only optional public information.

### B. Private one-to-one chat

- Implement durable message persistence and real-time delivery where supported by the existing free stack. A reload or second device must show the same conversation and history.
- Support plain text, multiline text, emoji (Unicode), image attachments, animated GIFs, mixed text-plus-media, and message timestamps.
- Compose with Enter to send and Shift+Enter for a new line on desktop, with correct mobile behavior and IME composition handling.
- Show conversation list ordered by latest activity, last-message preview, unread counts, latest timestamp, and appropriate responsive empty states.
- Add delivery/pending/failure/retry states based on what can **actually** be verified; do not fake “delivered” or “read.” Define exact semantics before implementation.
- Where feasible, implement read/unread state, mark-as-read, typing indicators, and online status with privacy controls and accurate descriptions. Treat transient indicators as ephemeral, not permanent database writes.
- Provide cursor-based/paginated history, reverse scrolling that preserves position, date separators, loading skeletons, sender/receiver alignment, accessible controls, and smooth performance with large conversations.
- Use stable message identifiers and client-generated idempotency keys to prevent duplicates during retries, reconnects, optimistic updates, tab races, or offline queue flushing.
- Handle multiple tabs/devices and reconnect safely without duplicated subscriptions, memory leaks, missing messages, or wrong message ordering.
- Include optional edit/delete functionality only when backed by explicit secure authorization rules; show appropriate placeholders if deletion affects history.

### C. Emojis, images, GIFs, attachments

- Provide a searchable, keyboard-accessible **emoji picker** using Unicode / an appropriately licensed zero-cost library; include skin tones where practical. Ordinary emojis must remain usable without a paid API or external service.
- Support selecting image files, drag-and-drop (desktop), paste from clipboard where supported, and a mobile gallery/file chooser.
- Support JPEG, PNG, WebP, and real animated GIF uploads, with previews, upload progress, failed-upload retry/cancel, image dimensions and file size checks, friendly errors, and fullscreen media viewer.
- Compress/re-encode supported static images client-side as appropriate, **without destroying GIF animation**. Strip sensitive metadata where reasonably possible, validate MIME and actual file signatures, enforce size/type limits both server-side and client-side, and do not accept executable HTML/SVG as trusted images.
- Store attachments privately using an existing free storage facility when practical. Access must be authorized for actual conversation participants, including after blocking, deletion, expired URLs, and token changes. Do not use publicly accessible permanent links for private media.
- **GIFs must work without a paid GIF API.** First implement uploading and sending user-supplied animated `.gif` files. Add a built-in **GIF picker** only with media that is legally licensed for this use (e.g., explicitly licensed compatible assets or user-owned/opt-in GIFs). A searchable picker backed by a third-party free API is optional only after verifying API terms, quota, privacy, current availability, and getting approval for any new external service. Never scrape GIF libraries or ship copyrighted GIF collections without rights.
- Preserve GIF animation in messages and allow reduced-motion users to avoid autoplay or pause animation where technically possible.
- Avoid untrusted remote embeds and unsanitized URLs; proxy, validate, or restrict media according to the security architecture.
- Configure attachment retention, orphan cleanup, and per-user/per-conversation upload limits to control free-tier costs.

### D. Requests, controls, and trust & safety

- Add a **message request** workflow for first contact where it improves safety: stranger can request a conversation; recipient can accept, decline, block, or report; limit unsolicited images/GIFs before acceptance.
- Implement block/unblock; blocking must be enforced at the data layer and across real-time delivery, search/discovery, notifications, and future sends. Define and test visibility of historical messages.
- Add mute conversation, report user/message, and clear abuse-handling workflow without implying reports are automatically moderated by a nonexistent team.
- Add server-side per-user send limits, search throttling, upload quotas, and spam protections; distinguish expected errors and abuse errors in UI.
- Provide chat privacy/settings controls: discoverability, read receipts (if implemented), online indicators (if implemented), notifications, and safe data deletion behavior.
- Do not expose private budget/transaction/account information in chat, profile search, event payloads, logs, push notifications, analytics, or error messages. The chat module is separate from financial data.

## 4. Secure data model, backend, and APIs

Design schema around the current database and conventions. Likely entities include:

- Public/minimal user discovery profile, handle, avatar, discovery settings.
- Conversations with canonical direct-chat uniqueness and timestamps.
- Conversation memberships/participants with membership and read state.
- Messages with sender, conversation, type, body, timestamps, edited/deleted state, client idempotency key, and sensible indexes.
- Message attachments with private storage object key, media metadata, and ownership/authorization.
- Blocks, message requests, reports, notification preferences, and minimal audit records as justified by the feature.

Do not blindly create all of these tables if the existing architecture supports a cleaner design. Generate **versioned, reversible, production-safe migrations**, constraints, indexes, ownership policies, referential actions, and deterministic seed fixtures. Prefer server-owned timestamps. Avoid storing the same sensitive body text redundantly in multiple tables or logs.

**Mandatory authorization:** authenticated users may discover only allowed profile fields; read messages/media only when they are authorized participants; write only as their own identity; cannot spoof sender, edit others' messages, forge read receipts, cross conversations, exfiltrate attachments, or bypass blocks. Test both positive and negative access cases. If using Supabase, apply Row Level Security (RLS) on relevant tables and storage objects, and use authenticated **private Realtime channels** with verified authorization policies; never expose service-role keys in browser code. Otherwise use equivalent server-side controls, not client-only checks.

Implement input validation, safe rendering against stored/reflected XSS, no unsafe `innerHTML`, parameterized database access, CSRF/origin protections where applicable, appropriate Content Security Policy, server-side throttling, and safe upload handling. Avoid writing message contents, tokens, signed URLs, or private financial data into browser/server logs or analytics. Do not claim end-to-end encryption unless actually implemented and verified; transport encryption plus at-rest provider security is not the same as E2EE.

## 5. Realtime, offline, and PWA resilience

- Reuse existing provider real-time features if compatible and within free-tier budget. Use event-driven updates for active chats, with correct authorization and cleanup on unmount/logout.
- Perform an initial paginated database fetch and reconcile socket events without gaps, duplicates, or out-of-order messages. Support reconnect, backoff, visibility changes, idle tabs, expired auth, and multi-device updates.
- If real-time is unsupported within the current platform, implement a documented secure fallback (such as conditional polling) without misrepresenting it as instant real-time. Carefully measure quota impact.
- Offline PWA: show clear online/offline status. Let users view **only data explicitly and securely cached** under a defined privacy policy; queue outgoing messages only when feasible and safe. Label queued messages as unsent and synchronize with idempotency after reconnect; never mark them delivered prematurely.
- Do not allow the service worker to cache private authenticated chat responses, image URLs, or access tokens into a publicly readable/static cache. Clear user-specific data on logout, account switch, and deletion.
- Support Android/Chrome, iPhone/Safari, desktop Chromium/Firefox/WebKit to the extent supported by the existing application; keep touch targets and the mobile keyboard experience correct.
- Consider push notifications **optional** only if the existing web-push infrastructure and free-tier platform constraints can support them securely. Never promise reliable background notifications on every OS or browser.

## 6. UX/UI quality requirements

Build a modern, polished experience **within FinKeep's existing branding**, not a separate mismatched app:

- Desktop two-pane layout (chat list + conversation) when space allows; mobile full-screen list and conversation with intuitive back navigation.
- Clear Search People action and conversation creation flow; helpful empty states for no chats, no results, blocked user, unavailable message, and failed upload.
- Efficient, accessible composer with attachment button, emoji selector, GIF entry point, send action, message bubble states, previews, and media lightbox.
- Attractive but restrained typography, spacing, subtle animations, polished hover/focus/disabled states, skeleton loading, toast/error feedback, accurate timestamps and localization.
- Fully tested responsive layout, dark and light themes, notches/safe areas, screen readers, focus return, keyboard-only use, aria-live announcements without overwhelming users, visible focus indicators, and reduced-motion support.
- Respect the existing design system and avoid unnecessary component libraries. Never sacrifice performance or accessible UX to imitate another brand.

## 7. Rigorous quality engineering and automated testing

Use the test infrastructure that is already present, improving it where needed. Maintain or add unit, component, API/integration, database/RLS policy, E2E (prefer Playwright if appropriate), security, accessibility, visual, and performance tests. Never merely generate a list of tests; **execute and show meaningful results**.

Minimum test domains and examples:

1. **Discovery:** exact/partial/case-insensitive matches, Unicode handles, 0/1/many results, duplicate handles, pagination, debouncing, opt-out, blocked accounts, unauthorized profile fields, query injection, brute-force/enumeration abuse.
2. **Conversation creation:** same pair creates only one DM under concurrent requests; mutual initiation; denied users; request/accept/decline/block state transitions.
3. **Text:** Unicode, emojis, long multiline, empty/whitespace-only, very long body, line breaks, IME, HTML/script payloads, rapid send, retry, duplicate submits, delivery failures.
4. **Real-time:** two authenticated browser contexts with distinct users; send/receive in both directions; multiple sessions; read/unread transitions; order; disconnect/reconnect; token expiration; subscription cleanup; racing page loads.
5. **Images/GIFs:** all allowed formats, genuine animated GIF retention, upload error/retry, huge or malformed image, fake MIME, unsupported formats, private asset access, signed-link expiration, quota enforcement, metadata stripping and media deletion.
6. **Authorization:** user C cannot read A–B message, subscribe to A–B stream, download A–B attachment, create a message as A, alter B's message, forge memberships or circumvent blocking. Test server-side and DB-level policies independently.
7. **PWA/offline:** offline composing, pending/retry/reconciliation, logout/account switch, cache isolation, updates and service-worker behavior.
8. **UI/UX:** light/dark, responsive breakpoints, iOS Safari keyboard, focus, ARIA, keyboard controls, empty/error/loading states, emoji picker, GIF rendering, scroll position, reduced motion.
9. **Performance/resource:** first load and bundle impact, list virtualization if necessary, pagination/query plans, storage quotas, slow network, many conversations, thousands of messages, multiple simultaneous sessions, leak checks, free-tier event counts.
10. **Regression:** all existing budgeting, transactions, reports, account/auth, data isolation, and offline PWA flows must remain intact.

Create deterministic test users and seed conversations in **non-production** environment only. Do not run destructive data reset or spam/load tests against production. Prefer controlled tests with measurable targets derived from existing baseline; distinguish verified metrics from targets/estimates.

Every new chat feature or bug fix must include relevant automated tests. Integrate with the existing CI/CD test suite: pull requests and pushes execute changed-unit/API/security/E2E smoke checks, with a properly budgeted broader regression pipeline. For a release, run the appropriate full regression before promotion and stop deployment on critical gate failure. Produce JUnit/HTML reports, screenshots, traces and videos **on failures** where available, actual-vs-expected explanations for failed cases, and concise category-wise pass/fail/skipped counts. Clearly report coverage gaps, flaky tests, unrun tests, and infrastructure failures; never fabricate 100% coverage.

Run the browser visibly in **headed/interactive mode locally** for demonstration and debugging where the environment supports it, showing two test users chatting, images/GIFs and reconnect scenarios. Explain that headless CI is normal and provide accessible trace/video artifacts where actual live browser display is unavailable.

## 8. Installation, migration, and deployment discipline

- List every package/tool to be installed, exact version, license, role, and why the existing stack does not already provide it.
- Avoid duplicate libraries, high-maintenance dependencies, large bundles, and deprecated/paid packages.
- Provide reproducible install commands and project scripts; update lockfiles, env example and setup docs. Never commit secrets.
- Write incremental migrations with backup/rollback notes. Test migrations in a disposable environment, preserve existing user records and finance data, and inspect RLS/storage permissions before production rollout.
- Run lint, formatting, typecheck, relevant unit/integration/E2E suites, production build, and security/dependency checks. Diagnose and fix issues instead of bypassing checks or weakening assertions.
- Deploy only through the existing authorized workflow. If live credentials, approvals, access, or configuration are missing, do not claim deployment succeeded. Show exact manual steps required.
- Add telemetry using non-sensitive aggregate counts and quota monitoring. No paid observability service.

## 9. Required permanent documentation and Claude Code maintenance rules

Create or update the following as appropriate:

- `docs/chat/ARCHITECTURE_AND_FREE_TIER_AUDIT.md`
- `docs/chat/FEATURE_SPEC.md` (scope, acceptance criteria, privacy, behavior)
- `docs/chat/DATABASE_AND_SECURITY.md` (schema, migrations, permission matrix and tests)
- `docs/chat/OPERATIONS_AND_LIMITS.md` (quotas, retention, storage cleanup, backup/rollback, alerts)
- `docs/chat/TEST_MATRIX.md` (coverage mapping from requirements to actual automated tests)
- `docs/chat/INSTALLATION_AND_DEPLOYMENT.md` (installed tools, versions, free-tier verification, environment configuration)
- `docs/chat/IMPLEMENTATION_REPORT.md` (completed, skipped, blocked, risks, test evidence)

Add project-level Claude Code instructions, using the repo's existing conventions (for example, `CLAUDE.md` and/or a scoped chat instruction file), stating:

> Any change to chat, accounts, profiles, authentication, database policies, media storage, shared navigation, or PWA behavior requires impact analysis; maintain the associated test cases, run relevant regression, update feature and operations docs, and report test evidence. Never disable security, paid-service checks, or CI quality gates to make a build green. Preserve finance-data isolation.

Integrate these rules with the existing project-wide SDET automation framework rather than introducing a competing test system.

## 10. Execution order — do the work, do not stop at planning

**Phase 1:** Inspect repository/infrastructure and produce honest audit + free-tier feasibility decision.

**Phase 2:** Define exact acceptance criteria, data/permission model, UX design, test plan, estimated storage/realtime consumption, and bounded rollout strategy.

**Phase 3:** Implement production-safe migrations and backend authorization first; write and run deny/allow security tests.

**Phase 4:** Implement user discovery, unique direct conversations, message persistence, realtime/fallback, media upload, emoji/GIF capability, privacy/abuse controls and polished PWA UI.

**Phase 5:** Add complete meaningful automated tests, run locally with two independent test accounts, show a headed-browser demonstration if available, and fix failures.

**Phase 6:** Integrate regression into existing Git/CI/CD setup; run security, performance, accessibility, responsiveness and existing FinKeep regression checks.

**Phase 7:** Verify production build, document deployment/rollback and all actual provider restrictions; deploy only within authorization/access constraints; provide an evidence-based final report.

For each phase give a brief factual progress update, but prioritize implementation over producing endless prose. Do not ask me to choose a framework if the repository gives enough evidence to make a sound decision. Do not mask blockers. Do not request payment details. Do not destroy or overwrite live data.

## 11. Definition of done / non-negotiable demonstration

The feature is **not done** unless you can verify as many of the following as environment access permits:

- Two **different** authenticated FinKeep users can find each other using in-app search, start or accept a private DM, and exchange actual persisted text, emojis, JPEG/PNG/WebP images, and animated GIFs.
- Both sides see correct updates when online; messages survive reload and sign-in on another device; offline or failed sends are represented honestly and recovered safely.
- User C cannot access A–B messages, events, or private media, even by calling APIs directly or modifying client-side state.
- The UI looks and works correctly on tested mobile and desktop viewports, dark/light themes, and accessible keyboard/screen-reader workflows.
- Existing FinKeep budgeting/data flows still work, and no finance data leaks into chat.
- No new paid dependency, billing requirement, or undocumented free-tier limit was introduced.
- Automated tests run in CI/CD and publish actual results, with documented failures/skips/gaps and enforcement of essential security/functional gates.
- You provide a clear final report covering **what was implemented, files changed, migrations, libraries installed and reasons, actual cost/free-tier assumptions, executed commands, pass/fail/skipped counts, issues resolved, remaining risks, manual steps, live browser evidence, and deployment status**.

**Begin now by inspecting the actual FinKeep repository. Do not write fake passing tests, fabricate completed integrations, or substitute a static mock chat UI for a functioning user-to-user system.**
