import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

interface MyButtonProps {
  title: string;
  color: string;
  backgroundColor: string;
  textColor?: string;
  onPress: () => void;
}

export default function MyButton({
  title,
  color,
  backgroundColor,
  onPress,
}: MyButtonProps) {
  return (
    <Pressable
      style={[styles.button, { backgroundColor }]}
      onPress={onPress}
    >
      <Text style={[styles.text, { color }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 4,
    width: "100%",
    padding: 6,
    paddingHorizontal: 6,
  },
  text: {
    fontSize: 20,
    textAlign: "center",
    fontWeight: "500",
  },
});
