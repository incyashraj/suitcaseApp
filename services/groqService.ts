import { Book, Review, UserPreferences } from "../types";
import * as Fallback from "./fallbackService";

/**
 * Groq AI Service
 * Fast, FREE AI inference using Groq's LPU (Language Processing Unit)
 * No credit card required - just get a free API key from https://console.groq.com
 * 
 * Supports models: llama-3.3-70b-versatile, mixtral-8x7b-32768, gemma2-9b-it
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL = "llama-3.3-70b-versatile"; // Best free model for book recommendations

interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

// Helper to call Groq API
const callGroq = async (
    messages: ChatMessage[],
    jsonMode: boolean = false,
    maxTokens: number = 2048
): Promise<string> => {
    if (!API_KEY) throw new Error("No Groq API Key");

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: MODEL,
            messages,
            max_tokens: maxTokens,
            temperature: 0.7,
            ...(jsonMode && { response_format: { type: "json_object" } }),
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Groq API Error");
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
};

// Helper to parse JSON from response
const parseJSON = (text: string) => {
    try {
        return JSON.parse(text);
    } catch {
        // Try to extract JSON from markdown code blocks
        const match = text.match(/```json?\s*([\s\S]*?)```/);
        if (match) {
            try {
                return JSON.parse(match[1].trim());
            } catch {
                return null;
            }
        }
        // Try to find JSON in the text
        const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch {
                return null;
            }
        }
        return null;
    }
};

/**
 * Search for books using Groq AI
 */
export const searchBooks = async (query: string): Promise<Book[]> => {
    if (!API_KEY) return Fallback.searchBooks(query);

    try {
        const response = await callGroq([
            {
                role: "system",
                content: `You are a knowledgeable book search engine. Return a JSON array of 6 real books matching the query.
Each book must have: title, author, description (2 sentences), publishedYear, categories (array), coverColor (pastel hex), isbn (valid ISBN-13).
Only return real, existing books. If the query makes no sense, return an empty array [].`
            },
            {
                role: "user",
                content: `Search for books: "${query}"`
            }
        ], true);

        const data = parseJSON(response);
        if (!data || !Array.isArray(data)) return Fallback.searchBooks(query);

        return data.map((item: any, index: number) => ({
            id: `groq-search-${Date.now()}-${index}`,
            title: item.title || "Unknown",
            author: item.author || "Unknown",
            coverColor: item.coverColor || "#e2e8f0",
            isbn: item.isbn,
            description: item.description || "A great book.",
            isLocal: false,
            publishedYear: item.publishedYear?.toString() || "Unknown",
            categories: item.categories || [],
            source: "groq" as const,
        }));
    } catch (error) {
        console.warn("Groq search error:", error);
        return Fallback.searchBooks(query);
    }
};

/**
 * Conversational book concierge
 */
export const consultConcierge = async (
    userMessage: string,
    history: { role: "user" | "model"; text: string }[]
): Promise<{ reply: string; suggestions: Book[] }> => {
    if (!API_KEY) return Fallback.consultConcierge(userMessage, history);

    try {
        const messages: ChatMessage[] = [
            {
                role: "system",
                content: `You are "Suitcase", a warm and witty literary concierge. Have natural conversations about books.
Return JSON with: { "reply": "your conversational response", "suggestions": [] }
If recommending books, include in suggestions array: title, author, description, publishedYear, categories, coverColor (pastel hex), isbn, matchReason.
Only suggest 1-3 books when relevant. Can have empty suggestions for casual chat.`
            },
            ...history.slice(-6).map((msg) => ({
                role: (msg.role === "user" ? "user" : "assistant") as "user" | "assistant",
                content: msg.text,
            })),
            { role: "user", content: userMessage },
        ];

        const response = await callGroq(messages, true);
        const data = parseJSON(response);

        if (!data) {
            return { reply: response, suggestions: [] };
        }

        const suggestions = (data.suggestions || []).map((item: any, index: number) => ({
            id: `groq-concierge-${Date.now()}-${index}`,
            title: item.title,
            author: item.author,
            coverColor: item.coverColor || "#cbd5e1",
            isbn: item.isbn,
            description: item.description,
            isLocal: false,
            publishedYear: item.publishedYear?.toString(),
            categories: item.categories || [],
            matchReason: item.matchReason,
            source: "groq" as const,
        }));

        return {
            reply: data.reply || "I'm thinking about that...",
            suggestions,
        };
    } catch (error) {
        console.warn("Groq concierge error:", error);
        return Fallback.consultConcierge(userMessage, history);
    }
};

/**
 * Get book recommendations based on user preferences
 */
export const getOnboardingRecommendations = async (prefs: UserPreferences): Promise<Book[]> => {
    if (!API_KEY) return Fallback.getOnboardingRecommendations(prefs);

    try {
        const prompt = `Based on these preferences, recommend 4 books:
Genres: ${prefs.genres.join(", ")}
Reading Goal: ${prefs.readingGoal}

Return JSON array with: title, author, description, publishedYear, categories, coverColor (pastel hex), isbn, matchReason.`;

        const response = await callGroq([
            { role: "system", content: "You are a book recommendation expert. Return only a JSON array of books." },
            { role: "user", content: prompt }
        ], true);

        const data = parseJSON(response);
        if (!data || !Array.isArray(data)) return Fallback.getOnboardingRecommendations(prefs);

        return data.map((item: any, index: number) => ({
            id: `groq-rec-${Date.now()}-${index}`,
            title: item.title,
            author: item.author,
            coverColor: item.coverColor || "#e2e8f0",
            isbn: item.isbn,
            description: item.description,
            isLocal: false,
            publishedYear: item.publishedYear?.toString(),
            categories: item.categories || [],
            matchReason: item.matchReason,
            source: "groq" as const,
        }));
    } catch (error) {
        console.warn("Groq recommendations error:", error);
        return Fallback.getOnboardingRecommendations(prefs);
    }
};

/**
 * Generate book reviews
 */
export const generateReviews = async (title: string, author: string): Promise<Review[]> => {
    if (!API_KEY) return Fallback.generateReviews(title, author);

    try {
        const response = await callGroq([
            {
                role: "system",
                content: "Generate 3 realistic book reviews. Return JSON array with: reviewerName, rating (1-5), text, date, avatarColor (hex)."
            },
            { role: "user", content: `Generate reviews for "${title}" by ${author}` }
        ], true);

        const data = parseJSON(response);
        if (!data || !Array.isArray(data)) return Fallback.generateReviews(title, author);

        return data.map((item: any, index: number) => ({
            id: `groq-review-${index}`,
            reviewerName: item.reviewerName || "Reader",
            rating: Math.min(5, Math.max(1, item.rating || 4)),
            text: item.text || "Great book!",
            date: item.date || "Recently",
            avatarColor: item.avatarColor || "#3b82f6",
        }));
    } catch (error) {
        console.warn("Groq reviews error:", error);
        return Fallback.generateReviews(title, author);
    }
};

/**
 * Chat about a specific book
 */
export const chatAboutBook = async (
    bookTitle: string,
    userMessage: string,
    history: { role: "user" | "model"; text: string }[]
): Promise<string> => {
    if (!API_KEY) return Fallback.chatAboutBook(bookTitle, userMessage, history);

    try {
        const messages: ChatMessage[] = [
            {
                role: "system",
                content: `You are a literary companion discussing "${bookTitle}". Be helpful, insightful, and engaging. Keep responses concise (2-3 paragraphs max).`
            },
            ...history.slice(-4).map((msg) => ({
                role: (msg.role === "user" ? "user" : "assistant") as "user" | "assistant",
                content: msg.text,
            })),
            { role: "user", content: userMessage },
        ];

        return await callGroq(messages, false, 512);
    } catch (error) {
        console.warn("Groq book chat error:", error);
        return Fallback.chatAboutBook(bookTitle, userMessage, history);
    }
};

/**
 * Translate text
 */
export const translateText = async (text: string, targetLang: string = "English"): Promise<string> => {
    if (!API_KEY) return Fallback.translateText(text);

    try {
        return await callGroq([
            { role: "system", content: `You are a translator. Translate the text to ${targetLang}. Return only the translation.` },
            { role: "user", content: text }
        ], false, 512);
    } catch (error) {
        console.warn("Groq translate error:", error);
        return Fallback.translateText(text);
    }
};

/**
 * Explain context of selected text
 */
export const explainContext = async (text: string, bookTitle: string): Promise<string> => {
    if (!API_KEY) return Fallback.explainContext(text, bookTitle);

    try {
        return await callGroq([
            {
                role: "system",
                content: `Explain the context and meaning of this text from "${bookTitle}". Be concise but insightful (2-3 paragraphs).`
            },
            { role: "user", content: text }
        ], false, 512);
    } catch (error) {
        console.warn("Groq explain error:", error);
        return Fallback.explainContext(text, bookTitle);
    }
};

/**
 * Generate book content (chapter preview)
 */
export const generateBookContent = async (
    title: string,
    author: string,
    chapter: number = 1
): Promise<string> => {
    if (!API_KEY) return Fallback.generateBookContent(title, author, chapter);

    try {
        const response = await callGroq([
            {
                role: "system",
                content: `Write the content for Chapter ${chapter} of "${title}" by ${author}. 
CRITICAL INSTRUCTION:
1. If this book is in the PUBLIC DOMAIN (classic), you MUST provide the ORIGINAL, VERBATIM text for this chapter. Do not summarize, do not adapt. Give me the real text.
2. If it is copyrighted, write a detail-rich, scene-by-scene adaptation that is at least 2000 words long.
3. Allow the response to be very long. Do not cut it short.
4. Use HTML formatting (<h3>, <p>, <em>).`
            },
            { role: "user", content: `Write full Chapter ${chapter} verbatim if possible` }
        ], false, 6000);

        return response || Fallback.generateBookContent(title, author, chapter);
    } catch (error) {
        console.warn("Groq content error:", error);
        return Fallback.generateBookContent(title, author, chapter);
    }
};

/**
 * Get book summary
 */
export const getBookSummary = async (title: string): Promise<string> => {
    if (!API_KEY) return Fallback.getBookSummary(title);

    try {
        return await callGroq([
            { role: "system", content: "Provide a concise, engaging summary of this book in 2-3 paragraphs." },
            { role: "user", content: `Summarize "${title}"` }
        ], false, 512);
    } catch (error) {
        console.warn("Groq summary error:", error);
        return Fallback.getBookSummary(title);
    }
};

/**
 * Get book recap
 */
export const getBookRecap = async (title: string): Promise<string> => {
    if (!API_KEY) return Fallback.getBookRecap(title);

    try {
        return await callGroq([
            { role: "system", content: "Provide a detailed plot recap of this book, covering major events and themes. 3-4 paragraphs." },
            { role: "user", content: `Recap "${title}"` }
        ], false, 768);
    } catch (error) {
        console.warn("Groq recap error:", error);
        return Fallback.getBookRecap(title);
    }
};

/**
 * Check if Groq is available
 */
export const isGroqAvailable = (): boolean => {
    return !!API_KEY;
};
