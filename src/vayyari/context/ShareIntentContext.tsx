import React, { createContext, useContext, useState, ReactNode } from 'react';
import { mediaStagingService } from '@/services/media-staging.service';

export interface SharedMediaItem {
  uri: string;
  type?: 'image' | 'video';
  fileName?: string;
  sessionId?: string;
}

interface ShareIntentContextType {
  sharedMedia: SharedMediaItem[];
  currentSessionId?: string;
  setSharedMedia: (media: SharedMediaItem[], sessionId?: string) => void;
  addSharedMedia: (media: SharedMediaItem[]) => void;
  removeSharedMedia: (index: number) => void;
  clearSharedMedia: () => void;
  discardCurrentSession: () => Promise<void>;
  commitCurrentSession: () => Promise<void>;
}

const ShareIntentContext = createContext<ShareIntentContextType>({
  sharedMedia: [],
  currentSessionId: undefined,
  setSharedMedia: () => {},
  addSharedMedia: () => {},
  removeSharedMedia: () => {},
  clearSharedMedia: () => {},
  discardCurrentSession: async () => {},
  commitCurrentSession: async () => {},
});

export const ShareIntentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sharedMedia, setSharedMediaState] = useState<SharedMediaItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);

  const setSharedMedia = (media: SharedMediaItem[], sessionId?: string) => {
    setSharedMediaState(media);
    if (sessionId !== undefined) {
      setCurrentSessionId(sessionId);
    }
  };

  const addSharedMedia = (newItems: SharedMediaItem[]) => {
    setSharedMediaState(prev => [...prev, ...newItems]);
  };

  const removeSharedMedia = (index: number) => {
    setSharedMediaState(prev => prev.filter((_, i) => i !== index));
  };

  const clearSharedMedia = () => {
    setSharedMediaState([]);
    setCurrentSessionId(undefined);
  };

  const discardCurrentSession = async () => {
    if (currentSessionId) {
      await mediaStagingService.purgeSession(currentSessionId);
    }
    clearSharedMedia();
  };

  const commitCurrentSession = async () => {
    if (currentSessionId) {
      await mediaStagingService.commitSession(currentSessionId);
    }
    clearSharedMedia();
  };

  return (
    <ShareIntentContext.Provider
      value={{
        sharedMedia,
        currentSessionId,
        setSharedMedia,
        addSharedMedia,
        removeSharedMedia,
        clearSharedMedia,
        discardCurrentSession,
        commitCurrentSession,
      }}
    >
      {children}
    </ShareIntentContext.Provider>
  );
};

export const useShareIntentContext = () => useContext(ShareIntentContext);
