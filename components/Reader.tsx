import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2, Maximize2, Minimize2, Highlighter, MessageSquare, Globe, Search, BookOpen, PenTool, CheckCircle, Gift, Send, X, StickyNote, FileText, RefreshCw, Sparkles, ChevronRight, ChevronLeft, Eye, Book as BookIcon, List, Navigation } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Book, Note, Highlight } from '../types';
import { chatAboutBook, translateText, explainContext, generateBookContent, getBookSummary, getBookRecap } from '../services/aiProviderService';

// Configure PDF.js worker - using cdnjs for proper CORS support
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
  const [selection, setSelection] = useState<{ text: string, top: number, left: number } | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>(book.userHighlights || []);
  const [notes, setNotes] = useState<Note[]>(book.userNotes || []);
  const [activeSidebar, setActiveSidebar] = useState<'chat' | 'notes' | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');

  // Note Input State
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteInput, setNoteInput] = useState('');

  // Interaction State
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [contextPopup, setContextPopup] = useState<{ text: string, type: 'translation' | 'explanation', top?: number, left?: number } | null>(null);

  // Finishing Flow
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [authorNote, setAuthorNote] = useState('');
  const [showReward, setShowReward] = useState(false);

  // PDF State
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(book.lastPage || 1);
  const [pageInput, setPageInput] = useState('');
  const [showPageJump, setShowPageJump] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Chapter Navigation State
  const [showChapterJump, setShowChapterJump] = useState(false);
  const [chapterInput, setChapterInput] = useState('');

  // Table of Contents State
  const [showTOC, setShowTOC] = useState(false);
  const [tableOfContents] = useState<{ chapter: number; title: string; }[]>([
    { chapter: 1, title: 'The Beginning' },
    { chapter: 2, title: 'Rising Action' },
    { chapter: 3, title: 'Complications' },
    { chapter: 4, title: 'The Turning Point' },
    { chapter: 5, title: 'Falling Action' },
    { chapter: 6, title: 'Resolution' },
    { chapter: 7, title: 'Epilogue' },
  ]);

  // AI Navigation State
  const [showAINav, setShowAINav] = useState(false);
  const [aiNavInput, setAINavInput] = useState('');
  const [aiNavLoading, setAINavLoading] = useState(false);
  const [aiNavResult, setAINavResult] = useState<{ chapter: number; description: string } | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    // Resume from saved page
    if (book.lastPage && book.lastPage <= numPages) {
      setPageNumber(book.lastPage);
    }
  }

  // Handle mouse up for text selection - ONLY trigger when mouse is released
  const handleMouseUp = (e: React.MouseEvent) => {
    // Check if the click target is part of the toolbar or note input - if so, ignore
    if ((e.target as HTMLElement).closest('.selection-toolbar') ||
      (e.target as HTMLElement).closest('.note-input')) {
      return;
    }

    // Small delay to let browser complete selection
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : '';

      if (text.length > 0) {
        const range = sel!.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        console.log('Selection detected:', text.substring(0, 50) + '...');

        setSelectedText(text);
        setSelection({
          text: text,
          top: rect.bottom + 10,
          left: rect.left + (rect.width / 2)
        });
        setShowNoteInput(false);
        setContextPopup(null);
      } else if (!showNoteInput) {
        // Explicitly clear if no text is selected and not writing a note
        setSelection(null);
        setSelectedText('');
        setContextPopup(null);
      }
    }, 10);
  };

  // Handle click to clear selection (but not on toolbar)
  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't clear if clicking on toolbar or its children
    if (target.closest('.selection-toolbar') || target.closest('.note-input')) {
      return;
    }
    // Only clear if there's no active selection
    const sel = window.getSelection();
    if (!sel || sel.toString().trim().length === 0) {
      if (selection && !showNoteInput) {
        setSelection(null);
        setSelectedText('');
      }
    }
  };

  // Sync highlights/notes/position to backend
  useEffect(() => {
    onUpdateBookData(book.id, {
      userNotes: notes,
      userHighlights: highlights,
      lastReadDate: Date.now(),
      currentChapter: currentChapter,
      lastPage: pageNumber
    });
  }, [notes, highlights, currentChapter, pageNumber]);

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

  // Initial Load - auto-start reading
  useEffect(() => {
    if (book.isLocal) {
      setMode('complete');
      setLoading(false);
    } else if (book.content && book.currentChapter) {
      // Resume previous session
      setMode('complete');
      setContent(applyHighlightsToText(book.content, highlights));
      setCurrentChapter(book.currentChapter || 1);
      setLoading(false);
    } else {
      // Auto-start from beginning (skip mode selection)
      setMode('complete');
      loadContent(book.currentChapter || 1);
    }
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
    window.scrollTo(0, 0);
  };

  const handlePrevChapter = () => {
    if (currentChapter > 1) {
      const prev = currentChapter - 1;
      setCurrentChapter(prev);
      loadContent(prev);
      window.scrollTo(0, 0);
    }
  };

  // Helper to re-apply highlights to HTML string
  const applyHighlightsToText = (html: string, highlightsToApply: Highlight[]) => {
    let markedText = html;
    highlightsToApply.forEach(h => {
      if (markedText.includes(h.text)) {
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

  // AI Navigation - "Take me to where X happens"
  const handleAINavigation = async () => {
    if (!aiNavInput.trim()) return;

    setAINavLoading(true);
    setAINavResult(null);

    try {
      // Ask AI to find the chapter based on user's description
      const prompt = `I'm reading "${book.title}" by ${book.author}. The user wants to go to: "${aiNavInput}". 
      Based on typical book structure, which chapter (1-7) would most likely contain this part of the story?
      Respond with ONLY a JSON object: {"chapter": <number>, "description": "<brief explanation of what happens in that section>"}`;

      const response = await chatAboutBook(book.title, prompt, []);

      // Try to parse the JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        setAINavResult({
          chapter: result.chapter || 1,
          description: result.description || 'Found a matching section'
        });
      } else {
        // Fallback: assume chapter 3-5 for main events
        setAINavResult({
          chapter: 4,
          description: 'Based on your description, this might be in the middle chapters of the book.'
        });
      }
    } catch (error) {
      console.error('AI Navigation error:', error);
      setAINavResult({
        chapter: 4,
        description: 'I found a section that might match your description.'
      });
    }

    setAINavLoading(false);
  };

  // Navigate to AI suggested chapter
  const goToAIChapter = () => {
    if (aiNavResult) {
      setCurrentChapter(aiNavResult.chapter);
      loadContent(aiNavResult.chapter);
      setShowAINav(false);
      setAINavInput('');
      setAINavResult(null);
    }
  };

  // IMPORTANT: Prevents the toolbar buttons from clearing selection on click
  const preventSelectionLoss = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Tools Logic
  const addHighlight = (color: string) => {
    if (selection && selection.text) {
      const textToHighlight = selection.text;
      const newHighlight = { id: Date.now().toString(), text: textToHighlight, color };
      setHighlights(prev => [...prev, newHighlight]);

      // Immediate DOM update for cloud books
      if (!book.isLocal) {
        setContent(prev => prev.replace(
          textToHighlight,
          `<mark style="background-color: ${color}; color: inherit; border-radius: 2px; padding: 0 2px;">${textToHighlight}</mark>`
        ));
      }

      // Clear selection
      setSelection(null);
      setSelectedText('');
      if (window.getSelection) { window.getSelection()?.removeAllRanges(); }
    }
  };

  const handleTranslate = async () => {
    if (!selection || !selection.text) return;
    const textToTranslate = selection.text;
    const { top, left } = selection;

    setContextPopup({ text: "Translating...", type: 'translation', top, left });
    setSelection(null);
    setSelectedText('');

    const res = await translateText(textToTranslate);
    setContextPopup({ text: res, type: 'translation', top, left });
  };

  const handleExplain = async () => {
    if (!selection || !selection.text) return;
    const textToExplain = selection.text;
    const { top, left } = selection;

    setContextPopup({ text: "Analyzing context...", type: 'explanation', top, left });
    setSelection(null);
    setSelectedText('');

    const res = await explainContext(textToExplain, book.title);
    setContextPopup({ text: res, type: 'explanation', top, left });
  };

  const handleGoogleSearch = () => {
    if (!selection || !selection.text) return;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(selection.text)}`, '_blank');
    setSelection(null);
    setSelectedText('');
  };

  const handleAddNoteClick = () => {
    setShowNoteInput(true);
  };

  const submitNote = () => {
    if (selection && selection.text && noteInput) {
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
    if (action === 'summarize') {
      setChatHistory(prev => [...prev, { role: 'user', text: 'Summarize this book.' }]);
      res = await getBookSummary(book.title);
    } else {
      setChatHistory(prev => [...prev, { role: 'user', text: 'Where was I? Recap the context.' }]);
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
    <div className="flex h-screen bg-[#F5F5F7] text-[#1d1d1f] animate-in fade-in duration-300 overflow-hidden font-sans">

      {/* 1. Main Content Area */}
      <div className={`flex-1 flex flex-col relative transition-all duration-500 ${activeSidebar ? 'mr-96' : ''}`}>

        {/* Top Bar - Minimal & Transparent */}
        <div className="h-16 flex items-center justify-between px-6 bg-white/70 backdrop-blur-xl border-b border-[#d2d2d7]/50 z-20">
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors text-[#1d1d1f]">
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
                ref={pdfContainerRef}
                file={book.fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" size={24} /></div>}
                error={<div className="flex items-center justify-center h-full text-red-500">Failed to load PDF</div>}
              >
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={true}
                  renderAnnotationLayer={false}
                  onMouseUp={handleMouseUp}
                  className="shadow-lg"
                />
              </Document>
              {numPages && (
                <div className="flex items-center justify-center gap-4 mt-4 p-4 bg-white rounded-2xl shadow-lg border border-gray-100">
                  <button
                    onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                    disabled={pageNumber <= 1}
                    className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  {/* Clickable page indicator with jump input */}
                  <div className="relative">
                    {showPageJump ? (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const page = parseInt(pageInput);
                        if (page >= 1 && page <= numPages) {
                          setPageNumber(page);
                        }
                        setShowPageJump(false);
                        setPageInput('');
                      }}>
                        <input
                          type="number"
                          value={pageInput}
                          onChange={(e) => setPageInput(e.target.value)}
                          placeholder={`1-${numPages}`}
                          className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                          onBlur={() => {
                            setShowPageJump(false);
                            setPageInput('');
                          }}
                          min={1}
                          max={numPages}
                        />
                      </form>
                    ) : (
                      <button
                        onClick={() => setShowPageJump(true)}
                        className="px-4 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        Page {pageNumber} of {numPages}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                    disabled={pageNumber >= numPages}
                    className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
                    title="Next page"
                  >
                    <ChevronRight size={20} />
                  </button>

                  {/* Quick jump buttons */}
                  <div className="border-l border-gray-200 pl-4 flex gap-2">
                    <button
                      onClick={() => setPageNumber(1)}
                      disabled={pageNumber === 1}
                      className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50"
                      title="Go to first page"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setPageNumber(numPages)}
                      disabled={pageNumber === numPages}
                      className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50"
                      title="Go to last page"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto bg-white p-12 shadow-sm rounded-[2px] min-h-full leading-loose text-lg text-gray-800 selection:bg-blue-100 selection:text-blue-900 pb-32">
              <div dangerouslySetInnerHTML={{ __html: content }} />

              {/* Chapter Navigation for Cloud Books */}
              {mode === 'complete' && (
                <div className="mt-16 pt-8 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handlePrevChapter}
                      disabled={currentChapter <= 1}
                      className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>

                    {/* Chapter Jump */}
                    <div className="flex items-center gap-3">
                      {showChapterJump ? (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const chapter = parseInt(chapterInput);
                          if (chapter >= 1) {
                            setCurrentChapter(chapter);
                            loadContent(chapter);
                          }
                          setShowChapterJump(false);
                          setChapterInput('');
                        }}>
                          <input
                            type="number"
                            value={chapterInput}
                            onChange={(e) => setChapterInput(e.target.value)}
                            placeholder="Chapter #"
                            className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onBlur={() => {
                              setShowChapterJump(false);
                              setChapterInput('');
                            }}
                            min={1}
                          />
                        </form>
                      ) : (
                        <button
                          onClick={() => setShowChapterJump(true)}
                          className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          Chapter {currentChapter}
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleNextChapter}
                      className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-full text-sm font-bold hover:scale-105 transition-transform"
                    >
                      Next Chapter <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {mode === 'preview' && (
                <div className="mt-8 pt-8 border-t border-gray-100 text-center text-xs text-gray-400 italic">
                  This is an AI-generated preview. Switch to "Complete Book" mode to read more.
                </div>
              )}
            </div>
          )}

          {/* Selection Context Menu - iOS Style Tooltip */}
          {selection && selectedText && !showNoteInput && (
            <div
              className="selection-toolbar fixed z-[100] bg-[#1d1d1f] text-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.16)] flex items-center gap-0.5 p-1 animate-in zoom-in-95 duration-200 font-sans"
              style={{
                top: Math.max(10, selection.top),
                left: Math.max(10, Math.min(window.innerWidth - 320, selection.left - 160)),
                transform: 'translateX(0)'
              }}
              onMouseDown={preventSelectionLoss}
            >
              <button
                onClick={() => addHighlight('#fef08a')}
                className="p-3 hover:bg-white/20 rounded-xl flex items-center gap-2 text-sm"
                title="Highlight"
              >
                <Highlighter size={18} className="text-yellow-300" />
                <span className="hidden sm:inline">Highlight</span>
              </button>
              <div className="w-px h-6 bg-white/20"></div>
              <button
                onClick={handleAddNoteClick}
                className="p-3 hover:bg-white/20 rounded-xl flex items-center gap-2 text-sm"
                title="Add Note"
              >
                <StickyNote size={18} className="text-pink-300" />
              </button>
              <div className="w-px h-6 bg-white/20"></div>
              <button
                onClick={handleTranslate}
                className="p-3 hover:bg-white/20 rounded-xl flex items-center gap-2 text-sm"
                title="Translate"
              >
                <Globe size={18} className="text-blue-300" />
              </button>
              <div className="w-px h-6 bg-white/20"></div>
              <button
                onClick={handleExplain}
                className="p-3 hover:bg-white/20 rounded-xl flex items-center gap-2 text-sm"
                title="Explain"
              >
                <BookOpen size={18} className="text-green-300" />
              </button>
              <div className="w-px h-6 bg-white/20"></div>
              <button
                onClick={handleGoogleSearch}
                className="p-3 hover:bg-white/20 rounded-xl"
                title="Search Google"
              >
                <Search size={18} className="text-gray-300" />
              </button>
            </div>
          )}

          {/* Note Input Popover */}
          {showNoteInput && selectedText && (
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

          {/* Context Popup (Explanation/Translation) - Clean Card */}
          {contextPopup && (
            <div
              style={{ top: contextPopup.top, left: contextPopup.left }}
              className="fixed z-[100] bg-white text-[#1d1d1f] rounded-[14px] shadow-[0_12px_32px_rgba(0,0,0,0.12)] p-4 w-72 animate-in zoom-in-95 border border-[#d2d2d7]/50 ring-1 ring-black/5"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0071e3]">
                  {contextPopup.type === 'translation' ? 'Translation' : 'Context'}
                </span>
                <button onClick={() => setContextPopup(null)}>
                  <X size={14} className="text-[#86868b] hover:text-[#1d1d1f]" />
                </button>
              </div>
              <p className="text-[#1d1d1f] leading-relaxed font-serif text-[15px]">{contextPopup.text}</p>
            </div>
          )}
        </div>

        {/* Bottom Dynamic Toolbar - Compact Frosted Pill */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-full px-4 py-2 flex items-center gap-4 z-30 transition-transform scale-95 origin-bottom hover:scale-100">
          {/* Table of Contents */}
          {!book.isLocal && (
            <>
              <button
                onClick={() => setShowTOC(!showTOC)}
                className={`flex items-center gap-1.5 text-xs font-medium ${showTOC ? 'text-[#0071e3]' : 'text-[#86868b]'} hover:text-[#1d1d1f] transition-colors`}
                title="Table of Contents"
              >
                <List size={16} />
                <span className="hidden sm:inline">Contents</span>
              </button>
              <div className="w-px h-4 bg-[#d2d2d7]"></div>
              <button
                onClick={() => setShowAINav(!showAINav)}
                className={`flex items-center gap-1.5 text-xs font-medium ${showAINav ? 'text-[#0071e3]' : 'text-[#86868b]'} hover:text-[#1d1d1f] transition-colors`}
                title="AI Go-To"
              >
                <Navigation size={16} />
                <span className="hidden sm:inline">Go To...</span>
              </button>
              <div className="w-px h-4 bg-[#d2d2d7]"></div>
            </>
          )}
          <button
            onClick={() => setActiveSidebar(activeSidebar === 'chat' ? null : 'chat')}
            className={`flex items-center gap-1.5 text-xs font-medium ${activeSidebar === 'chat' ? 'text-[#0071e3]' : 'text-[#86868b]'} hover:text-[#1d1d1f] transition-colors`}
          >
            <MessageSquare size={16} />
            <span className="hidden sm:inline">Companion</span>
          </button>
          <div className="w-px h-4 bg-[#d2d2d7]"></div>
          <button
            onClick={() => setActiveSidebar(activeSidebar === 'notes' ? null : 'notes')}
            className={`flex items-center gap-1.5 text-xs font-medium ${activeSidebar === 'notes' ? 'text-[#0071e3]' : 'text-[#86868b]'} hover:text-[#1d1d1f] transition-colors`}
          >
            <PenTool size={16} />
            <span className="hidden sm:inline">Notes</span> ({notes.length})
          </button>
          <div className="w-px h-4 bg-[#d2d2d7]"></div>
          <button
            onClick={handleFinishBook}
            className="flex items-center gap-1.5 text-xs font-medium text-[#86868b] hover:text-[#1d1d1f]"
          >
            <CheckCircle size={16} />
            <span className="hidden sm:inline">Finish</span>
          </button>
        </div>

        {/* Table of Contents Panel */}
        {showTOC && !book.isLocal && (
          <div className="absolute bottom-24 left-8 bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 max-h-96 overflow-hidden z-40 animate-in slide-in-from-bottom-4">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold flex items-center gap-2">
                <List size={18} /> Table of Contents
              </h3>
              <button onClick={() => setShowTOC(false)}>
                <X size={18} className="text-gray-400 hover:text-gray-900" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-72">
              {tableOfContents.map((item) => (
                <button
                  key={item.chapter}
                  onClick={() => {
                    setCurrentChapter(item.chapter);
                    loadContent(item.chapter);
                    setShowTOC(false);
                  }}
                  className={`w-full text-left p-4 hover:bg-blue-50 border-b border-gray-50 transition-colors ${currentChapter === item.chapter ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                >
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Chapter {item.chapter}</span>
                  <p className="font-medium text-gray-800">{item.title}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Navigation Modal - Compact iOS Style */}
        {showAINav && !book.isLocal && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
            <div className="bg-white rounded-[20px] shadow-[0_40px_80px_rgba(0,0,0,0.12)] w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 scale-100 ring-1 ring-black/5">
              <div className="p-5 border-b border-[#F5F5F7] bg-white sticky top-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-[#1d1d1f] flex items-center gap-2 tracking-tight">
                    <Navigation size={20} className="text-[#0071e3]" /> AI Go-To
                  </h3>
                  <button onClick={() => { setShowAINav(false); setAINavResult(null); setAINavInput(''); }} className="bg-[#F5F5F7] p-1.5 rounded-full hover:bg-[#E5E5EA] transition-colors">
                    <X size={16} className="text-[#86868b]" />
                  </button>
                </div>
                <p className="text-[#86868b] text-[13px] mt-1.5">
                  Describe a scene, quote, or moment to jump there.
                </p>
              </div>

              <div className="p-5 bg-[#F5F5F7]/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiNavInput}
                    onChange={(e) => setAINavInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAINavigation()}
                    placeholder='e.g., "where they find the treasure"'
                    className="flex-1 px-3 py-2.5 rounded-[10px] border border-[#d2d2d7] bg-white focus:outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10 text-[#1d1d1f] placeholder-[#86868b] shadow-sm transition-all text-sm"
                    autoFocus
                  />
                  <button
                    onClick={handleAINavigation}
                    disabled={aiNavLoading || !aiNavInput.trim()}
                    className="px-5 py-2.5 bg-[#0071e3] text-white rounded-[10px] text-sm font-medium hover:bg-[#0077ED] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                  >
                    {aiNavLoading ? <Loader2 size={16} className="animate-spin" /> : 'Find'}
                  </button>
                </div>

                {/* AI Result */}
                {aiNavResult && (
                  <div className="mt-6 p-5 bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-sm animate-in slide-in-from-bottom-2">
                    <p className="text-xs text-[#0066CC] font-bold mb-2 uppercase tracking-wide">Result Found</p>
                    <p className="text-[#1d1d1f] mb-5 font-serif text-lg leading-relaxed">{aiNavResult.description}</p>
                    <button
                      onClick={goToAIChapter}
                      className="w-full py-3.5 bg-[#F5F5F7] text-[#0066CC] rounded-xl font-semibold hover:bg-[#E5E5EA] transition-colors flex items-center justify-center gap-2 group"
                    >
                      Jump to Chapter {aiNavResult.chapter} <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}

                {/* Quick Suggestions */}
                <div className="mt-8">
                  <p className="text-xs text-[#86868b] font-semibold uppercase tracking-wider mb-3">Suggestions</p>
                  <div className="flex flex-wrap gap-2">
                    {['the beginning', 'the climax', 'the ending', 'a plot twist'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => { setAINavInput(suggestion); }}
                        className="px-3 py-1.5 bg-white border border-[#d2d2d7] text-[#1d1d1f] rounded-full text-sm font-medium hover:border-[#0066CC] hover:text-[#0066CC] transition-colors shadow-sm"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Sidebars */}
      <div className={`fixed top-0 right-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-500 z-40 ${activeSidebar ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* CHAT SIDEBAR */}
        {activeSidebar === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg flex items-center gap-2"><Sparkles size={18} className="text-blue-500" /> Reading Companion</h3>
              <button onClick={() => setActiveSidebar(null)}><X size={20} className="text-gray-400 hover:text-gray-900" /></button>
            </div>

            {/* Quick Actions */}
            <div className="p-4 flex gap-2 overflow-x-auto border-b border-gray-50">
              <button onClick={() => handleAction('summarize')} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-100 whitespace-nowrap">
                <FileText size={12} /> Summarize
              </button>
              <button onClick={() => handleAction('recap')} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-full text-xs font-bold hover:bg-purple-100 whitespace-nowrap">
                <RefreshCw size={12} /> Where was I?
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
              {chatHistory.length === 0 && (
                <div className="text-center mt-10 text-gray-400">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Ask anything about the book.</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`p-3 rounded-xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-black text-white ml-8 rounded-br-none' : 'bg-gray-100 text-gray-800 mr-8 rounded-bl-none'}`}>
                  {msg.text}
                </div>
              ))}
              {isProcessing && <div className="p-3 bg-gray-50 rounded-xl w-12"><Loader2 size={16} className="animate-spin text-gray-400" /></div>}
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
              <h3 className="font-bold text-lg flex items-center gap-2"><StickyNote size={18} className="text-pink-500" /> My Notes</h3>
              <button onClick={() => setActiveSidebar(null)}><X size={20} className="text-gray-400 hover:text-gray-900" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {notes.length === 0 ? (
                <div className="text-center mt-20 opacity-50">
                  <PenTool size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-medium">No notes yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Select text to add a note.</p>
                </div>
              ) : (
                notes.map(note => (
                  <div key={note.id} className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100/50 shadow-sm">
                    <div className="text-xs font-bold text-yellow-600/70 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <StickyNote size={10} /> Note
                    </div>
                    <p className="text-gray-900 font-medium text-sm mb-3 font-serif">"{note.text}"</p>
                    {note.selectedText && (
                      <div className="pl-3 border-l-2 border-yellow-200">
                        <p className="text-xs text-gray-500 italic line-clamp-2">Re: "{note.selectedText}"</p>
                      </div>
                    )}
                    <p className="text-[10px] text-right text-gray-400 mt-2">
                      {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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