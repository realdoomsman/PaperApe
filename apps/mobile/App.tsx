import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/providers/AuthProvider';
import { ModeProvider } from './src/providers/ModeProvider';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ModeProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </ModeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
