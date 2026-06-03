import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../providers/AuthProvider';
import { colors } from '../theme';
import LoginScreen from '../screens/LoginScreen';
import MainTabs from './MainTabs';
import WalletsScreen from '../screens/WalletsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LessonDetailScreen from '../screens/LessonDetailScreen';
import CalculatorScreen from '../screens/CalculatorScreen';
import CompareScreen from '../screens/CompareScreen';
import { ActivityIndicator, View } from 'react-native';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  Wallets: undefined;
  History: undefined;
  Analytics: undefined;
  Settings: undefined;
  LessonDetail: { lessonId: string; title: string };
  Calculator: undefined;
  Compare: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.bg1 },
  headerTintColor: colors.t0,
  headerTitleStyle: { fontFamily: 'SpecialElite', fontSize: 18 },
  contentStyle: { backgroundColor: colors.bg0 },
  headerShadowVisible: false,
};

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg0 }}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Wallets" component={WalletsScreen} options={{ title: 'WALLETS' }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'HISTORY' }} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'ANALYTICS' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'SETTINGS' }} />
            <Stack.Screen name="LessonDetail" component={LessonDetailScreen} options={({ route }) => ({ title: route.params?.title || 'LESSON' })} />
            <Stack.Screen name="Calculator" component={CalculatorScreen} options={{ title: 'CALCULATOR' }} />
            <Stack.Screen name="Compare" component={CompareScreen} options={{ title: 'COMPARE' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
