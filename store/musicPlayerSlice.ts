import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Track {
  id: string;
  title: string;
  artist?: string;
  uri: string;
  duration?: number;
}

interface MusicPlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  playlist: Track[];
  currentTime: number;
  duration: number;
  converterAPI: string;
}

const initialState: MusicPlayerState = {
  currentTrack: null,
  isPlaying: false,
  playlist: [],
  currentTime: 0,
  duration: 0,
  converterAPI:"null==="
};

const musicPlayerSlice = createSlice({
  name: 'musicPlayer',
  initialState,
  reducers: {
    setCurrentTrack: (state, action: PayloadAction<Track>) => {
      state.currentTrack = action.payload;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setPlaylist: (state, action: PayloadAction<Track[]>) => {
      state.playlist = action.payload;
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
  setDuration,
  playNext,
  playPrevious,
  setConverterAPI

} = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer; 