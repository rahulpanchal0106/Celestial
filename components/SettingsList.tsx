import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import YouTubeSearch from "../components/YoutubeSearch";
import CelestialTitle from "../components/Title";
import { SafeAreaView } from "react-native-safe-area-context";
import ArtistsPage from "../components/Artists";
import SettingsScreen from "../screens/Settings";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";

export default function SettingsList() {
  // Get the current theme from Redux store
  const  theme  = useSelector((state: RootState) => state.musicPlayer.theme);
  
  // Get theme-specific colors
  const getThemeStyles = () => {
    if (!theme || theme === 'dark') {
      // Light theme colors
      return {
        safeAreaBackground: "#f8f9fa",
        containerBackground: "#ffffff",
        textColor: "#444444"
      };
    } else {
      // Dark theme colors
      return {
        safeAreaBackground: "#121212",
        containerBackground: "#000000",
        textColor: "#e0e0e0"
      };
    }
  };
  
  const themeColors = getThemeStyles();
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.safeAreaBackground }]}>
      <ScrollView 
        style={[styles.container, { backgroundColor: themeColors.containerBackground }]} 
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.titleContainer}>
          <CelestialTitle title="Settings" />
        </View>
        <View style={styles.artistsContainer}>
          {/* <Ionicons
            name={searchExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#444"
          /> */}
          <SettingsScreen />
        </View>
      </ScrollView>
    </SafeAreaView>
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
  }
});