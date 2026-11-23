import { Platform } from "react-native";
import type { FontFamilyOption } from "../types";

export function getScriptureFontFamily(fontFamily: FontFamilyOption): string | undefined {
  if (fontFamily === "sans") {
    return Platform.OS === "web"
      ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      : undefined;
  }
  if (Platform.OS === "web") {
    return 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif';
  }
  if (Platform.OS === "ios") {
    return "Georgia";
  }
  return "serif";
}

export function getUiFontFamily(): string | undefined {
  return Platform.OS === "web"
    ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    : undefined;
}
