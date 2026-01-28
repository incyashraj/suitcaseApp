import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Book, ViewState, UserPreferences, Wallet, User } from './types';
import { BookCard } from './components/BookCard';
import { BookDetail } from './components/BookDetail';
import { Reader } from './components/Reader';
import { Onboarding } from './components/Onboarding';
import { Profile } from './components/Profile';
import { AuthPage } from './components/AuthPage';
import { searchBooks, consultConcierge, getOnboardingRecommendations } from './services/aiProviderService';
import { loadPreferences, savePreferences, loadLibrary, saveLibrary, loadWallet, saveWallet, clearUserData } from './services/storageService';
import { authService, mapFirebaseUser } from './services/authService';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { Search, Upload, Library, Loader2, Sparkles, Briefcase, ArrowRight, X, Home, Plus, Wallet as WalletIcon, User as UserIcon, LogOut, FileQuestion, BookOpen, Send, ChevronRight } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('auth');
  const [activeBook, setActiveBook] = useState<Book | null>(null);

  // Persistent State
  const [myLibrary, setMyLibrary] = useState<Book[]>([]);
  const [userPrefs, setUserPrefs] = useState<UserPreferences | null>(null);
  const [wallet, setWallet] = useState<Wallet>({ balance: 0, nfts: [] });
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Transient State
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [onboardingResults, setOnboardingResults] = useState<Book[]>([]);

  // Concierge Chat State
  const [conciergeHistory, setConciergeHistory] = useState<{ role: 'user' | 'model', text: string, books?: Book[] }[]>([]);
  const [conciergeInput, setConciergeInput] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeMode, setActiveMode] = useState<'library' | 'mood' | 'search'>('library');
  const [isDragging, setIsDragging] = useState(false);
  const [isCurating, setIsCurating] = useState(false); // New loading state for onboarding transition

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Firebase Session Listener
  useEffect(() => {
    console.log("🔍 DEBUG ENV:", {
      GROQ_EXISTS: !!import.meta.env.VITE_GROQ_API_KEY,
      GEMINI_EXISTS: !!import.meta.env.VITE_GEMINI_API_KEY,
      MODE: import.meta.env.MODE
    });
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const appUser = mapFirebaseUser(firebaseUser);
        setCurrentUser(appUser);
        loadUserData(appUser.id);
      } else {
        setCurrentUser(null);
        setView('auth');
        setIsDataLoaded(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Load Data Helper
  const loadUserData = (userId: string) => {
    const prefs = loadPreferences(userId);
    const lib = loadLibrary(userId);
    const wal = loadWallet(userId);

    setUserPrefs(prefs);
    setMyLibrary(lib);
    setWallet(wal);
    setIsDataLoaded(true);

    if (!prefs) {
      setView('onboarding');
    } else {
      setView('library');
      // Background fetch recommendations
      getOnboardingRecommendations(prefs).then(results => {
        if (results && results.length > 0) {
          setOnboardingResults(results);
        }
      });
    }
  };

  // 3. Save Data on Change
  useEffect(() => {
    if (currentUser && isDataLoaded && userPrefs) savePreferences(currentUser.id, userPrefs);
  }, [userPrefs, isDataLoaded, currentUser]);

  useEffect(() => {
    if (currentUser && isDataLoaded) saveLibrary(currentUser.id, myLibrary);
  }, [myLibrary, isDataLoaded, currentUser]);

  useEffect(() => {
    if (currentUser && isDataLoaded) saveWallet(currentUser.id, wallet);
  }, [wallet, isDataLoaded, currentUser]);

  // Focus Search
  useEffect(() => {
    if (activeMode === 'search' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeMode]);

  // Auto scroll chat
  useEffect(() => {
    if (activeMode === 'mood') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conciergeHistory, activeMode]);

  // --- Helpers ---
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    loadUserData(user.id);
  };

  const handleLogout = async () => {
    await authService.logout();
    setUserPrefs(null);
    setMyLibrary([]);
    setWallet({ balance: 0, nfts: [] });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      addBookFromFile(file);
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].type === 'application/pdf') {
      addBookFromFile(files[0]);
    }
  };

  const addBookFromFile = (file: File) => {
    const newBook: Book = {
      id: `local-${Date.now()}`,
      title: file.name.replace('.pdf', ''),
      author: 'My Document',
      description: 'Imported PDF document from local device.',
      coverColor: getRandomColor(),
      fileUrl: URL.createObjectURL(file),
      isLocal: true,
      categories: ['Uploads'],
      publishedYear: new Date().getFullYear().toString()
    };
    setMyLibrary(prev => [newBook, ...prev]);
    if (activeMode !== 'library') setActiveMode('library');
  };

  const getRandomColor = () => {
    const colors = ['#e0f2fe', '#f0fdf4', '#fdf4ff', '#fff1f2', '#fefce8'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setHasSearched(false);

    const results = await searchBooks(searchQuery);
    setSearchResults(results);
    setHasSearched(true);
    setIsSearching(false);
  };

  const handleConciergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conciergeInput.trim()) return;

    const userMsg = conciergeInput;
    setConciergeInput('');
    setIsSearching(true); // Re-using loading state

    // Optimistic Update
    setConciergeHistory(prev => [...prev, { role: 'user', text: userMsg }]);

    // Call AI
    const apiHistory = conciergeHistory.map(h => ({ role: h.role, text: h.text }));
    const { reply, suggestions } = await consultConcierge(userMsg, apiHistory);

    setConciergeHistory(prev => [...prev, { role: 'model', text: reply, books: suggestions }]);
    setIsSearching(false);
  };

  const handleOnboardingComplete = async (prefs: UserPreferences) => {
    setIsCurating(true); // Start loading animation
    setUserPrefs(prefs);
    setWallet({ balance: 100, nfts: [] });

    // Artificial delay for premium feel if api is too fast, or just wait for data
    const minDelay = new Promise(resolve => setTimeout(resolve, 2500));
    const dataFetch = getOnboardingRecommendations(prefs);

    const [_, recs] = await Promise.all([minDelay, dataFetch]);

    setOnboardingResults(recs);
    setIsCurating(false);
    setView('library');
  };

  const handleReward = () => {
    setWallet(prev => ({
      ...prev,
      balance: prev.balance + 50,
      nfts: [...prev.nfts, activeBook?.id || 'unknown']
    }));
  };

  const updateBookData = (bookId: string, data: Partial<Book>) => {
    setMyLibrary(prev => prev.map(book =>
      book.id === bookId ? { ...book, ...data } : book
    ));

    if (activeBook && activeBook.id === bookId) {
      setActiveBook(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const updateProfile = (updatedPrefs: UserPreferences) => {
    setUserPrefs(updatedPrefs);
    // Optionally refresh recommendations if genres changed
    getOnboardingRecommendations(updatedPrefs).then(setOnboardingResults);
  };

  const handleResetData = () => {
    if (currentUser) {
      clearUserData(currentUser.id);
      handleLogout();
    }
  }

  const openBookDetails = (book: Book) => {
    const existingBook = myLibrary.find(b => b.id === book.id);
    setActiveBook(existingBook || book);
    setView('details');
  };

  const openReader = (book: Book) => {
    const existingBook = myLibrary.find(b => b.id === book.id);
    if (!existingBook) {
      const newBook = { ...book, lastReadDate: Date.now() };
      setMyLibrary(prev => [newBook, ...prev]);
      setActiveBook(newBook);
    } else {
      setActiveBook(existingBook);
    }
    setView('reader');
  };

  const closeOverlay = () => {
    setView('library');
    setActiveBook(null);
  };

  // Dock Item Component
  const DockItem = ({ icon: Icon, label, isActive, onClick }: { icon: React.ElementType, label: string, isActive?: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center w-12 h-12 rounded-full dock-icon-transition hover:scale-125 hover:-translate-y-2`}
    >
      <div className={`p-2.5 rounded-full transition-colors duration-300 ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
        <Icon size={26} strokeWidth={isActive ? 2.5 : 2} />
      </div>
      <span className={`absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-blue-600 transition-transform duration-300 ${isActive ? 'scale-100' : 'scale-0'}`}></span>
    </button>
  );

  // --- RENDER ---

  if (!isDataLoaded && view !== 'auth') return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
      <Loader2 className="animate-spin text-gray-400" />
    </div>
  );

  if (view === 'auth') {
    return <AuthPage onSuccess={handleAuthSuccess} />;
  }

  if (view === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Curating / Loading State for Library
  if (isCurating) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F5F5F7] animate-in fade-in duration-500">
        <div className="relative">
          <BookOpen size={48} className="relative text-[#0071e3] mb-4 animate-bounce" />
        </div>
        <h2 className="text-xl font-semibold text-[#1d1d1f] mb-1 tracking-tight">Curating your library...</h2>
        <p className="text-[#86868b] text-sm">Matching books to you.</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-[#F5F5F7] selection:bg-[#B3D7FF] selection:text-black overflow-x-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      {/* Drag Overlay - Smaller & cleaner */}
      {isDragging && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-xl border-4 border-[#0071e3] border-dashed m-6 rounded-[24px] flex items-center justify-center pointer-events-none animate-in fade-in duration-200">
          <div className="bg-white px-8 py-6 rounded-[18px] shadow-2xl flex flex-col items-center border border-black/5">
            <Upload size={32} className="text-[#0071e3] mb-3 animate-bounce" />
            <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">Drop PDF</h2>
          </div>
        </div>
      )}

      {/* Top Bar - Smaller, tighter */}
      <div className="fixed top-0 left-0 right-0 z-30 px-6 py-3 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-2">
          <Briefcase size={18} className="text-[#1d1d1f]" />
          <span className="font-semibold text-sm tracking-tight text-[#1d1d1f] hidden sm:block">Suitcase</span>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          <div
            onClick={() => { setActiveMode('library'); setView('profile'); }}
            className="bg-white/80 backdrop-blur-xl px-3 py-1.5 rounded-full shadow-sm border border-black/5 flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#FFD60A] to-[#FF9F0A] flex items-center justify-center shadow-sm">
              <span className="text-[9px] font-bold text-white">$</span>
            </div>
            <span className="text-xs font-medium text-[#1d1d1f]">{wallet.balance}</span>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileUpload} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-36 w-full">

        {view === 'profile' && userPrefs && (
          <Profile
            userPrefs={userPrefs}
            wallet={wallet}
            library={myLibrary}
            onClose={() => setView('library')}
            onUpdateProfile={updateProfile}
            onReset={handleResetData}
          />
        )}

        {/* View: Mood Concierge (Chat) */}
        {view === 'library' && activeMode === 'mood' && userPrefs && (
          <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">

            {/* Chat History */}
            {conciergeHistory.length === 0 ? (
              /* Initial Hero State */
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-spring pb-20">
                <div className="animate-float inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-full mb-6 shadow-xl shadow-blue-100/50">
                  <Sparkles size={32} className="text-blue-500" />
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4 tracking-tight">
                  How are you feeling?
                </h1>
                <p className="text-gray-500 text-lg max-w-md mb-8">
                  Tell me your mood, or what you're curious about, and I'll curate a selection just for you.
                </p>
              </div>
            ) : (
              /* Conversation Flow */
              <div className="flex-1 overflow-y-auto space-y-6 pb-24 px-4 scroll-smooth">
                {conciergeHistory.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                    {/* Message Bubble */}
                    <div className={`max-w-[85%] md:max-w-[70%] p-5 rounded-[1.5rem] text-base leading-relaxed shadow-sm ${msg.role === 'user'
                      ? 'bg-black text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                      }`}>
                      {msg.text}
                    </div>

                    {/* Suggestions Grid inside chat */}
                    {msg.books && msg.books.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                        {msg.books.map((book) => (
                          <div key={book.id} className="animate-in fade-in zoom-in-95 duration-500">
                            <BookCard
                              book={book}
                              onClick={() => openBookDetails(book)}
                              onRead={(e) => { e.stopPropagation(); openReader(book); }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isSearching && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 p-4 rounded-[1.5rem] rounded-bl-none shadow-sm flex gap-2 items-center text-gray-400">
                      <Sparkles size={16} className="animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider">Suitcase is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Bottom Input */}
            <div className={`${conciergeHistory.length === 0 ? 'relative mb-10' : 'fixed bottom-24 left-4 right-4 max-w-4xl mx-auto z-40'}`}>
              <form onSubmit={handleConciergeSubmit} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <input
                  type="text"
                  placeholder="I want a mystery set in Paris..."
                  className="w-full relative bg-white/90 backdrop-blur-xl border border-white/60 p-5 pl-8 pr-16 rounded-full text-lg text-gray-900 placeholder:text-gray-400 outline-none shadow-[0_8px_30px_rgb(0,0,0,0.06)] focus:shadow-[0_12px_40px_rgb(0,0,0,0.1)] transition-all duration-300 font-medium"
                  value={conciergeInput}
                  onChange={(e) => setConciergeInput(e.target.value)}
                  autoFocus={conciergeHistory.length === 0}
                />
                <button
                  type="submit"
                  disabled={!conciergeInput.trim() || isSearching}
                  className="absolute right-2 top-2 bottom-2 aspect-square bg-black text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? <Loader2 size={18} className="animate-spin" /> : (conciergeHistory.length === 0 ? <ArrowRight size={20} /> : <Send size={18} />)}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* View: Search */}
        {view === 'library' && activeMode === 'search' && (
          <div className="max-w-6xl mx-auto animate-spring mt-8">
            <div className="mb-8 max-w-2xl mx-auto relative px-4">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
                <form onSubmit={handleSearch}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search for books, authors..."
                    className="w-full pl-16 pr-6 py-5 bg-white/90 backdrop-blur-xl border border-white/50 rounded-3xl text-2xl text-gray-900 placeholder:text-gray-300 outline-none shadow-2xl shadow-gray-200/50 transition-all duration-300 font-serif"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults([]); setHasSearched(false); }} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {isSearching ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 opacity-50 pointer-events-none">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="aspect-[2/3] bg-white rounded-2xl animate-pulse"></div>)}
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {hasSearched && searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-60">
                    <FileQuestion size={64} className="text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">No books found</h3>
                    <p className="text-gray-500">Try checking the spelling or use different keywords.</p>
                  </div>
                ) : (
                  searchResults.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                      {searchResults.map((book) => (
                        <BookCard key={book.id} book={book} onClick={() => openBookDetails(book)} onRead={() => openReader(book)} />
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* View: Library (Default) */}
        {view === 'library' && activeMode === 'library' && (
          <div className="animate-in fade-in duration-500 space-y-12">

            {/* Personalized Greeting */}
            <div className="flex flex-col gap-1 px-2">
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900">
                {getGreeting()}, {currentUser?.name.split(' ')[0] || 'Traveler'}.
              </h1>
              <p className="text-gray-500">Ready to continue your journey?</p>
            </div>

            {/* Horizontal Scroll Shelf for Recommendations */}
            {onboardingResults.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-blue-500" />
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">For You</h2>
                  </div>
                  <button className="text-xs font-bold text-gray-400 hover:text-gray-900 flex items-center gap-1">
                    View All <ChevronRight size={12} />
                  </button>
                </div>

                {/* Horizontal Container */}
                <div className="flex gap-6 overflow-x-auto pb-8 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
                  {onboardingResults.map((book) => (
                    <div key={book.id} className="min-w-[160px] md:min-w-[180px] snap-start">
                      <BookCard book={book} onClick={() => openBookDetails(book)} onRead={() => openReader(book)} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Grid for User Library */}
            <section>
              <div className="flex items-end justify-between mb-6 px-2 border-b border-gray-200 pb-2">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Your Suitcase</h2>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-white px-2 py-1 rounded-md border border-gray-100">
                  {myLibrary.length} Items
                </span>
              </div>

              {myLibrary.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-20 rounded-3xl transition-all cursor-pointer group bg-white border border-gray-100 hover:border-blue-200 hover:shadow-lg"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="relative mb-4">
                    <div className="animate-float relative bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <Upload className="text-blue-600 w-8 h-8" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">It's empty here</h3>
                  <p className="text-gray-500 text-sm mb-4">Upload a PDF to start reading.</p>
                  <button className="bg-[#073642] text-[#fdf6e3] px-6 py-2 rounded-full text-sm font-bold hover:bg-[#002b36] transition-colors">Import Book</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                  {/* Upload Button as First Item - Smaller */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[2/3] rounded-xl bg-[#E5E5EA] border border-dashed border-[#d2d2d7] hover:border-[#0071e3] hover:bg-[#0071e3]/5 transition-all group flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-[#86868b] group-hover:text-[#0071e3] transition-colors">
                      <Plus size={20} />
                    </div>
                    <span className="text-[11px] font-semibold text-[#86868b] group-hover:text-[#0071e3] uppercase tracking-wide">Add Book</span>
                  </button>

                  {myLibrary.map((book) => (
                    <BookCard key={book.id} book={book} onClick={() => openBookDetails(book)} onRead={() => openReader(book)} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

      </main>

      {/* Floating Glass Dock - iOS Style (Compact) */}
      {view !== 'reader' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-12 duration-1000 ease-out">
          <div className="flex items-center gap-1 p-1.5 px-3 rounded-[20px] shadow-[0_12px_32px_rgba(0,0,0,0.08)] bg-white/80 backdrop-blur-xl border border-white/40 ring-1 ring-black/5 scale-90 origin-bottom">
            <DockItem icon={Home} label="Library" isActive={view === 'library' && activeMode === 'library'} onClick={() => { setView('library'); setActiveMode('library'); }} />
            <DockItem icon={Sparkles} label="Concierge" isActive={view === 'library' && activeMode === 'mood'} onClick={() => { setView('library'); setActiveMode('mood'); }} />
            <DockItem icon={Search} label="Search" isActive={view === 'library' && activeMode === 'search'} onClick={() => { setView('library'); setActiveMode('search'); }} />
            <DockItem icon={UserIcon} label="Profile" isActive={view === 'profile'} onClick={() => { setView('profile'); }} />
          </div>
        </div>
      )}

      {/* Overlays */}
      {view === 'details' && activeBook && (
        <BookDetail book={activeBook} onClose={closeOverlay} onRead={() => openReader(activeBook)} />
      )}

      {view === 'reader' && activeBook && (
        <div className="fixed inset-0 z-50">
          <Reader book={activeBook} onClose={closeOverlay} onReward={handleReward} onUpdateBookData={updateBookData} />
        </div>
      )}
    </div>
  );
}