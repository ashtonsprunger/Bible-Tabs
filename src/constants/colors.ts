import type { AccentColorName, HighlightColor, ThemeName } from "../types";

export const ACCENT_COLORS: readonly AccentColorName[] = [
  "blue",
  "green",
  "purple",
  "red",
  "orange",
  "yellow",
  "pink",
  "gray",
] as const;

export const HIGHLIGHT_COLORS: readonly HighlightColor[] = [
  "yellow",
  "green",
  "blue",
  "pink",
  "purple",
  "orange",
] as const;

export const TEXT_SIZES = ["15", "18", "24", "32", "40"] as const;

export interface HighlightPaletteEntry {
  fill: string;
  swatch: string;
  accent: string;
}

export const highlightColors: Record<
  ThemeName,
  Record<HighlightColor, HighlightPaletteEntry>
> = {
  light: {
    yellow: {
      fill: "rgba(253, 224, 71, 0.42)",
      swatch: "#FDE047",
      accent: "#B45309",
    },
    green: {
      fill: "rgba(134, 239, 172, 0.38)",
      swatch: "#86EFAC",
      accent: "#15803D",
    },
    blue: {
      fill: "rgba(147, 197, 253, 0.38)",
      swatch: "#93C5FD",
      accent: "#1D4ED8",
    },
    pink: {
      fill: "rgba(249, 168, 212, 0.38)",
      swatch: "#F9A8D4",
      accent: "#BE185D",
    },
    purple: {
      fill: "rgba(216, 180, 254, 0.40)",
      swatch: "#D8B4FE",
      accent: "#7E22CE",
    },
    orange: {
      fill: "rgba(253, 186, 116, 0.42)",
      swatch: "#FDBA74",
      accent: "#C2410C",
    },
  },
  sepia: {
    yellow: {
      fill: "rgba(234, 196, 53, 0.34)",
      swatch: "#EAB308",
      accent: "#92400E",
    },
    green: {
      fill: "rgba(110, 200, 140, 0.30)",
      swatch: "#6EE7B7",
      accent: "#166534",
    },
    blue: {
      fill: "rgba(120, 170, 235, 0.30)",
      swatch: "#7DD3FC",
      accent: "#1E40AF",
    },
    pink: {
      fill: "rgba(232, 145, 188, 0.30)",
      swatch: "#F472B6",
      accent: "#9D174D",
    },
    purple: {
      fill: "rgba(192, 152, 232, 0.32)",
      swatch: "#C084FC",
      accent: "#6B21A8",
    },
    orange: {
      fill: "rgba(238, 162, 88, 0.34)",
      swatch: "#FB923C",
      accent: "#9A3412",
    },
  },
  dark: {
    yellow: {
      fill: "rgba(234, 179, 8, 0.28)",
      swatch: "#EAB308",
      accent: "#FACC15",
    },
    green: {
      fill: "rgba(34, 197, 94, 0.25)",
      swatch: "#22C55E",
      accent: "#4ADE80",
    },
    blue: {
      fill: "rgba(59, 130, 246, 0.30)",
      swatch: "#3B82F6",
      accent: "#60A5FA",
    },
    pink: {
      fill: "rgba(236, 72, 153, 0.28)",
      swatch: "#EC4899",
      accent: "#F472B6",
    },
    purple: {
      fill: "rgba(168, 85, 247, 0.28)",
      swatch: "#A855F7",
      accent: "#C084FC",
    },
    orange: {
      fill: "rgba(249, 115, 22, 0.28)",
      swatch: "#F97316",
      accent: "#FB923C",
    },
  },
};

export interface ThemeUiTokens {
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  muted: string;
  chromeBg: string;
  danger: string;
}

export const uiTokens: Record<ThemeName, ThemeUiTokens> = {
  light: {
    bg: "#FDFCFA",
    surface: "#F3F0EA",
    surfaceRaised: "#FFFFFF",
    border: "#E6E1D8",
    text: "#1C1917",
    muted: "#78716C",
    chromeBg: "#EFECE6",
    danger: "#DC2626",
  },
  sepia: {
    bg: "#F8F3E6",
    surface: "#EFE8D6",
    surfaceRaised: "#FBF7EC",
    border: "#DFD5BF",
    text: "#2C241B",
    muted: "#7A6D5D",
    chromeBg: "#EAE1CC",
    danger: "#B91C1C",
  },
  dark: {
    bg: "#161618",
    surface: "#202024",
    surfaceRaised: "#27272B",
    border: "#2E2E33",
    text: "#E7E5E4",
    muted: "#A1A1AA",
    chromeBg: "#0F0F11",
    danger: "#F87171",
  },
};

export const colors: {
  tab: {
    text: {
      active: Record<ThemeName, string>;
      inactive: Record<ThemeName, string>;
    };
    tab: {
      active: Record<ThemeName, string>;
      inactive: Record<ThemeName, string>;
    };
    background: Record<ThemeName, string>;
  };
  bible: {
    text: Record<ThemeName, string>;
    background: Record<ThemeName, string>;
    color: Record<ThemeName, Record<AccentColorName, readonly [string, string]>>;
  };
} = {
  tab: {
    text: {
      active: {
        light: "#1C1917",
        sepia: "#2C241B",
        dark: "#F4F4F5",
      },
      inactive: {
        light: "#6B6660",
        sepia: "#716556",
        dark: "#9CA3AF",
      },
    },
    tab: {
      active: {
        light: "#FDFCFA",
        sepia: "#F8F3E6",
        dark: "#161618",
      },
      inactive: {
        light: "#F3F0EA",
        sepia: "#EFE8D6",
        dark: "#202024",
      },
    },
    background: {
      light: "#EFECE6",
      sepia: "#EAE1CC",
      dark: "#0F0F11",
    },
  },
  bible: {
    text: {
      light: "#1C1917",
      sepia: "#2C241B",
      dark: "#E7E5E4",
    },
    background: {
      light: "#FDFCFA",
      sepia: "#F8F3E6",
      dark: "#161618",
    },
    color: {
      light: {
        red: ["#DC2626", "#B91C1C"],
        orange: ["#EA580C", "#C2410C"],
        yellow: ["#CA8A04", "#A16207"],
        green: ["#16A34A", "#15803D"],
        blue: ["#2563EB", "#1D4ED8"],
        purple: ["#7C3AED", "#6D28D9"],
        pink: ["#DB2777", "#BE185D"],
        gray: ["#57534E", "#44403C"],
      },
      sepia: {
        red: ["#C82829", "#B91C1C"],
        orange: ["#D95A16", "#C2410C"],
        yellow: ["#B47B07", "#92400E"],
        green: ["#1F8A4C", "#166534"],
        blue: ["#2458B8", "#1E40AF"],
        purple: ["#6F3DC4", "#5B21B6"],
        pink: ["#C0266A", "#9D174D"],
        gray: ["#6B5E50", "#52473C"],
      },
      dark: {
        red: ["#F87171", "#FCA5A5"],
        orange: ["#FB923C", "#FDBA74"],
        yellow: ["#EAB308", "#FACC15"],
        green: ["#4ADE80", "#86EFAC"],
        blue: ["#60A5FA", "#93C5FD"],
        purple: ["#A78BFA", "#C4B5FD"],
        pink: ["#F472B6", "#F9A8D4"],
        gray: ["#A1A1AA", "#D4D4D8"],
      },
    },
  },
};
