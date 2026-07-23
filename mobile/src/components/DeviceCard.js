import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Platform, Animated, Modal } from "react-native";
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
  const width = isMaster ? 100 : isMedium ? 64 : 56;
  const height = isMaster ? 160 : isMedium ? 104 : 88;
  const borderRadius = isMaster ? 40 : isMedium ? 26 : 22;

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
  const [modalVisible, setModalVisible] = useState(false);

  // Determine Node S-1 to S-7
  let nodeLabel = "DEV";
  let nodeNum = 0;
  if (device?.node_id?.includes("_")) {
    const suffix = parseInt(device.node_id.split("_").pop(), 10);
    nodeNum = suffix;
    if (suffix === 5) nodeLabel = "S-5";
    else if (suffix === 6) nodeLabel = "S-6";
    else if (suffix === 7) nodeLabel = "Master Switch";
    else nodeLabel = `S-${suffix}`;
  } else if (device?.type === "fan") {
    nodeLabel = "S-5";
    nodeNum = 5;
  } else if (device?.type === "light") {
    nodeLabel = "S-6";
    nodeNum = 6;
  } else if (device?.type === "master") {
    nodeLabel = "Master Switch";
    nodeNum = 7;
  }

  const isMaster = nodeNum === 7 || device?.type === "master";
  const isFan = nodeNum === 5 || device?.type === "fan";
  const isDimmer = nodeNum === 6 || (device?.type === "light" && (device?.name?.toLowerCase().includes("strip") || device?.name?.toLowerCase().includes("dim")));
  const hasSettings = isFan || isDimmer;

  // 1. Full-Width Master Switch Card Layout (Room-specific)
  if (isMaster) {
    return (
      <View style={styles.fullWidthMasterCard}>
        <View style={styles.masterCardRow}>
          <View style={styles.masterTextGroup}>
            <Text style={styles.masterTitleProminent}>Master Switch</Text>
            <Text style={styles.masterSubtitleText}>Master control for this room</Text>
          </View>
          <LuminaRockerSwitch isEnabled={isEnabled} onToggle={onToggle} size="medium" />
        </View>
      </View>
    );
  }

  // 2. Uniform 2-Column Grid Cards (S-1 to S-6)
  return (
    <View style={styles.gridGlassCard}>
      {/* Node Tag Header */}
      <Text style={styles.nodeTagText}>{nodeLabel}</Text>

      {/* 3D Rocker Switch */}
      <View style={{ marginTop: 10 }}>
        <LuminaRockerSwitch isEnabled={isEnabled} onToggle={onToggle} size="normal" />
      </View>

      {/* Gear Icon Button for Fan & Dimmer Settings */}
      {hasSettings && (
        <TouchableOpacity
          style={styles.gearButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="cog" size={16} color={TOKENS.accentGreen} />
        </TouchableOpacity>
      )}

      {/* Settings Modal (Popup) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialCommunityIcons
                  name={isFan ? "fan" : "lightbulb-outline"}
                  size={22}
                  color={TOKENS.accentGreen}
                />
                <Text style={styles.modalTitleText}>
                  {isFan ? "Fan Speed Control" : "Light Dimmer"}
                </Text>
              </View>

              <TouchableOpacity onPress={() => setModalVisible(false)} padding={4}>
                <MaterialCommunityIcons name="close" size={22} color={TOKENS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Fan Speed Controls Modal Content */}
            {isFan && (
              <View style={styles.modalControlGroup}>
                <View style={styles.levelHeaderRow}>
                  <Text style={styles.subLabelCaps}>Speed Level</Text>
                  <Text style={styles.speedValueText}>{device?.value || 3}</Text>
                </View>

                {/* 5 Speed Level Bars */}
                <View style={styles.speedBarsRow}>
                  {[1, 2, 3, 4, 5].map((lvl) => {
                    const speed = device?.value || 3;
                    const isActive = lvl <= speed && isEnabled;
                    const barHeights = [16, 24, 32, 40, 48];
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
            )}

            {/* Dimmer Controls Modal Content */}
            {isDimmer && (
              <View style={styles.modalControlGroup}>
                <View style={styles.levelHeaderRow}>
                  <Text style={styles.subLabelCaps}>Brightness</Text>
                  <Text style={styles.brightnessValueText}>{device?.value || 65}%</Text>
                </View>

                <View style={styles.dimmerAdjusterRow}>
                  <TouchableOpacity style={styles.adjustBtn} onPress={onDecrease} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="brightness-5" size={18} color={TOKENS.textPrimary} />
                  </TouchableOpacity>

                  <View style={styles.dimmerProgressBar}>
                    <View
                      style={[
                        styles.dimmerProgressFill,
                        { width: `${device?.value || 65}%` },
                        isEnabled ? styles.fillActive : styles.fillInactive
                      ]}
                    />
                  </View>

                  <TouchableOpacity style={styles.adjustBtn} onPress={onIncrease} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="brightness-7" size={18} color={TOKENS.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Done / Close Button */}
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Grid Card (S-1 to S-6) */
  gridGlassCard: {
    width: "48%",
    backgroundColor: TOKENS.glassBg,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: TOKENS.border
  },

  /* Full Width Master Card (Master Switch Room Master) */
  fullWidthMasterCard: {
    width: "100%",
    backgroundColor: TOKENS.glassBg,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  masterCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  masterTextGroup: {
    flex: 1,
    marginRight: 12
  },
  masterTitleProminent: {
    fontSize: 22,
    fontWeight: "900",
    color: TOKENS.accentGreen,
    letterSpacing: 0.5,
    marginBottom: 4
  },
  masterSubtitleText: {
    fontSize: 12,
    fontWeight: "600",
    color: TOKENS.textSecondary
  },
  nodeTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: TOKENS.accentGreen,
    letterSpacing: 1.5,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  },

  /* Gear Icon Button */
  gearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#201F1F",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },

  /* Modal Overlay & Popup Window */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#1C1B1B",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.1)"
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: "800",
    color: TOKENS.textPrimary
  },
  modalControlGroup: {
    marginVertical: 12
  },

  /* Fan Controls in Modal */
  levelHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 14
  },
  subLabelCaps: {
    fontSize: 11,
    fontWeight: "700",
    color: TOKENS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  speedValueText: {
    fontSize: 24,
    fontWeight: "900",
    color: TOKENS.accentGreen
  },
  speedBarsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    height: 52,
    marginBottom: 8
  },
  speedBar: {
    flex: 1,
    borderRadius: 8
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
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)"
  },
  speedNumLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4
  },
  speedNumText: {
    fontSize: 10,
    fontWeight: "700",
    color: TOKENS.textSecondary
  },

  /* Dimmer Controls in Modal */
  brightnessValueText: {
    fontSize: 16,
    fontWeight: "800",
    color: TOKENS.accentGreen,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  },
  dimmerAdjusterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10
  },
  adjustBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  dimmerProgressBar: {
    flex: 1,
    height: 10,
    backgroundColor: "#2A2A2A",
    borderRadius: 5,
    overflow: "hidden"
  },
  dimmerProgressFill: {
    height: "100%",
    borderRadius: 5
  },
  fillActive: {
    backgroundColor: TOKENS.accentGreen
  },
  fillInactive: {
    backgroundColor: TOKENS.accentInactive
  },

  doneButton: {
    backgroundColor: TOKENS.accentGreen,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20
  },
  doneButtonText: {
    color: "#002112",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5
  },

  /* 3D Vertical Rocker Switch Styling */
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
