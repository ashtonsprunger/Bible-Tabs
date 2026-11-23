import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

interface MyButtonProps {
  title: string;
  color: string;
  backgroundColor: string;
  borderColor?: string;
  textColor?: string;
  onPress: () => void;
}

export default function MyButton({
  title,
  color,
  backgroundColor,
  borderColor,
  onPress,
}: MyButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor: borderColor ?? "transparent",
          borderWidth: borderColor ? 1 : 0,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.text, { color }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    width: "100%",
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  text: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});
