# ADC Investor Room — release procedure

Existing Vercel project: adc-9600/adc-investor-room. Existing custom domain: dataroom.africandigitconsulting.com. Never create a replacement project or new production database. The release branch derives from the existing local-agent work; compare the currently deployed local source and preserve any unpublished changes before deploying.

Production environment: CONVEX_DEPLOY_KEY (deployment-scoped, sensitive, Production only), VITE_CONVEX_URL and VITE_CONVEX_SITE_URL (existing production endpoints). Do not retrieve, print, commit or transfer the key. Existing Convex authentication, MFA, Resend and storage settings stay unchanged.

`vercel.json` uses `npm run build:vercel`. In a Vercel production build the locked Convex CLI resolves the target from the key; the command verifies that the resolved URL matches both existing frontend endpoints before running the frontend build. Convex then typechecks, regenerates bindings and deploys the schema/functions. A mismatch or missing key fails the build before push. Preview builds do not run a Convex deployment. The script deliberately rejects custom Convex endpoint names until separately reviewed. Production variables and actual token permission still require validation in Vercel's build environment.

Release gates: check clean source, exact reviewed SHA, green CI, production backup/recovery procedure and test invitation/new-user magic link/email OTP/TOTP/inactivity/revocation. On an authorized Vercel plan, use the existing local CLI project link (do not link an unrelated project):

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run test:e2e
vercel deploy --prod --skip-domain --scope adc-9600
```

The last command runs a production build (including the Convex push) but does not assign production domains. Check the build logs without exposing secrets. Test the staged deployment with authorized test accounts and approved origins; callback URLs remain the canonical production URL, so the full end-to-end test must also be performed on the canonical domain after promotion. Promote only the verified deployment ID, then verify logs and sign-in on the canonical domain. Do not disable access controls for testing.

A frontend rollback does not roll back Convex automatically. Keep the previous backend revision, verify compatibility and use the same reviewed deployment process to revert backend functions if needed. Never replace or import production data as part of a code rollback. No production release executed by this commit. Vercel Hobby does not support direct private organization Git integration; follow Vercel's applicable plan terms.

## Dedicated Convex production cutover

The current live Vercel release has historically targeted the development deployment `dev/recette`. Do not treat a successful Vercel build as proof of a production-class Convex backend. Follow [CONVEX_PRODUCTION_MIGRATION.md](./CONVEX_PRODUCTION_MIGRATION.md) for an independently approved migration with backups, controlled cutover, and a verified rollback. Until then keep the existing endpoint guard and release target unchanged.
