import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Button,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Browser from "./Browser";

export default function Tab(props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [tabName, setTabName] = useState(props.tabs[props.index].name);

  useEffect(() => {
    if (modalOpen) {
      StatusBar.setBackgroundColor("white", true);
      // StatusBar.setBarStyle("dark-content");
    } else {
      StatusBar.setBackgroundColor("black", false);
      StatusBar.setBarStyle("light-content");
    }
  }, [modalOpen]);

  const changeTabName = (e) => {
    const newName = e.nativeEvent.text;
    setTabName(newName);
    let oldTabs = props.tabs;
    oldTabs[props.index].name = newName.trim();
    AsyncStorage.setItem("tabs", JSON.stringify(oldTabs))
      .then(() => {
        props.updateLocalTabs();
      })
      .catch((e) => {
        console.log(e);
      });
  };

  const toggleOpen = () => {
    setModalOpen(!modalOpen);
    setTabName(tabName.trim());
  };

  const updateReference = (newReference) => {
    console.log(newReference);
    let tabs = JSON.parse(JSON.stringify(props.tabs));
    tabs[props.index].reference = newReference.join(",");
    AsyncStorage.setItem("tabs", JSON.stringify(tabs)).then(() => {
      props.updateLocalTabs();
      setTimeout(() => {
        props.setCurrentTab(-1);
        props.setCurrentTab(props.currentTab);
      }, 100);
    });
  };

  const removeTab = () => {
    console.log(props.index);
    let tabs = JSON.parse(JSON.stringify(props.tabs));
    tabs.splice(props.index, 1);
    AsyncStorage.setItem("tabs", JSON.stringify(tabs)).then(() => {
      props.updateLocalTabs();
      toggleOpen();
      setTimeout(() => {
        props.setCurrentTab(-1);
        props.setCurrentTab(0);
      }, 100);
    });
  };

  return (
    <>
      <Modal visible={modalOpen} animationType="slide">
        <View
          // onPress={toggleOpen}
          style={{
            padding: 12,
            // paddingTop: 60,
            height: "100%",
          }}
        >
          <TextInput
            style={{ fontSize: 35, marginBottom: 15 }}
            value={tabName}
            onChange={changeTabName}
            placeholder={
              props.books[props.tabs[props.index].reference.split(",")[0]] +
              " " +
              props.tabs[props.index].reference.split(",")[1]
            }
            selectTextOnFocus={true}
          />
          <Browser
            books={props.books}
            reference={props.tabs[props.index].reference.split(",")}
            updateReference={updateReference}
            toggleOpen={toggleOpen}
          />
          <View style={{ marginTop: 15 }}>
            <Button color={"red"} onPress={removeTab} title="Remove Tab" />
          </View>
          <View style={{ marginTop: 15 }}>
            <Button onPress={toggleOpen} title="Done" />
          </View>
        </View>
      </Modal>

      <Pressable
        style={{
          ...styles.tabButton,
          backgroundColor: props.index == props.currentTab ? "white" : "black",
        }}
        onPress={() => {
          props.updateLocalTabs();
          if (props.currentTab == props.index) {
            toggleOpen();
          } else {
            props.setCurrentTab(props.index);
          }
        }}
      >
        <Text
          style={{
            ...styles.tabText,
            color: props.index == props.currentTab ? "black" : "white",
          }}
        >
          {props.tabs[props.index].name
            ? props.tabs[props.index].name
            : props.books[props.tabs[props.index].reference.split(",")[0]] +
              " " +
              props.tabs[props.index].reference.split(",")[1]}
        </Text>
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
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "bold",
    letterSpacing: 0.25,
    // color: "white",
  },
});
