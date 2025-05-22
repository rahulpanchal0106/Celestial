import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentTrack } from '../store/musicPlayerSlice';
import { AudioFile } from './YoutubeSearch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WaveformViewer from './waveformViewer';
import { RootState } from '../store/store';

interface MusicFileListProps {
  onTrackSelect?: (track: AudioFile) => void; // Optional callback for track selection
}

const MusicFileList: React.FC<MusicFileListProps> = ({ onTrackSelect }) => {
  const dispatch = useDispatch();
  const AUDIO_BASE_URL = useSelector((state: RootState) => state.musicPlayer.converterAPI) || 'https://fifth-funky-caps-dev.trycloudflare.com';
  const [musicFiles, setMusicFiles] = useState<AudioFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useSelector((state:RootState)=>state.musicPlayer.theme)
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
          borderColor:"lightGray"
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
          borderColor:"#333"
        };
      }
    };
  
    const colors = getThemeColors();
    const styles = StyleSheet.create({
      container: {
        flex: 1,
        // backgroundColor: '#fff',
      },
      listContent: {
        padding: 16,
        paddingBottom: 100,
      },
      fileItem: {
        flexDirection: 'row',
        padding: 12,
        borderWidth: 1,
        // borderColor: '#f0f0f0',
        borderColor: colors.borderColor,
        backgroundColor:colors.backgroundColor,
        borderRadius:10,
        marginBottom:7,
        alignItems: 'center',
      },
      thumbnail: {
        width: 50,
        height: 50,
        borderRadius: 5,
        marginRight: 12,
      },
      icon: {
        marginRight: 12,
      },
      fileInfo: {
        flex: 1,
      },
      fileName: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.textColor,
      },
      fileSource: {
        fontSize: 12,
        color: colors.textColor,
        marginTop: 4,
      },
      errorText: {
        fontSize: 14,
        color: '#d32f2f',
        textAlign: 'center',
        marginVertical: 12,
      },
      emptyText: {
        fontSize: 14,
        color: colors.textColor,
        textAlign: 'center',
        marginVertical: 12,
      },
    });
    

  // Request media library permissions and load music files
  useEffect(() => {
    loadMusicFiles();
  }, []);
  const loadMusicFiles = async () => {
    setIsLoading(true);
    setError(null);
  
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Media library permission denied. Cannot access music files.');
        Alert.alert(
          'Permission Required',
          'Please grant media library permissions to access your music files.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }
  
      const albums = await MediaLibrary.getAlbumsAsync();
      const brokeBeatsAlbum = albums.find((album) => album.title === 'Celestial');
      console.log("!!!! ALBUM: ",brokeBeatsAlbum)
      if ((!brokeBeatsAlbum || brokeBeatsAlbum==undefined )&& !isLoading ) {
        setError('No music files found in local album.');
        setIsLoading(false);
        return;
      }
      
      const assets = await MediaLibrary.getAssetsAsync({
        album: brokeBeatsAlbum,
        mediaType: ['audio'],
        first: 100,
      });
      console.log("!!!! ASSETS: ",assets )
  
      // Retrieve metadata from AsyncStorage
      const files: AudioFile[] = [];
      for (const asset of assets.assets) {
        // Try to find metadata in AsyncStorage
        const metadataKeys = await AsyncStorage.getAllKeys();
        const trackKey = metadataKeys.find((key) => key.startsWith('track_') && key.includes(asset.filename));
        let track: AudioFile = {
          filepath: asset.uri,
          name: asset.filename || `Track_${asset.id}`,
          source: 'mongo',
          thumbnail: undefined,
        };
  
        if (trackKey) {
          const metadataStr = await AsyncStorage.getItem(trackKey);
          if (metadataStr) {
            const metadata = JSON.parse(metadataStr);
            track = {
              filepath: metadata.filepath,
              name: metadata.title || asset.filename,
              source: metadata.source,
              thumbnail: metadata.thumbnail,
            };
          }
        }
  
        files.push(track);
      }
  
      setMusicFiles(files);
    } catch (err: any) {
      console.error('Error loading music files:', err);
      setError('Failed to load music files. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackSelect = (track: AudioFile) => {
    if(!isLoading){
      dispatch(setCurrentTrack({
        uri: track.filepath!,
        title: track.name,
        thumbnail: track.thumbnail,
      }));
      
    }
    if (onTrackSelect) {
      onTrackSelect(track);
    }
  };

  const renderMusicFile = ({ item,i }: { item: AudioFile, i:number }) => (
    <TouchableOpacity
    key={i}
      style={styles.fileItem}
      onPress={() => handleTrackSelect(item)}
    >
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      ) : (
        <Ionicons name="musical-note" size={40} color="#6200ee" style={styles.icon} />
      )}
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        {/* <WaveformViewer url={`${item.filepath}` || ""}/> */}
        <Text style={styles.fileSource}>
          Source: {item.source === 'mongo' ? 'Downloaded' : item.source}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* {isLoading && <ActivityIndicator size="large" color="#6200ee" />} */}
      {error && <Text style={styles.errorText}>{error}</Text>}
      {/* <FlatList
        data={musicFiles}
        renderItem={renderMusicFile}
        keyExtractor={(item, index) => `${item.filepath}-${index}`}
        ListEmptyComponent={
          !isLoading && !error ? (
            <Text style={styles.emptyText}>No music files found in Broke Beats album.</Text>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
      /> */}
        <View style={styles.listContent}>
          {isLoading && (<ActivityIndicator size="large" color="#6200ee" />)}
          {musicFiles.length === 0 ? 
          <Text style={styles.emptyText}>No music files found in local album.</Text>:
          musicFiles.map((item,i)=>renderMusicFile({item,i}))
          }
        </View>
    </View>
  );
};


export default MusicFileList;