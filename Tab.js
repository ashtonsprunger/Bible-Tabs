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
import Settings from "./Settings";
import MyButton from "./MyButton";

const colors = require("./colors.json");

export default function Tab(props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [tabName, setTabName] = useState(props.tabs[props.index].name);

  useEffect(() => {
    // props.updateStatusBarColor();
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
      <Modal
        visible={modalOpen}
        animationType="slide"
        onRequestClose={toggleOpen}
      >
        <View
          // onPress={toggleOpen}
          style={{
            padding: 12,
            // paddingTop: 60,
            height: "100%",
            backgroundColor: colors.bible.background[props.theme],
            flexDirection: "column",
            flex: 1,
            // justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <TextInput
              style={{
                fontSize: 35,
                marginBottom: 15,
                width: "85%",
                color: colors.bible.text[props.theme],
              }}
              value={tabName}
              onChange={changeTabName}
              placeholder={
                props.books[props.tabs[props.index].reference.split(",")[0]] +
                " " +
                props.tabs[props.index].reference.split(",")[1]
              }
              placeholderTextColor={"rgb(150,150,150)"}
              selectTextOnFocus={true}
            />
            <Settings
              theme={props.theme}
              color={props.color}
              updateTheme={props.updateTheme}
              updateColor={props.updateColor}
              allowRotation={props.allowRotation}
              updateRotation={props.updateRotation}
              textSize={props.textSize}
              updateTextSize={props.updateTextSize}
            />
          </View>
          <Browser
            books={props.books}
            reference={props.tabs[props.index].reference.split(",")}
            updateReference={updateReference}
            toggleOpen={toggleOpen}
            theme={props.theme}
          />
          <View>
            <View style={{ marginTop: 15 }}>
              <MyButton
                color={colors.bible.color[props.theme].red[0]}
                textColor={colors.bible.text[props.theme]}
                backgroundColor={colors.tab.tab.inactive[props.theme]}
                onPress={removeTab}
                title="Remove Tab"
              />
            </View>
            <View style={{ marginTop: 15 }}>
              <MyButton
                onPress={toggleOpen}
                title="Done"
                color={colors.bible.color[props.theme][props.color][1]}
                textColor={colors.bible.text[props.theme]}
                backgroundColor={colors.tab.tab.inactive[props.theme]}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Pressable
        style={{
          ...styles.tabButton,
          backgroundColor:
            props.index == props.currentTab
              ? colors.tab.tab.active[props.theme]
              : colors.tab.tab.inactive[props.theme],
          marginTop: 4,
          borderTopWidth: 3,
          borderTopColor:
            props.currentTab == props.index
              ? colors.bible.color[props.theme][props.color][0]
              : "rgba(0,0,0,0)",
        }}
        onPress={() => {
          props.updateLocalTabs();
          if (props.currentTab == props.index) {
            toggleOpen();
          } else {
            props.setCurrentTab(props.index);
            props.setShowSearch(false);
          }
        }}
      >
        <Text
          style={{
            ...styles.tabText,
            color:
              props.index == props.currentTab
                ? colors.tab.text.active[props.theme]
                : colors.tab.text.inactive[props.theme],
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
    paddingVertical: 9,
    paddingHorizontal: 15,
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
