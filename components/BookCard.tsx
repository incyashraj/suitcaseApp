import React, { useState } from 'react';
import { Book } from '../types';
import { BookOpen, Star, Sparkles, TrendingUp, Play, Library, Wifi } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onClick: () => void;
  onRead: (e: React.MouseEvent) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onClick, onRead }) => {
  const [imgError, setImgError] = useState(false);

  // Use coverImageUrl from Open Library first, then fall back to ISBN-based lookup
  const coverUrl = book.coverImageUrl ||
    (book.isbn ? `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg` : null);

  return (
    <div
      className="group relative flex flex-col w-full cursor-pointer"
      onClick={onClick}
    >
      {/* Cover Area - Strictly 2:3 Ratio */}
      <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-sm transition-all duration-500 group-hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] group-hover:-translate-y-2">

        {/* The Image or Gradient */}
        {!imgError && coverUrl ? (
          <img
            src={coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden p-4"
            style={{
              background: `linear-gradient(135deg, ${book.coverColor} 0%, ${adjustColor(book.coverColor, -20)} 100%)`,
            }}
          >
            {/* Abstract Geometric Pattern for generic covers */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-black to-transparent"></div>

            {/* Book icon and title on cover if no image */}
            <div className="transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] mb-4">
              <BookOpen className="text-black/20 w-12 h-12" strokeWidth={1.5} />
            </div>
            <p className="text-black/60 font-serif font-bold text-sm text-center leading-tight line-clamp-3">{book.title}</p>
            <p className="text-black/40 text-xs mt-1">{book.author}</p>
          </div>
        )}

        {/* Hover Overlay with "Read" Button */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-4">
          <button
            onClick={onRead}
            className="bg-white text-gray-900 px-6 py-2.5 rounded-full text-xs font-bold shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2 hover:scale-105 active:scale-95"
          >
            <Play size={12} className="fill-current" /> READ NOW
          </button>
        </div>

        {/* Source Badge - Top Right */}
        {book.source === 'openLibrary' && (
          <div className="absolute top-2 right-2 z-10">
            <div className="inline-flex items-center gap-1 bg-green-500/90 backdrop-blur-md px-2 py-1 rounded-full shadow-sm">
              <Library size={8} className="text-white" />
              <span className="text-[7px] font-bold uppercase tracking-wide text-white">Open Library</span>
            </div>
          </div>
        )}

        {/* Match Badge - Top Left */}
        {book.matchReason && (
          <div className="absolute top-2 left-2 z-10">
            <div className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full shadow-sm border border-white/50">
              <Sparkles size={8} className="text-blue-500 fill-blue-500" />
              <span className="text-[8px] font-bold uppercase tracking-wide text-gray-800">For You</span>
            </div>
          </div>
        )}

        {/* Full Text Available Badge */}
        {book.hasFullText && (
          <div className="absolute bottom-2 left-2 z-10">
            <div className="inline-flex items-center gap-1 bg-blue-500/90 backdrop-blur-md px-2 py-1 rounded-full shadow-sm">
              <Wifi size={8} className="text-white" />
              <span className="text-[7px] font-bold uppercase tracking-wide text-white">Full Text</span>
            </div>
          </div>
        )}
      </div>

      {/* Info Area - Minimalist Below Cover */}
      <div className="mt-3 space-y-1">
        <h3 className="font-serif font-bold text-gray-900 text-base leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
          {book.title}
        </h3>
        <p className="text-xs text-gray-500 font-medium line-clamp-1">{book.author}</p>

        {/* Stats Row */}
        <div className="flex items-center gap-3 pt-1">
          {/* Real Rating from Open Library */}
          {book.averageRating ? (
            <div className="flex items-center gap-1">
              <Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold text-gray-700">{book.averageRating.toFixed(1)}</span>
              {book.ratingsCount && book.ratingsCount > 0 && (
                <span className="text-[10px] text-gray-400">({formatNumber(book.ratingsCount)})</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-0.5">
              <Star size={10} className="text-gray-300" />
              <span className="text-[10px] text-gray-400">No ratings</span>
            </div>
          )}

          {/* Buzz/Trending indicator */}
          {book.reviewSnippet && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              <TrendingUp size={8} /> Buzz
            </div>
          )}

          {/* Year if available */}
          {book.publishedYear && book.publishedYear !== 'Unknown' && (
            <span className="text-[10px] text-gray-400">{book.publishedYear}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to darken/lighten a hex color
function adjustColor(hex: string, percent: number): string {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch {
    return hex;
  }
}

// Helper to format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}