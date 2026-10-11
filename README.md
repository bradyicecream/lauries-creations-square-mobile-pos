# 💜 Laurie's Creations — Square Mobile POS

**New, separate Android repository.** The existing `lauries-creations-android-pos` GitHub repository is not changed.

A purple, touch-friendly Laurie’s Creations register for Zebra TC21 handhelds and ET51 Android tablets. The included native Android bridge uses **Square Mobile Payments SDK 2.6.1**, not the older Point of Sale API.

## Included in this starter

- Square-inspired checkout interface: Favorites grid, searchable Item Library, custom-amount keypad, bottom Checkout / Activity / More navigation, and mobile sale drawer\n- Fully branded register with responsive handheld / tablet layout
- Confirmed catalog examples: Tumbler ($25) with Black OSU, White OSU, Black OU, White OU; Autism awareness ($1); Halloween bracelet ($3)
- Ice cream product buttons with editable flavors, flavor availability, per-scoop upcharges, and flavor editing **after adding to the cart**
- Editable product names, prices, categories, variations, and named modifier upcharges
- Multiple quantities, persistent cart, manually editable tax percentage, total review, data export/import
- Square **Sandbox** authorization, mock-reader pairing, and test checkout via native Mobile Payments SDK
- GitHub Actions build of Android debug APK from an iPhone; no local Android Studio necessary

**Not yet included**: Square product / order / modifier / tax sync, OAuth server, release signing, production processing, USB printer / cash drawer, iPad build, or synchronizing settings across devices. The starter contains only prices independently confirmed in the project; ice cream base prices deliberately require your confirmation. 

## Security and payment boundaries

This is a **Sandbox-only** implementation. It deliberately refuses SDK initialization if the configured application ID is not a Sandbox ID, and makes no real charges. Never place Square access tokens, production personal access tokens, or a signing key in this repository. The app asks for a **Sandbox** personal access token and Sandbox location ID in a native dialog on the device; the token is passed to Square's authorization API and is not written to the register's localStorage. For production, implement OAuth with a backend token refresh and verify compliance/security with Square.

Square takes over the screen for the secure payment flow. The register's total is passed as a single amount (USD cents), with a summary note/reference. It does **not** create an itemized Square order or synchronize the inventory catalog. A successful SDK response doesn't automatically erase the sale: check the Sandbox Dashboard and manually clear the cart.

## How to create a *new* GitHub repository using an iPhone

1. Sign in to GitHub and go to **https://github.com/new**.
2. Name it **`lauries-creations-square-mobile-pos`**. Choose **Private** if you want to limit access. Select a README so the repository has a `main` branch, then create it.
3. Share that repository link with ChatGPT; the connected GitHub integration can upload this prepared source into it, without changing the previous repo. Or upload files from this ZIP using a device with a Git client.
4. After source is uploaded, go to **Settings → Secrets and variables → Actions → New repository secret**, name it **`SQUARE_SANDBOX_APP_ID`**, and set it to your Square **Sandbox Application ID** (not an access token).
5. Open **Actions → Build Laurie Square Mobile POS (Sandbox) → Run workflow**, select main. When the build succeeds, download the `Lauries-Creations-Square-Sandbox-APK` artifact ZIP.
6. Extract `app-debug.apk` and transfer it to the Zebra Android device, then install. This is a **debug** APK for testing only. Debug signing may vary by build; update installs might need a stable signing scheme.
7. On the Zebra, tap **Connect Sandbox** and grant permissions. Tap again; enter the **Sandbox access token and location ID** on the device, not in GitHub.
8. Add a simulated reader with the floating Mock Reader UI and test a sale. Physical Square readers **do not work in Sandbox**. Connect a physical reader only in a later production version.

## Device compatibility

- Square Mobile Payments SDK requires Android **9 (API 28) or later**. If your Zebra ET51 runs Android 8.1, it must be upgraded to a supported version before this app installs.
- Zebra TC21 and ET51 models can have different Android OS versions. Check **Settings → About device → Android version** on each actual device.
- Square warns that uncommon/OEM devices can fail its security or reader checks. Test with Sandbox first; being Android 9+ does **not** guarantee Square reader support.
- Location services and the device's clock must be correct. Rooted devices, custom ROMs, screen capture / elevated privilege software may be rejected by Square.
- Square's **Tap to Pay on Android** requires a specifically compatible phone and is not supported on tablets; the TC21's NFC alone does not guarantee eligibility.

## Building locally (optional)

Requires JDK 17, Android SDK 36, Gradle 8.13, and internet to resolve the Square SDK Maven repository.

```
gradle :app:assembleDebug -PsquareSandboxAppId=YOUR_SANDBOX_APPLICATION_ID
```

Without that property, the register UI remains usable in preview/offline practice mode, but the Square button cannot authorize.

## Project layout

- `app/src/main/assets/` — offline browser register, CSS and UI state
- `app/src/main/java/.../MainActivity.kt` — Android WebView + Square Mobile Payments SDK bridge
- `app/src/main/java/.../LaurieApplication.kt` — Square initialization
- `.github/workflows/build-android.yml` — download-ready debug APK automation

Official docs: https://developer.squareup.com/docs/mobile-payments-sdk/android

**Development status:** A prior Sandbox APK build succeeded. The Square-style v1.1 interface and on-device checkout must be validated with a fresh CI build and real device tests. This is a custom Laurie’s Creations interface inspired by common POS navigation patterns, not a modified or official Square Point of Sale app.
