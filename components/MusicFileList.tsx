import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { setCurrentTrack, setPlaylist, setConverterAPI } from '../store/musicPlayerSlice';
import { Ionicons } from '@expo/vector-icons';
import ScrollingText from './ScrollingText';

export interface MusicFile {
  id: string;
  title: string;
  artist: string;
  uri: string;
  duration: number;
  isFavorite: boolean;
  author?:string;
  filepath?:string;
}

const MUSIC_DIR = `${FileSystem.documentDirectory}music/`;
const FAVORITES_KEY = 'favorite-music-files';
// Replace with the actual base URL for audio files, if provided by the API
// var AUDIO_BASE_URL = 'https://fifth-funky-caps-dev.trycloudflare.com';

export default function MusicFileList() {
  const dispatch = useDispatch();
  const currentTrack = useSelector((state: RootState) => state.musicPlayer.currentTrack);
  const convAPI = useSelector((state: RootState) => state.musicPlayer.converterAPI);
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [favoriteFiles, setFavoriteFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  
  const AUDIO_BASE_URL= convAPI || "https://fifth-funky-caps-dev.trycloudflare.com"
  // Initialize music directory
  useEffect(() => {
    const initMusicDir = async () => {
      try {
        const dirInfo = await FileSystem.getInfoAsync(MUSIC_DIR);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(MUSIC_DIR, { intermediates: true });
        }
      } catch (error) {
        console.error('Error creating music directory:', error);
      }
    };
    initMusicDir();
  }, []);

  // Load favorite files
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const favoritesStr = await AsyncStorage.getItem(FAVORITES_KEY);
        if (favoritesStr) {
          setFavoriteFiles(new Set(JSON.parse(favoritesStr)));
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };
    loadFavorites();
  }, []);

  // Fetch tracks from API
  const fetchTracks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('https://broke-beats.vercel.app/api/search?q=.*');
      const data = await response.json();

      // console.log('Fetched data:', data);

      if (data.success && data.results && Array.isArray(data.results)) {
        const newTracks: MusicFile[] = data.results
          .filter((track: any) => track._id && track.title && track.author && track.length)
          .reverse()
          .map((track: any) => {
            // Handle filepath: prepend base URL if it's a relative path
            let uri = track.filepath;
            // console.log("🎷🎷 filepath: ",track.filepath)
            if (uri.endsWith('.mp3')) {
              uri = `${AUDIO_BASE_URL}${track.filepath}`;
              // console.log("🔥🔥 uri: ",uri)
            } else if (uri.startsWith('https://youtube.com') || !uri.endsWith('.mp3')) {
              // Skip YouTube URLs or non-mp3 files (or handle differently if API provides audio URLs)
              uri = ''; // Placeholder; replace with actual audio URL if available
            }

            return {
              id: track._id,
              title: track.title || 'Unknown Title',
              artist: track.author || 'Unknown Artist',
              uri: uri || '',
              duration: track.length || 0,
              isFavorite: favoriteFiles.has(track._id),
            };
          })
          .filter((track: MusicFile) => track.uri); // Exclude tracks without a valid URI

        // console.log('Processed tracks:', newTracks);

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

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      await fetchTracks();
    };
    loadData();
  }, [favoriteFiles]);

  // Pick audio file
  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        const fileName = file.name;
        const fileUri = file.uri;
        const fileId = `local_${Date.now()}`;

        const newFile: MusicFile = {
          id: fileId,
          title: fileName,
          artist: 'Local File',
          uri: fileUri,
          duration: 0,
          isFavorite: false,
        };

        const updatedFiles = [newFile, ...musicFiles];
        setMusicFiles(updatedFiles);
        dispatch(setPlaylist(updatedFiles));
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };

  // Toggle favorite
  const toggleFavorite = async (fileId: string) => {
    try {
      const newFavorites = new Set(favoriteFiles);
      if (newFavorites.has(fileId)) {
        newFavorites.delete(fileId);
      } else {
        newFavorites.add(fileId);
      }

      setFavoriteFiles(newFavorites);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...newFavorites]));

      setMusicFiles((prev) =>
        prev.map((file) =>
          file.id === fileId ? { ...file, isFavorite: !file.isFavorite } : file
        )
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Delete file
  const deleteFile = async (fileId: string, uri: string) => {
    try {
      if (favoriteFiles.has(fileId)) {
        const newFavorites = new Set(favoriteFiles);
        newFavorites.delete(fileId);
        setFavoriteFiles(newFavorites);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...newFavorites]));
      }

      const updatedFiles = musicFiles.filter((file) => file.id !== fileId);
      setMusicFiles(updatedFiles);
      dispatch(setPlaylist(updatedFiles));

      if (uri.startsWith('file://')) {
        await FileSystem.deleteAsync(uri);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      Alert.alert('Error', 'Failed to delete file');
    }
  };

  // Handle file selection
  const handleFileSelect = (file: MusicFile) => {
    dispatch(setCurrentTrack(file));
  };

  const handleRefresh = async()=>{
    await fetchTracks();
    try{
      const result = await fetch("https://broke-beats.vercel.app/api/music",{
        method:"PATCH",
        headers:{
          "Content-Type":"application/json", 
        },
        body:JSON.stringify({})
      });
      const data = await result.json();
      console.log("CONVAPI: ",data)
      if(data.convAPI){
        console.log("🔥🔥🔥🔥")
        dispatch(setConverterAPI(data.convAPI))
        
      }else{
        console.log("-----------")
        throw new Error("CONVAPI NOT FOUND: ",data)
      }
    }catch(e){
      console.error("Error fetching the Convapi: ",e)
      alert("Error fetching the convapi")
    }
  }

  // Render file item
  const renderFileItem = ({ item }: { item: MusicFile }) => {
    const isSelected = currentTrack?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.fileItem, isSelected && styles.selectedFileItem]}
        onPress={() => handleFileSelect(item)}
      >
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.title}
            {/* <ScrollingText title={item.title} /> */}
          </Text>
          <Text style={styles.fileArtist} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>

        <View style={styles.fileActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleFavorite(item.id)}
          >
            <Text style={styles.actionButtonText}>
              {item.isFavorite ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteFile(item.id, item.uri)}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  
  return (
    <View style={styles.container}>
      {/* <Text style={{color:"black", padding:10, paddingTop:30, width:"100%", fontWeight:700, fontSize:30}}>My Music Player</Text> */}
      <View style={{
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-evenly",
        alignContent: "center",
        // top:5
      }}>
        <TouchableOpacity style={styles.addButton} onPress={pickAudioFile}>
          <Text style={styles.addButtonText}>Add Music File</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshButton} onPress={async()=>await handleRefresh()}>
          <Text style={styles.addButtonText}><Ionicons name='reload' size={25} /></Text>
        </TouchableOpacity>
      </View>

      {musicFiles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No music files found</Text>
        </View>
      ) : (
        <FlatList
          data={musicFiles}
          renderItem={renderFileItem}
          keyExtractor={(item) => item.id}
          extraData={currentTrack}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    height:"50%"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  addButton: {
    backgroundColor: '#1DB954',
    padding: 15,
    width:"70%",
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#1DB954',
    padding: 15,
    width:"15%",
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fileItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
    alignItems: 'center',
    borderRadius:20
  },
  selectedFileItem: {
    backgroundColor: '#e8f5e9',
    borderRadius:20
  },
  fileInfo: {
    flex: 1,
    marginRight: 10,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  fileArtist: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 18,
  },
});