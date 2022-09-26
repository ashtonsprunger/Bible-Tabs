import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Header,
  FlatList,
  Button,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Bible(props) {
  // gets the index of the verse in the data
  const getVerseNumber = (book, chapter, verseNum, data) => {
    // console.log(data);
    let verse = data.find((verse) => {
      return verse[0] == book && verse[1] == chapter && verse[2] == verseNum;
    });
    return data.indexOf(verse);
  };

  const getBookVerses = (book, data) => {
    return data.filter((verse) => verse[0] == book);
  };

  const [data, setData] = useState(require("./data.json"));
  const [bookData, setBookData] = useState(getBookVerses(props.book, data));

  // const [showData, setShowData] = useState(
  //   data.slice(getVerseNumber(props.book, props.chapter, props.verse, data))
  // );

  const [numOfVerses, setNumOfVerses] = useState(500);
  const [startVerse, setStartVerse] = useState(
    getVerseNumber(props.book, props.chapter, props.verse, data) /* - 250 < 0*/
    //     ? 0
    //     : getVerseNumber(props.book, props.chapter, props.verse) - 250
  );
  const [scrollValue, setScrollValue] = useState(0);
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
  const [index, setIndex] = useState(
    getVerseNumber(props.book, props.chapter, props.verse, bookData)
  );

  const scrollToVerse = () => {
    // getReference().then((storedReference) => {
    //   if (storedReference) {
    //     const book = storedReference.reference.split(",")[0];
    //     const chapter = storedReference.reference.split(",")[1];
    //     const verse = storedReference.reference.split(",")[2];
    //     const storedIndex = getVerseNumber(book, chapter, verse, bookData);
    //     ref.current.scrollToIndex({ index: storedIndex, animated: false });
    //     console.log("3");
    //   } else {
    ref.current.scrollToIndex({ index: index, animated: false });
    console.log("hello?");
    console.log("4");
    //   }
    // });
    // window.setTimeout(() => {
    // }, 5000);
  };
  useEffect(() => {}, []);

  const itemChange = (items) => {
    if (items.viewableItems.length != 0) {
      updateReference(items.viewableItems[0].key);
    }
  };

  const updateReference = async (newReference) => {
    try {
      // let oldData;
      // let newData;
      AsyncStorage.getItem("tabs")
        .then((tabs) => {
          // console.log("OLD:", data);
          // if (data) {
          //   oldData = data;
          //   console.log("oldData:", oldData);
          //   oldData.reference = newReference;
          //   console.log("5");
          // }
          // if (oldData) {
          //   // if not our first time saving
          //   newData = oldData;
          //   console.log("1");
          // } else {
          //   // if we've saved before
          //   newData = { reference: newReference };
          //   console.log("2");
          // }
          // console.log("newData:", newData);
          // const jsonValue = JSON.stringify(newData);
          tabs = JSON.parse(tabs);
          tabs[props.index].reference = newReference;
          AsyncStorage.setItem("tabs", JSON.stringify(tabs));
        })
        .catch(console.log);
    } catch (e) {
      console.log("SAVING ERROR!!!", e);
    }
  };
  const getReference = async () => {
    try {
      const tabs = await AsyncStorage.getItem("tabs");
      if (tabs !== null) {
        console.log("VALUE:", value);
        return JSON.parse(tabs[props.index].reference);
      } else {
        console.log("value is null!");
      }
    } catch (e) {
      console.log("READING ERROR!!!");
    }
  };

  const ref = useRef(FlatList);
  // console.log("ref:", ref);ll

  const renderItem = (item) => {
    return (
      <Text>
        {item.item[1] == 1 && item.item[2] == 1 && item.item[0] != 0 ? (
          <Button
            onPress={() => console.log("123")}
            title={books[props.book - 1]}
          />
        ) : null}
        <Text style={{ fontSize: 50 }}>
          {item.item[1] == 1 && item.item[2] == 1
            ? `\n${books[item.item[0]]}\n`
            : null}
        </Text>
        <Text style={{ fontSize: 50 }}>
          {item.item[2] == 1 ? item.item[1] : null}
        </Text>
        <Text style={{ color: "#0051ff", fontSize: 13 }}>
          {item.item[2] != 1 ? `${item.item[2]} ` : null}
        </Text>
        <Text style={{ fontSize: 18 }}>{item.item[3]}</Text>
      </Text>
    );
  };

  // const onLayout = () => {
  //   ref.scrollToIndex(5);
  // };

  return (
    <View
      style={{
        width: Dimensions.get("window").width,
        paddingRight: 12,
        paddingLeft: 12,
      }}
    >
      <FlatList
        onTouchEnd={() => {
          console.log("testing?");
        }}
        ref={ref}
        // initialScrollIndex={index}
        data={bookData}
        renderItem={renderItem}
        keyExtractor={(item) => `${item[0]},${item[1]},${item[2]}`}
        onLayout={scrollToVerse}
        initialNumToRender={2500}
        showsVerticalScrollIndicator={false}
        // onScroll={(e) => console.log(e.nativeEvent.contentOffset.x)}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        onViewableItemsChanged={itemChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  verseNum: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
