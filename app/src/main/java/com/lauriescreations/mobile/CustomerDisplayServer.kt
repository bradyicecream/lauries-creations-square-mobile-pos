package com.lauriescreations.mobile

import android.content.res.AssetManager
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicReference

/** Read-only LAN display. Never exposes customer/payment details or Square tokens. */
internal class CustomerDisplayServer(private val assets: AssetManager) {
    private val abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    private val rng = SecureRandom()
    private val code = (1..10).map { abc[rng.nextInt(abc.length)] }.joinToString("")
    private val latest = AtomicReference("""{"items":[],"charges":[],"cashTotalCents":0,"cardTotalCents":0,"cardGratuityCents":0,"incomplete":false,"paid":false}""")
    private val workers = Executors.newFixedThreadPool(4)
    @Volatile private var running = false
    private var listener: ServerSocket? = null

    fun start() {
        try {
            listener = ServerSocket(8765)
            running = true
            Thread({
                while (running) {
                    val client = try { listener?.accept() } catch (_: Exception) { null }
                    if (client != null) {
                        try { workers.execute { serve(client) } } catch (_: Exception) { client.close() }
                    } else break
                }
            }, "LaurieCustomerDisplay").apply { isDaemon = true; start() }
        } catch (_: Exception) {
            running = false
        }
    }
    fun stop() {
        running = false
        try { listener?.close() } catch (_: Exception) {}
        workers.shutdownNow()
    }
    fun status(): String {
        val ip = wifiAddress()
        return JSONObject().apply {
            put("running", running && ip != null)
            put("address", if (running && ip != null) "http://$ip:8765" else "")
            put("pairingCode", if (running && ip != null) code else "")
            put("reason", if (!running) "Display server could not start. Restart the register."
              else if (ip == null) "Connect the register and customer devices to the same Wi-Fi."
              else "")
        }.toString()
    }

    fun publish(raw: String) {
        if (!running || raw.length > 48000) return
        try {
            val input = JSONObject(raw)
            val items = input.optJSONArray("items") ?: JSONArray()
            val charges = input.optJSONArray("charges") ?: JSONArray()
            if (items.length() > 150 || charges.length() > 8) return
            val cleanedItems = JSONArray()
            for (i in 0 until items.length()) {
                val x = items.optJSONObject(i) ?: return
                val cents = x.optLong("lineTotalCents", -2)
                val qty = x.optInt("qty", 0)
                if (cents !in -1..100000000 || qty !in 1..99) return
                cleanedItems.put(JSONObject().apply {
                    put("name", x.optString("name").take(120))
                    put("detail", x.optString("detail").take(250))
                    put("qty", qty)
                    put("lineTotalCents", cents)
                })
            }
            val cleanedCharges = JSONArray()
            for (i in 0 until charges.length()) {
                val x = charges.optJSONObject(i) ?: return
                val cents = x.optLong("cents", -1)
                if (cents !in 0..100000000) return
                cleanedCharges.put(JSONObject().apply {
                    put("label", x.optString("label").take(80))
                    put("cents", cents)
                })
            }
            val cash = input.optLong("cashTotalCents", -1)
            val card = input.optLong("cardTotalCents", -1)
            val gratuity = input.optLong("cardGratuityCents", -1)
            if (cash !in 0..100000000 || card !in 0..100000000 || gratuity !in 0..100000000) return
            latest.set(JSONObject().apply {
                put("items", cleanedItems); put("charges", cleanedCharges)
                put("cashTotalCents", cash); put("cardTotalCents", card)
                put("cardGratuityCents", gratuity)
                put("incomplete", input.optBoolean("incomplete"))
                put("paid", input.optBoolean("paid"))
            }.toString())
        } catch (_: Exception) {
            // Invalid data is not published.
        }
    }

    private fun wifiAddress(): String? {
        val nets = try { NetworkInterface.getNetworkInterfaces() } catch (_: Exception) { null }
            ?: return null
        var backup: String? = null
        while (nets.hasMoreElements()) {
            val net = nets.nextElement()
            if (!net.isUp || net.isLoopback) continue
            val ips = net.inetAddresses
            while (ips.hasMoreElements()) {
                val ip = ips.nextElement()
                if (ip is Inet4Address && ip.isSiteLocalAddress) {
                    if (net.name.startsWith("wlan") || net.name.startsWith("wifi"))
                        return ip.hostAddress
                    if (backup == null) backup = ip.hostAddress
                }
            }
        }
        return backup
    }

    private fun serve(client: Socket) {
        client.use { socket ->
            try {
                socket.soTimeout = 3500
                val reader = BufferedReader(InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8))
                val first = reader.readLine() ?: return
                if (first.length > 2048) { reply(socket, 400, "text/plain", "Bad request"); return }
                val parts = first.split(' ')
                if (parts.size < 2 || parts[0] != "GET") {
                    reply(socket, 405, "text/plain", "Method not allowed"); return
                }
                var pin = ""
                var bytes = 0
                var count = 0
                while (count++ < 40) {
                    val header = reader.readLine() ?: return
                    bytes += header.length
                    if (bytes > 8192) { reply(socket, 400, "text/plain", "Bad request"); return }
                    if (header.isEmpty()) break
                    if (header.startsWith("X-Display-Code:", true))
                        pin = header.substringAfter(':').trim().uppercase()
                }
                if (count > 40) { reply(socket, 400, "text/plain", "Bad request"); return }
                when (parts[1].substringBefore('?')) {
                    "/" -> reply(socket, 200, "text/html; charset=utf-8",
                        assets.open("customer-display.html").bufferedReader().use { it.readText() })
                    "/state" -> if (pin == code) reply(socket, 200, "application/json", latest.get())
                        else reply(socket, 403, "application/json", """{"error":"pairing_required"}""")
                    else -> reply(socket, 404, "text/plain", "Not found")
                }
            } catch (_: Exception) { /* Wi-Fi can disconnect at any moment. */ }
        }
    }

    private fun reply(socket: Socket, status: Int, kind: String, body: String) {
        val data = body.toByteArray(StandardCharsets.UTF_8)
        val reason = when (status) { 200 -> "OK"; 403 -> "Forbidden"; 404 -> "Not Found"
            405 -> "Method Not Allowed"; else -> "Bad Request" }
        val headers = "HTTP/1.1 $status $reason\r\n" +
            "Content-Type: $kind\r\nContent-Length: \${data.size}\r\n" +
            "Cache-Control: no-store, private\r\nReferrer-Policy: no-referrer\r\n" +
            "X-Content-Type-Options: nosniff\r\nX-Frame-Options: DENY\r\n" +
            "Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'\r\n" +
            "Connection: close\r\n\r\n"
        socket.getOutputStream().write(headers.toByteArray(StandardCharsets.UTF_8))
        socket.getOutputStream().write(data)
        socket.getOutputStream().flush()
    }
}
