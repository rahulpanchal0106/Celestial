import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentTrack } from '../store/musicPlayerSlice';
import { AudioFile } from './YoutubeSearch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../store/store';
import WaveformViewer from './waveformViewer';
import ArtGenerator from './ArtGenerator';

interface MusicFileListProps {
  onTrackSelect?: (track: AudioFile) => void; // Optional callback for track selection
}

const MusicFileList: React.FC<MusicFileListProps> = ({ onTrackSelect }) => {
  const dispatch = useDispatch();
  const AUDIO_BASE_URL = useSelector((state: RootState) => state.musicPlayer.converterAPI) || 'https://fifth-funky-caps-dev.trycloudflare.com';
  const [musicFiles, setMusicFiles] = useState<AudioFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(''); // New state for search input
  const theme = useSelector((state: RootState) => state.musicPlayer.theme);
  const currentTrack = useSelector((state: RootState) => state.musicPlayer.currentTrack);
  const isPlaying = useSelector((state: RootState) => state.musicPlayer.isPlaying);
  // const [isCurrentlyPlaying, setIsCurrentlyPlaying] = useState<boolean>(false);
  const checkIsItPlaying=(item:AudioFile)=>{
    const isCurrent=item.name.includes(currentTrack?.title || "")
    if(isPlaying && isCurrent){
      // setIsCurrentlyPlaying(true);
      return true;
    }
    return false
  }
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
        borderColor: "#00000000",
        searchBackground: "#e0e0e0", // Added for search bar
        searchTextColor: "#333333",  // Added for search text
        searchPlaceholderColor: "#666666", // Added for placeholder
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
        borderColor: "#333",
        searchBackground: "#333333", // Added for search bar
        searchTextColor: "#e0e0e0",  // Added for search text
        searchPlaceholderColor: "#b3b3b3", // Added for placeholder
      };
    }
  };

  const colors = getThemeColors();
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    listContent: {
      padding: 16,
      paddingBottom: 100,
    },
    fileItem: {
      flexDirection: 'row',
      overflow:"hidden",
      padding: 12,
      paddingRight:15,
      // borderWidth: 1,
      // borderColor: colors.borderColor,
      backgroundColor: colors.backgroundColor,
      borderRadius:100 ,
      marginBottom: 7,
      alignItems: 'center',
      
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
  
      // Android shadow
      elevation: 5,
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
      marginLeft:10
    },
    fileName: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.textColor,
    },
    fileSource: {
      fontSize: 12,
      color: "#ffffff",
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
    refreshButton: {
      backgroundColor: colors.buttonColor,
      padding: 15,
      width: '15%',
      margin: 10,
      borderRadius: 100,
      alignItems: 'center',
    },
    addButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: 'bold',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width:"70%",
      margin: 16,
      padding: 8,
      backgroundColor: colors.searchBackground,
      borderRadius: 50,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.searchTextColor,
    },
  });

  // Request media library permissions and load music files
  useEffect(() => {
    loadMusicFiles();
  }, []);

  const loadMusicFiles = async () => {
    setIsLoading(true);
    setError(null);
    setSearchQuery(''); // Clear search query on refresh

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
      console.log("!!!! ALBUM: ", brokeBeatsAlbum);
      if (!brokeBeatsAlbum && !isLoading) {
        setError('No music files found in local album.');
        setIsLoading(false);
        return;
      }

      const assets = await MediaLibrary.getAssetsAsync({
        album: brokeBeatsAlbum,
        mediaType: ['audio'],
      });
      console.log("!!!! ASSETS: ", assets);
      const filteredAssets = assets.assets.filter((asset) =>
        /Imagine/i.test(asset.filename)
      );

      // Retrieve metadata from AsyncStorage
      const files: AudioFile[] = [];
      for (const asset of assets.assets) {
        const metadataKeys = await AsyncStorage.getAllKeys();
        const trackKey = metadataKeys.find((key) => key.startsWith('track_') && key.includes(asset.filename));

        let track: AudioFile = {
          filepath: asset.uri,
          name: asset.filename || `Track_${asset.id}`,
          source: 'mongo',
          thumbnail: undefined,
          duration: asset.duration
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
              duration: asset.duration
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
    if (!isLoading) {
      dispatch(setCurrentTrack({
        uri: track.filepath!,
        title: track.name,
        thumbnail: track.thumbnail,
      }));
      setSearchQuery(''); // Clear search query when a track is selected
    }
    if (onTrackSelect) {
      onTrackSelect(track);
    }
  };
  const formatLength = (seconds?: number) => {
    const minutes = Math.floor((seconds || 0) / 60).toFixed(0);
    const secs: number = ((seconds || 0) % 60).toFixed(0);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Filter music files based on search query
  const filteredMusicFiles = musicFiles.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMusicFile = ({ item, i }: { item: AudioFile, i: number }) => {
    const isIt=checkIsItPlaying(item);
    return (<TouchableOpacity
      key={i}
      style={styles.fileItem}
      onPress={() => handleTrackSelect(item)}
    >
      {item.thumbnail && (
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      ) }
      <ArtGenerator trackId={item.filepath as string} width={50} height={50} borderRadius={25} />
      <ArtGenerator trackId={item.filepath as string} borderRadius={0} setAsBg={true} />
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name.replace(/_+/g, ' ')}
        </Text>
        <Text style={[styles.fileSource,{color:colors.titleColor}]}>
          {formatLength(item.duration as number)}
        </Text>
      </View>
      {
        <Ionicons name={isIt?"pause":"play"} size={20} color="#6200ee" style={{marginLeft:12}} />
      }
    </TouchableOpacity>)
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}

      <View style={{flex:1, flexDirection:'row', width:"100%"}}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.searchPlaceholderColor} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tracks..."
          placeholderTextColor={colors.searchPlaceholderColor}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <TouchableOpacity style={styles.refreshButton} disabled={isLoading} onPress={async () => await loadMusicFiles()}>
        <Text style={styles.addButtonText}>
          <Ionicons name="reload" size={25} />
        </Text>
      </TouchableOpacity>

      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
      <View style={styles.listContent}>
        {isLoading && <ActivityIndicator size="large" color="#6200ee" />}
        {filteredMusicFiles.length === 0 && !isLoading ? (
          <Text style={styles.emptyText}>No music files found.</Text>
        ) : (
          filteredMusicFiles.reverse().map((item, i) => renderMusicFile({ item, i }))
        )}
      </View>
      
    </View>
  );
};

export default MusicFileList;