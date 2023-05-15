// import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { json } from "d3";
import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  StatusBar,
  FlatList,
  Dimensions,
  View,
  Pressable,
} from "react-native";
import Bible from "./Bible";
import Tab from "./Tab";
// import Carousel from "react-native-reanimated-carousel";
import { getNavigationBarHeight } from "react-native-android-navbar-height";
import Why from "./Why";
import NewTab from "./NewTab";
import Settings from "./Settings";
// import {
//   BannerAd,
//   BannerAdSize,
//   TestIds,
// } from "react-native-google-mobile-ads";

import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import Version from "./Version";

const updateBigEnough = true;

const colors = require("./colors.json");

export default function App() {
  const [books, setBooks] = useState([
    "Genesis",
    "Exodus",
    "Leviticus",
    "Numbers",
    "Deuteronomy",
    "Joshua",
    "Judges",
    "Ruth",
    "1 Samual",
    "2 Samual",
    "1 Kings",
    "2 Kings",
    "1 Chronicles",
    "2 Chronicles",
    "Ezra",
    "Nehemiah",
    "Esther",
    "Job",
    "Psalms",
    "Proverbs",
    "Ecclesiastes",
    "Song of Solomon",
    "Isaiah",
    "Jeremiah",
    "Lamentations",
    "Ezekiel",
    "Daniel",
    "Hosea",
    "Joel",
    "Amos",
    "Obediah",
    "Jonah",
    "Micah",
    "Nahum",
    "Habakkuk",
    "Zephaniah",
    "Haggai",
    "Zechariah",
    "Malachi",
    "Matthew",
    "Mark",
    "Luke",
    "John",
    "Acts",
    "Romans",
    "1 Corinthians",
    "2 Corinthians",
    "Galatians",
    "Ephesians",
    "Philippians",
    "Colossians",
    "1 Thessalonians",
    "2 Thessalonians",
    "1 Timothy",
    "2 Timothy",
    "Titus",
    "Philemon",
    "Hebrews",
    "James",
    "1 Peter",
    "2 Peter",
    "1 John",
    "2 John",
    "3 John",
    "Jude",
    "Revelation",
  ]);

  const [tabs, setTabs] = useState([]);
  const [currentTab, setCurrentTab] = useState();

  const [hideAd, setHideAd] = useState(true);

  const [theme, setTheme] = useState("dark");
  const [color, setColor] = useState("blue");
  const [allowRotation, setAllowRotation] = useState("false");
  const [textSize, setTextSize] = useState("18");
  const [lastVersion, setLastVersion] = useState("");

  const [showNew, setShowNew] = useState(false);

  const updateTextSize = () => {
    AsyncStorage.getItem("textSize").then((result) => {
      if (result) {
        setTextSize(result);
      } else {
        AsyncStorage.setItem("textSize", "18");
        setTextSize("18");
      }
    });
  };
  updateTextSize();

  async function allowRotationDefault() {
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.DEFAULT
    );
  }

  async function lockPortraitRotation() {
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT
    );
  }

  const updateRotation = () => {
    AsyncStorage.getItem("rotate").then((result) => {
      if (result) {
        setAllowRotation(result);
      } else {
        AsyncStorage.setItem("rotate", "false");
      }
    });
  };

  const updateLastVersion = () => {
    AsyncStorage.getItem("lastVersion").then((result) => {
      // if (result) {
      // setLastVersion(result)
      setShowNew(result != require("./app.json").expo.version);
      // }
    });
  };

  const closeNewModal = () => {
    setShowNew(false);
    AsyncStorage.setItem("lastVersion", require("./app.json").expo.version);
  };

  const updateLocalTabs = () => {
    AsyncStorage.getItem("tabs").then((tabsFS) => {
      const tabsJson = JSON.parse(tabsFS);
      if (tabsJson) {
        setTabs(JSON.parse(tabsFS));
      } else {
        const blankTabs = [{ reference: "0,1,1", name: "" }];
        // const blankTabs = [
        //   { reference: "0,1,1", name: "" },
        //   { reference: "1,2,2", name: "" },
        //   { reference: "2,1,1", name: "" },
        //   { reference: "3,1,1", name: "" },
        // ];
        setTabs(blankTabs);
        AsyncStorage.setItem("tabs", JSON.stringify(blankTabs));
      }
    });
  };

  const updateTheme = () => {
    AsyncStorage.getItem("theme").then((result) => {
      if (result) {
        setTheme(result);
        updateStatusBarColor();
      } else {
        AsyncStorage.setItem("theme", "light");
        updateStatusBarColor();
        setTheme("light");
      }
    });
  };
  const updateColor = () => {
    AsyncStorage.getItem("color").then((result) => {
      if (result) {
        setColor(result);
      } else {
        AsyncStorage.setItem("color", "blue");
        setColor("blue");
      }
    });
  };

  const updateStatusBarColor = () => {
    StatusBar.setBackgroundColor(colors.tab.background[theme], true);
    StatusBar.setBarStyle(
      theme == "light" || theme == "sepia" ? "dark-content" : "light-content",
      true
    );
    NavigationBar.setBackgroundColorAsync(colors.tab.background[theme]);
  };

  const updateCurrentTab = () => {
    AsyncStorage.getItem("lastTab").then((result) => {
      if (result) {
        console.log("result", result);
        setCurrentTab(Number(result));
      } else {
        AsyncStorage.setItem("lastTab", "0");
        setCurrentTab(0);
      }
    });
  };

  useEffect(() => {
    if (currentTab != undefined) {
      console.log("str curr", currentTab.toString());
      AsyncStorage.setItem("lastTab", String(currentTab));
    }
  }, [currentTab]);

  useEffect(() => {
    updateStatusBarColor();
  }, [theme]);

  useEffect(() => {
    if (allowRotation == "true") {
      allowRotationDefault();
    } else {
      lockPortraitRotation();
    }
  }, [allowRotation]);

  useEffect(() => {
    // AsyncStorage.clear();
    // AsyncStorage.clear();
    updateLocalTabs();
    console.log(
      "dimentions:",
      Dimensions.get("screen").height - Dimensions.get("window").height
    );

    // StatusBar.setBackgroundColor("blue", true);
    // StatusBar.setBarStyle("light-content");

    AsyncStorage.getItem("hideAd").then((result) => {
      if (result == true) {
        setHideAd(true);
      } else {
        setHideAd(false);
      }
    });

    updateTheme();
    updateColor();
    updateRotation();
    updateTextSize();
    updateCurrentTab();
    if (updateBigEnough) {
      updateLastVersion();
    }
  }, []);

  const renderTab = (item) => {
    const tab = item.item;

    return (
      <View>
        {/* <Pressable
          style={{
            ...styles.tabButton,
            backgroundColor: item.index == currentTab ? "white" : "black",
          }}
          onPress={() => {
            updateLocalTabs();
            setCurrentTab(item.index);
          }}
        >
          <Text
            style={{
              ...styles.tabText,
              color: item.index == currentTab ? "black" : "white",
            }}
          >
            Tab
          </Text>
          <Tab />
        </Pressable> */}
        {item.index < tabs.length ? (
          <Tab
            updateLocalTabs={updateLocalTabs}
            setCurrentTab={setCurrentTab}
            currentTab={currentTab}
            index={item.index}
            tabs={tabs}
            books={books}
            theme={theme}
            color={color}
            updateTheme={updateTheme}
            updateColor={updateColor}
            updateStatusBarColor={updateStatusBarColor}
            allowRotation={allowRotation}
            updateRotation={updateRotation}
            textSize={textSize}
            updateTextSize={updateTextSize}
            key={item.index}
          />
        ) : (
          <NewTab
            tabs={tabs}
            updateLocalTabs={updateLocalTabs}
            setCurrentTab={setCurrentTab}
            index={item.index}
            theme={theme}
          />
        )}
      </View>
    );
  };

  const updateTab = (index, newReference) => {
    let oldTabs = JSON.parse(JSON.stringify(tabs));
    oldTabs[index].reference = newReference;
  };

  const onViewableItemsChanged = ({ viewableItems }) => {
    // Do stuff
  };
  const viewabilityConfigCallbackPairs = useRef([{ onViewableItemsChanged }]);

  return (
    <SafeAreaView
      style={{
        ...styles.container,
      }}
    >
      <View>
        <FlatList
          style={{
            backgroundColor: colors.tab.background[theme],
          }}
          data={[...tabs, "newTab"]}
          renderItem={renderTab}
          horizontal={true}
          viewabilityConfigCallbackPairs={
            viewabilityConfigCallbackPairs.current
          }
          showsHorizontalScrollIndicator={false}
        />
      </View>
      {tabs.map((tab, index) => {
        const book = tab.reference.split(",")[0];
        const chapter = tab.reference.split(",")[1];
        const verse = tab.reference.split(",")[2];
        return currentTab == index ? (
          <Bible
            index={index}
            book={book}
            chapter={chapter}
            verse={verse}
            updateTab={updateTab}
            updateLocalTabs={updateLocalTabs}
            theme={theme}
            color={color}
            key={index}
            textSize={textSize}
          />
        ) : null;
      })}
      {tabs.length == 0 && currentTab != undefined ? (
        <Why theme={theme} />
      ) : null}
      {/* <BannerAd
        unitId="ca-app-pub-2469761428575146/1250229229"
        size={BannerAdSize.BANNER}
      /> */}
      <Version
        modalOpen={showNew}
        toggleOpen={closeNewModal}
        theme={theme}
        color={color}
        updateColor={updateColor}
        show={false}
      />
    </SafeAreaView>
  );
}

const scale = Dimensions.get("screen").scale;
// const navigationBarHeight = await getNavigationBarHeight();
// const result = navigationBarHeight / scale;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
    // backgroundColor: "orange",
    // padding: 12,
    // paddingBottom: 50,
    // paddingTop: StatusBar.currentHeight,
    // paddingTop: 50,
    // backgroundColor: "black",
    // flex: 1
    // // fontFamily: "Arial, Helvetica, sans-serif",
    // padding: "10px",
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    elevation: 3,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tabText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "bold",
    letterSpacing: 0.25,
    // color: "white",
  },
});
