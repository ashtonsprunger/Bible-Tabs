import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollViewComponent,
  Text,
  View,
} from "react-native";
import { SelectList } from "react-native-dropdown-select-list";

const colors = require("./colors.json");

export default function (props) {
  const [data, setData] = useState(require("./data.json"));
  const [bookData, setBookData] = useState(require("./books.json"));
  const [openBook, setOpenBook] = useState(bookData[props.reference[0]].book);

  // const [bookData, setBookData] = useState([
  //   { key: 0, value: "Genesis" },
  //   { key: 1, value: "Exodus" },
  //   { key: 2, value: "Leviticus" },
  //   { key: 3, value: "Numbers" },
  //   { key: 4, value: "Deuteronomy" },
  //   { key: 5, value: "Joshua" },
  //   { key: 6, value: "Judges" },
  //   { key: 7, value: "Ruth" },
  //   { key: 8, value: "1 Samual" },
  //   { key: 9, value: "2 Samual" },
  //   { key: 10, value: "1 Kings" },
  //   { key: 11, value: "2 Kings" },
  //   { key: 12, value: "1 Chronicles" },
  //   { key: 13, value: "2 Chronicles" },
  //   { key: 14, value: "Ezra" },
  //   { key: 15, value: "Nehemiah" },
  //   { key: 16, value: "Esther" },
  //   { key: 17, value: "Job" },
  //   { key: 18, value: "Psalms" },
  //   { key: 19, value: "Proberbs" },
  //   { key: 20, value: "Ecclesiastes" },
  //   { key: 21, value: "Song of Solomon" },
  //   { key: 22, value: "Isaiah" },
  //   { key: 23, value: "Jeremiah" },
  //   { key: 24, value: "Lamentations" },
  //   { key: 25, value: "Ezekiel" },
  //   { key: 26, value: "Daniel" },
  //   { key: 27, value: "Hosea" },
  //   { key: 28, value: "Joel" },
  //   { key: 29, value: "Amos" },
  //   { key: 30, value: "Obediah" },
  //   { key: 31, value: "Jonah" },
  //   { key: 32, value: "Micah" },
  //   { key: 33, value: "Nahum" },
  //   { key: 34, value: "Habakkuk" },
  //   { key: 35, value: "Zephaniah" },
  //   { key: 36, value: "Haggai" },
  //   { key: 37, value: "Zechariah" },
  //   { key: 38, value: "Malachi" },
  //   { key: 39, value: "Matthew" },
  //   { key: 40, value: "Mark" },
  //   { key: 41, value: "Luke" },
  //   { key: 42, value: "John" },
  //   { key: 43, value: "Acts" },
  //   { key: 44, value: "Romans" },
  //   { key: 45, value: "1 Corinthians" },
  //   { key: 46, value: "2 Corinthians" },
  //   { key: 47, value: "Galatians" },
  //   { key: 48, value: "Ephesians" },
  //   { key: 49, value: "Philippians" },
  //   { key: 50, value: "Colossians" },
  //   { key: 51, value: "1 Thessalonians" },
  //   { key: 52, value: "2 Thessalonians" },
  //   { key: 53, value: "1 Timothy" },
  //   { key: 54, value: "2 Timothy" },
  //   { key: 55, value: "Titus" },
  //   { key: 56, value: "Philemon" },
  //   { key: 57, value: "Hebrews" },
  //   { key: 58, value: "James" },
  //   { key: 59, value: "1 Peter" },
  //   { key: 60, value: "2 Peter" },
  //   { key: 61, value: "1 John" },
  //   { key: 62, value: "2 John" },
  //   { key: 63, value: "3 John" },
  //   { key: 64, value: "Jude" },
  //   { key: 65, value: "Revelation" },
  // ]);
  const [chapterData, setChapterData] = useState([]);

  const [book, setBook] = useState(bookData[props.reference[0]].index);
  const [chapter, setChapter] = useState(props.reference[1]);

  const getBookVerses = (book, data) => {
    return data.filter((verse) => verse[0] == book);
  };

  const scrollTo = (book) => {
    ref.current.scrollToIndex({ index: book, animated: true });
  };

  // useEffect(() => {
  //   scrollToBook();
  // }, [book]);

  const generateArray = (number) => {
    let array = [];

    for (let i = 1; i <= number; i++) {
      array.push(i);
    }

    return array;
  };

  // useEffect(() => {
  //   setChapterData(generateArray(book));
  // }, [book]);

  const ref = useRef(FlatList);

  const scrollToBook = () => {
    ref.current.scrollToIndex({ index: book, animated: true });
  };

  const renderItem = (item) => {
    let bookF = item.item;

    return (
      <View>
        <Pressable
          style={{ marginVertical: 0, paddingVertical: 0 }}
          onPress={() => {
            if (openBook == bookF.book) {
              setOpenBook("");
            } else {
              setOpenBook(bookF.book);
              setBook(bookF.index);
              ref.current.scrollToIndex({
                index: bookF.index,
                animated: true,
              });
            }
          }}
        >
          <Text
            style={{
              fontSize: 20,
              height: 30,
              color: colors.bible.text[props.theme],
            }}
          >
            {bookF.book}
          </Text>
        </Pressable>
        <View>
          {openBook == bookF.book
            ? generateArray(Math.ceil(bookF.chapters / 5)).map((set) => (
                <View style={{ flexDirection: "row" }}>
                  {generateArray(bookF.chapters)
                    .slice((set - 1) * 5, (set - 1) * 5 + 5)
                    .map((chapter) => (
                      <Pressable
                        style={{
                          width: "20%",
                          paddingVertical: 4,
                        }}
                        onPress={() => {
                          props.updateReference([book, chapter, 1]);
                          props.toggleOpen();
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 20,
                            color: "rgb(150,150,150)",
                            width: "100%",
                            textAlign: "center",
                          }}
                        >
                          {chapter}
                        </Text>
                      </Pressable>
                    ))}
                </View>
              ))
            : null}
        </View>
      </View>
    );
  };

  return (
    <View style={{ maxHeight: "72%" }}>
      {/* <View style={{ marginBottom: 10, marginTop: 10 }}>
        <SelectList
          data={bookData}
          save="key"
          search={false}
          setSelected={(book) => {
            setBook(book);
            setChapter(1);
            props.updateReference([book, 1, 1]);
          }}
          placeholder={props.books[book]}
        />
      </View>
      <View style={{ marginBottom: 10 }}>
        {chapterData.length > 0 && chapter != 0 ? (
          <SelectList
            data={chapterData}
            setSelected={(chapter) => {
              setChapter(chapter);
              props.updateReference([book, chapter, 1]);
            }}
            save="key"
            search={false}
            placeholder={chapter}
          />
        ) : null}
      </View> */}
      <FlatList
        ref={ref}
        data={bookData}
        renderItem={renderItem}
        initialNumToRender={66}
        onLayout={scrollToBook}
        getItemLayout={(data, index) => ({
          length: 30,
          offset: 30 * index,
          index,
        })}
      />
    </View>
  );
}
