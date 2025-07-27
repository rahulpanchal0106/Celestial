import { ScrollView, StyleSheet, View } from "react-native";
import ArtistsPage from "../components/Artists";
import StickyHeader from "../components/StickyHeader";
import { RootState } from "../store/store";
import { useSelector } from "react-redux";

export default function ArtistScreen() {
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

  return (
    <View style={[styles.safeArea]}>
      <StickyHeader title="Artists" />
      <ScrollView style={[styles.container, { backgroundColor: colors.backgroundColor, paddingTop: 100 }]} contentContainerStyle={styles.contentContainer}>
        <View>
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
  artistsContainer: {
    width: "100%",
  },
});