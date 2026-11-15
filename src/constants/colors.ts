import type { AccentColorName, ThemeName } from "../types";

export const ACCENT_COLORS: readonly AccentColorName[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "gray",
] as const;

export const TEXT_SIZES = ["15", "18", "24", "32", "40"] as const;

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
        light: "black",
        sepia: "black",
        dark: "white",
      },
      inactive: {
        light: "#595959",
        sepia: "#595959",
        dark: "#c4c4c4",
      },
    },
    tab: {
      active: {
        light: "white",
        sepia: "#fffced",
        dark: "#303030",
      },
      inactive: {
        light: "#e8e8e8",
        sepia: "#ebe9dd",
        dark: "#212121",
      },
    },
    background: {
      light: "lightgrey",
      sepia: "#dbdace",
      dark: "black",
    },
  },
  bible: {
    text: {
      light: "black",
      sepia: "black",
      dark: "white",
    },
    background: {
      light: "white",
      sepia: "#fffced",
      dark: "#303030",
    },
    color: {
      light: {
        red: ["#ff6161", "#ff6161"],
        orange: ["#ff9124", "#ff9124"],
        yellow: ["#ebe300", "#ccc500"],
        green: ["#00a120", "#00a120"],
        blue: ["#308aff", "#308aff"],
        purple: ["#ae00ff", "#ae00ff"],
        pink: ["#ff00ff", "#ff00ff"],
        gray: ["#636363", "#636363"],
      },
      sepia: {
        red: ["#ff6161", "#ff6161"],
        orange: ["#ff9124", "#ff9124"],
        yellow: ["#ebe300", "#ccc500"],
        green: ["#00a120", "#00a120"],
        blue: ["#308aff", "#308aff"],
        purple: ["#ae00ff", "#ae00ff"],
        pink: ["#ff00ff", "#ff00ff"],
        gray: ["#636363", "#636363"],
      },
      dark: {
        red: ["#ff6161", "#ff6161"],
        orange: ["#ff9124", "#ff9124"],
        yellow: ["#e8e000", "#e8e000"],
        green: ["#00a120", "#00a120"],
        blue: ["#5ea4ff", "#82b8ff"],
        purple: ["#ae00ff", "#c13bff"],
        pink: ["#ff00ff", "#ff00ff"],
        gray: ["#b5b5b5", "#b5b5b5"],
      },
    },
  },
};
