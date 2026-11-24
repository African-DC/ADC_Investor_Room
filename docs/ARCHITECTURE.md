# Architecture
TanStack Start SSR, TypeScript, React, Tailwind/shadcn. Convex + Better Auth, Resend, Cloudflare R2 privé, Vercel. Vérifier compatibilité réelle et lockfile avant release. Structure src/routes, features, components, lib, server; convex; tests; docs.
## Données
Organizations, users, memberships, investorProfiles, fundraisingRounds, rooms, grants, sections, contentBlocks/versions, documents/versions/permissions, financialMetrics/evidence, pipelineEvents/notes, questions/answers, ndaAcceptances, activityEvents, notifications, auditLogs. Index room/user/slug/statut, pagination. Entiers XOF. Identité stable via auth, rôles internes et grants séparés.
## Sécurité
Deny par défaut, contrôle serveur de chaque lecture/mutation/action et R2, scope, room, expiry, révocation et NDA. Ne pas révéler titres, compteurs ou existence hors droits. Magic link unique TTL cible 15 min, anti-rejeu, anti-scan, réponses génériques, rate limit, redirections allowlist, cookies HttpOnly/Secure, CSRF. MFA admins. Pas de secrets ni tokens dans bundle/logs.
R2 privé séparé par env, métadonnées et hash, quarantaine et contrôle type/taille, proxy authentifié par range, URLs signées courtes uniquement si téléchargement permis. No-store, noindex, CSP; filigrane n'empêche pas captures. Audit applicatif append-only, rétention et sauvegarde/restauration. Aucun contenu réel en preview. IA : filtrer avant retrieval et au rendu, citations autorisées, abstention sans preuve.
## ADR E01
Versions candidates issues du stack du dépôt James10192/vatel-restaurant-os; non validées ici. npm local ne résout pas registry.npmjs.org; aucun lockfile fabriqué. Épingler lockfile pnpm après installation vérifiée. CI bootstrap npm provisoire, à durcir. Intégrations Convex/Better Auth/R2/Resend non provisionnées et non testées. Routes privées actuellement fermées; aucun faux auth ou envoi. Les modules ne seront ouverts qu'après tests E04/E05. Aucun déploiement.
## E04 spike
See AUTH_SETUP.md. Better Auth/Convex/Resend code candidate now present, disabled by default. Provisioning, codegen, live verification and MFA are pending. Initial E01 browser failure is being addressed; do not treat as released.

## E05–E07 spike
See PORTAL_SETUP.md. Investor portal now queries Convex after verified identity and explicit grants; section revisions are projected only when published. Staging-only internal operator commands are intentionally not a production admin API; no MFA evidence yet. Keep default flags off.
