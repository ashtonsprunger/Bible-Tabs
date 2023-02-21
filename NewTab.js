import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

export default function NewTab(props) {
  return (
    <Pressable
      style={{
        ...styles.tabButton,
        backgroundColor: "black",
      }}
      onPress={() => {
        AsyncStorage.getItem("tabs").then((data) => {
          let tabs = JSON.parse(data);
          let newTab = { name: "", reference: "0,1,1" };
          tabs.push(newTab);
          AsyncStorage.setItem("tabs", JSON.stringify(tabs)).then(() => {
            props.updateLocalTabs();
            props.setCurrentTab(props.index);
          });
        });
      }}
    >
      <Text
        style={{
          ...styles.tabText,
          color: "white",
        }}
      >
        +
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    elevation: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  tabText: {
    fontSize: 20,
    lineHeight: 21,
    fontWeight: "bold",
    letterSpacing: 0.25,
    // color: "white",
  },
});
