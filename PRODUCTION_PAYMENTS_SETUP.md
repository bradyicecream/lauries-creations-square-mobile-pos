# Laurie’s Creations — production payments (owner checklist)

**Status:** Source code preparation, not permission to charge real cards. **Sandbox v1.12 remains the public download** and is not changed into a production app.

## 1. Verify the merchant and location

The current **O.P. Gallo Mobile** Square location is `LHV4RK9G8JN4T`; verify this is the location where Laurie’s Creations transactions should be deposited **before** using the production app. The backend fails closed if its expected merchant `SQUARE_EXPECTED_MERCHANT_ID` or Square location does not match. Do not use this build for another Square location by changing only visible text.

## 2. Authorize production payment scopes

On the existing private connection site `https://lauries-square-oauth.netlify.app/oauth/status`, sign in, then choose **Production payment authorization and secure device pairing**. The new link `/oauth/payments-status` requests separate, explicit Square authorization for:

- `MERCHANT_PROFILE_READ`
- `ITEMS_READ` (existing catalog)
- `PAYMENTS_WRITE`
- `PAYMENTS_WRITE_IN_PERSON`

Square's OAuth token status must confirm the permissions and the exact expected merchant before the server issues a pairing code. The read-only catalog still uses its own endpoint.

**Never give ChatGPT, GitHub source code, email, or screenshots an access token, refresh token, admin key, client secret, keystore, or pairing code.** Keep these in authorized services and private device UIs.

## 3. Configure release signing privately

A production app must have a **stable signing key**. Save the keystore and its passwords outside GitHub in a secure backup, and add these GitHub Actions repository secrets:

- `SQUARE_PRODUCTION_APP_ID`: Production application ID for the **same Square developer application** used by Netlify's `SQUARE_APPLICATION_ID`
- `LAURIE_PROD_KEYSTORE_B64`: Base64 of the production signing keystore
- `LAURIE_PROD_STORE_PASSWORD`
- `LAURIE_PROD_KEY_ALIAS`
- `LAURIE_PROD_KEY_PASSWORD`

The workflow **Prepare Laurie POS Production APK (manual and private)** is dispatch-only and produces a private artifact, not a public release. It requires every secret. The produced APK uses package name `com.lauriescreations.mobile.production`, separately from the original `com.lauriescreations.mobile` Sandbox app.

After building, copy the **Signer #1 certificate SHA-256 digest** from the workflow output into the Square Developer Console → your application → **Mobile Payments SDK → Add Signature**, with the exact production package name. The signature must be accepted **before** live charges.

## 4. Pair the live account securely

From the private admin payment status page, click **Create pairing code**. On the signed production Android app, tap **Connect production** and enter that **32-character one-time code**. The pairing expires in five minutes; it is consumed once, delivered to native Android code by HTTPS, and never exposed to the app's JavaScript interface.

OAuth access tokens normally expire after 30 days; create a new pairing code when required. The encrypted backend can refresh its own token if authorized.

## 5. Test hardware and real charges safely

Before the first production charge:

1. Export the current register backup, and preserve the Sandbox app as your test environment.
2. Verify the Android OS and reader are supported; Zebra TC21 and ET51 are not automatically guaranteed by Square. Verify with the specific physical device and reader.
3. On the production register, check the **PRODUCTION MODE • REAL PAYMENTS** banner and linked reader.
4. Have the seller confirm the **exact merchant and O.P. Gallo Mobile location** before accepting any real payments.
5. Validate a small, consensual real transaction using an eligible reader; verify it **in Square Dashboard** before treating the payment as finalized in business records.
6. Review how sales tax, service charges and card-only gratuity are handled for legal and Square-policy compliance. Existing local catalog, carts and cash sales are not Square Order items.

**No self-serve unattended kiosk payments.** Square prohibits Mobile Payments SDK in unattended settings.

## 6. Build validation and publication

On pull requests, CI validates Sandbox and the new production isolation tests without taking payments. No production APK is automatically published or distributed. Release is deliberately held until signatures, OAuth scopes and device support have been validated.

References:
- [Square Android authorization](https://developer.squareup.com/docs/mobile-payments-sdk/android/configure-authorize)
- [Square Mobile Payments SDK](https://developer.squareup.com/docs/mobile-payments-sdk)
- [Square Android setup and signature](https://developer.squareup.com/docs/mobile-payments-sdk/android)
