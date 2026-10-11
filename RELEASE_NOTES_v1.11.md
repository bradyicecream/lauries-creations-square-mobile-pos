# Laurie’s Creations POS v1.11 — Live Customer Display (LAN)

The customer-facing display is now a real second-screen view for the **Android APK**.

## Use it
1. Install the updated app on the Zebra TC21/ET51 and open the register.
2. Connect the Zebra and the second iPad/Zebra to the **same trusted Wi-Fi**.
3. Tap **More → Live customer display** on the cashier.
4. On the customer device, open **Safari/Chrome** and type the address displayed (for example, `http://192.168.x.x:8765`; use the actual address shown).
5. Enter the 10-character pairing code. Updates appear automatically about every second when you add/remove/edit items or complete/clear a test sale.

## Behavior
- Customer sees the current item quantities, variations, flavor/modifier descriptions, line prices, service charges, and cash/card totals (including card-only Gratuity).
- Customer cannot control the register or submit payments.
- No external computer, Raspberry Pi, cloud account, Square login, or Square Catalog integration is required.
- Square connection and payments remain **Sandbox-only**. This does not display orders entered into the separate official Square POS app.

## Limitations
- This is local HTTP rather than encrypted internet hosting. Use a trusted private Wi-Fi, not a public/untrusted network.
- The cashier Android app must remain running, both devices must be on the same reachable network, and guest/client-isolation Wi-Fi must be disabled.
- If the register restarts, use the newly displayed pairing code.
- iPads can be customer screens but **cannot run this Android cashier app**.
- The screen shows the register's current **local** cart, not the official Square POS cart.
