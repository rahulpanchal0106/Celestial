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
import { Image, SvgUri } from 'react-native-svg';
import ChannelAvatar from './channelAvatar';
import ArtGenerator from './ArtGenerator';
import { ArtisticInitialsAvatar, GeometricAvatar, GradientBlobAvatar, MusicWaveAvatar } from './artistPicGenerator';

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
  const [isDownloading, setIsDownloading] = useState<{ [key: string]: boolean }>({});
  const [expandedArtists, setExpandedArtists] = useState<ExpandedArtistsState>({});
  const tracks = useSelector((state: RootState) => state.musicPlayer.playlist);
  const isPlaying = useSelector((state: RootState) => state.musicPlayer.isPlaying);
  const currentTrack = useSelector((state: RootState) => state.musicPlayer.currentTrack);
  const theme = useSelector((state: RootState) => state.musicPlayer.theme);
  const dispatch = useDispatch();

  const getThemeColors = () => {
    console.log("♾️♾️♾️ Theme: ", theme);
    if (!theme || theme === 'dark') {
      return {
        textColor: "#1a1a2e",
        particleColor: "#000000",
        gradientPrimary: "#4e3794",
        underlineColor: "#e0e0e0",
        backgroundColor: "#ffffff",
        titleColor: "#2c2c2c",
        timeTextColor: "#666666",
        sliderThumbColor: "#6200ee",
        sliderTrackColor: "#d3d3d3",
        sliderProgressColor: "#6200ee",
        buttonColor: "#6200ee",
        buttonTextColor: "white",
        disabledButtonColor: "#cccccc",
        currentTrackBG: "#f8f4ff",
        cardBackground: "#ffffff",
        artistHeaderBG: "#f9f9f9",
        searchBG: "#f5f5f5",
        shadowColor: "#000000",
        borderColor: "#e8e8e8",
        accentColor: "#6200ee",
        playingIndicator: "#4CAF50"
      };
    } else {
      return {
        textColor: "#ffffff",
        particleColor: "#ffffff",
        gradientPrimary: "#ffffff",
        underlineColor: "#404040",
        backgroundColor: "#121212",
        titleColor: "#e0e0e0",
        timeTextColor: "#b3b3b3",
        sliderThumbColor: "#6200ee",
        sliderTrackColor: "#4f4f4f",
        sliderProgressColor: "#6200ee",
        buttonColor: "#6200ee",
        buttonTextColor: "white",
        disabledButtonColor: "#333333",
        currentTrackBG: "#1e1e2e",
        cardBackground: "#1e1e1e",
        artistHeaderBG: "#2a2a2a",
        searchBG: "#2a2a2a",
        shadowColor: "#000000",
        borderColor: "#404040",
        accentColor: "#bb86fc",
        playingIndicator: "#4CAF50"
      };
    }
  };

  const colors = getThemeColors();

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
    console.log("--------- ", file);
    const downloadFile = {
      _id: file.id,
      id: file.id,
      title: file.title,
      artist: file.artist,
      author: (file as any).author,
      filepath: (file as any).filepath || '',
      thumbnail: undefined, // Add thumbnail if available in your API data
    };

    console.log("🎵🎵🎵 starting download");
    await initiateFastDownload(downloadFile, setIsDownloading, onTrackAdd, convAPI);
    console.log("🎵🎵🎵 FINisHED download");
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

  async function getChannelIdFromHandle(handle: string): Promise<string | null> {
    const url = `https://www.youtube.com/@${handle}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0', // Pretend to be a browser
      },
    });
  
    const html = await response.text();
    const match = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
  
    return match ? match[1] : null;
  }

  // Track card component
  const TrackCard: React.FC<{ track: Track; i: number }> = ({ track, i }) => {
    const dispatch = useDispatch();
    const isCurrentTrack = currentTrack?.id === track.id;

    return (
      <TouchableOpacity
        key={i}
        style={[
          styles.trackCard, 
          { 
            borderColor: colors.borderColor, 
            backgroundColor: isCurrentTrack ? colors.currentTrackBG : colors.cardBackground,
            // borderLeftWidth: isCurrentTrack ? 4 : 0,
            borderLeftColor: isCurrentTrack ? colors.accentColor : 'transparent'
          }
        ]}
        onPress={() => {
          dispatch(setCurrentTrack(track));
          dispatch(setArtistPlaylist(tracks.filter((tr: Track) => tr.artist === track.artist)));
        }}
        activeOpacity={0.8}
      >
        
        <View style={styles.trackImageContainer}>
          <ArtGenerator trackId={track.id as string} width={60} height={60} borderRadius={12} />
          {isCurrentTrack && (
            <View style={[styles.playingIndicator, { backgroundColor: colors.playingIndicator }]}>
              <Ionicons name="musical-notes" size={12} color="white" />
            </View>
          )}
        </View>
        
        <View style={styles.trackInfo}>
          <Text 
            numberOfLines={2}
            ellipsizeMode="tail" 
            style={[styles.trackTitle, { color: colors.titleColor }]}
          >
            {track.title}
          </Text>
          <View style={styles.trackMeta}>
            <Text style={[styles.trackArtist, { color: colors.timeTextColor }]}>
              {track.artist}
            </Text>
            <Text style={[styles.trackLength, { color: colors.timeTextColor }]}>
              {formatLength(track.duration)}
            </Text>
          </View>
        </View>

        <View style={styles.trackActions}>
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: isCurrentTrack ? colors.accentColor : colors.borderColor }]}
            onPress={() => {
              dispatch(setCurrentTrack(track));
              dispatch(setArtistPlaylist(tracks.filter((tr: Track) => tr.artist === track.artist)));
            }}
          >
            <Ionicons 
              name={isPlaying && isCurrentTrack ? 'pause' : 'play'} 
              size={20} 
              color={isCurrentTrack ? 'white' : colors.titleColor} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton]}
            onPress={() => toggleFavorite(track)}
            disabled={isDownloading[track.id]}
          >
            {isDownloading[track.id] ? (
              <ActivityIndicator size="small" color={colors.accentColor} />
            ) : (
              <Ionicons name="add-circle-outline" size={22} color={colors.timeTextColor} />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Artist item component
  const ArtistItem: React.FC<{ artist: ArtistGroup }> = ({ artist }) => {
    const isExpanded = !!expandedArtists[artist.author];
    
    return (
      <View style={[styles.artistContainer]}>
        <TouchableOpacity
          style={[styles.artistHeader, { backgroundColor: colors.artistHeaderBG }]}
          onPress={() => toggleArtist(artist.author)}
          activeOpacity={0.7}
        >
          <View style={styles.artistInfo}>
            {/* <View style={[styles.artistAvatar, { backgroundColor: colors.accentColor }]}>
              <Text style={[styles.artistInitial, { color: 'white' }]}>
                {artist.author.charAt(0).toUpperCase()}
              </Text>
            </View> */}
            <View style={[styles.artistAvatar, { backgroundColor: colors.accentColor }]}>
              {/* <Text style={[styles.artistInitial, { color: 'white' }]}>
                {artist.author.charAt(0).toUpperCase()}
              </Text> */}
              <MusicWaveAvatar artistName={artist.author} colors={colors} />
            </View>
            <View style={styles.artistDetails}>
              <Text style={[styles.artistName, { color: colors.titleColor }]}>
                {artist.author}
              </Text>
              <Text style={[styles.trackCount, { color: colors.timeTextColor }]}>
                {artist.tracks.length} track{artist.tracks.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          
          <View style={[styles.expandButton, { backgroundColor: colors.borderColor }]}>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colors.timeTextColor} 
            />
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.trackList}>
            {/* <ArtGenerator trackId={track.filepath as string} borderRadius={0} setAsBg={true} /> */}
            {artist.tracks.map((track, i) => (
              <TrackCard track={track} i={i} key={i} />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container]}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.timeTextColor} style={styles.searchIcon} />
        <TextInput
          placeholder="Search artists or tracks..."
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { 
            backgroundColor: colors.searchBG,
            color: colors.textColor,
          }]}
          placeholderTextColor={colors.timeTextColor}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={colors.timeTextColor} />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredArtists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={64} color={colors.timeTextColor} />
            <Text style={[styles.emptyText, { color: colors.timeTextColor }]}>
              No artists found
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.timeTextColor }]}>
              Try adjusting your search terms
            </Text>
          </View>
        ) : (
          filteredArtists.map((artist, i) => (
            <ArtistItem artist={artist} key={i} />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    paddingLeft: 48,
    paddingRight: 48,
    borderRadius: 25,
    fontSize: 16,
    fontWeight: '500',
  },
  clearButton: {
    position: 'absolute',
    right: 16,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  artistContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    // borderWidth: 1,
    // borderColor: "#333",
    // borderStyle: "dashed",
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 8,
    // elevation: 4,
  },
  artistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    marginBottom: 10,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  artistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  artistAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow:"hidden",
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  artistInitial: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  artistDetails: {
    flex: 1,
  },
  artistName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  trackCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  expandButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    width:"100%"
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    // shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  trackImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  playingIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 22,
  },
  trackMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackArtist: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  trackLength: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ArtistsPage;