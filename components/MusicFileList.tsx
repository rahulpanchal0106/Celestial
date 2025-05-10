import { useState } from "react";
import * as DocumentPicker from 'expo-document-picker';
import { View, StyleSheet, Text, TouchableOpacity, FlatList, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YouTubeSearch from './YoutubeSearch';

// Type definitions
interface AudioFile {
  uri: string;
  filepath: string;
  name: string;
  source: 'local' | 'api';
}

interface MusicFileListProps {
  onFileSelect: (uri: string, name: string) => void;
}

const MusicFileList: React.FC<MusicFileListProps> = ({ onFileSelect }) => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(true);
  const [searchHeight] = useState(new Animated.Value(1));

  const pickAudioFiles = async (isImportAll: boolean = false) => {
    try {
      setIsSelecting(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: isImportAll ? '*/*' : 'audio/mpeg',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const validFiles = result.assets
          .filter(file => file.name && /\.mp3$/i.test(file.name))
          .map(file => ({
            uri: file.uri,
            filepath: '',
            name: file.name,
            source: 'local' as const,
          }));

        if (validFiles.length === 0) {
          alert('No MP3 files found in the selected files or directory.');
          return;
        }

        setAudioFiles(prevFiles => [...new Set([...prevFiles, ...validFiles].map(file => JSON.stringify(file)))].map(str => JSON.parse(str)));
      } else {
        alert(isImportAll ? 'No files selected. Please choose MP3 files or a directory.' : 'No MP3 files selected.');
      }
    } catch (error) {
      console.log('Error picking audio files:', error);
      alert('Failed to select MP3 files. Please try again.');
    } finally {
      setIsSelecting(false);
    }
  };

  const fetchApiTracks = async () => {
    try {
      setIsFetching(true);
      const response = await fetch('https://broke-beats.vercel.app/api/search?q=.*');
      const data = await response.json();

      if (data.success && data.results) {
        const apiFiles = data.results
          .filter((track: any) => track.filepath && track.title)
          .map((track: any) => ({
            uri: `https://advise-either-surgeons-fresh.trycloudflare.com${track.filepath}`,
            filepath: track.filepath,
            name: track.title,
            source: 'api' as const,
          }));

        if (apiFiles.length === 0) {
          alert('No tracks found from the API.');
          return;
        }

        setAudioFiles(prevFiles => [...new Set([...prevFiles, ...apiFiles].map(file => JSON.stringify(file)))].map(str => JSON.parse(str)));
      } else {
        alert('Failed to fetch tracks from the API.');
      }
    } catch (error) {
      console.log('Error fetching API tracks:', error);
      alert('Failed to fetch tracks from the API. Please try again.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleTrackAdd = (track: AudioFile) => {
    setAudioFiles(prevFiles => [...new Set([...prevFiles, track].map(file => JSON.stringify(file)))].map(str => JSON.parse(str)));
  };
  
  const toggleSearchSection = () => {
    setSearchExpanded(!searchExpanded);
    Animated.timing(searchHeight, {
      toValue: searchExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false
    }).start();
  };

  const renderItem = ({ item }: { item: AudioFile }) => (
    <TouchableOpacity
      style={styles.fileItem}
      onPress={() => onFileSelect(item.source === 'api' ? item.uri : item.uri, item.name)}
    >
      <View style={styles.fileItemContent}>
        <View style={[styles.iconContainer, item.source === 'local' ? styles.localIcon : styles.apiIcon]}>
          <Ionicons
            name={item.source === 'local' ? "musical-note" : "cloud"}
            size={20}
            color="white"
          />
        </View>
        <View style={styles.fileTextContainer}>
          <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
            {item.name}
          </Text>
          <Text style={styles.fileSource}>
            {item.source === 'local' ? 'Local Storage' : 'Cloud API'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Music Library</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.pickButton, isSelecting && styles.disabledButton]}
          onPress={() => pickAudioFiles(false)}
          disabled={isSelecting || isFetching}
        >
          <Ionicons name="musical-notes" size={18} color="white" />
          <Text style={styles.buttonText}>
            {isSelecting ? 'Selecting...' : 'Select MP3'}
          </Text>
          {isSelecting && <ActivityIndicator size="small" color="#fff" style={styles.loader} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.fetchButton, isFetching && styles.disabledButton]}
          onPress={fetchApiTracks}
          disabled={isSelecting || isFetching}
        >
          <Ionicons name="cloud-download" size={18} color="white" />
          <Text style={styles.buttonText}>
            {isFetching ? 'Fetching...' : 'API Tracks'}
          </Text>
          {isFetching && <ActivityIndicator size="small" color="#fff" style={styles.loader} />}
        </TouchableOpacity>
      </View>

      <View style={styles.searchSectionHeader}>
        <Text style={styles.sectionTitle}>YouTube Search</Text>
        <TouchableOpacity style={styles.toggleButton} onPress={toggleSearchSection}>
          <Ionicons 
            name={searchExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#444"
          />
        </TouchableOpacity>
      </View>
      
      <Animated.View style={[
        styles.youtubeContainer, 
        { 
          maxHeight: searchHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 200]
          }),
          opacity: searchHeight,
          overflow: 'hidden'
        }
      ]}>
        <YouTubeSearch onTrackAdd={handleTrackAdd} />
      </Animated.View>

      <View style={[
        styles.listContainer,
        { height: searchExpanded ? 200 : 350 }
      ]}>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>
            {audioFiles.length > 0 ? `Available Tracks (${audioFiles.length})` : 'No Tracks Available'}
          </Text>
        </View>

        <FlatList
          data={audioFiles}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.filepath || item.uri}-${index}`}
          style={styles.fileList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="musical-note-outline" size={40} color="#ccc" />
              <Text style={styles.emptyText}>Select or fetch tracks to get started</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={audioFiles.length === 0 ? styles.emptyListContent : styles.listContent}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 600, // Set a max height to prevent overflow
    height: 550, // Fixed height
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickButton: {
    backgroundColor: '#6200ee',
  },
  fetchButton: {
    backgroundColor: '#d81b60',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  loader: {
    marginLeft: 6,
  },
  searchSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  toggleButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    width: 28,
    height: 28,
  },
  youtubeContainer: {
    marginBottom: 16,
  },
  listContainer: {
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    flex: 1, // Allow it to grow within the parent container
    transition: 'height 0.3s ease-in-out',
  },
  sectionTitleContainer: {
    backgroundColor: '#f1f3f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    padding: 12,
  },
  fileList: {
    width: '100%',
  },
  listContent: {
    paddingBottom: 8,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fileItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  localIcon: {
    backgroundColor: '#6200ee',
  },
  apiIcon: {
    backgroundColor: '#0288d1',
  },
  fileTextContainer: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  fileSource: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default MusicFileList;