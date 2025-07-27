import { Ionicons } from "@expo/vector-icons";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import GlobalMusicFileList, { MusicFile } from "../components/GlobalList";
import StickyHeader from "../components/StickyHeader";
import { SafeAreaView } from 'react-native';
import ArtistsPage from '../components/Artists';
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { useEffect, useState } from "react";
import { setPlaylist } from "../store/musicPlayerSlice";
import { QueuedTrack } from "../store/downloadQueueSlice";

export default function Global() {
  const dispatch = useDispatch();
  const currentTrack = useSelector((state: RootState) => state.musicPlayer.currentTrack);
  const convAPI = useSelector((state: RootState) => state.musicPlayer.converterAPI);
  const downloadQueue = useSelector((state: RootState) => state.downloadQueue.queue); // Get download queue

  useEffect(() => {
    fetchTracks();
  }, []);
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
              youtubeVideoId: uri.includes('youtube.com/watch?v=') ? uri.split('v=')[1].split('&')[0] : undefined,
            };
          })
          .filter((track: MusicFile) => track.uri);

        // setMusicFiles([...newTracks]);
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
    if (!theme || theme === 'dark') {
      return {
        backgroundColor: "#f5f5f5",
        titleColor: "#333333",
        textColor: "#1a1a2e",
      };
    } else {
      return {
        backgroundColor: "#121212",
        titleColor: "#e0e0e0",
        textColor: "#ffffff",
      };
    }
  };

  const colors = getThemeColors();

  const styles = StyleSheet.create({
    contentContainer: {
      paddingBottom: "20%",
      paddingHorizontal: 0,
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
      paddingTop: 100, // Add padding to avoid content being hidden by the sticky header
    },
    sectionTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.titleColor,
      padding: 12,
    },
    downloadQueueContainer: {
      marginTop: 20,
      paddingHorizontal: 12,
    },
    queueItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    queueItemText: {
      fontSize: 16,
      color: colors.textColor,
    },
  });

  return (
    <View style={styles.safeArea}>
      <StickyHeader title="Library" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.tracksContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.titleColor} />
          ) : (
            <GlobalMusicFileList />
          )}
        </View>

        {downloadQueue.length > 0 && (
          <View style={styles.downloadQueueContainer}>
            <Text style={styles.sectionTitle}>Download Queue</Text>
            {downloadQueue.map((track) => (
              <View key={track.id} style={styles.queueItem}>
                <Text style={styles.queueItemText}>{track.title} - {track.status}</Text>
                {track.status === 'downloading' && <ActivityIndicator size="small" color={colors.textColor} />}
                {track.status === 'failed' && <Ionicons name="alert-circle" size={20} color="red" />}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}