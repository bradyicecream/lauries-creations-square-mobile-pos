# Laurie’s Creations POS v1.10.0 — Settings & Add-ons (Sandbox)

**Custom Android register only. Not the official Square Point of Sale app.**

## Settings & Add-ons hub
Open **More → All settings & add-ons** or the ⚙ button. Browse more than 50 named features grouped into:
- Checkout
- Items & inventory
- Customers & engagement
- Staff & shifts
- Hardware & devices
- Payments & money
- Business & extensions

Each entry visibly distinguishes **On this device**, **Local preview**, **Square connection required**, **Additional hardware required**, or **Square subscription/service**. Tapping an existing local function (cash management, products, modifiers, inventory, local loyalty, staff/timecards, etc.) opens the real editor instead of an inactive mock panel.

## Five functional, saved register preferences
Open **More → Register preferences** (or choose that action from the settings hub):
- One-tap adding simple products, or always open the product editor.
- Show/hide locally tracked stock levels on Favorites tiles.
- Compact/expanded Favorites grid.
- Show/hide empty Favorites tile placeholders when not editing.
- Require/skip confirmation before clearing a sale.

Preferences are stored in register WebView localStorage and exported with the register's JSON backup. They do **not** synchronize to other devices or the Square POS app.

## Unconnected or separately licensed services
Square Catalog/Inventory/Customers/Loyalty APIs, live payment links, Banking, invoices, appointments, marketing, scheduling/payroll, retail/restaurant modes, live customer displays, receipt/cash drawer hardware and paid app add-ons need their own authenticated provider connections, approved hardware, or eligible subscriptions. This settings directory does not activate subscriptions, install marketplace apps, or access Square financial data. Square's official POS supports modes and advanced capabilities subject to account and device eligibility.

**Existing checkout behavior:** no local calculated sales tax, required Gratuity (if enabled) charged only on Square Sandbox card tests, not local cash; a separately configured service charge may apply to both. The card-only fee can be subject to surcharge restrictions in live commerce, and legal tax obligations may remain.

Always back up locally edited register data before replacing an older debug-signed APK.
