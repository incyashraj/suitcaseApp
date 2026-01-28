import React, { useEffect, useState, useRef } from 'react';
import { Book, Review } from '../types';
import { generateReviews, chatAboutBook } from '../services/aiProviderService';
import { X, Star, BookOpen, Clock, Calendar, User, Share2, Sparkles, Send, Loader2, Quote } from 'lucide-react';

interface BookDetailProps {
  book: Book;
  onClose: () => void;
  onRead: () => void;
}

export const BookDetail: React.FC<BookDetailProps> = ({ book, onClose, onRead }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [activeTab, setActiveTab] = useState<'reviews' | 'details' | 'chat'>('reviews');

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoadingReviews(true);
      const generatedReviews = await generateReviews(book.title, book.author);
      setReviews(generatedReviews);
      setLoadingReviews(false);
    };

    if (activeTab === 'reviews' && reviews.length === 0) {
      fetchReviews();
    }
  }, [book, activeTab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');
    const newHistory = [...chatHistory, { role: 'user' as const, text: userMsg }];
    setChatHistory(newHistory);
    setIsChatting(true);

    try {
      const response = await chatAboutBook(book.title, userMsg, newHistory);
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-spring">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-[#FBFBFD] h-[85vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-[scale-up_0.4s_cubic-bezier(0.16,1,0.3,1)]">

        {/* Left Panel: Visuals & Key Info */}
        <div className="w-full md:w-1/3 bg-white border-r border-gray-100 flex flex-col">
          <div className="relative h-64 md:h-1/2 w-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: book.coverColor }}>
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full backdrop-blur-lg transition-colors z-10 md:hidden"
            >
              <X size={20} />
            </button>
            <BookOpen className="text-white/80 w-24 h-24 drop-shadow-lg transform hover:scale-105 transition-transform duration-700" />
            {book.matchReason && (
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/90 backdrop-blur p-4 rounded-2xl shadow-lg border border-white/50">
                  <p className="text-[10px] uppercase font-bold text-blue-600 mb-1 flex items-center gap-1">
                    <Sparkles size={10} /> Why this book?
                  </p>
                  <p className="text-xs text-gray-700 font-medium leading-relaxed">
                    "{book.matchReason}"
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-8 flex flex-col flex-1 bg-white">
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2 leading-tight">{book.title}</h2>
            <p className="text-lg text-gray-500 font-medium mb-6">{book.author}</p>

            <div className="mt-auto space-y-3">
              <button
                onClick={onRead}
                className="w-full bg-[#1D1D1F] text-white py-4 rounded-2xl font-semibold hover:bg-black transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg"
              >
                <BookOpen size={18} />
                Read
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Content */}
        <div className="flex-1 flex flex-col bg-[#F5F5F7]">
          {/* Header & Tabs */}
          <div className="p-6 md:p-8 pb-0 shrink-0">
            <div className="flex justify-between items-start mb-6">
              <div className="flex bg-gray-200/50 p-1 rounded-full relative">
                {(['reviews', 'details', 'chat'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 relative z-10 ${activeTab === tab
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              <button onClick={onClose} className="hidden md:block p-2 text-gray-400 hover:text-gray-900 bg-white rounded-full shadow-sm hover:shadow transition-all">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8">

            {activeTab === 'reviews' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Critics & Readers</h3>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-white px-3 py-1.5 rounded-full shadow-sm">
                    <Sparkles size={12} className="text-blue-500" /> Smart Summary
                  </div>
                </div>

                {book.reviewSnippet && (
                  <div className="mb-8 p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50">
                    <Quote className="text-blue-200 mb-2 w-8 h-8" />
                    <p className="text-lg font-serif text-gray-800 italic leading-relaxed">
                      {book.reviewSnippet}
                    </p>
                  </div>
                )}

                {loadingReviews ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="animate-spin text-gray-400 w-8 h-8 mb-4" />
                    <p className="text-gray-400 text-sm">Aggregating reviews...</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="bg-white p-6 rounded-3xl shadow-sm border border-white hover:border-blue-100 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                            style={{ backgroundColor: review.avatarColor }}
                          >
                            {review.reviewerName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{review.reviewerName}</p>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(i => (
                                <Star key={i} size={10} className={`${i <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                              ))}
                            </div>
                          </div>
                          <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{review.date}</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          "{review.text}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Synopsis</h3>
                  <p className="text-gray-700 leading-loose font-serif text-lg">
                    {book.description || "No description provided."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-3xl shadow-sm">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Calendar size={18} />
                      <span className="text-xs font-bold uppercase tracking-wider">Published</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{book.publishedYear || 'Unknown'}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <User size={18} />
                      <span className="text-xs font-bold uppercase tracking-wider">Rights</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">Public Domain</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {book.categories.map(cat => (
                      <span key={cat} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-full text-sm font-medium shadow-sm">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 min-h-[300px]">
                  {chatHistory.length === 0 && (
                    <div className="text-center py-12">
                      <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-blue-500" />
                      </div>
                      <h4 className="text-gray-900 font-bold text-lg mb-1">Book Companion</h4>
                      <p className="text-gray-500 text-sm">Ask about themes, characters, or plot points.</p>
                    </div>
                  )}
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                        }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isChatting && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-bl-sm shadow-sm">
                        <Loader2 size={16} className="animate-spin text-gray-400" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleChatSubmit} className="relative mt-auto">
                  <input
                    type="text"
                    placeholder="Ask a question..."
                    className="w-full pl-6 pr-14 py-4 bg-white border-0 shadow-lg shadow-gray-200/50 rounded-full focus:ring-2 focus:ring-blue-500 outline-none text-base font-medium placeholder:text-gray-400 transition-all"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isChatting}
                    className="absolute right-2 top-2 p-2.5 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-90"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};