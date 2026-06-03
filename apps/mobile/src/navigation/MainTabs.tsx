import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';
import DashboardScreen from '../screens/DashboardScreen';
import TerminalScreen from '../screens/TerminalScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import AcademyScreen from '../screens/AcademyScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';

// Inline SVG-style tab icons using View components
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? colors.green : colors.t3;
  const size = 22;

  // Simple shape-based icons
  const icons: Record<string, React.ReactNode> = {
    home: (
      <View style={[styles.iconBase, { borderColor: color }]}>
        <View style={[styles.homeRoof, { borderBottomColor: color }]} />
        <View style={[styles.homeBody, { backgroundColor: color }]} />
      </View>
    ),
    trade: (
      <View style={[styles.iconBase]}>
        <View style={[styles.chartBar, { backgroundColor: color, height: 8, left: 2 }]} />
        <View style={[styles.chartBar, { backgroundColor: color, height: 14, left: 8 }]} />
        <View style={[styles.chartBar, { backgroundColor: color, height: 10, left: 14 }]} />
      </View>
    ),
    discover: (
      <View style={[styles.iconBase]}>
        <View style={[styles.searchCircle, { borderColor: color }]} />
        <View style={[styles.searchHandle, { backgroundColor: color }]} />
      </View>
    ),
    learn: (
      <View style={[styles.iconBase]}>
        <View style={[styles.bookCover, { backgroundColor: color }]} />
        <View style={[styles.bookPage, { backgroundColor: colors.bg1 }]} />
      </View>
    ),
    ranks: (
      <View style={[styles.iconBase]}>
        <View style={[styles.trophy, { borderColor: color }]} />
        <View style={[styles.trophyBase, { backgroundColor: color }]} />
      </View>
    ),
  };

  return <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>{icons[name]}</View>;
}

export type MainTabParamList = {
  Dashboard: undefined;
  Terminal: undefined;
  Discover: undefined;
  Academy: undefined;
  Leaderboard: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.bg1,
          borderTopColor: colors.bg3,
          borderTopWidth: 2,
          height: 85,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.t3,
        tabBarLabelStyle: {
          fontFamily: 'SpecialElite',
          fontSize: 10,
          marginTop: 2,
        },
        headerStyle: { backgroundColor: colors.bg1 },
        headerTintColor: colors.t0,
        headerTitleStyle: { fontFamily: 'SpecialElite', fontSize: 18 },
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
          headerTitle: 'PAPERAPE',
        }}
      />
      <Tab.Screen
        name="Terminal"
        component={TerminalScreen}
        options={{
          title: 'Trade',
          tabBarIcon: ({ focused }) => <TabIcon name="trade" focused={focused} />,
          headerTitle: 'TERMINAL',
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => <TabIcon name="discover" focused={focused} />,
          headerTitle: 'DISCOVER',
        }}
      />
      <Tab.Screen
        name="Academy"
        component={AcademyScreen}
        options={{
          title: 'Learn',
          tabBarIcon: ({ focused }) => <TabIcon name="learn" focused={focused} />,
          headerTitle: 'ACADEMY',
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          title: 'Ranks',
          tabBarIcon: ({ focused }) => <TabIcon name="ranks" focused={focused} />,
          headerTitle: 'LEADERBOARD',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconBase: { width: 22, height: 22, position: 'relative', justifyContent: 'flex-end', alignItems: 'center' },
  homeRoof: { width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginBottom: -1 },
  homeBody: { width: 14, height: 10, borderRadius: 1 },
  chartBar: { position: 'absolute', bottom: 0, width: 4, borderRadius: 1 },
  searchCircle: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, position: 'absolute', top: 0, left: 0 },
  searchHandle: { width: 6, height: 2, position: 'absolute', bottom: 2, right: 1, transform: [{ rotate: '45deg' }], borderRadius: 1 },
  bookCover: { width: 16, height: 18, borderRadius: 2 },
  bookPage: { position: 'absolute', width: 12, height: 14, right: 1, top: 2, borderRadius: 1 },
  trophy: { width: 12, height: 10, borderWidth: 2, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, borderTopWidth: 0 },
  trophyBase: { width: 10, height: 3, borderRadius: 1, marginTop: 1 },
});
