import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import {
  Button,
  Linking,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MyButton from "./MyButton";
const colors = require("./colors.json");

export default function Version(props) {
  const [version, setVersion] = useState(require("./app.json").expo.version);

  const setColor = (color) => {
    AsyncStorage.setItem("color", color).then(() => {
      props.updateColor();
    });
  };

  const openPlayStore = () => {
    Linking.openURL(
      `market://details?id=${require("./app.json").expo.android.package}`
    );
  };

  return (
    <>
      <Modal
        visible={props.modalOpen}
        animationType="slide"
        onRequestClose={props.toggleOpen}
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
            What's new?
          </Text>
          <View style={{ padding: 12 }}>
            <Text
              style={{
                color: colors.bible.text[props.theme],
                fontSize: 20,
                marginBottom: 20,
              }}
            >
              - Search function is now accessed by pulling down as if you were
              refreshing the page
            </Text>
            <Text
              style={{
                color: colors.bible.text[props.theme],
                fontSize: 20,
                marginBottom: 20,
              }}
            >
              - Press and hold on the book at the top of the page to open the
              book overview in GotQuestions.org
            </Text>
            <Text
              style={{
                color: colors.bible.text[props.theme],
                fontSize: 20,
                marginBottom: 20,
              }}
            >
              - New grey theme
            </Text>
            <Text
              style={{
                color: colors.bible.text[props.theme],
                fontSize: 20,
                marginBottom: 20,
              }}
            >
              - Minor UI tweaks
            </Text>

            <Text
              style={{
                color: colors.bible.text[props.theme],
                fontSize: 20,
                marginBottom: 20,
              }}
            >
              - Other bug fixes
            </Text>
            <Pressable onPress={openPlayStore}>
              <Text
                style={{
                  color: colors.bible.text[props.theme],
                  fontSize: 20,
                  marginBottom: 20,
                  textDecorationLine: "underline",
                }}
              >
                Review Bible Tabs ➤
              </Text>
            </Pressable>
          </View>
          <MyButton
            color={colors.bible.color[props.theme][props.color][1]}
            textColor={colors.bible.text[props.theme]}
            backgroundColor={colors.tab.tab.inactive[props.theme]}
            title="Done"
            onPress={props.toggleOpen}
          />
        </View>
      </Modal>
      {props.show ? (
        <Pressable onPress={props.toggleOpen}>
          <Text
            style={{
              color: colors.bible.text[props.theme],
              textDecorationLine: "underline",
            }}
          >
            version: {version}
          </Text>
        </Pressable>
      ) : null}
    </>
  );
}
