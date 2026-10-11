# Laurie’s Creations — Dedicated Square OAuth Backend

This code is for the **new, separate Netlify project**: https://app.netlify.com/projects/lauries-square-oauth

The backend lives in its own folder within the existing Laurie’s Creations POS GitHub repo. It does not alter the register APK, and no real Square credentials have been configured or accessed.

## Deployment from an iPhone

1. Open https://app.netlify.com/projects/lauries-square-oauth.
2. Under Project configuration → Build & deploy → Continuous deployment → Repository, choose Link repository.
3. Select GitHub repository **bradyicecream/lauries-creations-square-mobile-pos**, branch **main**.
4. Set **Base directory** to exactly: square-oauth-backend
5. The folder contains its own netlify.toml: publish directory is public; function directory is netlify/functions.
6. Deploy and check that the production site is published.
7. If the new project's production visitors are blocked behind Netlify SSO, you must remove site-level SSO **after the secure functions are deployed** so Square can reach the callback. The backend itself still requires an independent private administrator login.

## Production OAuth redirect URI

https://lauries-square-oauth.netlify.app/oauth/callback

Do **not** register the URI in the Square developer console until the site and its functions have been successfully deployed.

## Required private Netlify environment variables

Under Project configuration → Environment variables set:

- SQUARE_APPLICATION_ID — production application ID of the Laurie’s creations Square developer app.
- SQUARE_APPLICATION_SECRET — confidential production application secret. NEVER share in chat or commit to GitHub.
- SQUARE_REDIRECT_URI — https://lauries-square-oauth.netlify.app/oauth/callback
- LAURIE_OAUTH_ADMIN_KEY — long unique randomly generated administrator password, at least 24 characters.
- LAURIE_OAUTH_ENCRYPTION_KEY — base64-encoded 32 cryptographically random bytes. Generate in a trusted terminal with: openssl rand -base64 32.
- SQUARE_EXPECTED_MERCHANT_ID — optional, only after confirming the seller's merchant ID independently.

Save private settings directly inside Netlify, not in this repository, the Android app, screenshots, or ChatGPT. Environment variable changes require a fresh deploy. On the Free plan, site environment variables are normally shared across scopes; on eligible plans you can restrict to Functions.

## Authorizing the Square account after deployment

1. Open https://lauries-square-oauth.netlify.app.
2. Sign in with the private administrator password.
3. Choose Connect Square securely and approve only read-only MERCHANT_PROFILE_READ and ITEMS_READ scopes.
4. Inspect the authenticated location names and IDs. Confirm the correct location for O.P. Gallo mobile / Laurie’s Creations before adding any inventory or payment-related permissions.
5. Inspect the sample read-only catalog if needed.

The production OAuth code stores access/refresh tokens encrypted (AES-256-GCM) in Netlify Blobs. It uses short-lived signed admin sessions, browser-bound OAuth state validation, no-cache headers, and read-only Square endpoints. Tokens are never displayed to the browser or stored in the Android APK.

It is the foundation for later secure catalog, inventory, customer and licensed feature connections — **not live Square sync yet**. It does not unlock paid Square subscriptions or provide live card processing, financial account access, payroll or banking.

**Protect the encryption key** in a password manager; loss of it means existing stored OAuth tokens must be discarded and the seller reauthorized.
