import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import YouTubeSearch from "../components/YoutubeSearch";
import CelestialTitle from "../components/Title";
import { View } from "react-native";
import ArtistsPage from "../components/Artists";
import { RootState } from "../store/store";
import { useSelector } from "react-redux";

export default function ArtistScreen() {
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
        disabledButtonColor: "#cccccc"
      };
    } else {
      // Assuming 'light' theme for any non-dark theme
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
        disabledButtonColor: "#333333"
      };
    }
  };

  const colors = getThemeColors();

  return (
    <View style={[styles.safeArea]}>
      <ScrollView style={[styles.container, { backgroundColor: colors.backgroundColor }]} contentContainerStyle={styles.contentContainer}>
        <View style={styles.titleContainer}>
          <CelestialTitle title="Artists" />
        </View>
        <View>
          {/* <Ionicons
            name={searchExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.timeTextColor}
          /> */}
          <ArtistsPage />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: "40%",
    paddingHorizontal: 0,
  },
  titleContainer: {
    paddingVertical: 10,
  },
  artistsContainer: {
    width: "100%",
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: "700",
    // color: colors.titleColor,
  },
});