package com.lauriescreations.mobile

import android.app.Application
import android.util.Log
import com.squareup.sdk.mobilepayments.MobilePaymentsSdk

/** Sandbox and production must use separate APKs. OAuth tokens are never embedded. */
class LaurieApplication : Application() {
    var sdkReady: Boolean = false
        private set
    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.SQUARE_APP_ID.isBlank()) {
            Log.i("LauriePOS", "Square application ID not configured; register-only mode")
            return
        }
        try {
            MobilePaymentsSdk.initialize(BuildConfig.SQUARE_APP_ID, this)
            sdkReady = MobilePaymentsSdk.isSandboxEnvironment() != BuildConfig.IS_PRODUCTION
            if (!sdkReady) Log.e("LauriePOS", "Square SDK environment mismatches this signed app build")
        } catch (e: Exception) {
            Log.e("LauriePOS", "Square SDK initialization unavailable", e)
        }
    }
}
