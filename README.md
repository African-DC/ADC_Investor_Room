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
