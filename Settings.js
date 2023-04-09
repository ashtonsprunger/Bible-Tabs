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

  const themeLight = () => {
    AsyncStorage.setItem("theme", "light").then(() => {
      props.updateTheme();
    });
  };

  const themeSepia = () => {
    AsyncStorage.setItem("theme", "sepia").then(() => {
      props.updateTheme();
    });
  };

  const themeDark = () => {
    AsyncStorage.setItem("theme", "dark").then(() => {
      props.updateTheme();
    });
  };

  const toggleRotate = () => {
    AsyncStorage.setItem(
      "rotate",
      props.allowRotation == "true" ? "false" : "true"
    ).then(() => {
      props.updateRotation();
    });
  };

  const setSize = (size) => {
    AsyncStorage.setItem("textSize", size).then(() => {
      props.updateTextSize();
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
                backgroundColor: colors.bible.background.light,
                padding: 3,
                paddingHorizontal: 8,
                borderWidth: 2,
                borderColor: "black",
              }}
              onPress={themeLight}
            >
              <Text style={{ fontSize: 20, color: colors.bible.text.light }}>
                Light
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.background.sepia,
                padding: 3,
                paddingHorizontal: 8,
                borderWidth: 2,
                borderColor: "black",
              }}
              onPress={themeSepia}
            >
              <Text style={{ fontSize: 20, color: colors.bible.text.sepia }}>
                Sepia
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.background.dark,
                padding: 3,
                paddingHorizontal: 8,
                borderWidth: 2,
                borderColor: "black",
              }}
              onPress={themeDark}
            >
              <Text style={{ fontSize: 20, color: colors.bible.text.dark }}>
                Dark
              </Text>
            </TouchableOpacity>
          </View>
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
              Text Size
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.background[props.theme],
                padding: 4,
              }}
              onPress={() => {
                setSize("15");
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color:
                    props.textSize == "15"
                      ? colors.bible.verse[props.theme]
                      : colors.bible.text[props.theme],
                }}
              >
                A
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.background[props.theme],
                padding: 4,
              }}
              onPress={() => {
                setSize("18");
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  color:
                    props.textSize == "18"
                      ? colors.bible.verse[props.theme]
                      : colors.bible.text[props.theme],
                }}
              >
                A
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.background[props.theme],
                padding: 4,
              }}
              onPress={() => {
                setSize("24");
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  color:
                    props.textSize == "24"
                      ? colors.bible.verse[props.theme]
                      : colors.bible.text[props.theme],
                }}
              >
                A
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.background[props.theme],
                padding: 4,
              }}
              onPress={() => {
                setSize("32");
              }}
            >
              <Text
                style={{
                  fontSize: 32,
                  color:
                    props.textSize == "32"
                      ? colors.bible.verse[props.theme]
                      : colors.bible.text[props.theme],
                }}
              >
                A
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.background[props.theme],
                padding: 4,
              }}
              onPress={() => {
                setSize("40");
              }}
            >
              <Text
                style={{
                  fontSize: 40,
                  color:
                    props.textSize == "40"
                      ? colors.bible.verse[props.theme]
                      : colors.bible.text[props.theme],
                }}
              >
                A
              </Text>
            </TouchableOpacity>
          </View>
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
              Orientation
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.background[props.theme],
                padding: 4,
              }}
              onPress={toggleRotate}
            >
              <Text
                style={{ fontSize: 20, color: colors.bible.text[props.theme] }}
              >
                {props.allowRotation == "true" ? "Any" : "Portrait"}
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
