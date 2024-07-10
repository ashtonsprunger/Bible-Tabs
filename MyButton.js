import react from "react";
import {
  Pressable,
  Text,
  TouchableHighlight,
  TouchableOpacity,
} from "react-native";

export default function (props) {
  return (
    <Pressable
      style={{
        // borderColor: props.color,
        // borderWidth: 3,
        borderRadius: 4,
        width: "100%",
        padding: 6,
        paddingHorizontal: 6,
        backgroundColor: props.backgroundColor,
      }}
      onPress={props.onPress}
    >
      <Text
        style={{
          fontSize: 20,
          // color: props.textColor,
          color: props.color,
          textAlign: "center",
          fontWeight: "500",
        }}
      >
        {props.title}
      </Text>
    </Pressable>
  );
}
