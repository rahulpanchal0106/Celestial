import { configureStore } from '@reduxjs/toolkit';
import musicPlayerReducer from './musicPlayerSlice';
import downloadQueueReducer from './downloadQueueSlice';

export const store = configureStore({
  reducer: {
    musicPlayer: musicPlayerReducer,
    downloadQueue: downloadQueueReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 