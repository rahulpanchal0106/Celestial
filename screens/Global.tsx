import { Ionicons } from "@expo/vector-icons";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
// import YouTubeSearch from "../components/YoutubeSearch";
import GlobalMusicFileList, { MusicFile } from "../components/GlobalList";
import CelestialTitle from "../components/Title";
import { SafeAreaView } from "react-native-safe-area-context";
import ArtistsPage from "../components/Artists";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { useState } from "react";
import { setPlaylist } from "../store/musicPlayerSlice";

export default function Global(){
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
    const tracks = useSelector((state:RootState)=>state.musicPlayer.playlist)
    return (
        <SafeAreaView style={styles.safeArea}>
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.titleContainer}>
          <CelestialTitle title="Library" />
        </View>
        <View style={styles.tracksContainer}>
          {/* <Ionicons
            name={searchExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#444"
          /> */}
         {/* <ArtistsPage tracks={tracks} /> */}
         <GlobalMusicFileList/>
        </View>
      </ScrollView>

        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    contentContainer: {
        paddingBottom: "20%",
        paddingHorizontal: 0,
      },
      titleContainer: {
        paddingVertical: 10,
        // borderColor:"black",
        // borderStyle:"solid",
        // borderWidth:1,
      },
      tracksContainer:{
        width:"100%"
      },
    safeArea: {
        flex: 1,
        padding:0,
        margin:0,
        backgroundColor: "#f8f9fa",
      },
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        // padding: 10,
        // paddingTop: 40,
        // height:70,
        // overflow:"scroll",
        paddingBottom:10
    },
    sectionTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#444444',
        padding: 12,
      }
})