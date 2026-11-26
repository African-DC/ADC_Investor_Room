# Rapport de livraison — état au 2026-11-24 (en cours)

Ce rapport est volontairement honnête : il ne déclare **terminé** que ce qui a été exécuté et vérifié.

## Base de départ
- HEAD distant `feat/E01-foundations` : `c8267cd` (PR #62, CI `verify` verte : runs 45508992464 et 45508981140).
- Travail de cette session poussé sur la branche `claude/wonderful-thompson-qv1lpw` (basée sur `c8267cd`), à fusionner dans `feat/E01-foundations` après revue.

## Vérifications exécutées localement (Node 22.23.5, npm 10.9.9)
| Commande | Résultat |
|---|---|
| `npm ci` | OK, 0 vulnérabilité |
| `npm run build` | OK |
| `npm run typecheck` (app + convex) | OK |
| `npm run lint` | OK |
| `npm test` | 24 fichiers / 37 tests OK |
| `npm run test:e2e` | 6/6 OK (Chromium préinstallé du conteneur) |

## Corrections apportées
1. **Bug bloquant upload Convex File Storage** : `completeUpload` comparait le SHA-256 hexadécimal calculé par le serveur à `_storage.sha256`, que Convex stocke en **base64** → tout upload réel aurait été refusé. Corrigé via `convex/lib/hash.ts` + test `tests/hash.test.ts`.
2. **Nettoyage R2/S3** : `@aws-sdk/client-s3` désinstallé (lockfile régénéré), champ `objectKey` supprimé du schéma, `storageId` désormais obligatoire.
3. **Fixtures** : `registerDraft` (staging/test uniquement) exige un objet Convex Storage réel ; taille, type MIME, empreinte et usage unique vérifiés. Les tests utilisent un PDF synthétique stocké via l'émulation convex-test (`tests/storageFixture.ts`), avec cas négatifs (hash faux, taille fausse, réutilisation).

## Non réalisé — nécessite une intervention humaine
Aucun identifiant de service n'est disponible dans ce conteneur cloud (pas de `CONVEX_DEPLOY_KEY`, token Vercel, clé Resend, clé AI Gateway, ni CLI `gh`). Donc **non effectué** :
- Phase B : création/liaison du projet Convex dev, `npx convex dev` / codegen officiel (les bindings `convex/_generated` restent ceux du dépôt), variables Convex, crons live, sauvegarde/restauration.
- Phase C : recette Better Auth live (lien magique, MFA admin step-up). Le MFA admin réellement vérifié côté serveur reste un **P0 ouvert** avant production.
- Phase D : domaine expéditeur Resend vérifié et réception réelle.
- Phase M/N : preview Vercel, comptes de test, recette end-to-end live.
- Scanner antivirus réel, mise à jour des issues #1–61.

## Décisions requises avant production
- Choix du mécanisme MFA admin compatible passwordless (WebAuthn recommandé) et sa recette.
- Politique de traitement des données pour AI Gateway.
- Fournisseur antivirus et format du verdict signé.
- Domaine d'envoi Resend et domaine applicatif.
- Architecture pour documents > 3 Mio (upload direct via URL Convex à usage unique côté admin + vérification post-upload, recommandé).

## Mise à jour 2026-11-25 — services configurés
- **Convex** : projet `adc-investor-room` (équipe djedjelipatrick), déploiement dev `expert-bulldog-136`; schéma, index, composant Better Auth et fonctions déployés; `convex/_generated` régénéré officiellement. Variables : SITE_URL, BETTER_AUTH_SECRET (aléatoire), RESEND_API_KEY, MAIL_FROM.
- **Vercel** : projet `adc-investor-room` (équipe ADC, hobby). URL : https://adc-investor-room.vercel.app. Variables : VITE_CONVEX_URL, VITE_CONVEX_SITE_URL, ADC_APP_ORIGIN, ADC_AUTH_ENABLED, VITE_ADC_AUTH_ENABLED. Build via preset Nitro `vercel`. Un secret « Protection Bypass for Automation » a été ajouté au projet par `vercel curl` (à révoquer si inutile).
- **Resend** : domaine vérifié `klassci.com` (click/open tracking désactivés). Clé dédiée `adc-investor-room-recette`, permission envoi seul, limitée à ce domaine. Expéditeur recette : `investor-room@klassci.com` (à remplacer par un domaine ADC dédié avant production).
- **Preuve** : POST `/api/auth/sign-in/magic-link` pour `delivered@resend.dev` → HTTP 200, e-mail « ADC Investor Room — Vérifiez votre accès » au statut `delivered` dans Resend.
- **Design** : palette alignée sur adc-website (orange #e8590c / #c2410c, vert #1a5d3a, ivoire #fbf7f2).

## Mise à jour 2026-11-26 — avancement
- Back-office : coque UI SDK (navigation, palette ⌘K, toasts, confirmations), éditeur de pages par blocs (texte riche Tiptap, graphiques SVG validés, images, galerie), matrice d'accès datée, groupes, liens d'invitation temporaires, équipe ADC (invitations, rôles, révocation), journal des notifications.
- Sécurité : MFA TOTP lié à la session sur toutes les fonctions d'administration ; publication en deux temps (auteur ≠ relecteur) ; documents vérifiés manuellement en recette (`ADC_MANUAL_SCAN_ALLOWED`), aucune URL de stockage exposée.
- Notifications : outbox idempotente (clé unique + Idempotency-Key Resend), reprises 1 min → 6 h, statut « envoyé » uniquement après acceptation Resend. Preuve : e-mail « Votre accès est ouvert » vers delivered@resend.dev → statut sent + `delivered` côté Resend.
- Expéditeur : `investor-room@africandigitconsulting.com` (domaine vérifié Resend, tracking désactivé).
- Restant avant production : recette complète avec comptes réels, base Convex de production sans drapeaux de staging, antivirus réel, traductions EN, déploiement Vercel sans contournement (auteur des commits), audit accessibilité/performance, sauvegarde/restauration.
