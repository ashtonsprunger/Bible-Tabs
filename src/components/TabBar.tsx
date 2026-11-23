import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { formatChapterLabel, parseReference } from "../constants/books";
import { colors, uiTokens } from "../constants/colors";
import type { RuntimeTab } from "../store/useAppStore";
import type { AccentColorName, ThemeName } from "../types";
import {
  ChevronIcon,
  MenuIcon,
  NotebookIcon,
  SearchIcon,
  SettingsIcon,
} from "./Icons";

interface TabBarProps {
  tabs: RuntimeTab[];
  currentTab: number;
  theme: ThemeName;
  color: AccentColorName;
  isDesktop: boolean;
  isTabPanelOpen: boolean;
  isSearchOpen: boolean;
  activeRightPanel?: "search" | "notebook" | "settings" | null;
  studyCount: number;
  onSelectTab: (index: number) => void;
  onToggleActiveTabPanel: () => void;
  onOpenTabPanelForIndex: (index: number) => void;
  onCloseTab: (index: number) => void;
  onAddTab: () => void;
  onToggleSearch: () => void;
  onOpenNotebook: () => void;
  onOpenSettings: () => void;
  onOpenMenu: () => void;
}

const BAR_HEIGHT = 44;
const TAB_HEIGHT = 39;

interface WebAnimatableNode {
  offsetLeft?: number;
  animate?: (
    keyframes: Array<{ transform: string }>,
    options: { duration: number; easing: string }
  ) => unknown;
  getAnimations?: () => Array<{ cancel: () => void }>;
}

export default function TabBar({
  tabs,
  currentTab,
  theme,
  color,
  isDesktop,
  isTabPanelOpen,
  isSearchOpen,
  activeRightPanel = null,
  studyCount,
  onSelectTab,
  onToggleActiveTabPanel,
  onOpenTabPanelForIndex,
  onCloseTab,
  onAddTab,
  onToggleSearch,
  onOpenNotebook,
  onOpenSettings,
  onOpenMenu,
}: TabBarProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [hoveredCloseId, setHoveredCloseId] = useState<string | null>(null);

  const tabOrderSig = tabs.map((t) => t.id).join("|");

  // Web FLIP refs (DOM offsetLeft + Web Animations API, since RN-Web onLayout uses ResizeObserver and ignores x-only moves)
  const webNodeByIdRef = useRef<Map<string, WebAnimatableNode>>(new Map());
  const webPrevLeftByIdRef = useRef<Map<string, number>>(new Map());
  const webPrevSigRef = useRef<string>(tabOrderSig);

  // Native FLIP refs (Yoga onLayout fires reliably on x changes)
  const nativePrevXByIdRef = useRef<Map<string, number>>(new Map());
  const nativeAnimXByIdRef = useRef<Map<string, Animated.Value>>(new Map());
  const nativePrevSigRef = useRef<string>(tabOrderSig);
  const nativeLastOrderChangeAtRef = useRef<number>(0);

  if (Platform.OS !== "web" && tabOrderSig !== nativePrevSigRef.current) {
    nativePrevSigRef.current = tabOrderSig;
    nativeLastOrderChangeAtRef.current = Date.now();
  }

  // Web FLIP: measure offsetLeft before paint and animate with Web Animations API when tab order changes
  useLayoutEffect(() => {
    if (Platform.OS !== "web") return;

    const orderChanged = webPrevSigRef.current !== tabOrderSig;
    const nextLefts = new Map<string, number>();

    for (const tab of tabs) {
      const node = webNodeByIdRef.current.get(tab.id);
      if (node && typeof node.offsetLeft === "number") {
        nextLefts.set(tab.id, node.offsetLeft);
      }
    }

    if (orderChanged) {
      for (const tab of tabs) {
        const node = webNodeByIdRef.current.get(tab.id);
        const prevLeft = webPrevLeftByIdRef.current.get(tab.id);
        const nextLeft = nextLefts.get(tab.id);
        if (
          node &&
          prevLeft !== undefined &&
          nextLeft !== undefined &&
          typeof node.animate === "function"
        ) {
          const deltaX = prevLeft - nextLeft;
          if (Math.abs(deltaX) > 2) {
            node.getAnimations?.().forEach((a) => a.cancel());
            node.animate(
              [
                { transform: `translateX(${deltaX}px)` },
                { transform: "translateX(0px)" },
              ],
              {
                duration: 220,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              }
            );
          }
        }
      }
    }

    webPrevLeftByIdRef.current = nextLefts;
    webPrevSigRef.current = tabOrderSig;
  }, [tabOrderSig, tabs, currentTab, isDesktop]);

  // Clean up closed tab entries
  useEffect(() => {
    const activeIds = new Set(tabs.map((t) => t.id));
    for (const id of nativePrevXByIdRef.current.keys()) {
      if (!activeIds.has(id)) {
        nativePrevXByIdRef.current.delete(id);
        nativeAnimXByIdRef.current.delete(id);
      }
    }
    for (const id of webNodeByIdRef.current.keys()) {
      if (!activeIds.has(id)) {
        webNodeByIdRef.current.delete(id);
      }
    }
  }, [tabOrderSig, tabs]);

  // Keep active tab scrolled into view on switch / add / reorder
  const prevFocusRef = useRef<{ currentTab: number; count: number; sig: string }>({
    currentTab,
    count: tabs.length,
    sig: tabOrderSig,
  });

  useEffect(() => {
    const prev = prevFocusRef.current;
    const didChange =
      prev.currentTab !== currentTab ||
      prev.count !== tabs.length ||
      prev.sig !== tabOrderSig;
    prevFocusRef.current = { currentTab, count: tabs.length, sig: tabOrderSig };

    if (!didChange || tabs.length === 0 || currentTab >= tabs.length) {
      return;
    }

    const activeId = tabs[currentTab]?.id;
    if (!activeId) return;

    const timer = setTimeout(() => {
      const targetX =
        Platform.OS === "web"
          ? webPrevLeftByIdRef.current.get(activeId)
          : nativePrevXByIdRef.current.get(activeId);
      if (targetX !== undefined) {
        scrollRef.current?.scrollTo({
          x: Math.max(0, targetX - 72),
          animated: true,
        });
      }
    }, 35);

    return () => clearTimeout(timer);
  }, [currentTab, tabs, tabOrderSig]);

  const getNativeAnimX = (id: string): Animated.Value => {
    let val = nativeAnimXByIdRef.current.get(id);
    if (!val) {
      val = new Animated.Value(0);
      nativeAnimXByIdRef.current.set(id, val);
    }
    return val;
  };

  const handleNativeTabLayout = (id: string, newX: number) => {
    if (Platform.OS === "web") return;
    const prevX = nativePrevXByIdRef.current.get(id);
    nativePrevXByIdRef.current.set(id, newX);

    if (prevX === undefined) {
      return;
    }

    const deltaX = prevX - newX;
    const isRecentOrderChange =
      Date.now() - nativeLastOrderChangeAtRef.current < 350;

    if (isRecentOrderChange && Math.abs(deltaX) > 2) {
      const anim = getNativeAnimX(id);
      anim.stopAnimation();
      anim.setValue(deltaX);
      Animated.timing(anim, {
        toValue: 0,
        duration: 210,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  };

  const ui = uiTokens[theme];
  const accentBorder = colors.bible.color[theme][color][0];
  const accentColor = colors.bible.color[theme][color][1];
  const searchActive = isDesktop
    ? activeRightPanel === "search"
    : isSearchOpen;
  const notebookActive = isDesktop && activeRightPanel === "notebook";
  const settingsActive = isDesktop && activeRightPanel === "settings";

  return (
    <View
      style={[
        styles.barRoot,
        {
          backgroundColor: ui.chromeBg,
        },
      ]}
    >
      {/* Left: Scrollable Browser-Style Tab Strip with Smooth FLIP Reorder Animation */}
      <View style={styles.tabsStrip}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.listContent}
        >
          {tabs.map((item, index) => {
            const isActive = index === currentTab;
            const isHovered = hoveredTabId === item.id;
            const isCloseHovered = hoveredCloseId === item.id;
            const ref = parseReference(item.reference);
            const defaultLabel = formatChapterLabel(ref.book, ref.chapter);
            const label = item.name ? item.name : defaultLabel;
            const hasDesktopCloseSlot = isDesktop && tabs.length > 1;
            const closeVisible = hasDesktopCloseSlot && (isActive || isHovered);

            const shellStyle = [
              styles.tabShell,
              isDesktop && styles.tabShellDesktop,
              {
                zIndex: isActive ? 2 : 1,
              },
              isActive
                ? {
                    backgroundColor: ui.bg,
                    borderTopColor: accentBorder,
                    borderLeftWidth: 1,
                    borderLeftColor: ui.border,
                    borderRightWidth: 1,
                    borderRightColor: ui.border,
                    borderBottomColor: ui.bg,
                  }
                : {
                    backgroundColor: isHovered ? ui.surface : "transparent",
                    borderTopColor: "transparent",
                    borderLeftWidth: 0,
                    borderRightWidth: 0,
                    borderBottomColor: ui.border,
                  },
            ];

            const tabInner = (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.tabMainArea,
                    hasDesktopCloseSlot && styles.tabMainAreaWithClose,
                    !isActive && pressed && { opacity: 0.72 },
                  ]}
                  onPress={() => {
                    if (isActive) {
                      onToggleActiveTabPanel();
                    } else {
                      onSelectTab(index);
                    }
                  }}
                  onLongPress={() => onOpenTabPanelForIndex(index)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.tabText,
                      {
                        color: isActive ? ui.text : ui.muted,
                        fontWeight: isActive ? "600" : "500",
                      },
                    ]}
                  >
                    {label}
                  </Text>

                  {isActive ? (
                    <View style={styles.chevronWrap}>
                      <ChevronIcon
                        color={isTabPanelOpen ? accentColor : ui.muted}
                        direction={isTabPanelOpen ? "up" : "down"}
                        size={10}
                      />
                    </View>
                  ) : null}
                </Pressable>

                {hasDesktopCloseSlot ? (
                  <Pressable
                    onPress={() => {
                      setHoveredTabId(null);
                      setHoveredCloseId(null);
                      onCloseTab(index);
                    }}
                    onHoverIn={
                      Platform.OS === "web"
                        ? () => setHoveredCloseId(item.id)
                        : undefined
                    }
                    onHoverOut={
                      Platform.OS === "web"
                        ? () =>
                            setHoveredCloseId((prev) =>
                              prev === item.id ? null : prev
                            )
                        : undefined
                    }
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel={`Close ${label} tab`}
                    style={({ pressed }) => [
                      styles.tabCloseBtn,
                      {
                        opacity: closeVisible ? 1 : 0,
                      },
                      (pressed || isCloseHovered) && {
                        backgroundColor: isActive ? ui.surface : ui.chromeBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabCloseText,
                        { color: isCloseHovered ? ui.text : ui.muted },
                      ]}
                    >
                      ×
                    </Text>
                  </Pressable>
                ) : null}
              </>
            );

            if (Platform.OS === "web") {
              const webHoverProps = {
                onMouseEnter: () => setHoveredTabId(item.id),
                onMouseLeave: () => {
                  setHoveredTabId((prev) => (prev === item.id ? null : prev));
                  setHoveredCloseId((prev) => (prev === item.id ? null : prev));
                },
              } as Record<string, unknown>;

              return (
                <View
                  key={item.id}
                  ref={(node) => {
                    if (node) {
                      webNodeByIdRef.current.set(
                        item.id,
                        node as unknown as WebAnimatableNode
                      );
                    } else {
                      webNodeByIdRef.current.delete(item.id);
                    }
                  }}
                  {...webHoverProps}
                  style={shellStyle}
                >
                  {tabInner}
                </View>
              );
            }

            const animX = getNativeAnimX(item.id);
            return (
              <Animated.View
                key={item.id}
                onLayout={(e) =>
                  handleNativeTabLayout(item.id, e.nativeEvent.layout.x)
                }
                style={[...shellStyle, { transform: [{ translateX: animX }] }]}
              >
                {tabInner}
              </Animated.View>
            );
          })}

          <View style={[styles.footerFiller, { borderBottomColor: ui.border }]}>
            <Pressable
              style={({ pressed }) => [
                styles.newTabButton,
                pressed && { backgroundColor: ui.surface },
              ]}
              onPress={onAddTab}
              accessibilityRole="button"
              accessibilityLabel="New tab"
            >
              <Text style={[styles.newTabText, { color: ui.muted }]}>+</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {/* Right: Pinned Global Utility Controls */}
      <View
        style={[
          styles.rightControls,
          {
            borderLeftColor: ui.border,
            borderBottomColor: ui.border,
          },
          isDesktop && styles.rightControlsDesktop,
        ]}
      >
        {isDesktop ? (
          <>
            <Pressable
              onPress={onToggleSearch}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Search Scripture"
              style={({ pressed }) => [
                styles.iconBtn,
                (pressed || searchActive) && { backgroundColor: ui.surface },
              ]}
            >
              <SearchIcon
                color={searchActive ? accentColor : ui.text}
                size={17}
              />
            </Pressable>

            <Pressable
              onPress={onOpenNotebook}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Notebook"
              style={({ pressed }) => [
                styles.iconBtn,
                styles.desktopIconPill,
                (pressed || notebookActive) && { backgroundColor: ui.surface },
              ]}
            >
              <NotebookIcon
                color={notebookActive ? accentColor : ui.text}
                size={16}
              />
              <Text
                style={[
                  styles.desktopIconLabel,
                  {
                    color: notebookActive ? accentColor : ui.text,
                    fontWeight: notebookActive ? "600" : "500",
                  },
                ]}
              >
                Notebook{studyCount > 0 ? ` (${studyCount})` : ""}
              </Text>
            </Pressable>

            <Pressable
              onPress={onOpenSettings}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={({ pressed }) => [
                styles.iconBtn,
                (pressed || settingsActive) && { backgroundColor: ui.surface },
              ]}
            >
              <SettingsIcon
                color={settingsActive ? accentColor : ui.text}
                size={17}
              />
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={onOpenMenu}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            style={({ pressed }) => [
              styles.iconBtn,
              (pressed || isSearchOpen) && { backgroundColor: ui.surface },
            ]}
          >
            <MenuIcon color={isSearchOpen ? accentColor : ui.text} size={17} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barRoot: {
    flexDirection: "row",
    alignItems: "stretch",
    height: BAR_HEIGHT,
  },
  tabsStrip: {
    flex: 1,
    minWidth: 0,
    height: BAR_HEIGHT,
  },
  scrollView: {
    height: BAR_HEIGHT,
  },
  listContent: {
    flexGrow: 1,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: BAR_HEIGHT - TAB_HEIGHT,
    paddingBottom: 0,
    alignItems: "flex-end",
  },
  tabShell: {
    height: TAB_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderTopWidth: 3,
    borderBottomWidth: 1,
    maxWidth: 175,
  },
  tabShellDesktop: {
    maxWidth: 215,
    paddingRight: 6,
  },
  tabMainArea: {
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    flexShrink: 1,
  },
  tabMainAreaWithClose: {
    paddingLeft: 13,
    paddingRight: 4,
  },
  tabText: {
    fontSize: 14.5,
    lineHeight: 19,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  chevronWrap: {
    marginLeft: 5,
    opacity: 0.85,
  },
  tabCloseBtn: {
    marginLeft: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tabCloseText: {
    fontSize: 15,
    lineHeight: 16,
    fontWeight: "500",
  },
  footerFiller: {
    flexGrow: 1,
    height: TAB_HEIGHT,
    borderBottomWidth: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 4,
  },
  newTabButton: {
    width: 34,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  newTabText: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "500",
  },
  rightControls: {
    height: BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    paddingHorizontal: 6,
    gap: 2,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
  },
  rightControlsDesktop: {
    paddingHorizontal: 10,
    gap: 4,
  },
  iconBtn: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  desktopIconPill: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
  },
  desktopIconLabel: {
    fontSize: 13.5,
    fontWeight: "500",
  },
});
