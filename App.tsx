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
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AppMenuModal from "./src/components/AppMenuModal";
import BibleReader from "./src/components/BibleReader";
import NotebookModal, { NotebookContent } from "./src/components/NotebookModal";
import NoteEditorModal, {
  NoteEditorContent,
} from "./src/components/NoteEditorModal";
import SearchPanel from "./src/components/SearchPanel";
import SettingsModal, { SettingsContent } from "./src/components/SettingsModal";
import TabBar from "./src/components/TabBar";
import TabModal from "./src/components/TabModal";
import TabPassagePanel from "./src/components/TabPassagePanel";
import VersionModal, { VersionContent } from "./src/components/VersionModal";
import WhyEmpty from "./src/components/WhyEmpty";
import { uiTokens } from "./src/constants/colors";
import { useResponsiveLayout } from "./src/constants/layout";
import { BibleDbProvider, useBibleDb } from "./src/db/BibleDbContext";
import { useAppStore } from "./src/store/useAppStore";
import { useStudyStore } from "./src/store/useStudyStore";
import type { NoteEditorParams, RootStackParamList } from "./src/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, "Home">;

type RightPanelState =
  | null
  | { kind: "search" }
  | { kind: "notebook" }
  | { kind: "settings" }
  | { kind: "version" }
  | {
      kind: "noteEditor";
      params: NoteEditorParams;
      returnTo?: "notebook";
    };

const MAX_MOUNTED_TABS = 8;

function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { isDesktop, canFitBothSidebars } = useResponsiveLayout();
  const mountedOrderRef = useRef<string[]>([]);
  const { loadedTranslation } = useBibleDb();

  const [isTabPanelOpen, setIsTabPanelOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanelState>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs = useAppStore((s) => s.tabs);
  const currentTab = useAppStore((s) => s.currentTab);
  const theme = useAppStore((s) => s.theme);
  const color = useAppStore((s) => s.color);
  const textSize = useAppStore((s) => s.textSize);
  const fontFamily = useAppStore((s) => s.fontFamily);
  const showSearch = useAppStore((s) => s.showSearch);

  const setCurrentTab = useAppStore((s) => s.setCurrentTab);
  const addTab = useAppStore((s) => s.addTab);
  const removeTab = useAppStore((s) => s.removeTab);
  const moveTab = useAppStore((s) => s.moveTab);
  const renameTab = useAppStore((s) => s.renameTab);
  const flushTabs = useAppStore((s) => s.flushTabs);
  const jumpTabToReference = useAppStore((s) => s.jumpTabToReference);
  const jumpCurrentTabToReference = useAppStore(
    (s) => s.jumpCurrentTabToReference
  );
  const syncScrolledReference = useAppStore((s) => s.syncScrolledReference);
  const setShowSearch = useAppStore((s) => s.setShowSearch);
  const toggleShowSearch = useAppStore((s) => s.toggleShowSearch);

  const highlightsCount = useStudyStore(
    (s) => Object.keys(s.highlightsByKey).length
  );
  const notesCount = useStudyStore((s) => Object.keys(s.notesById).length);
  const studyCount = highlightsCount + notesCount;

  const openRightPanel = useCallback(
    (next: RightPanelState) => {
      setRightPanel(next);
      if (next !== null && !canFitBothSidebars) {
        setIsTabPanelOpen(false);
      }
    },
    [canFitBothSidebars]
  );

  const toggleDesktopRightPanel = useCallback(
    (kind: "search" | "notebook" | "settings") => {
      setRightPanel((prev) => {
        const isAlreadyActive =
          prev?.kind === kind ||
          (kind === "settings" && prev?.kind === "version") ||
          (kind === "notebook" &&
            prev?.kind === "noteEditor" &&
            prev.returnTo === "notebook");
        if (isAlreadyActive) {
          return null;
        }
        if (!canFitBothSidebars) {
          setIsTabPanelOpen(false);
        }
        return { kind };
      });
    },
    [canFitBothSidebars]
  );

  // Close TabPanel automatically if user removes the last tab
  useEffect(() => {
    if (tabs.length === 0 && isTabPanelOpen) {
      setIsTabPanelOpen(false);
    }
  }, [tabs.length, isTabPanelOpen]);

  // Keep desktop right sidebar and mobile search drawer cleanly synchronized across viewport resizes
  useEffect(() => {
    if (!isDesktop && rightPanel !== null) {
      setRightPanel(null);
    } else if (isDesktop && showSearch) {
      setShowSearch(false);
      openRightPanel({ kind: "search" });
    }
  }, [isDesktop, rightPanel, showSearch, setShowSearch, openRightPanel]);

  // Protect Scripture reading width if browser shrinks below wide-desktop threshold with both sidebars open
  useEffect(() => {
    if (isDesktop && !canFitBothSidebars && isTabPanelOpen && rightPanel !== null) {
      setIsTabPanelOpen(false);
    }
  }, [isDesktop, canFitBothSidebars, isTabPanelOpen, rightPanel]);

  // Android Hardware Back closes Menu -> RightPanel -> Search -> TabPanel in order
  useEffect(() => {
    if (!isFocused) return;
    if (!isMenuOpen && !rightPanel && !showSearch && !isTabPanelOpen) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
        return true;
      }
      if (rightPanel) {
        if (rightPanel.kind === "version") {
          setRightPanel({ kind: "settings" });
        } else if (
          rightPanel.kind === "noteEditor" &&
          rightPanel.returnTo === "notebook"
        ) {
          setRightPanel({ kind: "notebook" });
        } else {
          setRightPanel(null);
        }
        return true;
      }
      if (showSearch) {
        setShowSearch(false);
        return true;
      }
      if (isTabPanelOpen) {
        setIsTabPanelOpen(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [
    isFocused,
    isMenuOpen,
    rightPanel,
    showSearch,
    isTabPanelOpen,
    setShowSearch,
  ]);

  // Desktop web keyboard shortcuts: Ctrl/Cmd+K or "/" toggles Search, Escape pops/closes panels
  useEffect(() => {
    if (Platform.OS !== "web" || !isFocused || typeof window === "undefined") {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsMenuOpen(false);
        if (isDesktop) {
          toggleDesktopRightPanel("search");
        } else {
          setIsTabPanelOpen(false);
          toggleShowSearch();
        }
        return;
      }
      if (
        e.key === "/" &&
        !isEditing &&
        !(isDesktop ? rightPanel?.kind === "search" : showSearch)
      ) {
        e.preventDefault();
        setIsMenuOpen(false);
        if (isDesktop) {
          openRightPanel({ kind: "search" });
        } else {
          setIsTabPanelOpen(false);
          setShowSearch(true);
        }
        return;
      }
      if (e.key === "Escape") {
        if (isMenuOpen) {
          e.preventDefault();
          setIsMenuOpen(false);
        } else if (isDesktop && rightPanel) {
          e.preventDefault();
          if (rightPanel.kind === "version") {
            setRightPanel({ kind: "settings" });
          } else if (
            rightPanel.kind === "noteEditor" &&
            rightPanel.returnTo === "notebook"
          ) {
            setRightPanel({ kind: "notebook" });
          } else {
            setRightPanel(null);
          }
        } else if (showSearch) {
          e.preventDefault();
          setShowSearch(false);
        } else if (isTabPanelOpen) {
          e.preventDefault();
          setIsTabPanelOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isFocused,
    isDesktop,
    isMenuOpen,
    rightPanel,
    showSearch,
    isTabPanelOpen,
    setShowSearch,
    toggleShowSearch,
    openRightPanel,
    toggleDesktopRightPanel,
  ]);

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

  const activeRightTabBarKey: "search" | "notebook" | "settings" | null =
    !isDesktop || !rightPanel
      ? null
      : rightPanel.kind === "search"
        ? "search"
        : rightPanel.kind === "notebook" ||
            (rightPanel.kind === "noteEditor" &&
              rightPanel.returnTo === "notebook")
          ? "notebook"
          : rightPanel.kind === "settings" || rightPanel.kind === "version"
            ? "settings"
            : null;

  const ui = uiTokens[theme];
  const isLightStatusContent = theme === "dark";
  const showReaders = isDesktop || !isTabPanelOpen;

  return (
    <View style={[styles.root, { backgroundColor: ui.bg }]}>
      <StatusBar style={isLightStatusContent ? "light" : "dark"} />

      {/* Persistent Full-Width Responsive Top Tab & Utility Bar */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: ui.chromeBg,
        }}
      >
        <TabBar
          tabs={tabs}
          currentTab={currentTab}
          theme={theme}
          color={color}
          isDesktop={isDesktop}
          isTabPanelOpen={isTabPanelOpen}
          isSearchOpen={showSearch}
          activeRightPanel={activeRightTabBarKey}
          studyCount={studyCount}
          onSelectTab={(index) => {
            setCurrentTab(index);
            setIsMenuOpen(false);
            if (!isDesktop) {
              setShowSearch(false);
            }
          }}
          onToggleActiveTabPanel={() => {
            setIsMenuOpen(false);
            if (!isDesktop) {
              setShowSearch(false);
            }
            setIsTabPanelOpen((open) => {
              const nextOpen = !open;
              if (nextOpen && isDesktop && !canFitBothSidebars) {
                setRightPanel(null);
              }
              return nextOpen;
            });
          }}
          onOpenTabPanelForIndex={(index) => {
            setCurrentTab(index);
            setIsMenuOpen(false);
            if (!isDesktop) {
              setShowSearch(false);
            }
            if (isDesktop && !canFitBothSidebars) {
              setRightPanel(null);
            }
            setIsTabPanelOpen(true);
          }}
          onCloseTab={(index) => {
            removeTab(index);
          }}
          onAddTab={() => {
            addTab();
            setIsMenuOpen(false);
            if (!isDesktop) {
              setShowSearch(false);
            }
          }}
          onToggleSearch={() => {
            setIsMenuOpen(false);
            if (isDesktop) {
              toggleDesktopRightPanel("search");
            } else {
              setIsTabPanelOpen(false);
              toggleShowSearch();
            }
          }}
          onOpenNotebook={() => {
            setIsMenuOpen(false);
            if (isDesktop) {
              toggleDesktopRightPanel("notebook");
            } else {
              navigation.navigate("Notebook");
            }
          }}
          onOpenSettings={() => {
            setIsMenuOpen(false);
            if (isDesktop) {
              toggleDesktopRightPanel("settings");
            } else {
              navigation.navigate("Settings");
            }
          }}
          onOpenMenu={() => {
            setShowSearch(false);
            setIsMenuOpen((v) => !v);
          }}
        />
      </View>

      {/* Mobile Live Search Drawer (desktop Search lives in the docked right sidebar) */}
      {!isDesktop && showSearch ? (
        <View
          style={[
            styles.searchHost,
            { backgroundColor: ui.bg, borderBottomColor: ui.border },
          ]}
        >
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
        </View>
      ) : null}

      {/* Main Workspace: Desktop Split (Left Sidebar + Reader + Right Sidebar) OR Mobile Panel / Reader */}
      <View
        style={[
          styles.workspace,
          isDesktop ? styles.workspaceRow : styles.workspaceCol,
        ]}
      >
        {isTabPanelOpen && activeTab ? (
          <TabPassagePanel
            tab={activeTab}
            tabIndex={currentTab}
            totalTabs={tabs.length}
            theme={theme}
            color={color}
            isDesktop={isDesktop}
            bottomInset={insets.bottom}
            onRenameTab={(idx, name) => renameTab(idx, name)}
            onFlushTabs={flushTabs}
            onMoveTab={moveTab}
            onRemoveTab={removeTab}
            onSelectChapter={(book, chapter) => {
              jumpTabToReference(currentTab, { book, chapter, verse: 1 }, false);
            }}
            onClose={() => setIsTabPanelOpen(false)}
          />
        ) : null}

        <View
          style={[
            styles.readerArea,
            !showReaders && styles.hiddenArea,
          ]}
        >
          {tabs.length === 0 ? (
            <WhyEmpty theme={theme} />
          ) : (
            tabs.map((tabItem, idx) =>
              mountedTabIds.has(tabItem.id) ? (
                <BibleReader
                  key={`${loadedTranslation}:${tabItem.id}:${tabItem.navVersion}`}
                  tab={tabItem}
                  tabIndex={idx}
                  isActive={idx === currentTab}
                  theme={theme}
                  color={color}
                  textSize={textSize}
                  fontFamily={fontFamily}
                  translation={loadedTranslation}
                  isDesktop={isDesktop}
                  bottomInset={insets.bottom}
                  onSyncScrolledReference={syncScrolledReference}
                  onNavigateChapter={(tIdx, ref) => {
                    jumpTabToReference(tIdx, ref, false);
                  }}
                  onOpenNoteEditor={(params) => {
                    if (isDesktop) {
                      openRightPanel({ kind: "noteEditor", params });
                    } else {
                      navigation.navigate("NoteEditor", params);
                    }
                  }}
                />
              ) : null
            )
          )}
        </View>

        {/* Docked Desktop Right Sidebar: Search, Notebook, Settings, Note Editor, or About */}
        {isDesktop && rightPanel !== null ? (
          <View
            style={[
              styles.rightSidebar,
              {
                backgroundColor: ui.bg,
                borderLeftColor: ui.border,
                paddingBottom: Math.max(8, insets.bottom),
              },
            ]}
          >
            {rightPanel.kind === "search" ? (
              <SearchPanel
                theme={theme}
                color={color}
                embeddedSidebar
                onSelectReference={(ref, options) => {
                  jumpCurrentTabToReference(ref, options?.highlight ?? true);
                  if (options?.closeSearch) {
                    setRightPanel(null);
                  }
                }}
                onClose={() => setRightPanel(null)}
              />
            ) : null}

            {rightPanel.kind === "notebook" ? (
              <NotebookContent
                embedded
                onClose={() => setRightPanel(null)}
                onEditNote={(params) =>
                  openRightPanel({
                    kind: "noteEditor",
                    params,
                    returnTo: "notebook",
                  })
                }
              />
            ) : null}

            {rightPanel.kind === "settings" ? (
              <SettingsContent
                embedded
                onClose={() => setRightPanel(null)}
                onOpenVersion={() => openRightPanel({ kind: "version" })}
              />
            ) : null}

            {rightPanel.kind === "version" ? (
              <VersionContent
                embedded
                backLabel="Settings"
                onBack={() => openRightPanel({ kind: "settings" })}
                onClose={() => setRightPanel(null)}
              />
            ) : null}

            {rightPanel.kind === "noteEditor" ? (
              <NoteEditorContent
                key={`${rightPanel.params.noteId ?? "new"}:${rightPanel.params.book}:${rightPanel.params.chapter}:${rightPanel.params.startVerse}:${rightPanel.params.endVerse}`}
                embedded
                params={rightPanel.params}
                backLabel={
                  rightPanel.returnTo === "notebook" ? "Notebook" : undefined
                }
                onClose={() => {
                  if (rightPanel.returnTo === "notebook") {
                    openRightPanel({ kind: "notebook" });
                  } else {
                    setRightPanel(null);
                  }
                }}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Mobile Global Menu Dropdown */}
      <AppMenuModal
        visible={isMenuOpen}
        topOffset={insets.top}
        theme={theme}
        color={color}
        translation={loadedTranslation}
        fontFamily={fontFamily}
        notesCount={notesCount}
        highlightsCount={highlightsCount}
        onClose={() => setIsMenuOpen(false)}
        onOpenSearch={() => {
          setIsTabPanelOpen(false);
          setShowSearch(true);
        }}
        onOpenNotebook={() => navigation.navigate("Notebook")}
        onOpenSettings={() => navigation.navigate("Settings")}
        onOpenAbout={() => navigation.navigate("Version")}
      />
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

  const ui = uiTokens[theme];
  const baseNavTheme = theme === "dark" ? DarkTheme : DefaultTheme;
  const navigationTheme = useMemo(
    () => ({
      ...baseNavTheme,
      colors: {
        ...baseNavTheme.colors,
        background: ui.bg,
        card: ui.bg,
        text: ui.text,
      },
    }),
    [baseNavTheme, ui.bg, ui.text]
  );

  if (!isHydrated) {
    return <View style={[styles.loadingRoot, { backgroundColor: ui.bg }]} />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === "web" ? "fade" : "slide_from_bottom",
          contentStyle: { backgroundColor: ui.bg },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="TabModal" component={TabModal} />
        <Stack.Screen name="Settings" component={SettingsModal} />
        <Stack.Screen name="Version" component={VersionModal} />
        <Stack.Screen name="Notebook" component={NotebookModal} />
        <Stack.Screen name="NoteEditor" component={NoteEditorModal} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <BibleDbProvider>
        <RootNavigator />
      </BibleDbProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "column",
  },
  searchHost: {
    borderBottomWidth: 1,
  },
  workspace: {
    flex: 1,
  },
  workspaceRow: {
    flexDirection: "row",
  },
  workspaceCol: {
    flexDirection: "column",
  },
  readerArea: {
    flex: 1,
    minWidth: 0,
  },
  hiddenArea: {
    display: "none",
  },
  rightSidebar: {
    width: 380,
    borderLeftWidth: 1,
    flexShrink: 0,
  },
  loadingRoot: {
    flex: 1,
  },
});
