import React from 'react';
import { StyleSheet, View, TouchableOpacity, Dimensions } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Calculate grid card size (roughly half screen width minus margins)
const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 48) / 2;

export default function DeviceCard({ device, onToggle, onDelete }) {
  const theme = useTheme();
  
  // Choose icon based on device type and status
  const getDeviceIcon = () => {
    switch (device.type) {
      case 'light':
        return device.status ? 'lightbulb-on' : 'lightbulb-outline';
      case 'fan':
        return 'fan';
      case 'AC':
        return 'air-conditioner';
      default:
        return 'developer-board';
    }
  };

  // Determine neon glow color based on device type
  const getGlowColor = () => {
    if (!device.status) return 'transparent';
    switch (device.type) {
      case 'light':
        return theme.colors.primary;   // Neon Purple (#7C3AED)
      case 'fan':
        return theme.colors.secondary; // Neon Pink (#EC4899)
      case 'AC':
        return '#06B6D4';              // Neon Cyan
      default:
        return theme.colors.primary;
    }
  };

  // Determine icon color based on active state
  const getIconColor = () => {
    if (!device.status) return 'rgba(148, 163, 184, 0.4)'; // Muted slate gray
    switch (device.type) {
      case 'light':
        return '#A78BFA'; // Light Purple neon
      case 'fan':
        return '#F472B6'; // Soft Pink neon
      case 'AC':
        return '#22D3EE'; // Cool Cyan neon
      default:
        return theme.colors.primary;
    }
  };

  const glowColor = getGlowColor();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onToggle(device.id, !device.status)}
      style={[
        styles.cardContainer,
        {
          backgroundColor: device.status ? '#1E1E38' : '#121225',
          borderColor: device.status ? glowColor : '#22223B',
          borderWidth: device.status ? 2 : 1.5,
          // Shadow glow effect when ON
          shadowColor: glowColor,
          shadowOpacity: device.status ? 0.6 : 0,
          shadowRadius: device.status ? 14 : 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: device.status ? 8 : 1,
        }
      ]}
    >
      {/* Top right corner: Small unobtrusive Delete Button */}
      <IconButton
        icon="close-circle-outline"
        iconColor={device.status ? 'rgba(255, 255, 255, 0.3)' : 'rgba(148, 163, 184, 0.3)'}
        size={18}
        onPress={() => onDelete(device.id)}
        style={styles.deleteBtn}
      />

      {/* Center Section: Large Glowing Icon */}
      <View style={[
        styles.iconContainer,
        device.status && {
          backgroundColor: 'rgba(124, 58, 237, 0.1)',
          shadowColor: glowColor,
          shadowOpacity: 0.8,
          shadowRadius: 15,
        }
      ]}>
        <MaterialCommunityIcons 
          name={getDeviceIcon()} 
          size={42} 
          color={getIconColor()} 
        />
      </View>

      {/* Bottom Section: Device Label & Category */}
      <View style={styles.textContainer}>
        <Text style={[
          styles.deviceName,
          { color: device.status ? '#F8FAFC' : '#94A3B8' }
        ]} numberOfLines={1}>
          {device.name}
        </Text>
        <Text style={styles.deviceType}>
          {device.type.toUpperCase()}
        </Text>
      </View>

      {/* Active Dot Status */}
      <View style={[
        styles.statusDot,
        { backgroundColor: device.status ? glowColor : '#374151' }
      ]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  deleteBtn: {
    position: 'absolute',
    top: -2,
    right: -2,
    margin: 0,
    zIndex: 10,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  deviceType: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    bottom: 12,
  },
});
