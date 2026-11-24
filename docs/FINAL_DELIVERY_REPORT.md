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
