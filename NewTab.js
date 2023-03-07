import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

const colors = require("./colors.json");

export default function NewTab(props) {
  return (
    <Pressable
      style={{
        ...styles.tabButton,
        backgroundColor: "rgba(0, 0, 0, 0)",
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
          color: colors.tab.text.inactive[props.theme],
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
    // paddingVertical: 10,
    paddingTop: 14,
    paddingBottom: 6,

    paddingHorizontal: 15,
    // elevation: 3,
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
