# Laurie’s Creations POS v1.7.0 — Required Charges (Sandbox)

**Square Sandbox test app; required charges default OFF.**

### New checkout settings

Open **More → Automatic gratuity & service charges** or **Manage register → Required charges**. The two independently configured rules are:

- **Automatic gratuity:** Required percentage (such as 18%) or fixed dollar amount. Mandatory gratuities are treated as service charges, **not** voluntary tips.
- **Service charge:** A separately named required percentage or fixed dollar amount.

Each rule may be enabled or disabled without affecting the other, may be assigned its own custom checkout label, and has an independent **Include in manual sales-tax base** checkbox. Both rules are off by default on new installs and upgrades.

The required charges are calculated from the **original pre-tax item subtotal**, not compounded on each other. Each appears separately on the sale and customer display preview before checkout. With mandatory charges enabled, the register still permits a **separate optional voluntary tip**, including $0. Required fees are part of the Square Sandbox *base payment*, not its voluntary `tipMoney`.

The exact same calculator is used for cart previews, manual taxes, cash tender amounts and change, local cash history, and recorded Square Sandbox test payments. A pending Square payment is validated against the original base amount.

### Important limitations

This app does not create Square Order service-charge objects or synchronize required charge settings, staff payroll, live taxes, or actual Square catalog records. Under IRS guidance, mandatory gratuities are service charges, not voluntary tips, even if given to staff. Confirm applicable local tax, disclosure, employment, and surcharge rules before charging real customers.

Back up device-local register settings before reinstalling a debug-signed APK.
