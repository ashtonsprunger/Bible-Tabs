import React from "react";
import { StyleSheet, View } from "react-native";

export function SearchIcon({ color, size = 18 }: { color: string; size?: number }) {
  const lens = Math.round(size * 0.68);
  const handle = Math.round(size * 0.36);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: lens,
          height: lens,
          borderRadius: lens / 2,
          borderWidth: 1.9,
          borderColor: color,
          marginTop: -3,
          marginLeft: -3,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: handle,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
          right: 1,
          bottom: 2.5,
          transform: [{ rotate: "45deg" }],
        }}
      />
    </View>
  );
}

export function NotebookIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: Math.round(size * 0.78),
          height: Math.round(size * 0.92),
          borderWidth: 1.8,
          borderColor: color,
          borderRadius: 3,
          paddingHorizontal: 2.5,
          paddingTop: 3.5,
          gap: 2.5,
        }}
      >
        <View style={{ height: 1.6, width: "100%", borderRadius: 1, backgroundColor: color }} />
        <View style={{ height: 1.6, width: "68%", borderRadius: 1, backgroundColor: color }} />
      </View>
    </View>
  );
}

export function SettingsIcon({ color, size = 18 }: { color: string; size?: number }) {
  // Crisp 3-slider icon (renders identically across Android, iOS, and Web)
  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: "space-between",
        paddingVertical: 2.5,
      }}
    >
      <View style={styles.sliderRow}>
        <View style={[styles.sliderTrack, { backgroundColor: color }]} />
        <View style={[styles.sliderKnob, { left: 3, backgroundColor: color }]} />
      </View>
      <View style={styles.sliderRow}>
        <View style={[styles.sliderTrack, { backgroundColor: color }]} />
        <View style={[styles.sliderKnob, { right: 3, backgroundColor: color }]} />
      </View>
      <View style={styles.sliderRow}>
        <View style={[styles.sliderTrack, { backgroundColor: color }]} />
        <View style={[styles.sliderKnob, { left: 6, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function MenuIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: "space-between",
        paddingVertical: 3,
      }}
    >
      <View style={[styles.menuBar, { backgroundColor: color }]} />
      <View style={[styles.menuBar, { backgroundColor: color }]} />
      <View style={[styles.menuBar, { backgroundColor: color }]} />
    </View>
  );
}

export function ChevronIcon({
  color,
  direction = "down",
  size = 10,
}: {
  color: string;
  direction?: "down" | "up" | "right";
  size?: number;
}) {
  const rotate =
    direction === "up"
      ? "-135deg"
      : direction === "right"
        ? "-45deg"
        : "45deg";
  const box = Math.round(size * 0.62);
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: box,
          height: box,
          borderRightWidth: 1.7,
          borderBottomWidth: 1.7,
          borderColor: color,
          transform: [
            { rotate },
            { translateY: direction === "up" ? 1.5 : direction === "down" ? -1.5 : 0 },
          ],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sliderRow: {
    height: 4,
    justifyContent: "center",
    position: "relative",
  },
  sliderTrack: {
    height: 1.6,
    width: "100%",
    borderRadius: 1,
    opacity: 0.78,
  },
  sliderKnob: {
    position: "absolute",
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
  },
  menuBar: {
    height: 1.8,
    width: "100%",
    borderRadius: 1,
  },
});
