import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  useIsFocused,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { NavigationBar } from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef } from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import BibleReader from "./src/components/BibleReader";
import SearchPanel from "./src/components/SearchPanel";
import SettingsModal from "./src/components/SettingsModal";
import TabBar from "./src/components/TabBar";
import TabModal from "./src/components/TabModal";
import VersionModal from "./src/components/VersionModal";
import WhyEmpty from "./src/components/WhyEmpty";
import { colors } from "./src/constants/colors";
import { useAppStore } from "./src/store/useAppStore";
import type { RootStackParamList } from "./src/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, "Home">;

const MAX_MOUNTED_TABS = 8;

function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const mountedOrderRef = useRef<string[]>([]);

  const tabs = useAppStore((s) => s.tabs);
  const currentTab = useAppStore((s) => s.currentTab);
  const theme = useAppStore((s) => s.theme);
  const color = useAppStore((s) => s.color);
  const textSize = useAppStore((s) => s.textSize);
  const showSearch = useAppStore((s) => s.showSearch);

  const setCurrentTab = useAppStore((s) => s.setCurrentTab);
  const addTab = useAppStore((s) => s.addTab);
  const jumpCurrentTabToReference = useAppStore(
    (s) => s.jumpCurrentTabToReference
  );
  const syncScrolledReference = useAppStore((s) => s.syncScrolledReference);
  const setShowSearch = useAppStore((s) => s.setShowSearch);
  const toggleShowSearch = useAppStore((s) => s.toggleShowSearch);

  useEffect(() => {
    if (!isFocused || !showSearch) {
      return;
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setShowSearch(false);
      return true;
    });
    return () => sub.remove();
  }, [isFocused, showSearch, setShowSearch]);

  const activeTab = tabs[currentTab];
  const validTabIds = new Set(tabs.map((t) => t.id));
  const filteredOrder = mountedOrderRef.current.filter((id) =>
    validTabIds.has(id)
  );
  if (activeTab) {
    const withoutActive = filteredOrder.filter((id) => id !== activeTab.id);
    withoutActive.push(activeTab.id);
    mountedOrderRef.current = withoutActive.slice(-MAX_MOUNTED_TABS);
  } else {
    mountedOrderRef.current = filteredOrder.slice(-MAX_MOUNTED_TABS);
  }
  const mountedTabIds = new Set(mountedOrderRef.current);

  const isLightStatusContent = theme === "dark";

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.bible.background[theme] },
      ]}
    >
      <StatusBar style={isLightStatusContent ? "light" : "dark"} />

      {/* Top safe-area + Tab Bar */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: colors.tab.background[theme],
        }}
      >
        <TabBar
          tabs={tabs}
          currentTab={currentTab}
          theme={theme}
          color={color}
          onSelectTab={(index) => {
            setCurrentTab(index);
            setShowSearch(false);
          }}
          onOpenActiveTabModal={() => navigation.navigate("TabModal")}
          onAddTab={addTab}
        />
      </View>

      {/* Live Search Drawer */}
      {showSearch ? (
        <SearchPanel
          theme={theme}
          color={color}
          onSelectReference={(ref, options) => {
            jumpCurrentTabToReference(ref, options?.highlight ?? true);
            if (options?.closeSearch) {
              setShowSearch(false);
            }
          }}
          onClose={toggleShowSearch}
        />
      ) : null}

      {/* Mounted Bible Readers (up to 8 kept alive for instant sub-pixel tab switching) */}
      {tabs.length === 0 ? (
        <WhyEmpty theme={theme} />
      ) : (
        tabs.map((tabItem, idx) =>
          mountedTabIds.has(tabItem.id) ? (
            <BibleReader
              key={`${tabItem.id}:${tabItem.navVersion}`}
              tab={tabItem}
              tabIndex={idx}
              isActive={idx === currentTab}
              theme={theme}
              color={color}
              textSize={textSize}
              bottomInset={insets.bottom}
              onSyncScrolledReference={syncScrolledReference}
            />
          ) : null
        )
      )}
    </View>
  );
}

function RootNavigator() {
  const isHydrated = useAppStore((s) => s.isHydrated);
  const hydrateFromLegacyIfNeeded = useAppStore(
    (s) => s.hydrateFromLegacyIfNeeded
  );
  const theme = useAppStore((s) => s.theme);
  const allowRotation = useAppStore((s) => s.allowRotation);

  useEffect(() => {
    hydrateFromLegacyIfNeeded();
  }, [hydrateFromLegacyIfNeeded]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    const lock = allowRotation
      ? ScreenOrientation.OrientationLock.DEFAULT
      : ScreenOrientation.OrientationLock.PORTRAIT;
    ScreenOrientation.lockAsync(lock).catch(() => {});
  }, [allowRotation]);

  useEffect(() => {
    if (Platform.OS === "android") {
      const barStyle = theme === "dark" ? "light" : "dark";
      try {
        NavigationBar.setStyle(barStyle);
      } catch {
        // Ignore on unsupported devices
      }
    }
  }, [theme]);

  const bgColor = colors.bible.background[theme];
  const baseNavTheme = theme === "dark" ? DarkTheme : DefaultTheme;
  const navigationTheme = useMemo(
    () => ({
      ...baseNavTheme,
      colors: {
        ...baseNavTheme.colors,
        background: bgColor,
        card: bgColor,
        text: colors.bible.text[theme],
      },
    }),
    [baseNavTheme, bgColor, theme]
  );

  if (!isHydrated) {
    return (
      <View
        style={[
          styles.loadingRoot,
          { backgroundColor: bgColor },
        ]}
      />
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: bgColor },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="TabModal" component={TabModal} />
        <Stack.Screen name="Settings" component={SettingsModal} />
        <Stack.Screen name="Version" component={VersionModal} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider
        databaseName="bible_bsb_v2.db"
        assetSource={{ assetId: require("./assets/bible.db") }}
      >
        <RootNavigator />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "column",
  },
  loadingRoot: {
    flex: 1,
  },
});
