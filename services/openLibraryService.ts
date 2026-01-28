import { Book } from '../types';

const OPEN_LIBRARY_BASE = 'https://openlibrary.org';
const COVERS_BASE = 'https://covers.openlibrary.org';

interface OpenLibrarySearchResult {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  subject?: string[];
  language?: string[];
  edition_count?: number;
  has_fulltext?: boolean;
  ia?: string[]; // Internet Archive identifiers
  ratings_average?: number;
  ratings_count?: number;
}

interface OpenLibraryWork {
  title: string;
  description?: string | { value: string };
  subjects?: string[];
  covers?: number[];
}

/**
 * Search books using Open Library API
 * Returns books with real covers and metadata
 */
export const searchOpenLibrary = async (query: string, limit: number = 20): Promise<Book[]> => {
  try {
    const response = await fetch(
      `${OPEN_LIBRARY_BASE}/search.json?q=${encodeURIComponent(query)}&limit=${limit}&fields=key,title,author_name,first_publish_year,cover_i,isbn,subject,language,edition_count,has_fulltext,ia,ratings_average,ratings_count`
    );
    
    if (!response.ok) throw new Error('Open Library search failed');
    
    const data = await response.json();
    const results: OpenLibrarySearchResult[] = data.docs || [];
    
    return results.map((item, index) => ({
      id: `ol-${item.key.replace('/works/', '')}-${Date.now()}-${index}`,
      title: item.title,
      author: item.author_name?.[0] || 'Unknown Author',
      coverColor: getRandomPastelColor(),
      coverImageUrl: item.cover_i 
        ? `${COVERS_BASE}/b/id/${item.cover_i}-L.jpg` 
        : undefined,
      isbn: item.isbn?.[0],
      description: undefined, // Will be fetched on demand
      isLocal: false,
      publishedYear: item.first_publish_year?.toString() || 'Unknown',
      categories: (item.subject || []).slice(0, 5),
      source: 'openLibrary' as const,
      openLibraryId: item.key,
      averageRating: item.ratings_average,
      ratingsCount: item.ratings_count,
      hasFullText: item.has_fulltext || false,
      internetArchiveIds: item.ia || [],
    }));
  } catch (error) {
    console.error('Open Library search error:', error);
    return [];
  }
};

/**
 * Get detailed book information including description
 */
export const getBookDetails = async (workKey: string): Promise<Partial<Book> | null> => {
  try {
    // Remove /works/ prefix if present
    const cleanKey = workKey.replace('/works/', '');
    const response = await fetch(`${OPEN_LIBRARY_BASE}/works/${cleanKey}.json`);
    
    if (!response.ok) return null;
    
    const data: OpenLibraryWork = await response.json();
    
    return {
      description: typeof data.description === 'string' 
        ? data.description 
        : data.description?.value || 'No description available.',
      categories: data.subjects?.slice(0, 5) || [],
    };
  } catch (error) {
    console.error('Get book details error:', error);
    return null;
  }
};

/**
 * Get book cover URL by ISBN or cover ID
 */
export const getCoverUrl = (identifier: string, type: 'isbn' | 'id' = 'id', size: 'S' | 'M' | 'L' = 'L'): string => {
  return `${COVERS_BASE}/b/${type}/${identifier}-${size}.jpg`;
};

/**
 * Get readable book URL from Internet Archive
 */
export const getReadableUrl = (iaId: string): string => {
  return `https://archive.org/stream/${iaId}`;
};

/**
 * Get book download options from Internet Archive
 */
export const getDownloadFormats = async (iaId: string): Promise<{ format: string; url: string }[]> => {
  try {
    const response = await fetch(`https://archive.org/metadata/${iaId}`);
    if (!response.ok) return [];
    
    const data = await response.json();
    const files = data.files || [];
    
    const formats: { format: string; url: string }[] = [];
    const baseUrl = `https://archive.org/download/${iaId}`;
    
    files.forEach((file: any) => {
      if (file.format === 'Text PDF' || file.name?.endsWith('.pdf')) {
        formats.push({ format: 'PDF', url: `${baseUrl}/${file.name}` });
      }
      if (file.format === 'EPUB' || file.name?.endsWith('.epub')) {
        formats.push({ format: 'EPUB', url: `${baseUrl}/${file.name}` });
      }
    });
    
    return formats;
  } catch (error) {
    console.error('Get download formats error:', error);
    return [];
  }
};

/**
 * Search for books with full text available
 */
export const searchReadableBooks = async (query: string, limit: number = 10): Promise<Book[]> => {
  const results = await searchOpenLibrary(`${query} has_fulltext:true`, limit);
  return results.filter(book => book.hasFullText);
};

/**
 * Helper to generate random pastel color
 */
const getRandomPastelColor = (): string => {
  const colors = [
    '#e0f2fe', '#dbeafe', '#bfdbfe', // Blues
    '#f0fdf4', '#dcfce7', '#bbf7d0', // Greens
    '#fdf4ff', '#fae8ff', '#f5d0fe', // Purples
    '#fff1f2', '#ffe4e6', '#fecdd3', // Pinks
    '#fefce8', '#fef9c3', '#fef08a', // Yellows
    '#f5f5f4', '#fafaf9', '#e7e5e4', // Neutrals
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Trending books (based on Open Library's trending)
 */
export const getTrendingBooks = async (limit: number = 10): Promise<Book[]> => {
  // Open Library doesn't have a direct trending endpoint, 
  // so we search for popular categories
  const popularQueries = ['bestseller', 'popular fiction', 'classic literature'];
  const randomQuery = popularQueries[Math.floor(Math.random() * popularQueries.length)];
  return searchOpenLibrary(randomQuery, limit);
};
