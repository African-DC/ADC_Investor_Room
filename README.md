# ADC Investor Room
Portail privé de relations investisseurs pour African Digit Consulting. Dépôt propriétaire, privé. MVP : accueil, accès par e-mail, contenu publié, preuves financières et administration. FR/EN.
## Développement
Node 22+, npm (provisoire tant que le lockfile pnpm n'est pas validé). `npm install`, `npm run dev`, `npm run build`, `npm run typecheck`, `npm test`. Le build génère l'arbre de routes. Voir docs/PRD.md, ARCHITECTURE.md, DESIGN.md, CONTENT.md, BACKLOG.md.
## État
Premier scaffold E01 et aperçu public E02/E03. Aucune soumission ni session réelle : le formulaire reste local et annonce explicitement le blocage. Les routes privées refusent tout accès tant que Better Auth et Convex ne sont pas intégrés/testés. Ne pas déployer. Registre npm inaccessible dans l'environnement de rédaction; installation, lockfile, CI et intégrations à vérifier. Aucun secret ou fichier client réel.

## Auth integration progress
See [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md). Feature flags off by default, no credentials configured. First CI: build/typecheck/lint and 11 unit tests passed; wizard browser test failed and a regression fix is included in this revision. Real mail and session tests pending. Private routes remain closed.

Verified access page includes optional profile save via Convex with same-origin protection; no real provider configured or verified.

## E05–E07 progress
Protected investor portal, explicit room/section grants, versioned NDA and staging-only CMS operator mutations are implemented. See docs/PORTAL_SETUP.md. ADC_PORTAL_ENABLED and ADC_STAGING_CMS default off. No real authenticated test or production admin access; staging configuration and CI required.

## E10 finance registry
See docs/FINANCE_SETUP.md. Evidence-linked metrics, separate review, admin editor and authorized investor view. No actual figures committed. Real provider setup and MFA remain blockers.

## E09 content
Eleven bilingual editorial templates in the CMS. Only heading/category/slug/order are prefilled. All facts, sources and content require ADC review; nothing seeded or published automatically.

## Document upload staging
See docs/DOCUMENT_SETUP.md; bounded PDF upload and distinct reviewer publication, external scan required. All flags default off. Real infrastructure and scanner unverified.

Embedded PDF.js reader uses local worker, bounded canvas rendering and personalized visual watermark; no DRM, no range or accessible text layer yet. See DOCUMENT_SETUP.md.

Comparable financial trend charts and [MVP release checklist](docs/RELEASE_CHECKLIST.md). Staging admin/upload denied on Vercel production; independent Convex isolation still required. No real release approved.

## E11 CRM
See docs/CRM_SETUP.md for scoped pipeline, contacts and internal follow-up. Staging only; no automatic access or email.

## E12 Q&A
See docs/QA_SETUP.md. Private room/owner-scoped questions and answers with staging admin reply capability. Flags off; no notifications or real data.

## E13 engagement
Consent-gated, deduplicated and scoped daily engagement, aggregate dashboard, manual bounded retention purge. See docs/ANALYTICS_SETUP.md.

## E14 GitHub reporting
Allowlisted metadata snapshots and reviewed CMS draft, staging only. See docs/GITHUB_REPORTING.md. No code or secrets exposed.

## E15 ADC Intelligence
See docs/INTELLIGENCE_SETUP.md. Live ACL-filtered evidence retrieval and optional Vercel AI SDK structured selection; no generated financial claims. Default off.

## Recette réelle
Follow [staging runbook](docs/STAGING_RUNBOOK.md) and [release gates](docs/RELEASE_CHECKLIST.md). No real provider has been provisioned. Passwordless login is not MFA; production administration remains disabled.
