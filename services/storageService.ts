import { Book, UserPreferences, Wallet } from '../types';

// Helper to generate user-specific keys
const getKey = (userId: string, key: string) => `suitcase_${userId}_${key}`;

export const savePreferences = (userId: string, prefs: UserPreferences) => {
  try {
    localStorage.setItem(getKey(userId, 'prefs'), JSON.stringify(prefs));
  } catch (e) {
    console.error("Failed to save prefs", e);
  }
};

export const loadPreferences = (userId: string): UserPreferences | null => {
  try {
    const data = localStorage.getItem(getKey(userId, 'prefs'));
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const saveLibrary = (userId: string, library: Book[]) => {
  try {
    // We cannot save Blob URLs (local files) to localStorage efficiently.
    const safeLibrary = library.map(book => ({
      ...book,
      fileUrl: book.isLocal ? undefined : book.fileUrl 
    }));
    localStorage.setItem(getKey(userId, 'library'), JSON.stringify(safeLibrary));
  } catch (e) {
    console.error("Failed to save library", e);
  }
};

export const loadLibrary = (userId: string): Book[] => {
  try {
    const data = localStorage.getItem(getKey(userId, 'library'));
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveWallet = (userId: string, wallet: Wallet) => {
  try {
    localStorage.setItem(getKey(userId, 'wallet'), JSON.stringify(wallet));
  } catch (e) {
    console.error("Failed to save wallet", e);
  }
};

export const loadWallet = (userId: string): Wallet => {
  try {
    const data = localStorage.getItem(getKey(userId, 'wallet'));
    return data ? JSON.parse(data) : { balance: 0, nfts: [] };
  } catch (e) {
    return { balance: 0, nfts: [] };
  }
};

export const clearUserData = (userId: string) => {
    localStorage.removeItem(getKey(userId, 'prefs'));
    localStorage.removeItem(getKey(userId, 'library'));
    localStorage.removeItem(getKey(userId, 'wallet'));
    window.location.reload();
}