import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Header,
  FlatList,
  Button,
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
    // window.setTimeout(() => {
    ref.current.scrollToIndex({ index: index, animated: false });
    console.log("hello?");
    // }, 5000);
  };
  useEffect(() => {
    console.log("old::", getReference());
    // console.log(require("./data.json").length);
    // setData(require("./data.json"));
    // console.log(props);
    // console.log(books.length);
    window.setTimeout(() => {
      // console.log(getVerseNumber(65, 22, 21));
      // setShowData(data);
      // scrollToIndex(3);
    }, 1500);
    // window.setTimeout(() => {
    //   let scrollElement = document.getElementById(
    //     `${props.book},${props.chapter},${props.verse}`
    //   ).offsetTop;
    //   console.log("scroll:", scrollElement);
    //   window.scrollTo({ top: scrollElement + 100, behavior: "instant" });
    // }, 500);
    // window.setTimeout(() => {
    //   ref.current.scrollTo(50);
    // }, 500);
  }, []);

  const itemChange = (items) => {
    // console.log("key:", items.viewableItems[0].key);
    if (items.viewableItems.length != 0) {
      console.log("items:");
      console.log(items.viewableItems[0].key);
      updateReference(items.viewableItems[0].key);
      // updateReference("testing...");
    }
    // console.log("changed:", items.viewableItems);
    // console.log("keys:", Object.keys(items));
  };

  const updateReference = async (newReference) => {
    try {
      let oldData;
      let newData;
      console.log("json:", newReference);
      if (getReference()) {
        oldData = getReference();
        console.log("oldData:", oldData);
        oldData.reference = newReference;
      }
      if (oldData) {
        newData = oldData;
      } else {
        newData = { reference: newReference };
      }
      console.log("newData:", newData);
      const jsonValue = JSON.stringify(newData);
      await AsyncStorage.setItem(props.storageKey, jsonValue);
    } catch (e) {
      console.log("SAVING ERROR!!!", e);
    }
  };
  const getReference = async () => {
    try {
      const value = await AsyncStorage.getItem(props.storageKey);
      if (value !== null) {
        return JSON.parse(value);
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
        {item.item[1] == 1 && item.item[2] == 1 ? (
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
    // <Text>hello</Text>
    // <ScrollView>
    //   <Text>
    //     {data != null
    //       ? data.slice(startVerse, startVerse + numOfVerses).map((verse) => {
    //           if (!verse) {
    //             return null;
    //           }
    //           return (
    //             <Text
    //               id={`${verse[0]},${verse[1]},${verse[2]}`}
    //               key={`${verse[0]},${verse[1]},${verse[2]}`}
    //             >
    //               {/* if the loop is on the first verse */}
    //               {verse[2] == 1 ? (
    //                 <>
    //                   <Text style={{ fontSize: 30, color: "#0051ff" }}>
    //                     {/* if we are at the beginning of a book */}
    //                     {verse[1] == 1 && verse[2] == 1 ? (
    //                       <>
    //                         {/* <Text
    //                       > */}
    //                         {/* book */}
    //                         {books[verse[0]]}
    //                         {/* </Text> */}
    //                       </>
    //                     ) : null}
    //                     {/* chapter */} {verse[1]}
    //                   </Text>
    //                 </>
    //               ) : null}
    //               <Text style={{ color: "#0051ff" }}>
    //                 {" "}
    //                 {/* verse number if not first verse in chapter */}
    //                 {verse[2] != "1" ? verse[2] : null}
    //               </Text>{" "}
    //               {/* verse text */}
    //               {verse[3]}{" "}
    //             </Text>
    //           );
    //         })
    //       : null}
    //   </Text>
    // </ScrollView>

    <View>
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
