// import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  StatusBar,
} from "react-native";
import Bible from "./Bible";

export default function App() {
  const [data, setData] = useState("");

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

  // console.log(StatusBar.currentHeight);

  return (
    <SafeAreaView style={styles.container}>
      {/* <Text>
        Open up App.js to start working on your app! please do so now
        as;ldfkjas;ldkfjas;ldkfj as;ldkfjasd ;lfkjs adf;lsakdjf s;aldkfj
        asd;lfkasj ;sldkfj as;ldkfj a;sldkfj as;dlkfj as;ldkfj as;lkdjf ;asldkjf
        ;asldkjf ;asldkfj{" "}
      </Text> */}
      <Bible
        storageKey={"1"}
        book={books.indexOf("Exodus")}
        chapter={15}
        verse={5}
      />
      {/* {data.length > 0 ? data : null} */}
      {/* <Button onPress={loadFile} title="load file" /> */}
      {/* <StatusBar style="auto" /> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
    // backgroundColor: "orange",
    padding: 12,
    paddingBottom: 0,
    paddingTop: StatusBar.currentHeight,
    // flex: 1
    // // fontFamily: "Arial, Helvetica, sans-serif",
    // padding: "10px",
  },
});
