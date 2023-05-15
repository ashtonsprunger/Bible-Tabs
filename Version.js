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
            Enjoying Bible Tabs?
          </Text>
          <View style={{ padding: 12 }}>
            <Text
              style={{
                color: colors.bible.text[props.theme],
                fontSize: 20,
                marginBottom: 20,
              }}
            >
              If you're enjoying Bible Tabs, writing a quick review will help
              others find it faster!
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
                Open Play Store ➤
              </Text>
            </Pressable>

            <Text
              style={{
                color: colors.bible.text[props.theme],
                fontSize: 20,
                marginBottom: 20,
              }}
            ></Text>
          </View>
          <Button
            color={colors.bible.color[props.theme][props.color][0]}
            title="done"
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
