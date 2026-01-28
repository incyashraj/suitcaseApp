import React, { useState } from 'react';
import { Book } from '../types';
import { BookOpen, Star, Sparkles, TrendingUp, Play } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onClick: () => void;
  onRead: (e: React.MouseEvent) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onClick, onRead }) => {
  const [imgError, setImgError] = useState(false);
  const coverUrl = book.isbn ? `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg` : null;

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
            className="w-full h-full flex items-center justify-center relative overflow-hidden"
            style={{ 
              background: `linear-gradient(to bottom right, ${book.coverColor} 0%, #ffffff 150%)`,
            }}
          >
             {/* Abstract Geometric Pattern for generic covers */}
             <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-black to-transparent"></div>
             <div className="transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                <BookOpen className="text-black/20 w-16 h-16" strokeWidth={1.5} />
             </div>
             
             {/* Title on cover if no image */}
             <div className="absolute bottom-4 left-4 right-4 text-center">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Untitled</p>
             </div>
          </div>
        )}

        {/* Hover Overlay with "Read" Button */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
           <button 
             onClick={onRead}
             className="bg-white/90 backdrop-blur-xl text-gray-900 px-5 py-2.5 rounded-full text-xs font-bold shadow-xl transform scale-90 group-hover:scale-100 transition-all duration-300 flex items-center gap-2 hover:bg-white"
           >
             <Play size={12} className="fill-current" /> READ
           </button>
        </div>

        {/* Badges */}
        {book.matchReason && (
          <div className="absolute top-2 left-2 z-10">
             <div className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1 rounded-md shadow-sm border border-white/50">
                <Sparkles size={8} className="text-blue-500 fill-blue-500" />
                <span className="text-[8px] font-bold uppercase tracking-wide text-gray-800">Match</span>
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
        
        {/* Micro Stats */}
        <div className="flex items-center gap-3 pt-1">
            {book.reviewSnippet && (
                 <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                     <TrendingUp size={8} /> Buzz
                 </div>
            )}
            <div className="flex items-center gap-0.5">
               <Star size={10} className="text-yellow-400 fill-yellow-400" />
               <span className="text-[10px] font-bold text-gray-400">4.8</span>
            </div>
        </div>
      </div>
    </div>
  );
};