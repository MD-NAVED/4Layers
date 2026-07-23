import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function VerticalCapsuleSwitch({
  isEnabled = false,
  onToggle,
  onTurnOn,
  onTurnOff,
  size = "md"
}) {
  // Dimensions for specified variants:
  // sm: 72x160, radius 36
  // md: 96x210, radius 48
  // lg: 120x270, radius 60
  // normal: 54x110, radius 27 (for compact 2-column grid cards)
  let width = 96;
  let height = 210;
  let radius = 48;

  if (size === "sm") {
    width = 72;
    height = 160;
    radius = 36;
  } else if (size === "lg") {
    width = 120;
    height = 270;
    radius = 60;
  } else if (size === "normal" || size === "compact") {
    width = 54;
    height = 110;
    radius = 27;
  }

  // Animation values for smooth 350ms transition
  const animVal = useRef(new Animated.Value(isEnabled ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: isEnabled ? 1 : 0,
      duration: 350,
      useNativeDriver: false
    }).start();
  }, [isEnabled]);

  // Interpolated opacity values for smooth 350ms color transitions
  const activeOpacity = animVal;
  const inactiveOpacity = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0]
  });

  const handlePressOn = () => {
    if (!isEnabled) {
      if (onTurnOn) onTurnOn();
      else if (onToggle) onToggle(true);
    }
  };

  const handlePressOff = () => {
    if (isEnabled) {
      if (onTurnOff) onTurnOff();
      else if (onToggle) onToggle(false);
    }
  };

  const fontSize = size === "normal" ? 11 : width * 0.15;

  return (
    <View style={[styles.outerContainer, { width, height, borderRadius: radius }]}>
      {/* Outer Border & Glow Container */}
      <Animated.View
        style={[
          styles.capsuleShape,
          {
            width,
            height,
            borderRadius: radius,
            borderColor: isEnabled ? "#22C55E" : "rgba(255,255,255,0.08)",
            borderWidth: isEnabled ? 1.5 : 1
          },
          isEnabled && styles.outerGlowOn
        ]}
      >
        {/* TOP ZONE (ON) */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePressOn}
          style={styles.zoneTop}
        >
          {/* Active Gradient (ON = True) */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: activeOpacity }]}>
            <LinearGradient
              colors={["#16a34a", "#22C55E", "#15803d"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Inactive Gradient (ON = False) */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: inactiveOpacity }]}>
            <LinearGradient
              colors={["#111111", "#181818"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <Text
            style={[
              styles.labelText,
              { fontSize },
              isEnabled ? styles.textOnActive : styles.textInactive
            ]}
          >
            ON
          </Text>
        </TouchableOpacity>

        {/* THIN HORIZONTAL DIVIDER LINE */}
        <View style={styles.dividerContainer}>
          {/* Active Green Divider Line */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: activeOpacity }]}>
            <LinearGradient
              colors={["transparent", "rgba(34,197,94,0.6)", "transparent"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Inactive Subtle White Divider Line */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: inactiveOpacity }]}>
            <LinearGradient
              colors={["transparent", "rgba(255,255,255,0.15)", "transparent"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        {/* BOTTOM ZONE (OFF) */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePressOff}
          style={styles.zoneBottom}
        >
          {/* Active OFF Gradient (When OFF = True, i.e. isEnabled = False) */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: inactiveOpacity }]}>
            <LinearGradient
              colors={["#2a2a2a", "#242424", "#1e1e1e"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Inactive OFF Gradient (When OFF = False, i.e. isEnabled = True) */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: activeOpacity }]}>
            <LinearGradient
              colors={["#181818", "#1a1a1a"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <Text
            style={[
              styles.labelText,
              { fontSize },
              !isEnabled ? styles.textOffActive : styles.textInactive
            ]}
          >
            OFF
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    justifyContent: "center",
    alignItems: "center"
  },
  capsuleShape: {
    overflow: "hidden",
    justifyContent: "space-between",
    alignItems: "stretch"
  },
  outerGlowOn: {
    ...Platform.select({
      ios: {
        shadowColor: "#22C55E",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.85,
        shadowRadius: 20
      },
      android: {
        elevation: 10
      }
    })
  },
  zoneTop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden"
  },
  zoneBottom: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden"
  },
  dividerContainer: {
    height: 1.5,
    width: "100%",
    position: "relative"
  },
  labelText: {
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center"
  },
  textOnActive: {
    color: "#FFFFFF",
    textShadowColor: "#22C55E",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10
  },
  textOffActive: {
    color: "#FFFFFF"
  },
  textInactive: {
    color: "rgba(255, 255, 255, 0.18)"
  }
});
