import AsyncStorage from "@react-native-async-storage/async-storage";
import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";
import { create } from "zustand";
import { ACCENT_COLORS, TEXT_SIZES } from "../constants/colors";
import { formatReference, parseReference } from "../constants/books";
import { parseTranslationId } from "../constants/translations";
import type {
  AccentColorName,
  BibleReference,
  FontFamilyOption,
  TabItem,
  TextSizeOption,
  ThemeName,
  TranslationId,
} from "../types";

const MIGRATION_FLAG_KEY = "migrated_from_async_storage_v1";

const LEGACY_KEYS = [
  "tabs",
  "lastTab",
  "theme",
  "color",
  "textSize",
  "rotate",
  "lastVersion",
] as const;

export interface RuntimeTab extends TabItem {
  navVersion: number;
  highlightRef?: string | null;
}

let nextTabCounter = 1;
function makeTabId(): string {
  return `tab_${Date.now()}_${nextTabCounter++}`;
}

function kvGetSync(key: string): string | null {
  try {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined"
        ? localStorage.getItem(key)
        : null;
    }
    return Storage.getItemSync(key);
  } catch {
    return null;
  }
}

function kvSetSync(key: string, value: string): void {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, value);
      }
      return;
    }
    Storage.setItemSync(key, value);
  } catch (err) {
    console.warn("Storage write failed:", key, err);
  }
}

function parseStoredTabs(raw: string | null): RuntimeTab[] {
  if (raw === null) {
    return [{ id: makeTabId(), name: "", reference: "0,1,1", navVersion: 0 }];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [{ id: makeTabId(), name: "", reference: "0,1,1", navVersion: 0 }];
    }
    // Note: an empty array `[]` is preserved intentionally (triggers the Why screen)
    return parsed.map((item) => {
      const normalizedRef = formatReference(parseReference(item?.reference));
      const name = typeof item?.name === "string" ? item.name : "";
      const id =
        typeof item?.id === "string" && item.id.length > 0
          ? item.id
          : makeTabId();
      return {
        id,
        name,
        reference: normalizedRef,
        navVersion: 0,
      };
    });
  } catch {
    return [{ id: makeTabId(), name: "", reference: "0,1,1", navVersion: 0 }];
  }
}

const latestReferenceByTabId = new Map<string, string>();

function getBookChapterKey(refString: string): string {
  const firstComma = refString.indexOf(",");
  if (firstComma === -1) return refString;
  const secondComma = refString.indexOf(",", firstComma + 1);
  return secondComma === -1 ? refString : refString.slice(0, secondComma);
}

function withLatestRefs(tabs: RuntimeTab[]): RuntimeTab[] {
  let changed = false;
  const updated = tabs.map((t) => {
    const latest = latestReferenceByTabId.get(t.id);
    if (latest && latest !== t.reference) {
      changed = true;
      return { ...t, reference: latest };
    }
    return t;
  });
  return changed ? updated : tabs;
}

function serializeTabs(tabs: RuntimeTab[]): string {
  // Store exact legacy shape ({ reference, name }) plus id for backwards compatibility
  return JSON.stringify(
    tabs.map((t) => ({
      id: t.id,
      reference: latestReferenceByTabId.get(t.id) ?? t.reference,
      name: t.name,
    }))
  );
}

function parseTheme(raw: string | null): ThemeName {
  if (raw === "light" || raw === "sepia" || raw === "dark") {
    return raw;
  }
  return "light";
}

function parseColor(raw: string | null): AccentColorName {
  if (raw && (ACCENT_COLORS as readonly string[]).includes(raw)) {
    return raw as AccentColorName;
  }
  return "blue";
}

function parseTextSize(raw: string | null): TextSizeOption {
  if (raw && (TEXT_SIZES as readonly string[]).includes(raw)) {
    return raw as TextSizeOption;
  }
  return "18";
}

function parseFontFamily(raw: string | null): FontFamilyOption {
  if (raw === "serif" || raw === "sans") {
    return raw;
  }
  return "serif";
}

function clampTabIndex(raw: string | null, tabsLength: number): number {
  if (tabsLength === 0) {
    return 0;
  }
  const parsed = Number.parseInt(raw ?? "0", 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.min(parsed, tabsLength - 1);
}

let pendingTabsSaveTimer: ReturnType<typeof setTimeout> | null = null;

function flushTabsToStorage(tabs: RuntimeTab[]): void {
  if (pendingTabsSaveTimer !== null) {
    clearTimeout(pendingTabsSaveTimer);
    pendingTabsSaveTimer = null;
  }
  kvSetSync("tabs", serializeTabs(tabs));
}

function scheduleTabsSave(getTabs: () => RuntimeTab[]): void {
  if (pendingTabsSaveTimer !== null) {
    clearTimeout(pendingTabsSaveTimer);
  }
  pendingTabsSaveTimer = setTimeout(() => {
    pendingTabsSaveTimer = null;
    kvSetSync("tabs", serializeTabs(getTabs()));
  }, 300);
}

interface HydratedSnapshot {
  isHydrated: boolean;
  tabs: RuntimeTab[];
  currentTab: number;
  theme: ThemeName;
  color: AccentColorName;
  textSize: TextSizeOption;
  fontFamily: FontFamilyOption;
  allowRotation: boolean;
  translation: TranslationId;
}

function loadInitialSyncSnapshot(): HydratedSnapshot {
  const alreadyMigrated = kvGetSync(MIGRATION_FLAG_KEY) === "true";
  if (!alreadyMigrated) {
    return {
      isHydrated: false,
      tabs: [{ id: makeTabId(), name: "", reference: "0,1,1", navVersion: 0 }],
      currentTab: 0,
      theme: "light",
      color: "blue",
      textSize: "18",
      fontFamily: "serif",
      allowRotation: false,
      translation: "bsb",
    };
  }

  const tabs = parseStoredTabs(kvGetSync("tabs"));
  const currentTab = clampTabIndex(kvGetSync("lastTab"), tabs.length);
  const theme = parseTheme(kvGetSync("theme"));
  const color = parseColor(kvGetSync("color"));
  const textSize = parseTextSize(kvGetSync("textSize"));
  const fontFamily = parseFontFamily(kvGetSync("fontFamily"));
  const allowRotation = kvGetSync("rotate") === "true";
  const translation = parseTranslationId(kvGetSync("translation"));

  return {
    isHydrated: true,
    tabs,
    currentTab,
    theme,
    color,
    textSize,
    fontFamily,
    allowRotation,
    translation,
  };
}

export interface AppState extends HydratedSnapshot {
  showSearch: boolean;
  hydrateFromLegacyIfNeeded: () => Promise<void>;
  setCurrentTab: (index: number) => void;
  addTab: () => void;
  addTabAtReference: (ref: BibleReference, highlight?: boolean) => void;
  removeTab: (index: number) => void;
  moveTab: (fromIndex: number, toIndex: number) => void;
  renameTab: (index: number, name: string, trimForStorage?: boolean) => void;
  flushTabs: () => void;
  getSerializableTabs: () => Array<{ id: string; name: string; reference: string }>;
  jumpTabToReference: (
    index: number,
    ref: BibleReference,
    highlight?: boolean
  ) => void;
  jumpCurrentTabToReference: (ref: BibleReference, highlight?: boolean) => void;
  syncScrolledReference: (index: number, refString: string) => void;
  setTheme: (theme: ThemeName) => void;
  setColor: (color: AccentColorName) => void;
  setTextSize: (size: TextSizeOption) => void;
  setFontFamily: (font: FontFamilyOption) => void;
  toggleRotation: () => void;
  setTranslation: (translation: TranslationId) => void;
  setShowSearch: (show: boolean) => void;
  toggleShowSearch: () => void;
}

const initial = loadInitialSyncSnapshot();

export const useAppStore = create<AppState>((set, get) => ({
  ...initial,
  showSearch: false,

  hydrateFromLegacyIfNeeded: async () => {
    if (get().isHydrated) {
      return;
    }

    try {
      const pairs = await AsyncStorage.multiGet([...LEGACY_KEYS]);
      const legacyMap = new Map<string, string | null>();
      for (const [k, v] of pairs) {
        legacyMap.set(k, v);
        if (v !== null) {
          kvSetSync(k, v);
        }
      }

      const tabs = parseStoredTabs(legacyMap.get("tabs") ?? null);
      const currentTab = clampTabIndex(
        legacyMap.get("lastTab") ?? null,
        tabs.length
      );
      const theme = parseTheme(legacyMap.get("theme") ?? null);
      const color = parseColor(legacyMap.get("color") ?? null);
      const textSize = parseTextSize(legacyMap.get("textSize") ?? null);
      const fontFamily = parseFontFamily(kvGetSync("fontFamily"));
      const allowRotation = legacyMap.get("rotate") === "true";
      const translation = parseTranslationId(kvGetSync("translation"));

      // Ensure defaults are persisted cleanly in synchronous KV store
      kvSetSync("tabs", serializeTabs(tabs));
      kvSetSync("lastTab", String(currentTab));
      kvSetSync("theme", theme);
      kvSetSync("color", color);
      kvSetSync("textSize", textSize);
      kvSetSync("fontFamily", fontFamily);
      kvSetSync("rotate", allowRotation ? "true" : "false");
      kvSetSync("translation", translation);
      kvSetSync(MIGRATION_FLAG_KEY, "true");

      set({
        isHydrated: true,
        tabs,
        currentTab,
        theme,
        color,
        textSize,
        fontFamily,
        allowRotation,
        translation,
      });
    } catch (err) {
      console.warn("Legacy AsyncStorage migration fallback:", err);
      kvSetSync(MIGRATION_FLAG_KEY, "true");
      set({ isHydrated: true });
    }
  },

  setCurrentTab: (index) => {
    const syncedTabs = withLatestRefs(get().tabs);
    flushTabsToStorage(syncedTabs);
    const clamped = clampTabIndex(String(index), syncedTabs.length);
    kvSetSync("lastTab", String(clamped));
    set({ tabs: syncedTabs, currentTab: clamped });
  },

  addTab: () => {
    const syncedTabs = withLatestRefs(get().tabs);
    const newTab: RuntimeTab = {
      id: makeTabId(),
      name: "",
      reference: "0,1,1",
      navVersion: 0,
    };
    latestReferenceByTabId.set(newTab.id, "0,1,1");
    const nextTabs = [...syncedTabs, newTab];
    const nextIndex = nextTabs.length - 1;
    flushTabsToStorage(nextTabs);
    kvSetSync("lastTab", String(nextIndex));
    set({ tabs: nextTabs, currentTab: nextIndex });
  },

  addTabAtReference: (ref, highlight = true) => {
    const syncedTabs = withLatestRefs(get().tabs);
    const formatted = formatReference(ref);
    const newTab: RuntimeTab = {
      id: makeTabId(),
      name: "",
      reference: formatted,
      navVersion: 0,
      highlightRef: highlight ? formatted : null,
    };
    latestReferenceByTabId.set(newTab.id, formatted);
    const nextTabs = [...syncedTabs, newTab];
    const nextIndex = nextTabs.length - 1;
    flushTabsToStorage(nextTabs);
    kvSetSync("lastTab", String(nextIndex));
    set({ tabs: nextTabs, currentTab: nextIndex });
  },

  removeTab: (index) => {
    const syncedTabs = withLatestRefs(get().tabs);
    const removed = syncedTabs[index];
    if (removed) {
      latestReferenceByTabId.delete(removed.id);
    }
    const nextTabs = syncedTabs.filter((_, i) => i !== index);
    const nextCurrent =
      nextTabs.length === 0 ? 0 : Math.min(index, nextTabs.length - 1);
    flushTabsToStorage(nextTabs);
    kvSetSync("lastTab", String(nextCurrent));
    set({ tabs: nextTabs, currentTab: nextCurrent });
  },

  moveTab: (fromIndex, toIndex) => {
    const syncedTabs = withLatestRefs(get().tabs);
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= syncedTabs.length ||
      toIndex >= syncedTabs.length
    ) {
      return;
    }
    const nextTabs = [...syncedTabs];
    const [moved] = nextTabs.splice(fromIndex, 1);
    nextTabs.splice(toIndex, 0, moved);

    const cur = get().currentTab;
    let nextCurrent = cur;
    if (cur === fromIndex) {
      nextCurrent = toIndex;
    } else if (fromIndex < cur && cur <= toIndex) {
      nextCurrent = cur - 1;
    } else if (toIndex <= cur && cur < fromIndex) {
      nextCurrent = cur + 1;
    }

    flushTabsToStorage(nextTabs);
    kvSetSync("lastTab", String(nextCurrent));
    set({ tabs: nextTabs, currentTab: nextCurrent });
  },

  renameTab: (index, name, trimForStorage = true) => {
    const { tabs } = get();
    if (!tabs[index]) return;
    const storedName = trimForStorage ? name.trim() : name;
    const nextTabs = tabs.map((t, i) =>
      i === index ? { ...t, name: storedName } : t
    );
    scheduleTabsSave(() => get().tabs);
    set({ tabs: nextTabs });
  },

  flushTabs: () => {
    const syncedTabs = withLatestRefs(get().tabs);
    flushTabsToStorage(syncedTabs);
  },

  getSerializableTabs: () => {
    const syncedTabs = withLatestRefs(get().tabs);
    return syncedTabs.map((t) => ({
      id: t.id,
      name: t.name,
      reference: latestReferenceByTabId.get(t.id) ?? t.reference,
    }));
  },

  jumpTabToReference: (index, ref, highlight = false) => {
    const syncedTabs = withLatestRefs(get().tabs);
    const targetTab = syncedTabs[index];
    if (!targetTab) return;
    const formatted = formatReference(ref);
    latestReferenceByTabId.set(targetTab.id, formatted);
    const nextTabs = syncedTabs.map((t, i) =>
      i === index
        ? {
            ...t,
            reference: formatted,
            navVersion: t.navVersion + 1,
            highlightRef: highlight ? formatted : null,
          }
        : t
    );
    flushTabsToStorage(nextTabs);
    set({ tabs: nextTabs });
  },

  jumpCurrentTabToReference: (ref, highlight = true) => {
    const { currentTab, jumpTabToReference } = get();
    jumpTabToReference(currentTab, ref, highlight);
  },

  syncScrolledReference: (index, refString) => {
    const { tabs } = get();
    const existing = tabs[index];
    if (!existing) {
      return;
    }
    const prevLatest = latestReferenceByTabId.get(existing.id) ?? existing.reference;
    if (prevLatest === refString && existing.reference === refString) {
      return;
    }
    latestReferenceByTabId.set(existing.id, refString);
    scheduleTabsSave(() => get().tabs);

    // Only trigger a React state update when book or chapter crosses a boundary
    if (getBookChapterKey(existing.reference) !== getBookChapterKey(refString)) {
      const nextTabs = tabs.map((t, i) =>
        i === index ? { ...t, reference: refString } : t
      );
      set({ tabs: nextTabs });
    }
  },

  setTheme: (theme) => {
    kvSetSync("theme", theme);
    set({ theme });
  },

  setColor: (color) => {
    kvSetSync("color", color);
    set({ color });
  },

  setTextSize: (textSize) => {
    kvSetSync("textSize", textSize);
    set({ textSize });
  },

  setFontFamily: (fontFamily) => {
    kvSetSync("fontFamily", fontFamily);
    set({ fontFamily });
  },

  toggleRotation: () => {
    const next = !get().allowRotation;
    kvSetSync("rotate", next ? "true" : "false");
    set({ allowRotation: next });
  },

  setTranslation: (translation) => {
    if (get().translation === translation) {
      return;
    }
    const syncedTabs = withLatestRefs(get().tabs).map((t) => ({
      ...t,
      navVersion: t.navVersion + 1,
      highlightRef: null,
    }));
    flushTabsToStorage(syncedTabs);
    kvSetSync("translation", translation);
    set({ translation, tabs: syncedTabs });
  },

  setShowSearch: (showSearch) => {
    set({ showSearch });
  },

  toggleShowSearch: () => {
    set((s) => ({ showSearch: !s.showSearch }));
  },
}));
