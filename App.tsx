import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ConfigProvider } from './src/lib/ConfigContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { RemoteScreen } from './src/screens/RemoteScreen';
import { BrowserScreen } from './src/screens/BrowserScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { theme } from './src/theme';

export type RootStackParamList = {
  Home: undefined;
  Remote: undefined;
  Browser: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    primary: theme.colors.accent,
  },
};

export default function App() {
  return (
    <ConfigProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Remote" component={RemoteScreen} />
          <Stack.Screen name="Browser" component={BrowserScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ConfigProvider>
  );
}
