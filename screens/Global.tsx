import { Ionicons } from "@expo/vector-icons";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import GlobalMusicFileList, { MusicFile } from "../components/GlobalList";
import CelestialTitle from "../components/Title";
import { SafeAreaView } from "react-native-safe-area-context";
import ArtistsPage from "../components/Artists";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { useState } from "react";
import { setPlaylist } from "../store/musicPlayerSlice";

export default function Global() {
  const dispatch = useDispatch();
  const currentTrack = useSelector((state: RootState) => state.musicPlayer.currentTrack);
  const convAPI = useSelector((state: RootState) => state.musicPlayer.converterAPI);
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [favoriteFiles, setFavoriteFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<{ [key: string]: boolean }>({});
  const AUDIO_BASE_URL = convAPI || 'https://fifth-funky-caps-dev.trycloudflare.com';

  const fetchTracks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('https://broke-beats.vercel.app/api/search?q=.*');
      const data = await response.json();

      if (data.success && data.results && Array.isArray(data.results)) {
        const newTracks: MusicFile[] = data.results
          .filter((track: any) => track._id && track.title && track.author && track.length)
          .reverse()
          .map((track: any) => {
            let uri = track.filepath;
            if (uri.endsWith('.mp3')) {
              uri = `${AUDIO_BASE_URL}${track.filepath}`;
            } else if (uri.startsWith('https://youtube.com') || !uri.endsWith('.mp3')) {
              uri = '';
            }

            return {
              id: track._id,
              title: track.title || 'Unknown Title',
              artist: track.author || 'Unknown Artist',
              uri: uri || '',
              duration: track.length || 0,
              isFavorite: favoriteFiles.has(track._id),
              author: track.author,
              filepath: track.filepath,
            };
          })
          .filter((track: MusicFile) => track.uri);

        setMusicFiles([...newTracks]);
        dispatch(setPlaylist([...newTracks]));
      } else {
        console.error('Invalid data format received:', data);
        Alert.alert('Error', 'Invalid data format from server');
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
      Alert.alert('Error', 'Failed to fetch tracks from the server');
    } finally {
      setIsLoading(false);
    }
  };

  const tracks = useSelector((state: RootState) => state.musicPlayer.playlist);
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
    contentContainer: {
      paddingBottom: "20%",
      paddingHorizontal: 0,
    },
    titleContainer: {
      paddingVertical: 10,
    },
    tracksContainer: {
      width: "100%",
    },
    safeArea: {
      flex: 1,
      padding: 0,
      margin: 0,
      backgroundColor: colors.backgroundColor,
    },
    container: {
      flex: 1,
      backgroundColor: colors.backgroundColor,
      paddingBottom: 10,
    },
    sectionTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.titleColor,
      padding: 12,
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.titleContainer}>
          <CelestialTitle title="Library" />
        </View>
        <View style={styles.tracksContainer}>
          <GlobalMusicFileList />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}