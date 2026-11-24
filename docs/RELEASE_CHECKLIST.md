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
