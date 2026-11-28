# Convex production migration — ADC Investor Room

Status: preparation only. The live domain currently uses the existing development backend. No data export, restore, secret rotation or endpoint change was performed by this change.

## Before any cutover
- Identify the exact source deployment and the intended production deployment within the existing Convex project. Confirm plan, backup permission, retention, and storage capacity. Do not create a second Vercel project.
- Take a full source backup in the Convex dashboard, including file storage and installed component data. Verify the backup is complete, downloadable and encrypted at rest. Keep it in restricted storage, never GitHub or public links.
- Record table counts and application-level invariants: rooms, memberships, investor grants, NDA acceptances, document versions/storage references, audit logs, outbox statuses and Better Auth users. Record current source/target code revisions and deployment configuration names (not secret values).
- Review Better Auth component compatibility, authentication identity IDs, session signing/JWKS, MFA encryption key and sealed secrets, document delivery signing secret, mail configuration, origin and callback URLs. Restore required secrets via the authorized secret store, not a backup file or chat.
- Take a separate backup of the target if it has any data. Restore is destructive to target database contents. Test on a restricted, isolated target before cutover; suppress outbound mail and scheduled side effects during test restore. Never copy live confidential data into a shared developer environment.
- Validate that storage IDs, relationships and user identities survive restore; invalidate or reissue sessions/tokens as necessary rather than assume continuity. Test real login, MFA enrollment/recovery, grant/revoke, document viewing/download, room isolation, invitations, and email worker behavior. No live investor invitations during rehearsal.

## Cutover
- Agree a maintenance window; stop source writes and outbound jobs (including direct WebSocket mutations), drain in-flight work, then take a final backup and restore it into the verified target. A frontend maintenance banner alone does not stop writes.
- Deploy the reviewed code/schema on the target, configure the production-scoped deploy key and matching cloud/site endpoints in Vercel Production, and keep preview/development endpoints distinct. The existing target guard must pass. Use a staged production build, then verify and promote it to the same canonical domain. Ensure the old backend cannot continue accepting writes.
- Verify counts, files, permissions, user sessions, error rates and delivery status before opening access. Re-enable mail only after checking pending jobs so restored jobs do not send duplicates. Monitor both services.
- Rollback: before reopening writes, reverting to the preserved source and matching frontend is possible after confirming the target is isolated. After new writes on the target, do not blindly switch back: reconcile those changes and take backups before deciding. Vercel rollback alone does not undo Convex code or data.

## Official references
- https://docs.convex.dev/database/backup-restore
- https://docs.convex.dev/cli/reference/export
- https://docs.convex.dev/database/import-export/import
- https://docs.convex.dev/production/multiple-deployments
- https://docs.convex.dev/production/overview
