# Laurie’s Creations POS v1.8.0 — Card-only Gratuity and Zero Tax

This is a **Square Sandbox test application**, not the production Square POS application.

## Updated checkout
- **New sales have no tax calculated** for local cash or Sandbox card payments, even if older device settings or imported backups contained a tax rate. Historic sale records remain unchanged.
- The mandatory charge is displayed as **Gratuity**, not “Automatic gratuity,” and can still be configured as a percentage or fixed amount.
- **Gratuity applies only to Sandbox card payments**, never cash sales.
- An independently enabled **Service charge** still applies to both payment types.
- The checkout cart shows the **cash total** separately from the **card total**, with the added Gratuity clearly identified as card-only.
- The quick cash-tender buttons and change-due calculations use the cash total, without the card-only Gratuity.
- Voluntary additional tips remain separate from mandatory Gratuity. Only truly optional extra tips are sent through Square's `tipMoney` parameter; the required card Gratuity is included in the base amount.
- Local sale records, card payment amount verification, cash management and preview use the correct per-tender totals.

## Regulatory limitations
A mandatory card-only Gratuity can be treated as a regulated card surcharge, regardless of the wording. Square’s surcharge rules may impose percentage caps and may prohibit surcharges on certain tender types; **this Sandbox prototype does not implement live card-network surcharge compliance**. Turning off local tax computation does not establish that a transaction is tax-exempt. Review legal obligations before live use. This APK supports testing only and does not handle production payments.

Back up your existing local register data before replacing the earlier debug-signed app.
