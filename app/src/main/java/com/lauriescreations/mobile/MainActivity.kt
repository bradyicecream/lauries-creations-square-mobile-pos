package com.lauriescreations.mobile

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.ValueCallback
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Toast
import com.squareup.sdk.mobilepayments.MobilePaymentsSdk
import com.squareup.sdk.mobilepayments.core.Result.Failure
import com.squareup.sdk.mobilepayments.core.Result.Success
import com.squareup.sdk.mobilepayments.mockreader.ui.MockReaderUI
import com.squareup.sdk.mobilepayments.payment.CurrencyCode
import com.squareup.sdk.mobilepayments.payment.Money
import com.squareup.sdk.mobilepayments.payment.Payment.OfflinePayment
import com.squareup.sdk.mobilepayments.payment.Payment.OnlinePayment
import com.squareup.sdk.mobilepayments.payment.PaymentParameters
import com.squareup.sdk.mobilepayments.payment.ProcessingMode
import com.squareup.sdk.mobilepayments.payment.PromptMode
import com.squareup.sdk.mobilepayments.payment.PromptParameters
import org.json.JSONObject
import java.util.UUID

class MainActivity : Activity() {
    private lateinit var browser: WebView
    private lateinit var customerDisplay: CustomerDisplayServer
    private var inPayment = false
    private var selectedFileCallback: ValueCallback<Array<Uri>>? = null
    private val filePickerRequest = 701
    private val squareReady: Boolean get() = (application as LaurieApplication).sdkReady

    private fun notifyUI(type: String, message: String, paymentId: String = "") {
        if (!::browser.isInitialized) return
        val payload = JSONObject().apply {
            put("type", type)
            put("message", message)
            put("paymentId", paymentId)
            put("sandbox", true)
        }.toString()
        runOnUiThread {
            browser.evaluateJavascript("window.receiveSquareEvent && window.receiveSquareEvent(${JSONObject.quote(payload)});", null)
            if (type == "error") Toast.makeText(this, message, Toast.LENGTH_LONG).show()
        }
    }

    private inner class RegisterBridge {
        @JavascriptInterface fun displayStatus(): String = customerDisplay.status()
        @JavascriptInterface fun displayPublish(snapshot: String) { customerDisplay.publish(snapshot) }
        @JavascriptInterface fun shareDisplayDetails() = runOnUiThread {
            val details = JSONObject(customerDisplay.status())
            if (!details.optBoolean("running")) return@runOnUiThread
            val address = details.optString("address")
            val code = details.optString("pairingCode")
            val share = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, "Laurie’s Creations customer display\n\nOpen on the second iPad or Zebra: $address\nPairing code: $code\n\nBoth devices must use the same Wi-Fi. Display is view-only and uses no Square account credentials.")
            }
            startActivity(Intent.createChooser(share, "Share customer display instructions"))
        }
        @JavascriptInterface fun squareState(): String {
            if (!squareReady) return "not-configured"
            return if (MobilePaymentsSdk.authorizationManager().authorizationState.isAuthorized) "authorized-sandbox" else "unauthorized-sandbox"
        }
        @JavascriptInterface fun configureSquare() = runOnUiThread {
            try {
                configureSquareDialog()
            } catch (error: Exception) {
                android.util.Log.e("LauriePOS", "Sandbox setup screen could not open", error)
                AlertDialog.Builder(this@MainActivity)
                    .setTitle("Square Sandbox setup error")
                    .setMessage("The connection screen could not open: ${error.javaClass.simpleName}. Check your Android version and Square SDK compatibility, then reopen the app.")
                    .setPositiveButton("OK", null)
                    .show()
                notifyUI("error", "Square connection setup failed: ${error.javaClass.simpleName}")
            }
        }
        @JavascriptInterface fun readerSettings() = runOnUiThread {
            if (!squareReady || !MobilePaymentsSdk.authorizationManager().authorizationState.isAuthorized) {
                notifyUI("error", "Connect to Square Sandbox first.")
                return@runOnUiThread
            }
            MobilePaymentsSdk.settingsManager().showSettings { result ->
                if (result is Failure) notifyUI("error", "Reader settings: ${result.errorCode}")
            }
        }
        @JavascriptInterface fun takePayment(amountCents: Int, referenceId: String, note: String, tipCents: Int) = runOnUiThread {
            startSandboxPayment(amountCents, referenceId, note, tipCents)
        }
        @JavascriptInterface fun openSquareDashboard() = runOnUiThread {
            try {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://squareup.com/dashboard")))
            } catch (ex: Exception) {
                notifyUI("error", "Could not open browser: ${ex.javaClass.simpleName}")
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        customerDisplay = CustomerDisplayServer(assets).also { it.start() }
        browser = WebView(this)
        browser.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                selectedFileCallback?.onReceiveValue(null)
                selectedFileCallback = filePathCallback
                val picker = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                }
                try {
                    startActivityForResult(picker, filePickerRequest)
                } catch (error: Exception) {
                    selectedFileCallback?.onReceiveValue(null)
                    selectedFileCallback = null
                    Toast.makeText(this@MainActivity, "Cannot open file picker", Toast.LENGTH_LONG).show()
                }
                return true
            }
        }
        browser.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = true
        }
        browser.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            // File chooser grants access only to the JSON file explicitly picked by the owner.
            allowContentAccess = true
            javaScriptCanOpenWindowsAutomatically = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = false
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = false
        }
        browser.addJavascriptInterface(RegisterBridge(), "LaurieSquare")
        setContentView(browser)
        browser.loadUrl("file:///android_asset/index.html")
        if (squareReady && MobilePaymentsSdk.authorizationManager().authorizationState.isAuthorized) {
            MockReaderUI.show()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != filePickerRequest) return
        val callback = selectedFileCallback ?: return
        selectedFileCallback = null
        callback.onReceiveValue(if (resultCode == RESULT_OK) data?.data?.let { arrayOf(it) } else null)
    }

    private fun requiredPermissions(): Array<String> {
        val result = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.RECORD_AUDIO
        )
        if (Build.VERSION.SDK_INT >= 31) {
            result.add(Manifest.permission.BLUETOOTH_CONNECT)
            result.add(Manifest.permission.BLUETOOTH_SCAN)
        }
        return result.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }.toTypedArray()
    }

    private fun configureSquareDialog() {
        if (!squareReady) {
            val detail = if (BuildConfig.SQUARE_SANDBOX_APP_ID.isBlank()) {
                "This installed APK was built without the Square Sandbox Application ID. Check the GitHub SQUARE_SANDBOX_APP_ID build secret and reinstall a correctly configured APK."
            } else {
                "The APK contains a Square Application ID, but the Mobile Payments SDK was not initialized in Sandbox mode. Restart the app and check SDK/device compatibility."
            }
            AlertDialog.Builder(this)
                .setTitle("Square Sandbox not ready")
                .setMessage(detail + "\\n\\nApp version: " + BuildConfig.VERSION_NAME)
                .setPositiveButton("OK", null)
                .show()
            return
        }
        val pendingPermissions = requiredPermissions()
        if (pendingPermissions.isNotEmpty()) {
            AlertDialog.Builder(this)
                .setTitle("Allow Square device permissions")
                .setMessage("Square needs Android device permissions before it can connect. Tap Continue, grant the requested permissions, and the setup form will open automatically. If you previously denied a permission, open Android Settings and allow it for Laurie’s Creations POS.")
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Continue") { _, _ ->
                    requestPermissions(pendingPermissions, 140)
                }.show()
            return
        }
        if (MobilePaymentsSdk.authorizationManager().authorizationState.isAuthorized) {
            AlertDialog.Builder(this)
                .setTitle("Square Sandbox already connected")
                .setMessage("This register is already authorized for Sandbox test payments. Tap Reader Settings or use the mock reader for a test checkout.")
                .setPositiveButton("OK", null)
                .show()
            notifyUI("authorized", "Square Sandbox is already connected.")
            MockReaderUI.show()
            return
        }
        val pad = (resources.displayMetrics.density * 18).toInt()
        val form = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, 0)
        }
        val tokenField = EditText(this).apply {
            hint = "Sandbox access token (not production)"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            isSingleLine = true
        }
        val locationField = EditText(this).apply {
            hint = "Sandbox location ID"
            isSingleLine = true
        }
        form.addView(tokenField, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        form.addView(locationField, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        AlertDialog.Builder(this)
            .setTitle("Connect Square Sandbox")
            .setMessage("Use Sandbox credentials only. Token is not saved to the register or repository. Never enter your production access token here.")
            .setView(form)
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Connect") { _, _ ->
                val token = tokenField.text.toString().trim()
                val location = locationField.text.toString().trim()
                tokenField.text.clear()
                if (token.isBlank() || location.isBlank()) {
                    notifyUI("error", "Both Sandbox token and location ID are required.")
                    return@setPositiveButton
                }
                notifyUI("status", "Authorizing Square Sandbox…")
                try {
                    MobilePaymentsSdk.authorizationManager().authorize(token, location) { result ->
                        when (result) {
                            is Success -> {
                                MockReaderUI.show()
                                notifyUI("authorized", "Connected to Square Sandbox. Add a mock reader using the floating reader icon.")
                            }
                            is Failure -> notifyUI("error", "Sandbox authorization failed: ${result.errorCode}")
                        }
                    }
                } catch (ex: Exception) {
                    notifyUI("error", "Cannot authorize Square Sandbox: ${ex.javaClass.simpleName}")
                }
            }.show()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != 140) return
        if (requiredPermissions().isEmpty()) {
            configureSquareDialog()
        } else {
            AlertDialog.Builder(this)
                .setTitle("Square permissions still needed")
                .setMessage("At least one required Android permission is not granted. Open Settings → Apps → Laurie’s Creations POS → Permissions, allow the requested permissions, then return and tap Connect Sandbox.")
                .setPositiveButton("OK", null)
                .show()
        }
    }

    private fun startSandboxPayment(amountCents: Int, referenceId: String, note: String, tipCents: Int) {
        if (inPayment) { notifyUI("error", "A payment is already in progress."); return }
        if (!squareReady || !MobilePaymentsSdk.authorizationManager().authorizationState.isAuthorized) {
            notifyUI("error", "Authorize Square Sandbox before checkout."); return
        }
        if (amountCents <= 0 || amountCents > 1_000_000) {
            notifyUI("error", "Check your sale amount before checkout."); return
        }
        if (tipCents < 0 || tipCents > 1_000_000 || amountCents.toLong() + tipCents > 2_000_000L) {
            notifyUI("error", "Check the selected tip amount before checkout."); return
        }
        if (referenceId.isBlank() || referenceId.length > 40) {
            notifyUI("error", "Invalid unique sale reference."); return
        }
        try {
            val builder = PaymentParameters.Builder(
                amount = Money(amountCents.toLong(), CurrencyCode.USD),
                processingMode = ProcessingMode.ONLINE_ONLY,
                allowCardSurcharge = false,
                paymentAttemptId = UUID.randomUUID().toString()
            ).referenceId(referenceId).note(note.take(450)).autocomplete(true)
            // Square's amount excludes tipMoney; never add tips to the base amount twice.
            if (tipCents > 0) builder.tipMoney(Money(tipCents.toLong(), CurrencyCode.USD))
            val params = builder.build()
            val prompt = PromptParameters(mode = PromptMode.DEFAULT)
            inPayment = true
            notifyUI("processing", "Square Sandbox checkout opened. Use the mock reader to simulate a payment.")
            MobilePaymentsSdk.paymentManager().startPaymentActivity(params, prompt) { result ->
                inPayment = false
                when (result) {
                    is Success -> when (val payment = result.value) {
                        is OnlinePayment -> notifyUI("success", "Sandbox payment completed (TEST ONLY).", payment.id)
                        is OfflinePayment -> notifyUI("error", "Unexpected offline payment result. Check Sandbox transactions before retrying.", payment.localId)
                    }
                    is Failure -> notifyUI("error", "Square payment was not completed: ${result.errorCode}. Check Sandbox activity before retrying.")
                }
            }
        } catch (e: Exception) {
            inPayment = false
            notifyUI("error", "Could not start payment: ${e.javaClass.simpleName}")
        }
    }

    override fun onDestroy() {
        selectedFileCallback?.onReceiveValue(null)
        selectedFileCallback = null
        if (::customerDisplay.isInitialized) customerDisplay.stop()
        if (::browser.isInitialized) {
            browser.removeJavascriptInterface("LaurieSquare")
            browser.destroy()
        }
        super.onDestroy()
    }
}
