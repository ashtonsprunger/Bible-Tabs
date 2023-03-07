import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import {
  Button,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const colors = require("./colors.json");

export default function Settings(props) {
  const [modalOpen, setModalOpen] = useState(false);

  const toggleOpen = () => {
    setModalOpen(!modalOpen);
  };

  const toggleTheme = () => {
    const newTheme = props.theme == "light" ? "dark" : "light";
    AsyncStorage.setItem("theme", newTheme).then(() => {
      props.updateTheme();
    });
  };

  return (
    <>
      <Modal
        visible={modalOpen}
        animationType="slide"
        onRequestClose={toggleOpen}
      >
        <View
          style={{
            padding: 12,
            height: "100%",
            backgroundColor: colors.bible.background[props.theme],
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 40, color: colors.bible.text[props.theme] }}>
            Settings
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text
              style={{ fontSize: 30, color: colors.bible.text[props.theme] }}
            >
              Theme
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.background[props.theme],
                padding: 4,
              }}
              onPress={toggleTheme}
            >
              <Text
                style={{ fontSize: 20, color: colors.bible.text[props.theme] }}
              >
                {props.theme}
              </Text>
            </TouchableOpacity>
          </View>
          <Button title="done" onPress={toggleOpen} />
        </View>
      </Modal>
      <Pressable
        onPress={() => {
          toggleOpen();
        }}
      >
        <Text style={{ fontSize: 30, color: colors.bible.text[props.theme] }}>
          ⚙
        </Text>
      </Pressable>
    </>
  );
}
