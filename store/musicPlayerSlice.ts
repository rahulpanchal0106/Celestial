import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Track {
  id: string;
  title: string;
  artist?: string;
  uri: string;
  duration?: number;
  isFavorite?:boolean;
  filepath?:string;
}

interface MusicPlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  playlist: Track[];
  artistPlaylist: Track[];
  currentTime: number;
  duration: number;
  converterAPI: string;
  theme: string;
}

const initialState: MusicPlayerState = {
  currentTrack: null,
  isPlaying: false,
  playlist: [],
  artistPlaylist:[],
  currentTime: 0,
  duration: 0,
  converterAPI:"null===",
  theme: "dark"
};

const musicPlayerSlice = createSlice({
  name: 'musicPlayer',
  initialState,
  reducers: {
    setCurrentTrack: (state, action: PayloadAction<Track>) => {
      state.currentTrack = action.payload;
    },
    setTheme: (state, action: PayloadAction<string>) => {
      state.theme = action.payload;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setPlaylist: (state, action: PayloadAction<Track[]>) => {
      state.playlist = action.payload;
    },
    setArtistPlaylist: (state, action: PayloadAction<Track[]>) => {
      state.artistPlaylist = action.payload;
    },
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.currentTime = action.payload;
    },
    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
    },
    setConverterAPI: (state, action: PayloadAction<string>) => {
        console.log("STATE CONVAPI: ",state.converterAPI)
      state.converterAPI = action.payload;
    },
    playNext: (state) => {
      if (state.currentTrack && state.playlist.length > 0) {
        const currentIndex = state.playlist.findIndex(
          (track) => track.id === state.currentTrack?.id
        );
        if (currentIndex < state.playlist.length - 1) {
          state.currentTrack = state.playlist[currentIndex + 1];
        }
      }
    },
    playPrevious: (state) => {
      if (state.currentTrack && state.playlist.length > 0) {
        const currentIndex = state.playlist.findIndex(
          (track) => track.id === state.currentTrack?.id
        );
        if (currentIndex > 0) {
          state.currentTrack = state.playlist[currentIndex - 1];
        }
      }
    },
  },
});

export const {
  setCurrentTrack,
  setIsPlaying,
  setPlaylist,
  setCurrentTime,
  setTheme,
  setDuration,
  playNext,
  playPrevious,
  setConverterAPI,
  setArtistPlaylist
} = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer; 