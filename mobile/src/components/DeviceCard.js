import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Platform, Animated } from "react-native";

const TOKENS = {
  bg: "#121212",
  cardBg: "#1C1C1E",
  cardBgActive: "#24242A",
  accentGreen: "#22C55E",
  accentPurple: "#A855F7",
  border: "rgba(255, 255, 255, 0.06)",
  borderActive: "rgba(34, 197, 94, 0.4)",
  textPrimary: "#F3F4F6",
  textSecondary: "#9CA3AF",
  error: "#EF4444"
};

export function RockerSwitch({ isEnabled, onToggle, size = "normal" }) {
  const isLarge = size === "large";
  const width = isLarge ? 56 : 46;
  const height = isLarge ? 96 : 80;
  const borderRadius = isLarge ? 28 : 24;

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
        isEnabled ? styles.rockerTrackOn : styles.rockerTrackOff
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
        <Text style={[styles.rockerText, isEnabled ? styles.rockerTextOnActive : styles.rockerTextInactive]}>
          ON
        </Text>

        {/* Emissive Center Status LED Dot */}
        <View
          style={[
            styles.centerLedDot,
            isEnabled ? styles.centerLedDotOn : styles.centerLedDotOff
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

  return (
    <View style={[styles.floatingCard, isEnabled && styles.floatingCardActive]}>
      <View style={styles.cardHeader}>
        <View style={styles.infoBlock}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: device?.is_online ? TOKENS.accentGreen : TOKENS.error }
              ]}
            />
            <Text style={styles.shortLabelText}>{shortLabel}</Text>
          </View>
          <Text style={styles.deviceName} numberOfLines={1}>
            {device?.name || "Switch"}
          </Text>
        </View>

        {/* 3D Animated Rocker Switch */}
        <RockerSwitch isEnabled={isEnabled} onToggle={onToggle} />
      </View>

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
  floatingCard: {
    width: "48%",
    backgroundColor: TOKENS.cardBg,
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: TOKENS.border,

    // Floating 3D Shadows
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 10
      },
      android: {
        elevation: 8
      }
    })
  },
  floatingCardActive: {
    backgroundColor: TOKENS.cardBgActive,
    borderColor: TOKENS.borderActive,
    ...Platform.select({
      ios: {
        shadowColor: TOKENS.accentGreen,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12
      },
      android: {
        elevation: 10
      }
    })
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  infoBlock: {
    flex: 1,
    marginRight: 6
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6
  },
  shortLabelText: {
    fontSize: 16,
    fontWeight: "900",
    color: TOKENS.textPrimary,
    letterSpacing: 0.5
  },
  deviceName: {
    fontSize: 11,
    fontWeight: "600",
    color: TOKENS.textSecondary,
    marginTop: 4
  },

  /* 3D Animated Rocker Switch Styling */
  rockerTrack: {
    backgroundColor: "#0E0E0E",
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  rockerTrackOn: {
    borderColor: TOKENS.accentGreen,
    ...Platform.select({
      ios: {
        shadowColor: TOKENS.accentGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8
      },
      android: {
        elevation: 6
      }
    })
  },
  rockerTrackOff: {
    borderColor: "rgba(255, 255, 255, 0.05)"
  },
  rockerBody: {
    width: "100%",
    height: "92%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)"
  },
  rockerBodyOn: {
    backgroundColor: "#202024",
    ...Platform.select({
      ios: {
        shadowColor: TOKENS.accentGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6
      },
      android: {
        elevation: 4
      }
    })
  },
  rockerBodyOff: {
    backgroundColor: "#1C1B1B"
  },

  /* Center Status LED Dot */
  centerLedDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  centerLedDotOn: {
    backgroundColor: TOKENS.accentGreen,
    ...Platform.select({
      ios: {
        shadowColor: TOKENS.accentGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 6
      },
      android: {
        elevation: 4
      }
    })
  },
  centerLedDotOff: {
    backgroundColor: "#4B5563"
  },

  rockerText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  rockerTextOnActive: {
    color: TOKENS.accentGreen
  },
  rockerTextOffActive: {
    color: "#D1D5DB"
  },
  rockerTextInactive: {
    color: "#4B5563"
  },

  /* Adjuster row for Fan & Dimmer */
  adjusterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#121214",
    borderRadius: 12,
    padding: 4,
    marginTop: 12,
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  adjustButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#242428",
    alignItems: "center",
    justifyContent: "center"
  },
  adjustButtonText: {
    color: TOKENS.textPrimary,
    fontSize: 15,
    fontWeight: "800"
  },
  valueContainer: {
    alignItems: "center"
  },
  valueText: {
    color: TOKENS.textPrimary,
    fontSize: 12,
    fontWeight: "800"
  }
});
