import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import YouTubeSearch from "../components/YoutubeSearch";
import CelestialTitle from "../components/Title";
import { SafeAreaView } from "react-native-safe-area-context";
import ArtistsPage from "../components/Artists";

export default function ArtistScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.titleContainer}>
          <CelestialTitle title="Artists" />
        </View>
        <View style={styles.artistsContainer}>
          {/* <Ionicons
            name={searchExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#444"
          /> */}
          <ArtistsPage/>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
  artistsContainer: {
    width: "100%",
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#444444",
  }
});