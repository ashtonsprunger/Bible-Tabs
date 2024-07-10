import { autoType } from "d3";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  FlatList,
  Pressable,
  Text,
  TextInput,
  Vibration,
  View,
} from "react-native";
import MyButton from "./MyButton";

const colors = require("./colors.json");

export default function Search(props) {
  const searchInputRef = useRef(null);
  const flatListRef = useRef(null);
  const [data, setData] = useState(require("./data.json"));
  const [searchData, setSearchData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [currentSearchText, setCurrentSearchText] = useState("");
  const [bookData, setBookData] = useState(require("./books.json"));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    searchInputRef.current.focus();
  }, []);

  const updateSearchResults = () => {
    if (searchData.length > 0) {
      flatListRef.current.scrollToIndex({ index: 0, animated: true });
    }
    setIsLoading(true);
    setCurrentSearchText(searchText);
    setTimeout(() => {
      const results = data.filter((verse) =>
        verse[3].toLowerCase().includes(searchText.toLowerCase())
      );
      console.log(results);
      setSearchData(results);
      setIsLoading(false);
    }, 500);
  };

  function renderTextWithBoldMatches(text, keyword) {
    const regex = new RegExp(keyword, "gi");
    const matches = text.match(regex) || [];

    let currentIndex = 0;
    const textChunks = [];

    for (const match of matches) {
      const startIndex = text.indexOf(match, currentIndex);
      const endIndex = startIndex + match.length;

      if (startIndex !== -1) {
        const plainText = text.substring(currentIndex, startIndex);
        const boldText = text.substring(startIndex, endIndex);

        if (plainText) {
          textChunks.push(plainText);
        }

        if (boldText) {
          textChunks.push(
            <Text key={`bold_${startIndex}`} style={{ fontWeight: "900" }}>
              {boldText}
            </Text>
          );
        }

        currentIndex = endIndex;
      }
    }

    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      textChunks.push(remainingText);
    }

    return textChunks;
  }

  const NoResults = () => {
    return (
      <Text
        style={{ color: colors.bible.text[props.theme], paddingVertical: 12 }}
      >{`No results for "${currentSearchText}".`}</Text>
    );
  };

  const renderItem = (item) => {
    return (
      <View>
        <Pressable
          style={{ paddingVertical: 6 }}
          onPress={() => {
            props.updateReference([item.item[0], item.item[1], item.item[2]]);
          }}
        >
          <Text
            style={{ color: colors.bible.text[props.theme] }}
            key={item.index}
          >
            {/* <Text>{`${bookData[item.item[0]].book} ${item.item[1]}`}</Text> */}
            <Text
              style={{
                color: colors.bible.color[props.theme][props.color][1],
              }}
            >
              {`${bookData[item.item[0]].book} ${item.item[1]}:${
                item.item[2]
              } `}
            </Text>
            <Text>
              {renderTextWithBoldMatches(item.item[3], currentSearchText)}
            </Text>
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <>
      <View
        style={{
          backgroundColor: colors.bible.background[props.theme],
          padding: 12,
          borderBottomColor: colors.bible.color[props.theme][props.color][0],
          borderBottomWidth: 3,
          height: "auto",
          // flex: 1,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            // width: "100%",
          }}
        >
          <View style={{ flex: 3, marginRight: 12 }}>
            <TextInput
              onSubmitEditing={updateSearchResults}
              ref={searchInputRef}
              placeholder="Search..."
              placeholderTextColor={colors.bible.text[props.theme]}
              style={{
                fontSize: 25,
                backgroundColor: colors.tab.tab.inactive[props.theme],
                paddingHorizontal: 5,
                paddingVertical: 3,
                borderRadius: 7,
                color: colors.bible.text[props.theme],
                marginBottom: 6,
                // minWidth: "40%",
                // flexGrow: 1,
              }}
              onChangeText={(text) => {
                setSearchText(text);
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <MyButton
              color={colors.bible.color[props.theme][props.color][1]}
              textColor={colors.bible.text[props.theme]}
              backgroundColor={colors.tab.tab.inactive[props.theme]}
              onPress={updateSearchResults}
              title="Search"
            />
          </View>
        </View>
        <FlatList
          style={{ maxHeight: 300 }}
          data={searchData}
          renderItem={renderItem}
          ref={flatListRef}
        />
        {searchData.length == 0 && currentSearchText != "" && !isLoading ? (
          <NoResults />
        ) : null}
        <View style={{ marginTop: 6 }}>
          <MyButton
            color={colors.bible.color[props.theme][props.color][1]}
            textColor={colors.bible.text[props.theme]}
            backgroundColor={colors.tab.tab.inactive[props.theme]}
            onPress={props.toggleShowSearch}
            title="Close"
          />
        </View>
      </View>
      {isLoading ? (
        <View
          style={{
            position: "absolute",
            height: "100%",
            width: "100%",
            backgroundColor: "rgba(150,150,150,.5)",
            // alignItems: "flex-end",
          }}
        >
          <Text>loading...</Text>
        </View>
      ) : null}
    </>
  );
}
