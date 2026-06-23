import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';

// Custom Material Design 3 Dark Theme for a premium futuristic Cyberpunk/Sci-Fi aesthetic
const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#7C3AED',          // Neon Purple
    secondary: '#EC4899',        // Neon Pink
    background: '#0A0A0F',       // Pure Sci-Fi Dark Black
    surface: '#1A1A2E',          // Deep Slate Blue Card Surface
    onSurface: '#F8FAFC',        // Silver White text
    onSurfaceVariant: '#94A3B8',   // Muted slate gray text
    outline: '#3E3E5C',          // Subtle dark outline
    outlineVariant: '#1F1F3D',    // Darker outline for borders
    error: '#EF4444',            // Cyber Red
    errorContainer: '#7F1D1D',   // Dark red container
    onErrorContainer: '#FCA5A5', // Soft red text
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level1: '#1A1A2E',         // Card level 1
      level2: '#252542',         // Glowing active state card overlay
    }
  },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      {/* Light status bar icons for dark background */}
      <StatusBar style="light" backgroundColor="#0F172A" />
      <AppNavigator />
    </PaperProvider>
  );
}
