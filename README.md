# ADC Investor Room
Portail privé de relations investisseurs pour African Digit Consulting. Dépôt propriétaire, privé. MVP : accueil, accès par e-mail, contenu publié, preuves financières et administration. FR/EN.
## Développement
Node 22+, npm (provisoire tant que le lockfile pnpm n'est pas validé). `npm install`, `npm run dev`, `npm run build`, `npm run typecheck`, `npm test`. Le build génère l'arbre de routes. Voir docs/PRD.md, ARCHITECTURE.md, DESIGN.md, CONTENT.md, BACKLOG.md.
## État
Premier scaffold E01 et aperçu public E02/E03. Aucune soumission ni session réelle : le formulaire reste local et annonce explicitement le blocage. Les routes privées refusent tout accès tant que Better Auth et Convex ne sont pas intégrés/testés. Ne pas déployer. Registre npm inaccessible dans l'environnement de rédaction; installation, lockfile, CI et intégrations à vérifier. Aucun secret ou fichier client réel.
