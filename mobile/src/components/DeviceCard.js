import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Platform } from "react-native";

const TOKENS = {
  bg: "#121212",
  cardBg: "#1C1C1E",
  cardBgActive: "#242428",
  accentPurple: "#A855F7",
  accentGreen: "#22C55E",
  border: "rgba(255, 255, 255, 0.06)",
  borderActive: "rgba(168, 85, 247, 0.4)",
  textPrimary: "#F3F4F6",
  textSecondary: "#9CA3AF",
  error: "#EF4444"
};

export function RockerSwitch({ isEnabled, onToggle, size = "normal" }) {
  const isLarge = size === "large";
  const width = isLarge ? 56 : 46;
  const height = isLarge ? 92 : 76;
  const borderRadius = isLarge ? 28 : 23;

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
      {/* Top half: ON */}
      <View
        style={[
          styles.rockerHalf,
          { borderTopLeftRadius: borderRadius - 2, borderTopRightRadius: borderRadius - 2 },
          isEnabled ? styles.rockerTopActive : styles.rockerTopInactive
        ]}
      >
        <Text style={[styles.rockerText, isEnabled ? styles.rockerTextOnActive : styles.rockerTextInactive]}>
          ON
        </Text>
      </View>

      {/* Divider Line */}
      <View style={styles.rockerDivider} />

      {/* Bottom half: OFF */}
      <View
        style={[
          styles.rockerHalf,
          { borderBottomLeftRadius: borderRadius - 2, borderBottomRightRadius: borderRadius - 2 },
          !isEnabled ? styles.rockerBottomActive : styles.rockerBottomInactive
        ]}
      >
        <Text style={[styles.rockerText, !isEnabled ? styles.rockerTextOffActive : styles.rockerTextInactive]}>
          OFF
        </Text>
      </View>
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

        {/* 3D Rocker Switch */}
        <RockerSwitch isEnabled={isEnabled} onToggle={onToggle} />
      </View>

      {/* Adjuster controls for Light (dimmer) or Thermostat */}
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

    // Floating 3D Neumorphic Shadows
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
        shadowColor: TOKENS.accentPurple,
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

  /* 3D Rocker Switch Styling */
  rockerTrack: {
    backgroundColor: "#141416",
    padding: 3,
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  rockerTrackOn: {
    borderColor: TOKENS.accentPurple,
    ...Platform.select({
      ios: {
        shadowColor: TOKENS.accentPurple,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
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
  rockerHalf: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  rockerTopActive: {
    backgroundColor: TOKENS.accentPurple,
    elevation: 4
  },
  rockerTopInactive: {
    backgroundColor: "transparent"
  },
  rockerBottomActive: {
    backgroundColor: "#28282C",
    elevation: 2
  },
  rockerBottomInactive: {
    backgroundColor: "transparent"
  },
  rockerDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 1
  },
  rockerText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  rockerTextOnActive: {
    color: "#FFFFFF"
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
