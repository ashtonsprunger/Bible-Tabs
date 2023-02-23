import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import { Button, Modal, Pressable, StyleSheet, Text, View } from "react-native";

export default function Settings(props) {
  const [modalOpen, setModalOpen] = useState(false);

  const toggleOpen = () => {
    setModalOpen(!modalOpen);
  };

  return (
    <>
      <Modal
        visible={modalOpen}
        animationType="slide"
        onRequestClose={toggleOpen}
      >
        <View style={{ padding: 12 }}>
          <Button title="done" onPress={toggleOpen} />
        </View>
      </Modal>
      <Pressable
        onPress={() => {
          toggleOpen();
        }}
      >
        <Text style={{ fontSize: 30 }}>⚙</Text>
      </Pressable>
    </>
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
