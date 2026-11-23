import { useWindowDimensions } from "react-native";

export const DESKTOP_BREAKPOINT = 840;
export const WIDE_DESKTOP_BREAKPOINT = 1180;

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const canFitBothSidebars = width >= WIDE_DESKTOP_BREAKPOINT;
  return {
    width,
    height,
    isDesktop,
    canFitBothSidebars,
  };
}
