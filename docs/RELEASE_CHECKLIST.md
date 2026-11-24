# MVP release gate — not production-ready
## Isolated staging setup
- [ ] ADC-owned Convex dev deployment; regenerate bindings, set backend flags/secrets only in isolated environment; verify team and deployment IDs.
- [ ] Resend verified sender and test inboxes; disable link tracking for auth, verify anti-replay, scanner confirmation, session expiry/revocation, CSRF.
- [ ] Private R2 bucket and separate least-privilege read/write credentials, backup and restore exercise, orphan inventory. No real data during staging.
- [ ] Configure and test external malware scanning with signed/verified verdicts bound to exact SHA-256; manual operator scan labels are not evidence of scanner integration.
- [ ] MFA with session-bound proof on every privileged call; do not treat verified email or an admin membership as MFA. Staging flags must remain off in production. Vercel production server refuses staging admin and upload even if flags were set, but Convex requires independent environment isolation.
- [ ] Provision two distinct test admin identities and scoped test investor; verify cross-room, direct IDs, NDA change, revocation, no-store, publication, upload, PDF reader, archive and dependent metrics. Include negative and positive tests using real providers.
- [ ] Validate PDF.js security advisories, local worker/fonts, rendering and accessible alternative, large-document limits, rate limits and no leakage in logs; watermark is deterrent only.
- [ ] Verify exact source documents and reconcile all financial values, site/account distinction, reporting periods, actual vs forecast; ADC approves content.
- [ ] Pin reproducible dependency lockfile and audit dependencies; run CI against exact release SHA. Restore test, operational owner, privacy/retention and access review.
- [ ] Human release approval and separate production rollout; no automatic deployment or merge.
## Current limits
No live providers tested, no actual MFA or antivirus integration, no production access, no real data. The remaining gates are blockers, not tasks marked done by synthetic CI.

## Dependency incident
2026-11-24 CI failed at npm install because @better-auth/memory-adapter 1.7.28 tarball returned HTTP 404. Pin Better Auth 1.7.26 and Convex adapter 0.13.1, matching the lockfile of the existing Vatel project. This is a candidate fix, not a security or CI certification. Re-run all checks, review advisories and generate a reproducible lockfile before release.

## Advanced features activation gates
- [ ] CRM and Q&A: review retention, pagination, actual identities, room scope, notification consent and delivery before enabling.
- [ ] Analytics: approve privacy notice, verify opt-in and withdrawal, purge throughput and deletion requests; distinguish authorization from delivery.
- [ ] Technical reporting: configure least-privilege read-only GitHub credential and exact room targets; test rate limits, failures and CMS review.
- [ ] ADC Intelligence: default off. Verify actual provider and contractual data handling, approve exact source versions, test cross-room and stale citation rejection, adversarial questions, cost limits, finance accuracy and human fallback. No external real data until approval; model cannot emit freeform answers in current slice.

## Authentication design caveat
Better Auth's built-in two-factor plugin does not automatically gate passwordless magic-link sign-in. A user-level twoFactorEnabled flag is not a verified step-up. Keep the admin surface staging-only until a separately tested session-bound step-up and enrollment/recovery/revocation flow exists. Reference: https://better-auth.com/docs/plugins/2fa and https://labs.convex.dev/better-auth/security. Never add a passwordless bypass or accept client-provided MFA proof.

Lockfile captured from successful GitHub Actions run 45503554994, exact manifest verified, registry URLs checked. CI now uses npm ci exclusively; full locked CI still to verify and dependency advisories/security review remain mandatory. npm chosen for this initial release to match existing CI; pnpm migration is a separate change, not two competing lockfiles.
