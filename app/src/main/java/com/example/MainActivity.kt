package com.example

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.example.ui.theme.MyApplicationTheme
import java.io.File

class MainActivity : ComponentActivity() {

    private var webView: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Ensure Chromium cache directories exist with appropriate read/write permissions
        ensureWebViewCacheDir(this)

        // Immersive sticky fullscreen mode for the 3D runner game
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        windowInsetsController.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())

        setContent {
            MyApplicationTheme {
                NeonRushGameScreen(
                    onWebViewCreated = { wv -> webView = wv }
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        webView?.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView?.onPause()
    }

    override fun onDestroy() {
        webView?.destroy()
        webView = null
        super.onDestroy()
    }
}

/**
 * Native Android JavaScript Interface bridging WebGL game to Android OS
 */
class AndroidBridge(
    private val context: Context,
    private val prefs: SharedPreferences
) {
    @JavascriptInterface
    fun vibrate(durationMs: Long) {
        try {
            val clampedDuration = durationMs.coerceIn(10L, 500L)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager =
                    context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator?.vibrate(
                    VibrationEffect.createOneShot(clampedDuration, VibrationEffect.DEFAULT_AMPLITUDE)
                )
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(
                        VibrationEffect.createOneShot(clampedDuration, VibrationEffect.DEFAULT_AMPLITUDE)
                    )
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(clampedDuration)
                }
            }
        } catch (_: Exception) {}
    }

    @JavascriptInterface
    fun saveScore(highScore: Long, totalCoins: Long) {
        prefs.edit()
            .putLong("high_score", highScore)
            .putLong("total_coins", totalCoins)
            .apply()
    }

    @JavascriptInterface
    fun getHighScore(): Long {
        return prefs.getLong("high_score", 0L)
    }

    @JavascriptInterface
    fun getTotalCoins(): Long {
        return prefs.getLong("total_coins", 0L)
    }

    @JavascriptInterface
    fun getBatteryLevel(): Float {
        return try {
            val intent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val rawLevel = intent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = intent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
            if (rawLevel >= 0 && scale > 0) {
                rawLevel.toFloat() / scale.toFloat()
            } else {
                val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
                val capacity = batteryManager?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 100
                capacity / 100f
            }
        } catch (_: Exception) {
            1.0f
        }
    }

    @JavascriptInterface
    fun isBatteryCharging(): Boolean {
        return try {
            val intent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val status = intent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
            status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
        } catch (_: Exception) {
            false
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun NeonRushGameScreen(
    onWebViewCreated: (WebView) -> Unit
) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("neon_rush_prefs", Context.MODE_PRIVATE) }
    var localWebView: WebView? = remember { null }

    BackHandler {
        // Handle Android Back button: prompt game to pause or return to menu
        localWebView?.evaluateJavascript(
            """
            (function() {
                if (typeof soundManager !== 'undefined') soundManager.playClick();
                var pauseBtn = document.getElementById('btn-pause');
                if (pauseBtn && pauseBtn.offsetParent !== null) {
                    pauseBtn.click();
                } else {
                    var menuBtn = document.getElementById('btn-gameover-menu');
                    if (menuBtn && menuBtn.offsetParent !== null) menuBtn.click();
                }
            })();
            """.trimIndent(),
            null
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF080416))
            .testTag("neon_rush_container")
    ) {
        AndroidView(
            modifier = Modifier
                .fillMaxSize()
                .testTag("game_webview"),
            factory = { ctx ->
                ensureWebViewCacheDir(ctx)
                WebView(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )

                    // Hardware accelerated WebGL rendering
                    setLayerType(View.LAYER_TYPE_HARDWARE, null)
                    setBackgroundColor(android.graphics.Color.parseColor("#080416"))

                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        allowFileAccess = true
                        allowContentAccess = true
                        mediaPlaybackRequiresUserGesture = false
                        cacheMode = WebSettings.LOAD_DEFAULT
                        databaseEnabled = true
                        useWideViewPort = true
                        loadWithOverviewMode = true
                        displayZoomControls = false
                        builtInZoomControls = false
                    }

                    webChromeClient = object : WebChromeClient() {
                        override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                            consoleMessage?.let {
                                Log.d("NeonRushWeb", "${it.message()} [${it.sourceId()}:${it.lineNumber()}]")
                            }
                            return true
                        }
                    }

                    webViewClient = object : WebViewClient() {
                        override fun onReceivedError(
                            view: WebView?,
                            request: WebResourceRequest?,
                            error: WebResourceError?
                        ) {
                            super.onReceivedError(view, request, error)
                            Log.w("NeonRushWeb", "WebView resource error: ${error?.description} for ${request?.url}")
                        }
                    }

                    // Add JavaScript Interface for native haptics and persistent stats
                    addJavascriptInterface(AndroidBridge(ctx, prefs), "AndroidBridge")

                    // Load local bundled Three.js game (100% offline!)
                    loadUrl("file:///android_asset/game/index.html")

                    localWebView = this
                    onWebViewCreated(this)
                }
            }
        )
    }

    DisposableEffect(Unit) {
        onDispose {
            localWebView = null
        }
    }
}

/**
 * Ensures Chromium's internal cache directories exist with appropriate read/write permissions
 * to prevent 'Simple Cache Backend: cache directory inaccessible right after creation' errors.
 */
fun ensureWebViewCacheDir(context: Context) {
    try {
        val appCacheDir = context.applicationContext.cacheDir ?: return
        val webViewDir = File(appCacheDir, "WebView")
        val defaultDir = File(webViewDir, "Default")
        val httpCacheDir = File(defaultDir, "HTTP Cache")
        val codeCacheDir = File(httpCacheDir, "Code Cache")
        val jsDir = File(codeCacheDir, "js")

        listOf(webViewDir, defaultDir, httpCacheDir, codeCacheDir, jsDir).forEach { file ->
            if (file.exists() && !file.isDirectory) {
                file.delete()
            }
        }

        if (!jsDir.exists()) {
            jsDir.mkdirs()
        }

        listOf(appCacheDir, webViewDir, defaultDir, httpCacheDir, codeCacheDir, jsDir).forEach { dir ->
            if (dir.exists()) {
                dir.setReadable(true, false)
                dir.setWritable(true, false)
                dir.setExecutable(true, false)
            }
        }
    } catch (e: Exception) {
        Log.w("MainActivity", "Failed to ensure WebView cache directory: ${e.message}")
    }
}
