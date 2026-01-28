import React, { useState } from 'react';
import { UserPreferences, Wallet, Book } from '../types';
import { User, BookOpen, PenTool, Sparkles, LogOut, Award, Wallet as WalletIcon, Calendar, Edit2, Check, X } from 'lucide-react';

// Use same constants as Onboarding to ensure consistency
const GENRES = ["Sci-Fi", "Mystery", "Romance", "History", "Fantasy", "Business", "Philosophy", "Thriller"];
const GOALS = [
  { id: "relax", label: "Relax & Escape", icon: "🍵" },
  { id: "learn", label: "Learn & Grow", icon: "🧠" },
  { id: "adventure", label: "Adventure", icon: "🗺️" }
];

interface ProfileProps {
  userPrefs: UserPreferences;
  wallet: Wallet;
  library: Book[];
  onClose: () => void;
  onUpdateProfile: (prefs: UserPreferences) => void;
  onReset: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ userPrefs, wallet, library, onClose, onUpdateProfile, onReset }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Local state for editing
  const [nameInput, setNameInput] = useState(userPrefs.name || 'Traveler');
  const [selectedGoal, setSelectedGoal] = useState(userPrefs.readingGoal);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(userPrefs.genres);

  const booksRead = library.filter(b => b.isFinished).length;
  const totalNotes = library.reduce((acc, curr) => acc + (curr.userNotes?.length || 0), 0);
  const nftBooks = library.filter(b => wallet.nfts.includes(b.id));

  const handleSave = () => {
    onUpdateProfile({
        ...userPrefs,
        name: nameInput,
        readingGoal: selectedGoal,
        genres: selectedGenres
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
      // Revert changes
      setNameInput(userPrefs.name || 'Traveler');
      setSelectedGoal(userPrefs.readingGoal);
      setSelectedGenres(userPrefs.genres);
      setIsEditing(false);
  };

  const toggleGenre = (g: string) => {
    if (selectedGenres.includes(g)) {
      setSelectedGenres(prev => prev.filter(item => item !== g));
    } else {
      if (selectedGenres.length < 5) { // Allow more genres in profile
        setSelectedGenres(prev => [...prev, g]);
      }
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 max-w-4xl mx-auto mt-8 mb-24">
      
      {/* Edit Mode Controls */}
      <div className="flex justify-end mb-4">
          {isEditing ? (
              <div className="flex gap-2">
                   <button onClick={handleCancel} className="px-4 py-2 bg-white text-gray-500 rounded-full font-bold shadow-sm hover:bg-gray-50 text-sm">Cancel</button>
                   <button onClick={handleSave} className="px-4 py-2 bg-black text-white rounded-full font-bold shadow-lg hover:bg-gray-800 text-sm flex items-center gap-2">
                       <Check size={14} /> Save Changes
                   </button>
              </div>
          ) : (
              <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-white text-gray-900 rounded-full font-bold shadow-sm hover:bg-gray-50 text-sm flex items-center gap-2">
                  <Edit2 size={14} /> Edit Profile
              </button>
          )}
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm mb-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100 to-purple-100 rounded-bl-[10rem] -z-0 opacity-50 pointer-events-none"></div>
         
         <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-gray-900 to-gray-700 shadow-2xl flex items-center justify-center text-4xl font-serif font-bold text-white border-4 border-white">
               {nameInput.charAt(0).toUpperCase()}
            </div>
            
            {/* Info */}
            <div className="text-center md:text-left flex-1 w-full">
               {isEditing ? (
                 <div className="flex flex-col gap-2 mb-2 w-full max-w-md">
                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Display Name</label>
                    <input 
                      value={nameInput} 
                      onChange={(e) => setNameInput(e.target.value)}
                      className="text-2xl font-serif font-bold text-gray-900 bg-gray-50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    />
                 </div>
               ) : (
                 <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">
                   {nameInput}
                 </h1>
               )}
               
               <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-500 font-medium">
                  <span className="flex items-center gap-1.5"><Calendar size={14}/> Joined {new Date(userPrefs.joinDate).toLocaleDateString()}</span>
               </div>
            </div>

            {/* Wallet Card */}
            <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-xl min-w-[200px] text-center md:text-right relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-purple-500/20 group-hover:opacity-100 transition-opacity opacity-0"></div>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center justify-end gap-2">
                 Balance <WalletIcon size={12} />
               </p>
               <div className="text-3xl font-mono font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                 {wallet.balance} SCT
               </div>
            </div>
         </div>
      </div>

      {/* Preferences Section (Only Visible/Editable in Edit Mode or if Viewing details) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Reading Goal */}
          <div className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100 ${isEditing ? 'ring-2 ring-blue-500/20' : ''}`}>
              <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-4 flex items-center gap-2">
                 <Sparkles size={14} /> Current Focus
              </h3>
              {isEditing ? (
                  <div className="grid gap-2">
                      {GOALS.map(goal => (
                          <button 
                            key={goal.id} 
                            onClick={() => setSelectedGoal(goal.label)}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${selectedGoal === goal.label ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-gray-100 hover:bg-gray-50'}`}
                          >
                              <span className="text-xl">{goal.icon}</span>
                              <span className="font-bold text-sm">{goal.label}</span>
                              {selectedGoal === goal.label && <Check size={16} className="ml-auto text-blue-600"/>}
                          </button>
                      ))}
                  </div>
              ) : (
                  <div className="flex items-center gap-3">
                      <span className="text-3xl">{GOALS.find(g => g.label === selectedGoal)?.icon || '📚'}</span>
                      <span className="text-xl font-bold text-gray-900">{selectedGoal}</span>
                  </div>
              )}
          </div>

          {/* Genres */}
          <div className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100 ${isEditing ? 'ring-2 ring-blue-500/20' : ''}`}>
              <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-4 flex items-center gap-2">
                 <BookOpen size={14} /> Favorite Genres
              </h3>
              <div className="flex flex-wrap gap-2">
                  {isEditing ? (
                      GENRES.map(genre => (
                          <button
                            key={genre}
                            onClick={() => toggleGenre(genre)}
                            className={`px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${selectedGenres.includes(genre) ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                          >
                              {genre}
                          </button>
                      ))
                  ) : (
                      selectedGenres.map(genre => (
                          <span key={genre} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-bold">
                              {genre}
                          </span>
                      ))
                  )}
              </div>
          </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
         <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
               <BookOpen size={24} />
            </div>
            <div>
               <p className="text-2xl font-bold text-gray-900">{booksRead}</p>
               <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Books Finished</p>
            </div>
         </div>
         
         <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
               <PenTool size={24} />
            </div>
            <div>
               <p className="text-2xl font-bold text-gray-900">{totalNotes}</p>
               <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Notes Taken</p>
            </div>
         </div>

         <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-600">
               <Award size={24} />
            </div>
            <div>
               <p className="text-2xl font-bold text-gray-900">{wallet.nfts.length}</p>
               <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">NFTs Collected</p>
            </div>
         </div>
      </div>

      {/* NFT Gallery */}
      <div className="mb-12">
         <div className="flex items-center gap-2 mb-6 px-2">
            <Sparkles className="text-yellow-500" size={20} />
            <h2 className="text-2xl font-serif font-bold text-gray-900">Your Collection (NFTs)</h2>
         </div>
         
         {nftBooks.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-gray-200">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <Award size={32} />
               </div>
               <h3 className="text-gray-900 font-bold mb-1">No Digital Collectibles Yet</h3>
               <p className="text-gray-500 text-sm">Finish books to mint their covers as NFTs.</p>
            </div>
         ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
               {nftBooks.map(book => (
                  <div key={book.id} className="group relative aspect-[2/3] rounded-2xl overflow-hidden shadow-lg transition-transform hover:scale-105">
                     <div className="absolute inset-0" style={{ backgroundColor: book.coverColor }}></div>
                     {book.isbn && (
                        <img 
                          src={`https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`} 
                          className="absolute inset-0 w-full h-full object-cover" 
                          alt={book.title}
                        />
                     )}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        <p className="text-white font-bold text-sm line-clamp-2">{book.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                           <span className="text-[10px] font-bold bg-yellow-400 text-black px-1.5 rounded">NFT</span>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* Danger Zone */}
      <div className="flex justify-center">
         <button 
           onClick={onReset}
           className="text-red-500 text-sm font-bold flex items-center gap-2 hover:bg-red-50 px-6 py-3 rounded-full transition-colors"
         >
            <LogOut size={16} /> Reset Profile & Data
         </button>
      </div>

    </div>
  );
};