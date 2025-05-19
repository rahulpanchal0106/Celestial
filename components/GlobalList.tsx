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
// import * as MediaLibrary from 'expo-media-library';
// import { Platform } from 'react-native';

import { initiateFastDownload } from './InitiateFastDownload';
import WaveformViewer from './waveformViewer';

export interface MusicFile {
  id: string;
  title: string;
  artist: string;
  uri: string;
  duration: number;
  isFavorite: boolean;
  author?: string;
  filepath?: string;
}

interface AudioFile {
  uri?: string;
  filepath?: string;
  name: string;
  source: 'local' | 'mongo' | 'youtube';
  thumbnail?: string;
}

const MUSIC_DIR = `${FileSystem.documentDirectory}music/`;
const FAVORITES_KEY = 'favorite-music-files';

export default function GlobalList() {
  const dispatch = useDispatch();
  const currentTrack = useSelector((state: RootState) => state.musicPlayer.currentTrack);
  const convAPI = useSelector((state: RootState) => state.musicPlayer.converterAPI);
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [favoriteFiles, setFavoriteFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<{ [key: string]: boolean }>({}); // Add state for download status
//   const requestStoragePermission = async () => {
//     const { status } = await MediaLibrary.requestPermissionsAsync();
//     return status === 'granted';
//   };
  const AUDIO_BASE_URL = convAPI || 'https://fifth-funky-caps-dev.trycloudflare.com';

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

//   const initiateFastDownload = async (video: MusicFile) => {
//     setIsDownloading((prev) => ({ ...prev, [video._id]: true }));
  
//     try {
//       if (!video.filepath) {
//         throw new Error('Invalid filepath: filepath is missing or undefined');
//       }
  
//       if (!AUDIO_BASE_URL) {
//         throw new Error('AUDIO_BASE_URL is not set');
//       }
  
//       // Request media library permissions for persistent storage
//       const permissionGranted = await requestStoragePermission();
//       const storageDir = permissionGranted ? FileSystem.documentDirectory : FileSystem.cacheDirectory;
  
//       if (!storageDir) {
//         throw new Error('Storage directory is not available');
//       }
  
//       const downloadURI = `${AUDIO_BASE_URL.replace(/\/$/, '')}/${video.filepath.replace(/^\//, '')}`;
//       const safeTitle = video.title.replace(/[^a-zA-Z0-9]/g, '_');
//       const tempFilePath = `${FileSystem.cacheDirectory}${safeTitle}_${video._id}_${Date.now()}.mp3`;
//       let finalPath = tempFilePath;
//       let filename = video.title ? `${video.title}.mp3` : `track_${video._id}.mp3`;
  
//       // Download file to temporary location
//       const response = await FileSystem.downloadAsync(downloadURI, tempFilePath);
//       if (response.status !== 200) {
//         throw new Error(`Download failed with status: ${response.status}`);
//       }
  
//       // Verify downloaded file
//       const fileInfo = await FileSystem.getInfoAsync(tempFilePath);
//       if (!fileInfo.exists || (fileInfo.size && fileInfo.size === 0)) {
//         throw new Error('Downloaded file not found or is empty');
//       }
  
//       // Save thumbnail persistently (if available)
//       let thumbnailPath: string | undefined;
//       if (video.thumbnail) {
//         const thumbnailFileName = `${safeTitle}_${video._id}_thumb.jpg`;
//         const thumbnailTempPath = `${FileSystem.cacheDirectory}${thumbnailFileName}`;
//         try {
//           const thumbnailResponse = await FileSystem.downloadAsync(video.thumbnail, thumbnailTempPath);
//           if (thumbnailResponse.status === 200) {
//             const thumbnailDocPath = `${FileSystem.documentDirectory}${thumbnailFileName}`;
//             await FileSystem.copyAsync({
//               from: thumbnailTempPath,
//               to: thumbnailDocPath,
//             });
//             thumbnailPath = thumbnailDocPath;
//             await FileSystem.deleteAsync(thumbnailTempPath);
//           }
//         } catch (thumbnailErr) {
//           console.warn('Failed to save thumbnail:', thumbnailErr);
//         }
//       }
  
//       if (permissionGranted) {
//         // Save to media library
//         const asset = await MediaLibrary.createAssetAsync(tempFilePath);
//         const albums = await MediaLibrary.getAlbumsAsync();
//         let album = albums.find((a) => a.title === 'Broke Beats');
  
//         if (!album) {
//           album = await MediaLibrary.createAlbumAsync('Broke Beats', asset, false);
//         } else {
//           await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
//         }
  
//         const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
//         if (assetInfo.localUri) {
//           finalPath = assetInfo.localUri;
//         }
  
//         // Delete temporary file
//         await FileSystem.deleteAsync(tempFilePath);
//       } else {
//         // Save to document directory for semi-persistence
//         const docFilePath = `${FileSystem.documentDirectory}${safeTitle}_${video._id}.mp3`;
//         await FileSystem.copyAsync({
//           from: tempFilePath,
//           to: docFilePath,
//         });
//         finalPath = docFilePath;
//         await FileSystem.deleteAsync(tempFilePath);
//       }
  
//       // Save metadata to AsyncStorage for persistent retrieval
//       const metadata = {
//         id: video._id,
//         title: video.title,
//         artist: video.artist || video.author || 'Unknown Artist',
//         filepath: finalPath,
//         thumbnail: thumbnailPath,
//         source: 'mongo',
//       };
//       await AsyncStorage.setItem(`track_${video._id}`, JSON.stringify(metadata));
  
//       const track: AudioFile = {
//         filepath: Platform.OS === 'ios' ? finalPath : finalPath.startsWith('file://') ? finalPath : `file://${finalPath}`,
//         name: filename,
//         source: 'mongo',
//         thumbnail: thumbnailPath,
//       };
  
//       onTrackAdd(track);
//       Alert.alert(
//         'Success',
//         permissionGranted
//           ? `Track "${filename}" added to your library and saved to your device`
//           : `Track "${filename}" added to your library (may not persist after uninstall)`
//       );
//     } catch (err: any) {
//       console.error('Download Error:', err);
//       Alert.alert(
//         'Error',
//         err.message.includes('already being processed')
//           ? 'This track is already being processed. Please wait.'
//           : `Failed to add track: ${err.message}`
//       );
//     } finally {
//       setIsDownloading((prev) => ({ ...prev, [video._id]: false }));
//     }
//   };

  // Fetch tracks from API
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

  // Initial load
  useEffect(() => {
    const loadData = async () => {
    //   await fetchTracks();
      await handleRefresh();
    };
    loadData();
  }, [favoriteFiles]);
  useEffect(() => {
    const loadData = async () => {
    //   await fetchTracks();
      await handleRefresh();
    };
    loadData();
  }, []);

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

  // Handle track add for initiateFastDownload
  const onTrackAdd = (track: AudioFile) => {
    const newTrack: MusicFile = {
      id: `downloaded_${Date.now()}`,
      title: track.name,
      artist: 'Downloaded Track',
      uri: track.filepath || '',
      duration: 0,
      isFavorite: true,
      filepath: track.filepath,
    };
    const updatedFiles = [newTrack, ...musicFiles];
    setMusicFiles(updatedFiles);
    dispatch(setPlaylist(updatedFiles));
  };

  // Toggle favorite - now triggers initiateFastDownload
  const toggleFavorite = async (file: MusicFile) => {
    // Map MusicFile to the format expected by initiateFastDownload
    console.log("--------- ",file)
    const downloadFile = {
      _id: file.id,
      id: file.id,
      title: file.title,
      artist: file.artist,
      author: file.author,
      filepath: file.filepath || '',
      thumbnail: undefined, // Add thumbnail if available in your API data
    };

    console.log("🎵🎵🎵 starting download")
    await initiateFastDownload(downloadFile,setIsDownloading,onTrackAdd,AUDIO_BASE_URL);
    console.log("🎵🎵🎵 FINisHED download")
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

    console.log("TRACK CURRENT: ",file)
    let fillURI={};
    if(file.uri.startsWith("null")){
      fillURI={
        ...file,
        uri:`${convAPI || AUDIO_BASE_URL}${file.uri}`
      }
    }
    if(!isLoading){
      dispatch(setCurrentTrack(file));
    }
  };

  const handleRefresh = async () => {
    await fetchTracks();
    try {
      const result = await fetch('https://broke-beats.vercel.app/api/music', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const data = await result.json();
      if (data.convAPI) {
        dispatch(setConverterAPI(data.convAPI));
      } else {
        throw new Error('CONVAPI NOT FOUND');
      }
    } catch (e) {
      console.error('Error fetching the Convapi: ', e);
      Alert.alert('Error', 'Failed to fetch the convapi');
    }
  };

  // Render file item
  const renderFileItem = ({ item,i }: { item: MusicFile, i:number }) => {
    const isSelected = currentTrack?.id === item.id;

    return (
      <TouchableOpacity
      key={i}
        style={[styles.fileItem, isSelected && styles.selectedFileItem]}
        onPress={() => handleFileSelect(item)}
      >
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.fileArtist} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
      {/* <WaveformViewer url={`${item.filepath}` || ""}/> */}
        <View style={styles.fileActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleFavorite(item)}
            disabled={isDownloading[item.id]}
          >
            {isDownloading[item.id] ? (
              <ActivityIndicator size="small" color="#6200ee" />
            ) : (
              <Text style={styles.actionButtonText}>
                {item.isFavorite ? '❤️' : <Ionicons name='add-circle-outline' size={23} />}
              </Text>
            )}
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteFile(item.id, item.uri)}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity> */}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          alignContent: 'center',
        }}
      >
        <TouchableOpacity style={styles.addButton} onPress={!isLoading &&pickAudioFile}>
          <Text style={styles.addButtonText}>Add Music File</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshButton} onPress={async () => await handleRefresh()}>
          <Text style={styles.addButtonText}>
            <Ionicons name="reload" size={25} />
          </Text>
        </TouchableOpacity>
      </View>

      {musicFiles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No music files found</Text>
        </View>
      ) : (
        // <FlatList
        //   data={musicFiles}
        //   renderItem={renderFileItem}
        //   keyExtractor={(item) => item.id}
        //   extraData={currentTrack}
        // />
        <View style={styles.listContent}>
          {isLoading && (<ActivityIndicator size="large" color="#6200ee" />)}
          {musicFiles.length === 0 ? 
          <Text style={styles.emptyText}>No music files found in Local album. Add tracks from Celestial Library.</Text>:
          musicFiles.map((item,i)=>renderFileItem({item,i}))
          }
        </View>
      //   <View>
      //   {isLoading && (<ActivityIndicator size="large" color="#6200ee" />)}
      //   {musicFiles.length === 0 ? 
      //   <Text style={styles.emptyText}>No music files found in Broke Beats album.</Text>:
      //   musicFiles.map((item,i)=>renderFileItem({item,i}))
      //   }
      // </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#f5f5f5',
    height: '50%',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    paddingTop: 0,
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
    color: '#666666',
  },
  addButton: {
    backgroundColor: '#6200ee',
    padding: 15,
    width: '70%',
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#6200ee',
    padding: 15,
    width: '15%',
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
    borderRadius: 20,
  },
  selectedFileItem: {
    backgroundColor: '#ede7f6',
    borderRadius: 20,
  },
  fileInfo: {
    flex: 1,
    marginRight: 10,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  fileArtist: {
    fontSize: 14,
    color: '#666666',
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