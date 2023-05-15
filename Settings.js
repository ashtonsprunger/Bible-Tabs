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
import Version from "./Version";

const colors = require("./colors.json");

export default function Settings(props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);

  const toggleOpen = () => {
    setModalOpen(!modalOpen);
  };

  const toggleVersionOpen = () => {
    setVersionOpen(!versionOpen);
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

  const setColor = (color) => {
    AsyncStorage.setItem("color", color).then(() => {
      props.updateColor();
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
              Color
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.color[props.theme].red[0],
                padding: 3,
                paddingHorizontal: 8,
                borderWidth: 2,
                borderColor: "black",
              }}
              onPress={() => {
                setColor("red");
              }}
            >
              <Text
                style={{ fontSize: 20, color: colors.bible.text[props.theme] }}
              >
                {props.color == "red" ? "✓" : "   "}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.color[props.theme].orange[0],
                padding: 3,
                paddingHorizontal: 8,
                borderWidth: 2,
                borderColor: "black",
              }}
              onPress={() => {
                setColor("orange");
              }}
            >
              <Text
                style={{ fontSize: 20, color: colors.bible.text[props.theme] }}
              >
                {props.color == "orange" ? "✓" : "   "}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.color[props.theme].yellow[0],
                padding: 3,
                paddingHorizontal: 8,
                borderWidth: 2,
                borderColor: "black",
              }}
              onPress={() => {
                setColor("yellow");
              }}
            >
              <Text
                style={{ fontSize: 20, color: colors.bible.text[props.theme] }}
              >
                {props.color == "yellow" ? "✓" : "   "}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.color[props.theme].green[0],
                padding: 3,
                paddingHorizontal: 8,
                borderWidth: 2,
                borderColor: "black",
              }}
              onPress={() => {
                setColor("green");
              }}
            >
              <Text
                style={{ fontSize: 20, color: colors.bible.text[props.theme] }}
              >
                {props.color == "green" ? "✓" : "   "}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.color[props.theme].blue[0],
                padding: 3,
                paddingHorizontal: 8,
                borderWidth: 2,
                borderColor: "black",
              }}
              onPress={() => {
                setColor("blue");
              }}
            >
              <Text
                style={{ fontSize: 20, color: colors.bible.text[props.theme] }}
              >
                {props.color == "blue" ? "✓" : "   "}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.color[props.theme].purple[0],
                padding: 3,
                paddingHorizontal: 8,
                borderWidth: 2,
                borderColor: "black",
              }}
              onPress={() => {
                setColor("purple");
              }}
            >
              <Text
                style={{ fontSize: 20, color: colors.bible.text[props.theme] }}
              >
                {props.color == "purple" ? "✓" : "   "}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: colors.bible.color[props.theme].pink[0],
                padding: 3,
                paddingHorizontal: 8,
                borderWidth: 2,
                borderColor: "black",
              }}
              onPress={() => {
                setColor("pink");
              }}
            >
              <Text
                style={{ fontSize: 20, color: colors.bible.text[props.theme] }}
              >
                {props.color == "pink" ? "✓" : "   "}
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
                      ? colors.bible.color[props.theme][props.color][1]
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
                      ? colors.bible.color[props.theme][props.color][1]
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
                      ? colors.bible.color[props.theme][props.color][1]
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
                      ? colors.bible.color[props.theme][props.color][1]
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
                      ? colors.bible.color[props.theme][props.color][1]
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
          <View>
            <View style={{ alignItems: "center" }}>
              <Version
                modalOpen={versionOpen}
                toggleOpen={toggleVersionOpen}
                theme={props.theme}
                color={props.color}
                updateColor={props.updateColor}
                show={true}
              />
            </View>
            <View style={{ height: 20 }}></View>
            <Button
              title="done"
              onPress={toggleOpen}
              color={colors.bible.color[props.theme][props.color][0]}
            />
          </View>
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
