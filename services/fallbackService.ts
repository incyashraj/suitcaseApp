import { Book, Review, UserPreferences } from "../types";

/**
 * Fallback Service
 * Uses Hugging Face Inference API (Mistral-7B) as a free alternative when Gemini is down.
 * If HF_TOKEN is missing, it falls back to hardcoded "Offline" data to keep the app functional.
 */

const HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3";
const API_KEY = import.meta.env.VITE_HF_TOKEN; // Expects a Hugging Face Token (optional)

// Helper to call Hugging Face
const callLLM = async (systemPrompt: string, userPrompt: string) => {
    if (!API_KEY) throw new Error("No Fallback Key");

    const response = await fetch(HF_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            inputs: `<s>[INST] ${systemPrompt} \n\n ${userPrompt} [/INST]`,
            parameters: { max_new_tokens: 2500, temperature: 0.8, return_full_text: false }
        }),
    });

    if (!response.ok) throw new Error("Fallback API Failed");
    const result = await response.json();
    return result[0]?.generated_text || "";
};

// Helper to extract JSON from LLM text response
const extractJSON = (text: string) => {
    try {
        const match = text.match(/\[.*\]/s) || text.match(/\{.*\}/s);
        return match ? JSON.parse(match[0]) : null;
    } catch (e) {
        return null;
    }
};

// --- Fallback Implementations ---

export const searchBooks = async (query: string): Promise<Book[]> => {
    try {
        const system = "You are a book search engine. Return a JSON array of 5 books matching the query. properties: title, author, description, publishedYear, coverColor (hex), isbn (13 digit).";
        const text = await callLLM(system, `Search for: ${query}`);
        const json = extractJSON(text);
        if (json && Array.isArray(json)) return json.map((b: any, i) => ({
            ...b,
            id: `fallback-${Date.now()}-${i}`,
            categories: b.categories || ["General"],
            isLocal: false
        }));
        throw new Error("Parse failed");
    } catch (e) {
        // Offline Fallback
        return [
            {
                id: 'offline-1',
                title: 'The Offline Library',
                author: 'System Backup',
                description: 'We could not reach our AI services, but here is a classic placeholder.',
                publishedYear: '2024',
                categories: ['System'],
                coverColor: '#e2e8f0',
                isbn: '9780141439518', // Pride and Prejudice
                isLocal: false
            }
        ];
    }
};

export const consultConcierge = async (userMessage: string, history: any[]): Promise<{ reply: string, suggestions: Book[] }> => {
    try {
        const system = "You are a helpful book concierge named Suitcase (Backup Mode). Reply kindly. If asked for books, provide a JSON object with 'reply' (string) and 'suggestions' (array of books with title, author, isbn).";
        const text = await callLLM(system, userMessage);
        const json = extractJSON(text);

        if (json && json.reply) {
            return {
                reply: json.reply,
                suggestions: Array.isArray(json.suggestions) ? json.suggestions.map((s: any, i: number) => ({
                    ...s,
                    id: `fb-con-${i}`,
                    coverColor: '#cbd5e1',
                    isLocal: false,
                    categories: []
                })) : []
            };
        }
        return { reply: text, suggestions: [] };
    } catch (e) {
        return {
            reply: "I'm having trouble connecting to the cloud, but I'm here listening.",
            suggestions: []
        };
    }
};

export const getOnboardingRecommendations = async (prefs: UserPreferences): Promise<Book[]> => {
    // Return a solid offline set if AI fails
    return [
        { id: 'off-1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', description: 'A classic of the Jazz Age.', publishedYear: '1925', categories: ['Classic'], coverColor: '#fef3c7', isbn: '9780743273565', matchReason: 'Timeless classic', isLocal: false },
        { id: 'off-2', title: '1984', author: 'George Orwell', description: 'Dystopian social science fiction.', publishedYear: '1949', categories: ['Sci-Fi'], coverColor: '#f3f4f6', isbn: '9780451524935', matchReason: 'Essential reading', isLocal: false },
        { id: 'off-3', title: 'Dune', author: 'Frank Herbert', description: 'Epic science fiction.', publishedYear: '1965', categories: ['Sci-Fi'], coverColor: '#fed7aa', isbn: '9780441013593', matchReason: 'Masterpiece', isLocal: false },
        { id: 'off-4', title: 'Sapiens', author: 'Yuval Noah Harari', description: 'A brief history of humankind.', publishedYear: '2011', categories: ['History'], coverColor: '#e0f2fe', isbn: '9780062316097', matchReason: 'Thought provoking', isLocal: false },
    ];
};

export const generateReviews = async (title: string, author: string): Promise<Review[]> => {
    // Offline reviews
    return [
        { id: 'rev-1', reviewerName: 'Offline Reader', rating: 5, text: 'This book is a masterpiece!', date: 'Today', avatarColor: '#3b82f6' },
        { id: 'rev-2', reviewerName: 'Bookworm', rating: 4, text: 'Really enjoyed the plot twists.', date: 'Yesterday', avatarColor: '#ef4444' },
    ];
};

export const chatAboutBook = async (bookTitle: string, userMessage: string, history: any[]): Promise<string> => {
    try {
        const system = `You are a literary assistant discussing "${bookTitle}". Keep answers short.`;
        return await callLLM(system, userMessage);
    } catch (e) {
        return "I can't analyze this book right now due to connection issues.";
    }
};

export const translateText = async (text: string): Promise<string> => {
    try {
        const system = "Translate the following text to English.";
        return await callLLM(system, text);
    } catch (e) {
        return "Translation service unavailable.";
    }
};

export const explainContext = async (text: string, bookTitle: string): Promise<string> => {
    try {
        const system = `Explain the context of this text from "${bookTitle}".`;
        return await callLLM(system, text);
    } catch (e) {
        return "Context service unavailable.";
    }
};

export const generateBookContent = async (title: string, author: string, chapter: number = 1): Promise<string> => {
    try {
        const system = `Write the detailed narrative for Chapter ${chapter} of "${title}" by ${author}. 
        PUBLIC DOMAIN: Provide VERBATIM text. 
        COPYRIGHTED: Provide a detailed 2000-word adaptation. 
        Use HTML <p>. Do not trim content.`;
        const text = await callLLM(system, "Write the full chapter content.");
        return text || "<p>Content generation failed.</p>";
    } catch (e) {
        return `
            <h3>Chapter ${chapter}</h3>
            <p>We are currently unable to generate the full text for <strong>${title}</strong> due to high demand on our AI services.</p>
            <p>Please try again later or upload a local PDF copy of this book to continue reading.</p>
        `;
    }
};

export const getBookSummary = async (title: string): Promise<string> => {
    try {
        return await callLLM(`Summarize "${title}".`, "Summary:");
    } catch (e) {
        return "Summary unavailable offline.";
    }
};

export const getBookRecap = async (title: string): Promise<string> => {
    try {
        return await callLLM(`Recap the plot of "${title}".`, "Recap:");
    } catch (e) {
        return "Recap unavailable offline.";
    }
};