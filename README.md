# 💜 Laurie's Creations — Square Mobile POS

**v1.7 — Required gratuity + service charge:** Open **More → Automatic gratuity & service charges** or **Manage register → Required charges** to turn on each independently. Both are **off by default**. Choose a percentage of item subtotal or fixed dollar amount, a checkout label, and whether that charge is included in the manually calculated sales-tax base. Both charges show on the cart, customer-display preview, and checkout breakdown **before payment**. They are added to the Square Sandbox **base amount** (not Square tipMoney), with separate voluntary tipping still available. Cash sessions, sale records, expected cash, and inventory use the same breakdown. Since mandatory gratuities are service charges under US federal tip rules, they are recorded separately from voluntary tips; this app does not run payroll or synchronize Square service-charge objects. Determine required disclosures and taxability under the applicable laws before accepting real payments. No live Square production payments.


**v1.6 — Operations preview (Sandbox + device-local):** Adds **More → Staff & time cards** (local named staff/clock in and out; not verified payroll), **Inventory** (product-level count, low stock and deduction only once per completed local/Sandbox sale), **Cash management** (open/close cash session, reconcile, paid-in/paid-out, local cash sales), **Loyalty** (local test identifiers and points, not Square Loyalty), and **Customer display preview** (on the register only, not synchronized to another iPad). **Checkout** now offers 0/10/15/20/25% or custom tips, automatic cash tender suggestions and change due, local cash record, and Square Sandbox card tests passing the tip separately via the Mobile Payments SDK. **Payment links and Banking** are explicitly marked as requiring authenticated Square Dashboard/backend; they do not create links or access accounts. No bank credentials or Square API tokens are stored in the register. Do not use these device-local mock records as payroll, banking, or official Square reports. Export your backup before reinstalling.


**v1.5 — Square-inspired checkout redesign:** Neutral, touch-friendly register grid; strong order summary; tablet sidebar and mobile bottom navigation; one-tap adding for simple priced items; separate configuration sheet for variations, flavors and modifiers; quantity +/- controls on each cart line; editable sale notes included in the Sandbox payment note; search within Favorites and full Library. The custom Favorites groups, optional visibility of Keypad/Library, saved products/modifiers and Sandbox SDK are retained. This is Laurie’s Creations’ independent POS app—not a reskin of the official Square POS. It still does not sync your live Square catalog or take real payments.


**v1.4 Sandbox modifier editor:** Open **More → Modifier groups — all categories** (or **Manage register → Modifier groups**) to create, rename, edit and delete reusable modifier sets. Each set contains named options, prices/upcharges, availability, and minimum/maximum selected choices. Choose **Assign** to apply it to a whole category or all products, or open an individual item under **More → Products, modifiers & tax** and check any desired groups. Existing saved item modifiers are migrated to editable groups and remain attached to their items. Changes stay on this device only; Square Sandbox does not synchronize your live catalog. An unverified option price cannot be used for checkout.\n\n**v1.3.1 Sandbox optional tabs:** Open Checkout → ⚙ Edit tabs (or More → Edit Favorites tabs and groups). Under **Optional checkout tabs**, separately uncheck **Show Keypad** or **Show Library** to hide them. Either or both may be hidden. Turn them on again using the same settings; Favorites and your product library are never deleted. Changes save automatically on the current device, persist after reopening the app, and are included in exported register backups.\n\n**v1.3 Sandbox custom Favorites:** The Checkout screen now supports multiple customizable Favorites tabs. Tap **＋ Tab** to create one, **Edit tabs** to rename, remove or move tabs left/right, and **★ Edit items** to choose or rearrange the products in a group. In the full Item Library, ★ adds/removes an item from the selected group. In Library tap **Change group** to select which group the stars edit. **More → Edit Favorites tabs and groups** also opens the manager. This information stays in the device-local register backup, and existing single Favorites selections migrate automatically. This is not Square Favorites synchronization.

**v1.2.1 Sandbox setup fix:** Connect Sandbox now displays a native setup/permissions dialog or clear SDK error. Open **More → Check Square connection status** to see whether the SDK is initialized, authorized, or unavailable. You must install the Android APK on the Zebra; browser previews cannot authorize payments. The bundled catalog remains a saved snapshot, not a live Square catalog sync.

**New, separate Android repository.** The existing `lauries-creations-android-pos` GitHub repository is not changed.

A purple, touch-friendly Laurie’s Creations register for Zebra TC21 handhelds and ET51 Android tablets. The included native Android bridge uses **Square Mobile Payments SDK 2.6.1**, not the older Point of Sale API.

## Included in this starter

- Square-inspired checkout interface: editable Favorites groups, searchable Item Library, custom-amount keypad, bottom Checkout / Activity / More navigation, and mobile sale drawer\n- A saved register snapshot with 29 item records and 102 modifier options is bundled. Fresh installs see the saved snapshot; existing installs can choose **More → Restore saved item library** to merge missing products without overwriting local prices or cart. This is NOT a live Square sync.\n- Original prices marked for review are blocked from checkout until the product is reviewed under Manage.\n- Fully branded register with responsive handheld / tablet layout
- Confirmed catalog examples: Tumbler ($25) with Black OSU, White OSU, Black OU, White OU; Autism awareness ($1); Halloween bracelet ($3)
- Ice cream product buttons with editable flavors, flavor availability, per-scoop upcharges, and flavor editing **after adding to the cart**
- Editable product names, prices, categories, variations, and named modifier upcharges
- Multiple quantities, persistent cart, manually editable tax percentage, total review, data export/import
- Square **Sandbox** authorization, mock-reader pairing, and test checkout via native Mobile Payments SDK
- GitHub Actions build of Android debug APK from an iPhone; no local Android Studio necessary

**Not yet included**: Square product / order / modifier / tax sync, OAuth server, release signing, production processing, USB printer / cash drawer, iPad build, or synchronizing settings across devices. The restored catalog is an older, partial Square snapshot and may differ from your full current Square Item Library. Always verify variation and modifier prices before processing a Sandbox checkout. 

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
