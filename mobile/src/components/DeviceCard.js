import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Platform, Animated } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const TOKENS = {
  bg: "#131313",
  glassBg: "rgba(28, 27, 27, 0.7)",
  accentGreen: "#22C55E",
  accentInactive: "#4B5563",
  border: "rgba(255, 255, 255, 0.05)",
  textPrimary: "#E5E2E1",
  textSecondary: "#9CA3AF"
};

export function LuminaRockerSwitch({ isEnabled, onToggle, size = "normal" }) {
  const isMaster = size === "master";
  const isMedium = size === "medium";

  // Dimensions
  const width = isMaster ? 110 : isMedium ? 64 : 60;
  const height = isMaster ? 180 : isMedium ? 104 : 96;
  const borderRadius = isMaster ? 44 : isMedium ? 26 : 24;

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
        styles.rockerOuterWell,
        { width, height, borderRadius },
        isEnabled ? styles.rockerOuterWellOn : styles.rockerOuterWellOff
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: isEnabled }}
    >
      <Animated.View
        style={[
          styles.rockerInnerBody,
          {
            borderRadius: borderRadius - 4,
            transform: [{ translateY: tiltAnim }]
          },
          isEnabled ? styles.rockerInnerBodyOn : styles.rockerInnerBodyOff
        ]}
      >
        <Text style={[styles.labelCaps, isEnabled ? styles.labelOnActive : styles.labelInactive]}>
          ON
        </Text>
        <View style={[styles.indicatorDot, isEnabled ? styles.indicatorDotOn : styles.indicatorDotOff]} />
        <Text style={[styles.labelCaps, !isEnabled ? styles.labelOffActive : styles.labelInactive]}>
          OFF
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function DeviceCard({ device, onToggle, onIncrease, onDecrease }) {
  const isEnabled = device?.status === true || device?.status === "ON";

  // Determine Node S-1 to S-6
  let nodeLabel = "DEV";
  let nodeNum = 0;
  if (device?.node_id?.includes("_")) {
    const suffix = parseInt(device.node_id.split("_").pop(), 10);
    nodeNum = suffix;
    if (suffix === 5) nodeLabel = "S-5 (Fan)";
    else if (suffix === 6) nodeLabel = "S-6 (Dimmer)";
    else if (suffix === 7) nodeLabel = "M-S";
    else nodeLabel = `S-${suffix}`;
  } else if (device?.type === "fan") {
    nodeLabel = "S-5 (Fan)";
    nodeNum = 5;
  } else if (device?.type === "light") {
    nodeLabel = "S-6 (Dimmer)";
    nodeNum = 6;
  } else if (device?.type === "master") {
    nodeLabel = "M-S";
    nodeNum = 7;
  }

  const isFan = nodeNum === 5 || device?.type === "fan";
  const isDimmer = nodeNum === 6 || (device?.type === "light" && (device?.name?.toLowerCase().includes("strip") || device?.name?.toLowerCase().includes("dim")));

  // 1. Full-Width S-5 (Fan) Card Layout
  if (isFan) {
    const speed = device?.value || 3;
    return (
      <View style={styles.fullWidthGlassCard}>
        <View style={styles.cardTopRow}>
          <Text style={styles.nodeTagText}>{nodeLabel}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialCommunityIcons
              name="fan"
              size={20}
              color={isEnabled ? TOKENS.accentGreen : TOKENS.textSecondary}
            />
          </View>
        </View>

        <View style={styles.cardContentRow}>
          <LuminaRockerSwitch isEnabled={isEnabled} onToggle={onToggle} size="medium" />

          <View style={styles.fanControlGroup}>
            <View style={styles.levelHeaderRow}>
              <Text style={styles.subLabelCaps}>Speed Level</Text>
              <Text style={styles.speedValueText}>{speed}</Text>
            </View>

            {/* 5 Speed Level Bars */}
            <View style={styles.speedBarsRow}>
              {[1, 2, 3, 4, 5].map((lvl) => {
                const isActive = lvl <= speed && isEnabled;
                const barHeights = [14, 20, 26, 32, 38];
                return (
                  <TouchableOpacity
                    key={lvl}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (lvl > speed) onIncrease();
                      else if (lvl < speed) onDecrease();
                    }}
                    style={[
                      styles.speedBar,
                      { height: barHeights[lvl - 1] },
                      isActive ? styles.speedBarActive : styles.speedBarInactive
                    ]}
                  />
                );
              })}
            </View>

            <View style={styles.speedNumLabelsRow}>
              <Text style={styles.speedNumText}>1</Text>
              <Text style={styles.speedNumText}>2</Text>
              <Text style={styles.speedNumText}>3</Text>
              <Text style={styles.speedNumText}>4</Text>
              <Text style={styles.speedNumText}>5</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // 2. Full-Width S-6 (Dimmer) Card Layout
  if (isDimmer) {
    const brightness = device?.value || 65;
    return (
      <View style={styles.fullWidthGlassCard}>
        <View style={styles.cardTopRow}>
          <Text style={styles.nodeTagText}>{nodeLabel}</Text>
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={20}
            color={isEnabled ? TOKENS.accentGreen : TOKENS.textSecondary}
          />
        </View>

        <View style={styles.cardContentRow}>
          <LuminaRockerSwitch isEnabled={isEnabled} onToggle={onToggle} size="medium" />

          <View style={styles.dimmerControlGroup}>
            <View style={styles.levelHeaderRow}>
              <Text style={styles.subLabelCaps}>Brightness</Text>
              <Text style={styles.brightnessValueText}>{brightness}%</Text>
            </View>

            {/* Dimmer Adjuster Row */}
            <View style={styles.dimmerAdjusterRow}>
              <TouchableOpacity style={styles.adjustBtn} onPress={onDecrease} activeOpacity={0.7}>
                <MaterialCommunityIcons name="brightness-5" size={16} color={TOKENS.textPrimary} />
              </TouchableOpacity>

              <View style={styles.dimmerProgressBar}>
                <View
                  style={[
                    styles.dimmerProgressFill,
                    { width: `${brightness}%` },
                    isEnabled ? styles.fillActive : styles.fillInactive
                  ]}
                />
              </View>

              <TouchableOpacity style={styles.adjustBtn} onPress={onIncrease} activeOpacity={0.7}>
                <MaterialCommunityIcons name="brightness-7" size={16} color={TOKENS.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // 3. Grid S-1 to S-4 Cards Layout (2-Column Grid)
  return (
    <View style={styles.gridGlassCard}>
      <Text style={styles.nodeTagText}>{nodeLabel}</Text>
      <View style={{ marginTop: 12 }}>
        <LuminaRockerSwitch isEnabled={isEnabled} onToggle={onToggle} size="normal" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Grid Card (S-1 to S-4) */
  gridGlassCard: {
    width: "48%",
    backgroundColor: TOKENS.glassBg,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: TOKENS.border
  },

  /* Full Width Card (S-5 Fan & S-6 Dimmer) */
  fullWidthGlassCard: {
    width: "100%",
    backgroundColor: TOKENS.glassBg,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  nodeTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: TOKENS.accentGreen,
    letterSpacing: 1.5,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  },
  cardContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20
  },

  /* Fan Controls */
  fanControlGroup: {
    flex: 1
  },
  levelHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10
  },
  subLabelCaps: {
    fontSize: 10,
    fontWeight: "700",
    color: TOKENS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  speedValueText: {
    fontSize: 22,
    fontWeight: "900",
    color: TOKENS.accentGreen
  },
  speedBarsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 42,
    marginBottom: 6
  },
  speedBar: {
    flex: 1,
    borderRadius: 6
  },
  speedBarActive: {
    backgroundColor: TOKENS.accentGreen,
    ...Platform.select({
      ios: {
        shadowColor: TOKENS.accentGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8
      },
      android: {
        elevation: 6
      }
    })
  },
  speedBarInactive: {
    backgroundColor: "#201F1F",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)"
  },
  speedNumLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2
  },
  speedNumText: {
    fontSize: 9,
    fontWeight: "700",
    color: TOKENS.textSecondary
  },

  /* Dimmer Controls */
  dimmerControlGroup: {
    flex: 1
  },
  brightnessValueText: {
    fontSize: 14,
    fontWeight: "800",
    color: TOKENS.accentGreen,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  },
  dimmerAdjusterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6
  },
  adjustBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#201F1F",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  dimmerProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#201F1F",
    borderRadius: 4,
    overflow: "hidden"
  },
  dimmerProgressFill: {
    height: "100%",
    borderRadius: 4
  },
  fillActive: {
    backgroundColor: TOKENS.accentGreen
  },
  fillInactive: {
    backgroundColor: TOKENS.accentInactive
  },

  /* 3D Vertical Rocker Switch Styling (HTML Spec Exact) */
  rockerOuterWell: {
    backgroundColor: "#1C1B1B",
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 10
      },
      android: {
        elevation: 6
      }
    })
  },
  rockerOuterWellOn: {
    borderColor: "rgba(34, 197, 94, 0.4)",
    ...Platform.select({
      ios: {
        shadowColor: TOKENS.accentGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12
      },
      android: {
        elevation: 8
      }
    })
  },
  rockerOuterWellOff: {
    borderColor: "rgba(255, 255, 255, 0.04)"
  },
  rockerInnerBody: {
    width: "100%",
    height: "86%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  rockerInnerBodyOn: {
    backgroundColor: "#353534"
  },
  rockerInnerBodyOff: {
    backgroundColor: "#201F1F"
  },

  labelCaps: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  },
  labelOnActive: {
    color: TOKENS.accentGreen
  },
  labelOffActive: {
    color: "#E5E2E1"
  },
  labelInactive: {
    color: "rgba(229, 226, 225, 0.2)"
  },

  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  indicatorDotOn: {
    backgroundColor: TOKENS.accentGreen,
    ...Platform.select({
      ios: {
        shadowColor: TOKENS.accentGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8
      },
      android: {
        elevation: 4
      }
    })
  },
  indicatorDotOff: {
    backgroundColor: "rgba(229, 226, 225, 0.2)"
  }
});
