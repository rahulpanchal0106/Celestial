import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Track } from './musicPlayerSlice';

export interface QueuedTrack extends Track {
  status: 'queued' | 'downloading' | 'downloaded' | 'failed';
}

interface DownloadQueueState {
  queue: QueuedTrack[];
}

const initialState: DownloadQueueState = {
  queue: [],
};

const downloadQueueSlice = createSlice({
  name: 'downloadQueue',
  initialState,
  reducers: {
    addTrackToQueue: (state, action: PayloadAction<Track>) => {
      const newQueuedTrack: QueuedTrack = {
        ...action.payload,
        status: 'queued',
      };
      state.queue.push(newQueuedTrack);
    },
    updateTrackStatus: (state, action: PayloadAction<{ id: string; status: QueuedTrack['status'] }>) => {
      const { id, status } = action.payload;
      const trackIndex = state.queue.findIndex((track) => track.id === id);
      if (trackIndex !== -1) {
        state.queue[trackIndex].status = status;
      }
    },
    removeTrackFromQueue: (state, action: PayloadAction<string>) => {
      state.queue = state.queue.filter((track) => track.id !== action.payload);
    },
    setQueue: (state, action: PayloadAction<QueuedTrack[]>) => {
      state.queue = action.payload;
    },
  },
});

export const { addTrackToQueue, updateTrackStatus, removeTrackFromQueue, setQueue } = downloadQueueSlice.actions;

export default downloadQueueSlice.reducer;
