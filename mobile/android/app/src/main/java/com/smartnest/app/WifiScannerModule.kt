package com.smartnest.app

import android.content.Context
import android.net.wifi.WifiManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray

class WifiScannerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "WifiScanner"
    }

    @ReactMethod
    fun getWifiNetworks(promise: Promise) {
        try {
            val wifiManager = reactApplicationContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            
            // Try to trigger a scan (even if throttled, calling it is safe as a background trigger)
            try {
                wifiManager.startScan()
            } catch (e: Exception) {
                // Ignore startScan throttle exceptions
            }

            val scanResults = wifiManager.scanResults
            val array: WritableArray = Arguments.createArray()
            
            // Deduplicate SSIDs and only include non-empty ones
            val ssids = mutableSetOf<String>()
            for (result in scanResults) {
                val ssid = result.SSID
                if (ssid != null && ssid.isNotEmpty() && !ssids.contains(ssid)) {
                    ssids.add(ssid)
                    val map = Arguments.createMap()
                    map.putString("ssid", ssid)
                    map.putInt("level", result.level) // Signal strength in dBm
                    array.pushMap(map)
                }
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message, e)
        }
    }
}
