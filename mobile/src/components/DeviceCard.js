import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Platform, Animated } from "react-native";

const TOKENS = {
  bg: "#121212",
  accentPurple: "#BB86FC",
  accentGreen: "#22C55E",
  border: "rgba(255, 255, 255, 0.06)",
  textPrimary: "#E5E2E1",
  textSecondary: "#9CA3AF",
  error: "#EF4444"
};

export function RockerSwitch({ isEnabled, onToggle, size = "normal", accentColor = TOKENS.accentPurple }) {
  const isLarge = size === "large";
  const width = isLarge ? 64 : 52;
  const height = isLarge ? 108 : 88;
  const borderRadius = isLarge ? 32 : 26;

  // Animated 3D Tilt Offset (translateY)
  const tiltAnim = useRef(new Animated.Value(isEnabled ? -4 : 4)).current;

  useEffect(() => {
    Animated.spring(tiltAnim, {
      toValue: isEnabled ? -4 : 4,
      friction: 6,
      tension: 100,
      useNativeDriver: true
    }).start();
  }, [isEnabled]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onToggle}
      style={[
        styles.rockerTrack,
        { width, height, borderRadius },
        isEnabled ? { borderColor: accentColor, shadowColor: accentColor } : styles.rockerTrackOff
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: isEnabled }}
    >
      {/* 3D Animated Rocker Body */}
      <Animated.View
        style={[
          styles.rockerBody,
          {
            borderRadius: borderRadius - 3,
            transform: [{ translateY: tiltAnim }]
          },
          isEnabled ? styles.rockerBodyOn : styles.rockerBodyOff
        ]}
      >
        {/* Top half: ON Label */}
        <Text
          style={[
            styles.rockerText,
            isEnabled ? { color: accentColor, textShadowColor: accentColor, textShadowRadius: 6 } : styles.rockerTextInactive
          ]}
        >
          ON
        </Text>

        {/* Emissive Center Status LED Dot */}
        <View
          style={[
            styles.centerLedDot,
            isEnabled ? { backgroundColor: accentColor, shadowColor: accentColor, shadowRadius: 6, opacity: 1 } : styles.centerLedDotOff
          ]}
        />

        {/* Bottom half: OFF Label */}
        <Text style={[styles.rockerText, !isEnabled ? styles.rockerTextOffActive : styles.rockerTextInactive]}>
          OFF
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function DeviceCard({ device, onToggle, onIncrease, onDecrease }) {
  const isEnabled = device?.status === true || device?.status === "ON";

  // Formulate short minimal label (S-1, S-2, S-3, S-4, FAN, DIM, M-S)
  let shortLabel = "DEV";
  if (device?.node_id?.includes("_")) {
    const suffix = device.node_id.split("_").pop();
    if (suffix === "1") shortLabel = "S-1";
    else if (suffix === "2") shortLabel = "S-2";
    else if (suffix === "3") shortLabel = "S-3";
    else if (suffix === "4") shortLabel = "S-4";
    else if (suffix === "5") shortLabel = "FAN";
    else if (suffix === "6") shortLabel = "DIM";
    else if (suffix === "7") shortLabel = "M-S";
    else shortLabel = `S-${suffix}`;
  } else if (device?.type === "fan") {
    shortLabel = "FAN";
  } else if (device?.type === "light") {
    shortLabel = "DIM";
  }

  // Accent color selection (Purple by default as shown in Image 1)
  const accentColor = TOKENS.accentPurple;

  return (
    <View style={styles.floatingUnit}>
      {/* Centered Minimal Label (S-1, S-2, etc.) */}
      <Text style={[styles.centeredLabel, isEnabled && { color: accentColor }]}>
        {shortLabel}
      </Text>

      {/* Large Centered 3D Rocker Switch */}
      <RockerSwitch isEnabled={isEnabled} onToggle={onToggle} accentColor={accentColor} />

      {/* Adjuster controls for Light (dimmer), Thermostat, or Fan */}
      {(device?.type === "light" || device?.type === "thermostat" || device?.type === "fan") && (
        <View style={styles.adjusterRow}>
          <TouchableOpacity style={styles.adjustButton} onPress={onDecrease} activeOpacity={0.7}>
            <Text style={styles.adjustButtonText}>-</Text>
          </TouchableOpacity>

          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>
              {device?.value || 0}
              {device?.type === "light" ? "%" : device?.type === "fan" ? " spd" : "°F"}
            </Text>
          </View>

          <TouchableOpacity style={styles.adjustButton} onPress={onIncrease} activeOpacity={0.7}>
            <Text style={styles.adjustButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  floatingUnit: {
    width: "48%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 20,
    backgroundColor: "transparent"
  },
  centeredLabel: {
    fontSize: 16,
    fontWeight: "900",
    color: TOKENS.textPrimary,
    letterSpacing: 1.5,
    marginBottom: 12,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  },

  /* 3D Animated Rocker Switch Styling (Image 1 Specs) */
  rockerTrack: {
    backgroundColor: "#1C1B1B",
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",

    // Ambient Glow Effect
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16
      },
      android: {
        elevation: 8
      }
    })
  },
  rockerTrackOff: {
    borderColor: "rgba(255, 255, 255, 0.04)"
  },
  rockerBody: {
    width: "100%",
    height: "92%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  rockerBodyOn: {
    backgroundColor: "#262525",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 8
      },
      android: {
        elevation: 4
      }
    })
  },
  rockerBodyOff: {
    backgroundColor: "#181717"
  },

  /* Emissive Center Status LED Dot */
  centerLedDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  centerLedDotOff: {
    backgroundColor: "#404040",
    opacity: 0.4
  },

  rockerText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  },
  rockerTextOffActive: {
    color: "#D1D5DB"
  },
  rockerTextInactive: {
    color: "#3F3F46"
  },

  /* Minimal Adjuster row for Fan & Dimmer */
  adjusterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#181717",
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 12,
    width: "90%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)"
  },
  adjustButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#262525",
    alignItems: "center",
    justifyContent: "center"
  },
  adjustButtonText: {
    color: TOKENS.textPrimary,
    fontSize: 14,
    fontWeight: "800"
  },
  valueContainer: {
    alignItems: "center"
  },
  valueText: {
    color: TOKENS.textPrimary,
    fontSize: 11,
    fontWeight: "800"
  }
});
