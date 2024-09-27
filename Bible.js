import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  Button,
  Pressable,
  TouchableOpacity,
  Vibration,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MyButton from "./MyButton";

const colors = require("./colors.json");

export default function Bible(props) {
  // gets the index of the verse in the data
  const getVerseNumber = (book, chapter, verseNum, data) => {
    // console.log(data);
    let verse = data.find((verse) => {
      return verse[0] == book && verse[1] == chapter && verse[2] == verseNum;
    });
    return data.indexOf(verse);
  };

  const getVerseByIndex = (index, data) => {
    return data[index];
  };

  const getNextVerse = (book, chapter, verseNum, data) => {
    return data[getVerseNumber(book, chapter, verseNum, data) + 1];
  };

  const getBookVerses = (book, data) => {
    return data.filter((verse) => verse[0] == book);
  };

  const getChapterVerses = (book, chapter, data) => {
    return getBookVerses(book, data).filter((verse) => verse[1] == chapter);
  };

  const [data, setData] = useState(require("./data.json"));
  // const [bookData, setBookData] = useState(getBookVerses(props.book, data));
  const [chapterData, setChapterData] = useState(
    getChapterVerses(props.book, props.chapter, data)
  );

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
  const [index, setIndex] = useState(
    getVerseNumber(props.book, props.chapter, props.verse, chapterData)
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
    //   }
    // });
    // window.setTimeout(() => {
    // }, 5000);
  };
  useEffect(() => {}, []);

  const itemChange = (items) => {
    if (items.viewableItems.length != 0) {
      props.updateTab(props.index, items.viewableItems[0].key);
      updateReference(items.viewableItems[0].key);
    }
  };

  const onViewableItemsChanged = ({ viewableItems }) => {
    if (viewableItems.length != 0) {
      props.updateTab(props.index, viewableItems[0].key);
      updateReference(viewableItems[0].key);
    }
  };
  const viewabilityConfigCallbackPairs = useRef([{ onViewableItemsChanged }]);

  const refresh = () => {
    console.log("refresh");
    props.toggleShowSearch();
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
          console.log(tabs);
          AsyncStorage.setItem("tabs", JSON.stringify(tabs)).then(() => {
            console.log("update local tabs");
            props.updateLocalTabs();
          });
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

  const previousChapter = () => {
    const currentVerse = chapterData[0];

    let newBook;
    let newChapter;

    if (currentVerse[1] == 1) {
      newBook = currentVerse[0] - 1;
      newChapter = getBookVerses(newBook, data)[
        getBookVerses(newBook, data).length - 1
      ][1];
    } else {
      newBook = currentVerse[0];
      newChapter = currentVerse[1] - 1;
    }

    ref.current.scrollToIndex({ index: 0, animated: true });

    setChapterData(getChapterVerses(newBook, newChapter, data));
    // setTimeout(() => {
    //   props.updateLocalTabs();
    // }, 200);
  };

  const nextChapter = () => {
    const currentVerse = chapterData[0];

    let newBook;
    let newChapter;

    if (
      currentVerse[1] ==
      getBookVerses(currentVerse[0], data)[
        getBookVerses(currentVerse[0], data).length - 1
      ][1]
    ) {
      newBook = Number(currentVerse[0]) + 1;
      newChapter = 1;
    } else {
      newBook = currentVerse[0];
      newChapter = Number(currentVerse[1]) + 1;
    }

    ref.current.scrollToIndex({ index: 0, animated: true });

    setChapterData(getChapterVerses(newBook, newChapter, data));
    // setTimeout(() => {
    //   props.updateLocalTabs();
    // }, 200);
  };

  const ref = useRef(FlatList);
  // console.log("ref:", ref);ll

  const renderItem = (item) => {
    return (
      <Text key={item.index}>
        {item.item[2] == 1 && !(item.item[0] == 0 && item.item[1] == 1) ? (
          <>
            <Text
              style={{
                fontSize: 48,
              }}
            >
              <MyButton
                color={colors.bible.color[props.theme][props.color][1]}
                textColor={colors.bible.text[props.theme]}
                backgroundColor={colors.tab.tab.inactive[props.theme]}
                onPress={previousChapter}
                title={
                  item.item[1] == 1
                    ? books[props.book - 1] +
                      " " +
                      getBookVerses(item.item[0] - 1, data)[
                        getBookVerses(item.item[0] - 1, data).length - 1
                      ][1]
                    : books[item.item[0]] + " " + String(item.item[1] - 1)
                }
              />
              {"\n"}
            </Text>
          </>
        ) : null}
        {item.item[2] == 1 ? (
          <Pressable
            onLongPress={() => {
              Vibration.vibrate(10);
              Linking.openURL(
                `https://www.gotquestions.org/book-of-${books[item.item[0]]
                  .split(" ")
                  .join("-")}.html`
              );
            }}
            delayLongPress={300}
          >
            <Text
              style={{
                fontSize: 30 + Number(props.textSize),
                color: colors.bible.text[props.theme],
              }}
            >
              {`${books[item.item[0]]}`}
            </Text>
          </Pressable>
        ) : null}
        <Text
          style={{
            fontSize: 30 + Number(props.textSize),
            color: colors.bible.text[props.theme],
          }}
        >
          {item.item[2] == 1 ? `\n${item.item[1]}` : null}
        </Text>
        {item.item[2] == 1 ? <Text> </Text> : null}
        <Text
          style={{
            color: colors.bible.color[props.theme][props.color][1],
            fontSize: 0.7 * Number(props.textSize),
          }}
        >
          {item.item[2] != 1 ? `${item.item[2]} ` : null}
        </Text>
        <Text
          style={{
            fontSize: Number(props.textSize),
            color: colors.bible.text[props.theme],
          }}
        >
          {item.item[3]}
        </Text>
        {item.item[2] == chapterData[chapterData.length - 1][2] ? (
          <>
            {!(item.item[0] == 65 && item.item[1] == 22) ? (
              <>
                <Text>{"\n\n"}</Text>
                <MyButton
                  color={colors.bible.color[props.theme][props.color][1]}
                  textColor={colors.bible.text[props.theme]}
                  backgroundColor={colors.tab.tab.inactive[props.theme]}
                  onPress={nextChapter}
                  title={
                    item.item[1] ==
                    getBookVerses(item.item[0], data)[
                      getBookVerses(item.item[0], data).length - 1
                    ][1]
                      ? books[Number(item.item[0]) + 1] + " " + 1
                      : books[item.item[0]] + " " + (Number(item.item[1]) + 1)
                  }
                />
              </>
            ) : null}
            <Text>{"\n\n\n"}</Text>
          </>
        ) : null}
      </Text>
    );
  };

  // const onLayout = () => {
  //   ref.scrollToIndex(5);
  // };

  return (
    <View
      style={{
        // width: Dimensions.get("window").width,
        // flex: 10,
        // height: !props.showSearch ? "auto" : "auto",
        height: "100%",
        paddingRight: 12,
        paddingLeft: 12,
        backgroundColor: colors.bible.background[props.theme],
      }}
    >
      <FlatList
        // style={{ height: "80%" }}
        ref={ref}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise((resolve) => setTimeout(resolve, 25));
          wait.then(() => {
            if (ref) {
              ref.current.scrollToIndex({ index: info.index, animated: false });
            }
          });
        }}
        // initialScrollIndex={index}
        data={chapterData}
        renderItem={renderItem}
        keyExtractor={(item) => `${item[0]},${item[1]},${item[2]}`}
        onLayout={scrollToVerse}
        initialNumToRender={2500}
        showsVerticalScrollIndicator={false}
        // onScroll={(e) => console.log(e.nativeEvent.contentOffset.x)}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        // onViewableItemsChanged={itemChange}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
        refreshing={false}
        onRefresh={refresh}
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
