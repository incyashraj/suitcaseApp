import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2, Maximize2, Minimize2, Highlighter, MessageSquare, Globe, Search, BookOpen, PenTool, CheckCircle, Gift, Send, X, StickyNote, FileText, RefreshCw, Sparkles, ChevronRight, ChevronLeft, Eye, Book as BookIcon } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Book, Note, Highlight } from '../types';
import { chatAboutBook, translateText, explainContext, generateBookContent, getBookSummary, getBookRecap } from '../services/geminiService';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface ReaderProps {
  book: Book;
  onClose: () => void;
  onReward?: () => void;
  onUpdateBookData: (bookId: string, data: Partial<Book>) => void;
}

export const Reader: React.FC<ReaderProps> = ({ book, onClose, onReward, onUpdateBookData }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Reading Mode State (Only for cloud books)
  const [mode, setMode] = useState<'selecting' | 'preview' | 'complete'>(book.isLocal ? 'complete' : 'selecting');
  const [currentChapter, setCurrentChapter] = useState(book.currentChapter || 1);

  // Tools State
  const [selection, setSelection] = useState<{text: string, top: number, left: number} | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>(book.userHighlights || []);
  const [notes, setNotes] = useState<Note[]>(book.userNotes || []);
  const [activeSidebar, setActiveSidebar] = useState<'chat' | 'notes' | null>(null);
  
  // Note Input State
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  
  // Interaction State
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [contextPopup, setContextPopup] = useState<{text: string, type: 'translation' | 'explanation'} | null>(null);

  // Finishing Flow
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [authorNote, setAuthorNote] = useState('');
  const [showReward, setShowReward] = useState(false);

  // PDF State
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const pdfRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // Text selection handler
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      // Check if selection is within PDF
      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;
      const pdfElement = pdfRef.current?.querySelector('.react-pdf__Page');
      if (pdfElement && pdfElement.contains(commonAncestor as Node)) {
        const rect = range.getBoundingClientRect();
        if (pdfRef.current) {
          const containerRect = pdfRef.current.getBoundingClientRect();
          setSelection({
            text: selection.toString(),
            top: rect.top - containerRect.top + pdfRef.current.scrollTop,
            left: rect.left - containerRect.left
          });
        }
      }
    } else {
      setSelection(null);
    }
  };

  // Listen for text selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      handleTextSelection();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // Sync highlights/notes to backend
  useEffect(() => {
    onUpdateBookData(book.id, {
        userNotes: notes,
        userHighlights: highlights,
        lastReadDate: Date.now(),
        currentChapter: currentChapter
    });
  }, [notes, highlights, currentChapter]);

  // Load Content based on Mode and Chapter
  const loadContent = async (chapter: number) => {
    setLoading(true);
    if (book.isLocal && book.fileUrl) {
      setLoading(false);
    } else {
      // For cloud books, check if we already have content for this session/mode
      // If switching chapters, we must fetch new content
      const text = await generateBookContent(book.title, book.author, chapter);
      const markedText = applyHighlightsToText(text, highlights);
      setContent(markedText);
      setLoading(false);
    }
  };

  // Initial Load (skip mode selection if data exists)
  useEffect(() => {
    if (book.isLocal) {
        setMode('complete');
        setLoading(false);
    } else if (book.content && book.currentChapter) {
        // Resume previous session
        setMode('complete');
        setContent(applyHighlightsToText(book.content, highlights));
        setLoading(false);
    }
    // Else wait for user to select mode
  }, []);

  const handleModeSelect = (selectedMode: 'preview' | 'complete') => {
      setMode(selectedMode);
      if (selectedMode === 'preview') {
          // Just load chapter 1 as a "preview" effectively
          loadContent(1);
      } else {
          loadContent(currentChapter);
      }
  };

  const handleNextChapter = () => {
      const next = currentChapter + 1;
      setCurrentChapter(next);
      loadContent(next);
      window.scrollTo(0,0);
  };

  const handlePrevChapter = () => {
      if(currentChapter > 1) {
          const prev = currentChapter - 1;
          setCurrentChapter(prev);
          loadContent(prev);
          window.scrollTo(0,0);
      }
  };

  // Helper to re-apply highlights to HTML string
  const applyHighlightsToText = (html: string, highlightsToApply: Highlight[]) => {
      let markedText = html;
      highlightsToApply.forEach(h => {
           if(markedText.includes(h.text)) {
               markedText = markedText.replace(h.text, `<mark style="background-color: ${h.color}; color: black; border-radius: 2px; padding: 2px 0;">${h.text}</mark>`);
           }
      });
      return markedText;
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Text Selection Handler
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().length > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      if(activeSidebar) return;

      setSelection({
        text: sel.toString(),
        top: rect.top + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX
      });
      setShowNoteInput(false); 
      setContextPopup(null);
    } else if (!showNoteInput) {
       setSelection(null);
    }
  };

  // IMPORTANT: Prevents the toolbar buttons from clearing selection on click
  const preventSelectionLoss = (e: React.MouseEvent) => {
      e.preventDefault();
  };

  // Tools Logic
  const addHighlight = (color: string) => {
    if (selection) {
      const newHighlight = { id: Date.now().toString(), text: selection.text, color };
      setHighlights(prev => [...prev, newHighlight]);
      
      // Immediate DOM update
      setContent(prev => prev.replace(selection.text, `<mark style="background-color: ${color}; color: black; border-radius: 2px; padding: 2px 0;">${selection.text}</mark>`));
      
      setSelection(null);
      if (window.getSelection) { window.getSelection()?.removeAllRanges(); }
    }
  };

  const handleTranslate = async () => {
    if (!selection) return;
    setContextPopup({ text: "Translating...", type: 'translation' });
    const textToTranslate = selection.text;
    setSelection(null); 
    const res = await translateText(textToTranslate);
    setContextPopup({ text: res, type: 'translation' });
  };

  const handleExplain = async () => {
    if (!selection) return;
    setContextPopup({ text: "Analyzing context...", type: 'explanation' });
    const textToExplain = selection.text;
    setSelection(null);
    const res = await explainContext(textToExplain, book.title);
    setContextPopup({ text: res, type: 'explanation' });
  };

  const handleGoogleSearch = () => {
    if (!selection) return;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(selection.text)}`, '_blank');
    setSelection(null);
  };
  
  const handleAddNoteClick = () => {
      setShowNoteInput(true);
  };

  const submitNote = () => {
      if(selection && noteInput) {
          const newNote: Note = {
              id: Date.now().toString(),
              text: noteInput,
              selectedText: selection.text,
              createdAt: Date.now()
          };
          setNotes(prev => [...prev, newNote]);
          setNoteInput('');
          setShowNoteInput(false);
          setSelection(null);
          setActiveSidebar('notes');
      }
  };

  // Chat Logic
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setIsProcessing(true);
    const res = await chatAboutBook(book.title, msg, chatHistory);
    setChatHistory(prev => [...prev, { role: 'model', text: res }]);
    setIsProcessing(false);
  };

  // Quick Actions
  const handleAction = async (action: 'summarize' | 'recap') => {
      setActiveSidebar('chat');
      setIsProcessing(true);
      let res = '';
      if(action === 'summarize') {
          setChatHistory(prev => [...prev, {role: 'user', text: 'Summarize this book.'}]);
          res = await getBookSummary(book.title);
      } else {
          setChatHistory(prev => [...prev, {role: 'user', text: 'Where was I? Recap the context.'}]);
          res = await getBookRecap(book.title);
      }
      setChatHistory(prev => [...prev, { role: 'model', text: res }]);
      setIsProcessing(false);
  };

  // Finish Flow
  const handleFinishBook = () => {
    setShowFinishModal(true);
  };

  const submitToAuthor = () => {
    setShowFinishModal(false);
    onUpdateBookData(book.id, { isFinished: true }); 
    setShowReward(true);
    if (onReward) onReward();
  };

  // Mode Selection Screen
  if (mode === 'selecting' && !book.isLocal) {
      return (
          <div className="fixed inset-0 z-50 bg-[#F5F5F7] flex items-center justify-center p-4">
              <div className="max-w-2xl w-full bg-white rounded-[2rem] p-8 shadow-2xl animate-spring">
                  <div className="text-center mb-8">
                      <BookIcon size={48} className="mx-auto text-blue-500 mb-4" />
                      <h2 className="text-3xl font-serif font-bold mb-2">How would you like to read?</h2>
                      <p className="text-gray-500">Choose your reading experience for "{book.title}".</p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                      <button 
                        onClick={() => handleModeSelect('preview')}
                        className="p-6 rounded-3xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                      >
                          <Eye size={24} className="text-gray-400 group-hover:text-blue-500 mb-4" />
                          <h3 className="font-bold text-lg mb-1">Quick Preview</h3>
                          <p className="text-sm text-gray-500">Read a generated summary and excerpt to see if it's your vibe.</p>
                      </button>

                      <button 
                        onClick={() => handleModeSelect('complete')}
                        className="p-6 rounded-3xl border-2 border-black bg-black text-white hover:scale-[1.02] transition-all text-left"
                      >
                          <BookOpen size={24} className="text-white mb-4" />
                          <h3 className="font-bold text-lg mb-1">Read Complete Book</h3>
                          <p className="text-sm text-gray-400">Read the full book chapter by chapter with AI generation.</p>
                      </button>
                  </div>
                  
                  <button onClick={onClose} className="mt-8 mx-auto block text-sm font-bold text-gray-400 hover:text-gray-900">
                      Cancel
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-[#F5F5F7] text-gray-900 animate-in fade-in duration-300 overflow-hidden font-serif">
      
      {/* 1. Main Content Area */}
      <div className={`flex-1 flex flex-col relative transition-all duration-500 ${activeSidebar ? 'mr-96' : ''}`}>
         
         {/* Top Bar */}
         <div className="h-16 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md border-b border-gray-200 z-20">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="text-center">
              <h1 className="text-sm font-bold">{book.title}</h1>
              <p className="text-xs text-gray-500">
                  {book.author} 
                  {mode === 'complete' && !book.isLocal && <span className="ml-2 bg-gray-100 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">CH {currentChapter}</span>}
              </p>
            </div>
            <div className="flex gap-2">
               <button onClick={toggleFullscreen} className="p-2 hover:bg-gray-100 rounded-full">
                  {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
               </button>
            </div>
         </div>

         {/* Content */}
         <div className="flex-1 overflow-y-auto p-8 md:p-16 relative scroll-smooth" onMouseUp={handleMouseUp}>
            {loading ? (
               <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Loader2 className="animate-spin text-gray-400" />
                  <p className="text-sm text-gray-400">Loading {mode === 'complete' ? `Chapter ${currentChapter}` : 'Preview'}...</p>
               </div>
            ) : book.isLocal && !book.fileUrl ? (
                // Handling refreshed local file case (blob url expired)
                <div className="flex flex-col items-center justify-center h-full text-center">
                   <div className="bg-gray-100 p-6 rounded-full mb-4">
                       <FileText size={32} className="text-gray-400" />
                   </div>
                   <h3 className="text-lg font-bold mb-2">File Content Missing</h3>
                   <p className="text-gray-500 max-w-sm">
                       This is a local file. For security reasons, the browser does not persist the PDF content after a reload. Please re-upload to read again.
                   </p>
                </div>
            ) : book.isLocal && book.fileUrl ? (
               <div className="w-full h-full rounded-2xl shadow-sm overflow-auto">
                 <Document
                   ref={pdfRef}
                   file={book.fileUrl}
                   onLoadSuccess={onDocumentLoadSuccess}
                   loading={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" size={24} /></div>}
                   error={<div className="flex items-center justify-center h-full text-red-500">Failed to load PDF</div>}
                 >
                   <Page 
                     pageNumber={pageNumber} 
                     renderTextLayer={true}
                     renderAnnotationLayer={false}
                     onMouseUp={handleTextSelection}
                     className="shadow-lg"
                   />
                 </Document>
                 {numPages && (
                   <div className="flex items-center justify-center gap-4 mt-4 p-4 bg-white rounded-lg shadow-sm">
                     <button 
                       onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                       disabled={pageNumber <= 1}
                       className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                     >
                       <ChevronLeft size={20} />
                     </button>
                     <span className="text-sm font-medium">
                       Page {pageNumber} of {numPages}
                     </span>
                     <button 
                       onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                       disabled={pageNumber >= numPages}
                       className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                     >
                       <ChevronRight size={20} />
                     </button>
                   </div>
                 )}
               </div>
            ) : (
               <div className="max-w-2xl mx-auto bg-white p-12 shadow-sm rounded-[2px] min-h-full leading-loose text-lg text-gray-800 selection:bg-blue-100 selection:text-blue-900 pb-32">
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                  
                  {/* Chapter Navigation for Cloud Books */}
                  {mode === 'complete' && (
                      <div className="mt-16 pt-8 border-t border-gray-100 flex items-center justify-between">
                          <button 
                            onClick={handlePrevChapter}
                            disabled={currentChapter <= 1}
                            className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                              <ChevronLeft size={16} /> Previous
                          </button>
                          
                          <button 
                            onClick={handleNextChapter}
                            className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-full text-sm font-bold hover:scale-105 transition-transform"
                          >
                              Next Chapter <ChevronRight size={16} />
                          </button>
                      </div>
                  )}

                  {mode === 'preview' && (
                      <div className="mt-8 pt-8 border-t border-gray-100 text-center text-xs text-gray-400 italic">
                          This is an AI-generated preview. Switch to "Complete Book" mode to read more.
                      </div>
                  )}
               </div>
            )}

            {/* Selection Context Menu - Tooltip */}
            {selection && !showNoteInput && (
               <div 
                 className="fixed z-50 bg-gray-900/90 backdrop-blur-xl text-white rounded-xl shadow-2xl flex items-center gap-1 p-1 animate-in zoom-in-95 duration-200"
                 style={{ top: selection.top - 60, left: selection.left - 180 }}
                 onMouseDown={preventSelectionLoss} // Critical fix for buttons
               >
                  <button onClick={() => addHighlight('#fef08a')} className="p-3 hover:bg-white/20 rounded-lg group tooltip-container relative">
                     <Highlighter size={16} className="text-yellow-300" />
                  </button>
                  <div className="w-px h-4 bg-white/20"></div>
                  <button onClick={handleAddNoteClick} className="p-3 hover:bg-white/20 rounded-lg">
                     <StickyNote size={16} className="text-pink-300" />
                  </button>
                  <div className="w-px h-4 bg-white/20"></div>
                  <button onClick={handleTranslate} className="p-3 hover:bg-white/20 rounded-lg text-xs font-bold flex items-center gap-1">
                     <Globe size={14} /> Translate
                  </button>
                  <div className="w-px h-4 bg-white/20"></div>
                  <button onClick={handleExplain} className="p-3 hover:bg-white/20 rounded-lg text-xs font-bold flex items-center gap-1">
                     <BookOpen size={14} /> Explain
                  </button>
                  <div className="w-px h-4 bg-white/20"></div>
                  <button onClick={handleGoogleSearch} className="p-3 hover:bg-white/20 rounded-lg">
                     <Search size={16} />
                  </button>
               </div>
            )}

            {/* Note Input Popover */}
            {showNoteInput && selection && (
                <div 
                  className="fixed z-50 bg-white rounded-2xl shadow-2xl p-4 w-72 animate-in zoom-in-95 duration-200 border border-gray-100"
                  style={{ top: selection.top - 120, left: selection.left - 144 }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                    <textarea 
                      className="w-full bg-yellow-50 p-3 rounded-xl text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-yellow-200"
                      placeholder="Add your note here..."
                      rows={3}
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowNoteInput(false)} className="text-xs font-bold text-gray-400 px-3 py-1.5 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button onClick={submitNote} className="text-xs font-bold bg-black text-white px-3 py-1.5 rounded-lg">Save Note</button>
                    </div>
                </div>
            )}

            {/* Context Popup (Explanation/Translation) */}
            {contextPopup && (
               <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in slide-in-from-bottom-4 z-40 border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                     <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                        {contextPopup.type === 'translation' ? 'Translation' : 'Context & Analysis'}
                     </span>
                     <button onClick={() => setContextPopup(null)}><X size={16} className="text-gray-400 hover:text-gray-900" /></button>
                  </div>
                  <p className="text-gray-800 leading-relaxed font-serif text-lg">{contextPopup.text}</p>
               </div>
            )}
         </div>

         {/* Bottom Dynamic Toolbar */}
         <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-white shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 z-30 hover:scale-105 transition-transform">
            <button 
               onClick={() => setActiveSidebar(activeSidebar === 'chat' ? null : 'chat')}
               className={`flex items-center gap-2 text-sm font-bold ${activeSidebar === 'chat' ? 'text-blue-600' : 'text-gray-600'}`}
            >
               <MessageSquare size={18} />
               Ask Companion
            </button>
            <div className="w-px h-6 bg-gray-300"></div>
            <button 
               onClick={() => setActiveSidebar(activeSidebar === 'notes' ? null : 'notes')}
               className={`flex items-center gap-2 text-sm font-bold ${activeSidebar === 'notes' ? 'text-blue-600' : 'text-gray-600'}`}
            >
               <PenTool size={18} />
               Notes ({notes.length})
            </button>
            <div className="w-px h-6 bg-gray-300"></div>
            <button 
               onClick={handleFinishBook}
               className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900"
            >
               <CheckCircle size={18} />
               Finish
            </button>
         </div>
      </div>

      {/* 2. Sidebars */}
      <div className={`fixed top-0 right-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-500 z-40 ${activeSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
         
         {/* CHAT SIDEBAR */}
         {activeSidebar === 'chat' && (
            <div className="flex flex-col h-full">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-bold text-lg flex items-center gap-2"><Sparkles size={18} className="text-blue-500"/> Reading Companion</h3>
                  <button onClick={() => setActiveSidebar(null)}><X size={20} className="text-gray-400 hover:text-gray-900" /></button>
               </div>

               {/* Quick Actions */}
               <div className="p-4 flex gap-2 overflow-x-auto border-b border-gray-50">
                   <button onClick={() => handleAction('summarize')} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-100 whitespace-nowrap">
                       <FileText size={12}/> Summarize
                   </button>
                   <button onClick={() => handleAction('recap')} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-full text-xs font-bold hover:bg-purple-100 whitespace-nowrap">
                       <RefreshCw size={12}/> Where was I?
                   </button>
               </div>

               <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                  {chatHistory.length === 0 && (
                      <div className="text-center mt-10 text-gray-400">
                          <MessageSquare size={32} className="mx-auto mb-2 opacity-20"/>
                          <p className="text-sm">Ask anything about the book.</p>
                      </div>
                  )}
                  {chatHistory.map((msg, i) => (
                     <div key={i} className={`p-3 rounded-xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-black text-white ml-8 rounded-br-none' : 'bg-gray-100 text-gray-800 mr-8 rounded-bl-none'}`}>
                        {msg.text}
                     </div>
                  ))}
                  {isProcessing && <div className="p-3 bg-gray-50 rounded-xl w-12"><Loader2 size={16} className="animate-spin text-gray-400"/></div>}
               </div>
               <form onSubmit={handleChatSubmit} className="p-4 bg-white border-t border-gray-100">
                  <div className="relative">
                     <input 
                       value={chatInput}
                       onChange={e => setChatInput(e.target.value)}
                       placeholder="Ask about the plot..."
                       className="w-full bg-gray-100 rounded-full px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                     />
                     <button type="submit" className="absolute right-2 top-2 p-1.5 bg-blue-500 text-white rounded-full hover:scale-105 transition-transform"><Send size={14} /></button>
                  </div>
               </form>
            </div>
         )}

         {/* NOTES SIDEBAR */}
         {activeSidebar === 'notes' && (
            <div className="flex flex-col h-full">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-bold text-lg flex items-center gap-2"><StickyNote size={18} className="text-pink-500"/> My Notes</h3>
                  <button onClick={() => setActiveSidebar(null)}><X size={20} className="text-gray-400 hover:text-gray-900" /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-6">
                   {notes.length === 0 ? (
                       <div className="text-center mt-20 opacity-50">
                           <PenTool size={48} className="mx-auto mb-4 text-gray-300"/>
                           <p className="text-gray-500 font-medium">No notes yet.</p>
                           <p className="text-xs text-gray-400 mt-1">Select text to add a note.</p>
                       </div>
                   ) : (
                       notes.map(note => (
                           <div key={note.id} className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100/50 shadow-sm">
                               <div className="text-xs font-bold text-yellow-600/70 uppercase tracking-wider mb-2 flex items-center gap-1">
                                   <StickyNote size={10}/> Note
                               </div>
                               <p className="text-gray-900 font-medium text-sm mb-3 font-serif">"{note.text}"</p>
                               {note.selectedText && (
                                   <div className="pl-3 border-l-2 border-yellow-200">
                                       <p className="text-xs text-gray-500 italic line-clamp-2">Re: "{note.selectedText}"</p>
                                   </div>
                               )}
                               <p className="text-[10px] text-right text-gray-400 mt-2">
                                   {new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                               </p>
                           </div>
                       ))
                   )}
               </div>
            </div>
         )}
      </div>

      {/* 3. Finish & Rewards Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl animate-spring">
              <h2 className="text-3xl font-serif font-bold text-center mb-2">Congratulations!</h2>
              <p className="text-center text-gray-500 mb-8">You've finished {book.title}.</p>
              
              <div className="mb-6">
                 <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Leave a note for the author</label>
                 <textarea 
                   className="w-full bg-gray-50 rounded-2xl p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 h-32 resize-none"
                   placeholder="Your thoughts meant the world..."
                   value={authorNote}
                   onChange={e => setAuthorNote(e.target.value)}
                 />
              </div>

              <button 
                onClick={submitToAuthor}
                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                Send & Claim Reward <Gift size={18} />
              </button>
           </div>
        </div>
      )}

      {/* 4. NFT Reward Animation Overlay */}
      {showReward && (
         <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 text-white animate-in fade-in duration-500">
            <div className="relative mb-8 animate-[spin_10s_linear_infinite]">
               <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400 to-purple-500 blur-3xl opacity-50 rounded-full"></div>
               <div className="relative w-64 h-80 bg-gray-800 rounded-xl overflow-hidden border-2 border-yellow-500/50 shadow-[0_0_50px_rgba(234,179,8,0.3)]">
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: book.coverColor }}>
                     <BookOpen size={64} className="text-white/50" />
                  </div>
               </div>
            </div>
            <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">NFT Minted!</h1>
            <p className="text-gray-400 mb-8">You earned 50 Suitcase Tokens (SCT)</p>
            <button onClick={() => { setShowReward(false); onClose(); }} className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors">
               Add to Wallet
            </button>
         </div>
      )}

    </div>
  );
};