// import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { json } from "d3";
import React, { useEffect, useState } from "react";
import {
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  StatusBar,
  FlatList,
  Dimensions,
} from "react-native";
import Bible from "./Bible";
// import Carousel from "react-native-reanimated-carousel";

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
    "Proberbs",
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

  useEffect(() => {
    // AsyncStorage.clear();
    AsyncStorage.getItem("tabs").then((tabsFS) => {
      const tabsJson = JSON.parse(tabsFS);
      if (tabsJson) {
        setTabs(JSON.parse(tabsFS));
      } else {
        // const blankTabs = [{ reference: "0,1,1", name: "" }];
        const blankTabs = [
          { reference: "0,1,1", name: "" },
          { reference: "1,2,2", name: "" },
          { reference: "2,1,1", name: "" },
          { reference: "3,1,1", name: "" },
        ];
        setTabs(blankTabs);
        AsyncStorage.setItem("tabs", JSON.stringify(blankTabs));
      }
    });
  }, []);

  const renderBible = (tab, index) => {
    tab = tab.item;
    const book = tab.reference.split(",")[0];
    const chapter = tab.reference.split(",")[1];
    const verse = tab.reference.split(",")[2];
    return (
      <Bible
        index={index}
        book={book}
        chapter={chapter}
        verse={verse}
        key={index}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {tabs.length > 0 ? (
        <FlatList
          data={tabs}
          renderItem={renderBible}
          horizontal={true}
          snapToStart={true}
          snapToOffsets={[
            Dimensions.get("window").width,
            Dimensions.get("window").width,
            Dimensions.get("window").width,
            Dimensions.get("window").width,
          ]}
        />
      ) : null}
      {/* {tabs.length > 0
        ? tabs.map((tab, index) => {
            const book = tab.reference.split(",")[0];
            const chapter = tab.reference.split(",")[1];
            const verse = tab.reference.split(",")[2];
            return (
              <Bible
                index={index}
                book={book}
                chapter={chapter}
                verse={verse}
                key={index}
              />
            );
          })
        : null} */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
    // backgroundColor: "orange",
    // padding: 12,
    paddingBottom: 0,
    paddingTop: StatusBar.currentHeight,
    // flex: 1
    // // fontFamily: "Arial, Helvetica, sans-serif",
    // padding: "10px",
  },
});
