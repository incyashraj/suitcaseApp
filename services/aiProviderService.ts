/**
 * Unified AI Service
 * 
 * Automatically selects the best available AI provider:
 * 1. Groq (FREE - recommended) - Get key from https://console.groq.com
 * 2. Gemini (requires valid key)
 * 3. Fallback (works offline with static suggestions)
 * 
 * Set your preferred provider's API key in .env:
 * - VITE_GROQ_API_KEY=your_groq_key (FREE - recommended)
 * - VITE_GEMINI_API_KEY=your_gemini_key
 */

import * as GroqService from "./groqService";
import * as GeminiService from "./geminiService";
import * as FallbackService from "./fallbackService";
import { Book, Review, UserPreferences } from "../types";

// Detect which AI provider is available
const getProvider = () => {
    if (import.meta.env.VITE_GROQ_API_KEY) return "groq";
    if (import.meta.env.VITE_GEMINI_API_KEY) return "gemini";
    return "fallback";
};

const provider = getProvider();

console.log(`🤖 AI Provider: ${provider.toUpperCase()}${provider === "fallback" ? " (Add VITE_GROQ_API_KEY for free AI features)" : ""}`);

// Export the active service based on provider
const activeService = provider === "groq" ? GroqService : provider === "gemini" ? GeminiService : FallbackService;

export const searchBooks = activeService.searchBooks;
export const consultConcierge = activeService.consultConcierge;
export const getOnboardingRecommendations = activeService.getOnboardingRecommendations;
export const generateReviews = activeService.generateReviews;
export const chatAboutBook = activeService.chatAboutBook;
export const translateText = activeService.translateText;
export const explainContext = activeService.explainContext;
export const generateBookContent = activeService.generateBookContent;
export const getBookSummary = activeService.getBookSummary;
export const getBookRecap = activeService.getBookRecap;

// Re-export for backward compatibility
export { searchOpenLibrary } from "./openLibraryService";

// Utility to check current provider
export const getActiveProvider = () => provider;
export const isAIAvailable = () => provider !== "fallback";
