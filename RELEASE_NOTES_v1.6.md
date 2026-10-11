# Laurie’s Creations POS v1.6.0 — Sandbox Operations Preview

**Android Sandbox test build only. Not for production payments or official payroll/banking.**

## Device-local capabilities
- Staff names, clock-in and clock-out records (not secure payroll).
- Basic product-level inventory tracking, low-stock notifications in the register, stock deduction once on completed locally recorded cash or Sandbox card sales.
- Local cash register sessions, opening floats, paid-in/paid-out movements, expected/actual closing balance and variance.
- Local test customer nicknames and reward points (no Square Loyalty redemption or live customer matching).
- Sales activity for local cash records and Square Sandbox test confirmations.
- Customer-facing order display **preview on this device only**.
- Checkout with 0%, 10%, 15%, 20%, 25% and custom tips; tipMoney transmitted separately on Square Sandbox test payments.
- Automatic cash tender buttons with exact amount and convenient rounded amounts, plus change due.

## Requires further integrations
- **Payment Links:** a secure server-side Square Checkout API connection; no actual link creation yet.
- **Banking:** authenticated Square Dashboard; no bank balances, payouts or transfers available in this app.
- **Two-device customer-facing display:** a secure real-time relay or paired display service; this version does not sync a separate iPad.

Existing products, modifiers, Favorites groups, optional Keypad/Library tabs, and Square Sandbox setup have been retained. Back up locally edited register data before reinstalling the debug-signed APK.
