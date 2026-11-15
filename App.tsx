import { NavigationBar } from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import BibleReader from "./src/components/BibleReader";
import SearchPanel from "./src/components/SearchPanel";
import TabBar from "./src/components/TabBar";
import TabModal from "./src/components/TabModal";
import WhyEmpty from "./src/components/WhyEmpty";
import { colors } from "./src/constants/colors";
import { useAppStore } from "./src/store/useAppStore";

function MainScreen() {
  const insets = useSafeAreaInsets();
  const [tabModalOpen, setTabModalOpen] = useState(false);

  const isHydrated = useAppStore((s) => s.isHydrated);
  const hydrateFromLegacyIfNeeded = useAppStore(
    (s) => s.hydrateFromLegacyIfNeeded
  );
  const tabs = useAppStore((s) => s.tabs);
  const currentTab = useAppStore((s) => s.currentTab);
  const theme = useAppStore((s) => s.theme);
  const color = useAppStore((s) => s.color);
  const textSize = useAppStore((s) => s.textSize);
  const allowRotation = useAppStore((s) => s.allowRotation);
  const showSearch = useAppStore((s) => s.showSearch);

  const setCurrentTab = useAppStore((s) => s.setCurrentTab);
  const addTab = useAppStore((s) => s.addTab);
  const removeTab = useAppStore((s) => s.removeTab);
  const renameTab = useAppStore((s) => s.renameTab);
  const jumpTabToReference = useAppStore((s) => s.jumpTabToReference);
  const jumpCurrentTabToReference = useAppStore(
    (s) => s.jumpCurrentTabToReference
  );
  const syncScrolledReference = useAppStore((s) => s.syncScrolledReference);
  const setTheme = useAppStore((s) => s.setTheme);
  const setColor = useAppStore((s) => s.setColor);
  const setTextSize = useAppStore((s) => s.setTextSize);
  const toggleRotation = useAppStore((s) => s.toggleRotation);
  const setShowSearch = useAppStore((s) => s.setShowSearch);
  const toggleShowSearch = useAppStore((s) => s.toggleShowSearch);

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

  if (!isHydrated) {
    return (
      <View
        style={[
          styles.loadingRoot,
          { backgroundColor: colors.bible.background[theme] },
        ]}
      />
    );
  }

  const activeTab = tabs[currentTab];
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
          onOpenActiveTabModal={() => setTabModalOpen(true)}
          onAddTab={addTab}
        />
      </View>

      {/* Search Drawer */}
      {showSearch ? (
        <SearchPanel
          theme={theme}
          color={color}
          onSelectReference={(ref) => {
            jumpCurrentTabToReference(ref);
          }}
          onClose={toggleShowSearch}
        />
      ) : null}

      {/* Active Bible Reader or Empty State */}
      {tabs.length === 0 ? (
        <WhyEmpty theme={theme} />
      ) : activeTab ? (
        <BibleReader
          key={`${activeTab.id}:${activeTab.navVersion}`}
          tab={activeTab}
          tabIndex={currentTab}
          theme={theme}
          color={color}
          textSize={textSize}
          bottomInset={insets.bottom}
          onSyncScrolledReference={syncScrolledReference}
        />
      ) : null}

      {/* Hoisted Single Tab/Browser/Settings Modal */}
      <TabModal
        visible={tabModalOpen}
        tab={activeTab}
        tabIndex={currentTab}
        theme={theme}
        color={color}
        textSize={textSize}
        allowRotation={allowRotation}
        insets={insets}
        onClose={() => setTabModalOpen(false)}
        onOpenSearch={() => setShowSearch(true)}
        onRenameTab={renameTab}
        onSelectReference={jumpTabToReference}
        onRemoveTab={removeTab}
        onSetTheme={setTheme}
        onSetColor={setColor}
        onSetTextSize={setTextSize}
        onToggleRotation={toggleRotation}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider
        databaseName="bible_v1.db"
        assetSource={{ assetId: require("./assets/bible.db") }}
      >
        <MainScreen />
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
