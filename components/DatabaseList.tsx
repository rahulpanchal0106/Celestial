import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet } from 'react-native';

// Define interface for song data
interface Song {
  id: string | number;
  title: string;
  artist: string;
  url: string;
}

// Define props interface
interface DatabaseMusicListProps {
  onFileSelect: (uri: string, name: string) => void;
  apiUrl: string;
}

const DatabaseMusicList: React.FC<DatabaseMusicListProps> = ({ onFileSelect, apiUrl }) => {
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const response = await fetch(apiUrl);
        const data: Song[] = await response.json();
        setSongs(data);
      } catch (error) {
        console.error('Error fetching songs:', error);
      }
    };
    fetchSongs();
  }, [apiUrl]);

  const renderItem = ({ item }: { item: Song }) => (
    <TouchableOpacity style={styles.songItem} onPress={() => onFileSelect(item.url, item.title)}>
      <Text style={styles.songText}>{item.title} by {item.artist}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={songs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxHeight: 200,
    marginBottom: 20,
  },
  songItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },
  songText: {
    fontSize: 14,
    color: '#333333',
  },
});

export default DatabaseMusicList;