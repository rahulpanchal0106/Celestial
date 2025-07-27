import { ScrollView, StyleSheet, View } from "react-native";
import YouTubeSearch from "../components/YoutubeSearch";
import StickyHeader from "../components/StickyHeader";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";

export default function Search() {
  const theme = useSelector((state: RootState) => state.musicPlayer.theme);
  const getThemeColors = () => {
    if (!theme || theme === 'dark') {
      return {
        backgroundColor: "#f5f5f5",
      };
    } else {
      return {
        backgroundColor: "#121212",
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
      paddingTop: 100, // Add padding to avoid content being hidden by the sticky header
    },
    contentContainer: {
      paddingBottom: "40%",
      paddingHorizontal: 0,
    },
    searchContainer: {
      width: "100%",
    },
  });

  return (
    <View style={styles.safeArea}>
      <StickyHeader title="Search" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.searchContainer}>
          <YouTubeSearch onTrackAdd={() => {}} />
        </View>
      </ScrollView>
    </View>
  );
}

