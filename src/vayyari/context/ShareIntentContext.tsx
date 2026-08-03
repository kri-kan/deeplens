import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface SharedMediaItem {
  uri: string;
  type?: 'image' | 'video';
  fileName?: string;
}

interface ShareIntentContextType {
  sharedMedia: SharedMediaItem[];
  setSharedMedia: (media: SharedMediaItem[]) => void;
  addSharedMedia: (media: SharedMediaItem[]) => void;
  removeSharedMedia: (index: number) => void;
  clearSharedMedia: () => void;
}

const ShareIntentContext = createContext<ShareIntentContextType>({
  sharedMedia: [],
  setSharedMedia: () => {},
  addSharedMedia: () => {},
  removeSharedMedia: () => {},
  clearSharedMedia: () => {},
});

export const ShareIntentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sharedMedia, setSharedMedia] = useState<SharedMediaItem[]>([]);

  const addSharedMedia = (newItems: SharedMediaItem[]) => {
    setSharedMedia(prev => [...prev, ...newItems]);
  };

  const removeSharedMedia = (index: number) => {
    setSharedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const clearSharedMedia = () => setSharedMedia([]);

  return (
    <ShareIntentContext.Provider
      value={{
        sharedMedia,
        setSharedMedia,
        addSharedMedia,
        removeSharedMedia,
        clearSharedMedia,
      }}
    >
      {children}
    </ShareIntentContext.Provider>
  );
};

export const useShareIntentContext = () => useContext(ShareIntentContext);
