package com.lauriescreations.mobile

import android.app.Application
import android.util.Log
import com.squareup.sdk.mobilepayments.MobilePaymentsSdk

/** Sandbox-only starter. Production requires a separate, server-backed OAuth flow. */
class LaurieApplication : Application() {
    var sdkReady: Boolean = false
        private set
    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.SQUARE_SANDBOX_APP_ID.isBlank()) {
            Log.i("LauriePOS", "Sandbox application ID not configured; register-only mode")
            return
        }
        try {
            MobilePaymentsSdk.initialize(BuildConfig.SQUARE_SANDBOX_APP_ID, this)
            sdkReady = MobilePaymentsSdk.isSandboxEnvironment()
            if (!sdkReady) Log.e("LauriePOS", "Refusing non-Sandbox Square configuration")
        } catch (e: Exception) {
            Log.e("LauriePOS", "Square SDK initialization unavailable", e)
        }
    }
}
