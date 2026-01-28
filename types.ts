export interface Review {
  id: string;
  reviewerName: string;
  rating: number; // 1-5
  text: string;
  date: string;
  avatarColor: string;
}

export interface Note {
  id: string;
  text: string;
  selectedText?: string;
  createdAt: number;
}

export interface Highlight {
  id: string;
  text: string;
  color: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverColor: string; // Hex code for placeholder cover
  isbn?: string; // ISBN-13 or ISBN-10 for cover lookup
  description?: string;
  fileUrl?: string; // Blob URL for local files or External URL
  isLocal: boolean;
  pageCount?: number;
  publishedYear?: string;
  categories: string[];
  reviewSnippet?: string; // Short summary of online sentiment
  matchReason?: string; // Why it matches the user's mood
  content?: string; // Mock text content for reader interactivity
  currentChapter?: number; // Track which chapter the user is on
  
  // User Data specific to this book
  userNotes?: Note[];
  userHighlights?: Highlight[];
  isFinished?: boolean;
  lastReadDate?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface UserPreferences {
  name?: string;
  genres: string[];
  readingGoal: string; // e.g., "Relaxation", "Learning", "Adventure"
  onboardingComplete: boolean;
  joinDate: number;
}

export interface Wallet {
  balance: number; // Suitcase Tokens
  nfts: string[]; // Array of Book IDs
}

export type ViewState = 'auth' | 'onboarding' | 'library' | 'reader' | 'details' | 'profile';

export interface SearchState {
  query: string;
  results: Book[];
  isLoading: boolean;
  error: string | null;
}