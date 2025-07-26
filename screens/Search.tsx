import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import YouTubeSearch from "../components/YoutubeSearch";
import CelestialTitle from "../components/Title";
import { View } from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";

export default function Search() {
  const theme = useSelector((state: RootState) => state.musicPlayer.theme);
  const getThemeColors = () => {
    console.log("♾️♾️♾️ Theme: ", theme);
    if (!theme || theme === 'dark') {
      return {
        textColor: "#1a1a2e",
        particleColor: "#000000",
        gradientPrimary: "#4e3794",
        underlineColor: "#1a1a2e",
        backgroundColor: "#f5f5f5",
        titleColor: "#333333",
        timeTextColor: "#666666",
        sliderThumbColor: "#6200ee",
        sliderTrackColor: "#d3d3d3",
        sliderProgressColor: "#6200ee",
        buttonColor: "#6200ee",
        buttonTextColor: "white",
        disabledButtonColor: "#cccccc",
      };
    } else {
      return {
        textColor: "#ffffff",
        particleColor: "#ffffff",
        gradientPrimary: "#ffffff",
        underlineColor: "#e0e0e0",
        backgroundColor: "#121212",
        titleColor: "#e0e0e0",
        timeTextColor: "#b3b3b3",
        sliderThumbColor: "#6200ee",
        sliderTrackColor: "#4f4f4f",
        sliderProgressColor: "#6200ee",
        buttonColor: "#6200ee",
        buttonTextColor: "white",
        disabledButtonColor: "#333333",
      };
    }
  };

  const colors = getThemeColors();
  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.backgroundColor,
    },
    container: {
      flex: 1,
      backgroundColor: colors.backgroundColor,
    },
    contentContainer: {
      paddingBottom: "40%",
      paddingHorizontal: 0,
    },
    titleContainer: {
      paddingVertical: 10,
      // borderColor:"black",
      // borderStyle:"solid",
      // borderWidth:1,
    },
    searchContainer: {
      width: "100%",
    },
    sectionTitle: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.textColor,
    }
  });

  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.titleContainer}>
          <CelestialTitle title="Search" />
        </View>
        <View style={styles.searchContainer}>
          {/* <Ionicons
            name={searchExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#444"
          /> */}
          <YouTubeSearch onTrackAdd={() => {}} />
        </View>
      </ScrollView>
    </View>
  );
}

