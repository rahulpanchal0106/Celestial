import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { setArtistPlaylist, setPlaylist, Track } from '../store/musicPlayerSlice';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentTrack } from '../store/musicPlayerSlice';
import { Ionicons } from '@expo/vector-icons';
import { initiateFastDownload } from './InitiateFastDownload';
import { MusicFile } from './GlobalList';
import { RootState } from '../store/store';
import { AudioFile } from './YoutubeSearch';


// Types
type ArtistGroup = {
  author: string;
  tracks: Track[];
};

type ExpandedArtistsState = Record<string, boolean>;

type ArtistsPageProps = {
  tracks?: Track[];
};

const ArtistsPage: React.FC<ArtistsPageProps> = () => {
  // State for search and expanded artists
  const [search, setSearch] = useState<string>('');
  const convAPI = useSelector((state: RootState) => state.musicPlayer.converterAPI);
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [favoriteFiles, setFavoriteFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<{ [key: string]: boolean }>({});
  const [expandedArtists, setExpandedArtists] = useState<ExpandedArtistsState>({});
  const tracks = useSelector((state:RootState)=>state.musicPlayer.playlist);
  const dispatch = useDispatch();
  // Group tracks by artist and sort by track count
  const artistData: ArtistGroup[] = useMemo(() => {
    // Create a map of artist to their tracks
    const artistMap: Record<string, Track[]> = tracks.reduce((acc: Record<string, Track[]>, track: Track) => {
      const author = track.artist || 'Unknown Artist';
      if (!acc[author]) {
        acc[author] = [];
      }
      acc[author].push(track);
      return acc;
    }, {});

    // Convert to array and sort by track count
    return Object.entries(artistMap)
      .map(([author, tracks]) => ({
        author,
        tracks,
      }))
      .sort((a, b) => b.tracks.length - a.tracks.length);
  }, [tracks]);

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

  const toggleFavorite = async (file: MusicFile | Track) => {
    // Map MusicFile to the format expected by initiateFastDownload
    console.log("--------- ",file)
    const downloadFile = {
      _id: file.id,
      id: file.id,
      title: file.title,
      artist: file.artist,
      author: (file as any).author,
      filepath: (file as any).filepath || '',
      thumbnail: undefined, // Add thumbnail if available in your API data
    };

    console.log("🎵🎵🎵 starting download")
    await initiateFastDownload(downloadFile,setIsDownloading,onTrackAdd,convAPI);
    console.log("🎵🎵🎵 FINisHED download")
  };

  // Filter artists based on search (by artist name or track title)
  const filteredArtists: ArtistGroup[] = useMemo(() => {
    if (!search) return artistData;
    const lowerSearch = search.toLowerCase();
    return artistData
      .map((artist) => ({
        ...artist,
        tracks: artist.tracks.filter(
          (track: Track) =>
            track.title.toLowerCase().includes(lowerSearch) ||
            (artist.author && artist.author.toLowerCase().includes(lowerSearch))
        ),
      }))
      .filter(
        (artist) =>
          artist.tracks.length > 0 ||
          (artist.author && artist.author.toLowerCase().includes(lowerSearch))
      );
  }, [artistData, search]);

  // Toggle artist section expansion
  const toggleArtist = (author: string) => {
    setExpandedArtists((prev) => ({
      ...prev,
      [author]: !prev[author],
    }));
  };

  // Format track length (seconds to MM:SS)
  const formatLength = (seconds?: number) => {
    const minutes = Math.floor((seconds || 0) / 60);
    const secs = (seconds || 0) % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Track card component

  const TrackCard: React.FC<{ track: Track,i:number }> = ({ track,i }) => {
    const dispatch = useDispatch();

    return (
      <TouchableOpacity
        key={i}
        style={styles.trackCard}
        onPress={() => {
          dispatch(setCurrentTrack(track))
          dispatch(setArtistPlaylist(tracks.filter((tr:Track)=>tr.artist===track.artist)))
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.trackTitle}>{track.title}</Text>
        <Text style={styles.trackLength}>{formatLength(track.duration)}</Text>

        <View style={styles.fileActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleFavorite(track)}
            disabled={isDownloading[track.id]}
          >
            {isDownloading[track.id] ? (
              <ActivityIndicator size="small" color="#6200ee" />
            ) : (
              <Text style={styles.actionButtonText}>
                <Ionicons name='add-circle-outline' size={23} />
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Artist item component
  const ArtistItem: React.FC<{ artist: ArtistGroup}> = ({ artist }) => {
    const isExpanded = !!expandedArtists[artist.author];
    return (
      <View style={styles.artistContainer}>
        <TouchableOpacity
          style={styles.artistHeader}
          onPress={() => toggleArtist(artist.author)}
        >
          <Text style={styles.artistName}>
            {artist.author} ({artist.tracks.length} track
            {artist.tracks.length !== 1 ? 's' : ''})
          </Text>
          <Text style={styles.arrow}>{isExpanded ? <Ionicons name='chevron-up-outline'/> : <Ionicons name='chevron-down-outline'/>}</Text>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.trackList}>
            {artist.tracks.map((track, i) => (
              <TrackCard track={track} i={i} key={i} />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search artists or tracks..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
      />
      <ScrollView>
        {filteredArtists.length === 0 ? (
          <Text style={styles.emptyText}>No artists found</Text>
        ) : (
          filteredArtists.map((artist, i) => (
            <View key={i}>
              <ArtistItem artist={artist}/>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
    actionButton: {
        padding: 8,
        marginLeft: 8,
      },
    fileActions: {
        flexDirection: 'row',
        alignItems: 'center',
      },
  container: {
    flex: 1,
    padding: 10,
    // backgroundColor: '#f5f5f5',
  },
  actionButtonText: {
    fontSize: 18,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  artistContainer: {
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  artistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(224,224,224,0.1)',
  },
  artistName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  arrow: {
    fontSize: 16,
    color: '#666',
  },
  trackList: {
    paddingHorizontal: 10,
  },
  trackCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  trackTitle: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  trackLength: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
});

export default ArtistsPage;