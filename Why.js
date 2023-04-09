import { Text, View } from "react-native";

const colors = require("./colors.json");

export default function Why(props) {
  return (
    <View
      style={{
        padding: 12,
        height: "100%",
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.bible.background[props.theme],
      }}
    >
      <Text
        style={{
          position: "absolute",
          top: -40,
          left: 30,
          fontSize: 120,
          color: colors.bible.text[props.theme],
        }}
      >
        ↖
      </Text>
      <Text style={{ fontSize: 20, color: colors.bible.text[props.theme] }}>
        Why did you close all of your tabs?{"\n"}Click the '+' icon to open a
        new tab!
      </Text>
    </View>
  );
}
