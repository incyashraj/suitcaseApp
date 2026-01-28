import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Book, Review, UserPreferences } from "../types";
import * as Fallback from "./fallbackService";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelName = 'gemini-3-flash-preview';

// Helper to safely parse JSON from AI response if the SDK doesn't return an object directly
const parseJSON = (text: string | undefined) => {
    if (!text) return [];
    try {
        return JSON.parse(text);
    } catch (e) {
        // Fallback for markdown code blocks
        const clean = text.replace(/```json\n?|```/g, '').trim();
        try {
            return JSON.parse(clean);
        } catch (e2) {
            console.error("Failed to parse Gemini JSON", e2);
            return [];
        }
    }
};

/**
 * Searches for books using Gemini.
 * Acts as an interface to a "Global Library" by hallucinating accurate metadata for real books.
 */
export const searchBooks = async (query: string): Promise<Book[]> => {
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key missing, using fallback.");
    return Fallback.searchBooks(query);
  }

  try {
    const bookSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        author: { type: Type.STRING },
        description: { type: Type.STRING },
        publishedYear: { type: Type.STRING },
        categories: { 
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        coverColor: { type: Type.STRING, description: "A pastel hex color code matching the book vibe" },
        isbn: { type: Type.STRING, description: "Valid ISBN-13 (preferred) or ISBN-10 to fetch cover image." },
      },
      required: ["title", "author", "description", "publishedYear", "categories", "coverColor", "isbn"],
    };

    const responseSchema: Schema = {
      type: Type.ARRAY,
      items: bookSchema,
    };

    const prompt = `
      You are the search engine for the world's largest digital library.
      The user is searching for: "${query}".
      
      Instructions:
      1. If the query specifies a particular book title (e.g., "The Great Gatsby"), return that specific book first.
      2. If the query is a genre or topic (e.g., "Sci-Fi", "Cooking"), return 6 popular, high-quality books in that category.
      3. If the query is nonsense, random characters, or matches no known books (e.g., "asdfghjkl"), return an EMPTY array [].
      4. CRITICAL: Provide a valid real-world 'isbn' (ISBN-13 preferred) for every book so we can display the cover.
      
      For 'description', write a compelling 2-sentence hook.
      For 'coverColor', generate a unique, aesthetic pastel hex code for each book as a fallback.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const data = parseJSON(response.text);
    
    return data.map((item: any, index: number) => ({
      id: `gemini-search-${Date.now()}-${index}`,
      title: item.title,
      author: item.author,
      coverColor: item.coverColor || '#E2E8F0',
      isbn: item.isbn,
      description: item.description,
      isLocal: false,
      publishedYear: item.publishedYear,
      categories: item.categories || [],
      fileUrl: undefined // Indicates this is a "Cloud" book
    }));

  } catch (error) {
    console.warn("Gemini Search Error, switching to fallback:", error);
    return Fallback.searchBooks(query);
  }
};

/**
 * Conversational Concierge
 * Handles back-and-forth dialogue to recommend books.
 */
export const consultConcierge = async (userMessage: string, history: {role: 'user'|'model', text: string}[]): Promise<{ reply: string, suggestions: Book[] }> => {
    if (!process.env.API_KEY) return Fallback.consultConcierge(userMessage, history);

    try {
        const bookSchema: Schema = {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              description: { type: Type.STRING },
              publishedYear: { type: Type.STRING },
              categories: { type: Type.ARRAY, items: { type: Type.STRING } },
              coverColor: { type: Type.STRING },
              isbn: { type: Type.STRING, description: "Valid ISBN-13." },
              matchReason: { type: Type.STRING, description: "Why this recommendation fits the conversation." }
            },
            required: ["title", "author", "description", "publishedYear", "categories", "coverColor", "isbn", "matchReason"],
        };

        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                reply: { type: Type.STRING, description: "Your conversational response to the user." },
                suggestions: { 
                    type: Type.ARRAY, 
                    items: bookSchema,
                    description: "List of 1-3 books if relevant to the user's request. Can be empty if the user is just chatting."
                }
            },
            required: ["reply", "suggestions"]
        };

        const prompt = `
            You are a sophisticated, warm, and highly knowledgeable literary concierge named "Suitcase".
            Your goal is to have a natural conversation with the user to help them find the perfect book.
            
            Conversation History:
            ${JSON.stringify(history.slice(-6))}
            
            Current User Input: "${userMessage}"
            
            Instructions:
            1. Respond conversationally to the user's input. Be witty and helpful.
            2. If the user is asking for books, feeling a certain way, or discussing genres, provide 1-3 highly curated recommendations.
            3. If the user is just saying hello or asking a general question, reply without suggestions.
            4. 'matchReason' should be a personalized sentence about why you picked this book for them.
        `;

        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const data = parseJSON(response.text);
        
        const suggestions = (data.suggestions || []).map((item: any, index: number) => ({
            id: `concierge-${Date.now()}-${index}`,
            title: item.title,
            author: item.author,
            coverColor: item.coverColor || '#E2E8F0',
            isbn: item.isbn,
            description: item.description,
            isLocal: false,
            publishedYear: item.publishedYear,
            categories: item.categories || [],
            matchReason: item.matchReason,
            fileUrl: undefined
        }));

        return {
            reply: data.reply || "I'm pondering that thought...",
            suggestions: suggestions
        };

    } catch (e) {
        console.warn("Concierge Error, using fallback", e);
        return Fallback.consultConcierge(userMessage, history);
    }
}

/**
 * Suggests books based on user mood/query.
 * (Legacy function kept for fallback or specific single-shot mood queries if needed)
 */
export const getMoodRecommendations = async (mood: string): Promise<Book[]> => {
  return searchBooks(mood);
};

/**
 * Generates recommendations based on onboarding preferences.
 */
export const getOnboardingRecommendations = async (prefs: UserPreferences): Promise<Book[]> => {
    if (!process.env.API_KEY) return Fallback.getOnboardingRecommendations(prefs);
  
    try {
      const bookSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          author: { type: Type.STRING },
          description: { type: Type.STRING },
          publishedYear: { type: Type.STRING },
          categories: { type: Type.ARRAY, items: { type: Type.STRING } },
          coverColor: { type: Type.STRING },
          isbn: { type: Type.STRING, description: "Valid ISBN-13 (preferred) or ISBN-10." },
          matchReason: { type: Type.STRING, description: "Why this fits the user's preferences." }
        },
        required: ["title", "author", "description", "publishedYear", "categories", "coverColor", "isbn", "matchReason"],
      };
  
      const responseSchema: Schema = {
        type: Type.ARRAY,
        items: bookSchema,
      };
  
      const prompt = `
        The user loves these genres: ${prefs.genres.join(', ')}.
        Their reading goal is: ${prefs.readingGoal}.
        
        Recommend 4 diverse, highly-rated books that fit this profile.
        Use soft, elegant colors for coverColor as fallback.
        CRITICAL: Provide a valid 'isbn' for each book for cover lookup.
      `;
  
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });
  
      const data = parseJSON(response.text);
  
      return data.map((item: any, index: number) => ({
        id: `gemini-onboarding-${Date.now()}-${index}`,
        title: item.title,
        author: item.author,
        coverColor: item.coverColor || '#E2E8F0',
        isbn: item.isbn,
        description: item.description,
        isLocal: false,
        publishedYear: item.publishedYear,
        categories: item.categories || [],
        matchReason: item.matchReason,
        fileUrl: undefined
      }));
  
    } catch (error) {
      console.warn("Gemini Onboarding Error, using fallback:", error);
      return Fallback.getOnboardingRecommendations(prefs);
    }
  };

/**
 * Generates mock reviews to simulate Goodreads integration.
 */
export const generateReviews = async (title: string, author: string): Promise<Review[]> => {
  if (!process.env.API_KEY) return Fallback.generateReviews(title, author);

  try {
    const reviewSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        reviewerName: { type: Type.STRING },
        rating: { type: Type.NUMBER },
        text: { type: Type.STRING },
        date: { type: Type.STRING },
      },
      required: ["reviewerName", "rating", "text", "date"],
    };

    const responseSchema: Schema = {
      type: Type.ARRAY,
      items: reviewSchema,
    };

    const prompt = `
      Generate 4 realistic user reviews for "${title}" by ${author}.
      Style: Goodreads or Amazon reviews. 
      Mix of lengths. Some detailed, some short. 
      Vary the ratings (mostly positive but maybe one critical).
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const data = parseJSON(response.text);
    const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

    return data.map((item: any, index: number) => ({
      id: `review-${index}`,
      reviewerName: item.reviewerName,
      rating: item.rating,
      text: item.text,
      date: item.date,
      avatarColor: colors[index % colors.length],
    }));

  } catch (error) {
    console.warn("Review Gen Error, using fallback:", error);
    return Fallback.generateReviews(title, author);
  }
};

/**
 * Chat about a book
 */
export const chatAboutBook = async (bookTitle: string, userMessage: string, chatHistory: any[]): Promise<string> => {
     if (!process.env.API_KEY) return Fallback.chatAboutBook(bookTitle, userMessage, chatHistory);
     try {
        const prompt = `
            You are an expert literary scholar and reading companion.
            Context: The user is currently reading "${bookTitle}".
            
            Previous Conversation:
            ${JSON.stringify(chatHistory.slice(-5))}
            
            User Question: "${userMessage}"
            
            Answer concisely but deeply. If they ask about plot, be careful with spoilers unless asked.
        `;
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
        });
        return response.text || "I couldn't generate a response.";
     } catch (e) {
         return Fallback.chatAboutBook(bookTitle, userMessage, chatHistory);
     }
};

/**
 * Reader Tool: Translate
 */
export const translateText = async (text: string, targetLang: string = "English"): Promise<string> => {
    if (!process.env.API_KEY) return Fallback.translateText(text);
    try {
        const prompt = `Translate the following literary text to ${targetLang}. Preserve the tone and style: "${text}"`;
        const response = await ai.models.generateContent({ model: modelName, contents: prompt });
        return response.text || "Translation failed.";
    } catch (e) {
        return Fallback.translateText(text);
    }
}

/**
 * Reader Tool: Explain Context
 */
export const explainContext = async (text: string, bookTitle: string): Promise<string> => {
    if (!process.env.API_KEY) return Fallback.explainContext(text, bookTitle);
    try {
        const prompt = `The user is reading "${bookTitle}" and highlighted this text: "${text}".
        Explain this excerpt in simple terms. Provide necessary context, historical background, or define archaic words.`;
        const response = await ai.models.generateContent({ model: modelName, contents: prompt });
        return response.text || "Could not explain context.";
    } catch (e) {
        return Fallback.explainContext(text, bookTitle);
    }
}

/**
 * Reader Tool: Generate Content for "Online Library" books
 * Generates specific chapters to allow reading the 'complete' book in segments.
 */
export const generateBookContent = async (title: string, author: string, chapter: number = 1): Promise<string> => {
    if (!process.env.API_KEY) return Fallback.generateBookContent(title, author, chapter);
    try {
        const prompt = `
          The user wants to read **Chapter ${chapter}** of the book "${title}" by ${author}.
          
          Instructions:
          1. Write the FULL text for **Chapter ${chapter}**. 
          2. If it is a public domain book, provide the exact text.
          3. If it is copyrighted, write a very detailed, high-fidelity narrative adaptation that covers all events, dialogue, and descriptions of the chapter so the user can read it like a real book.
          4. Length: Write at least 800-1200 words. Do not be brief.
          5. Formatting: Use clean HTML. Use <h3> for the Chapter Title. Use <p> for paragraphs.
          
          Do NOT use markdown code blocks. Just return the HTML string.
        `;
        const response = await ai.models.generateContent({ model: modelName, contents: prompt });
        
        // Cleanup markdown if present
        let text = response.text || "<p>Content unavailable.</p>";
        text = text.replace(/```html|```/g, '').trim();
        
        return text;
    } catch (e) {
        return Fallback.generateBookContent(title, author, chapter);
    }
}

/**
 * Reader Tool: Summary
 */
export const getBookSummary = async (title: string): Promise<string> => {
    if (!process.env.API_KEY) return Fallback.getBookSummary(title);
    try {
        const prompt = `Provide a comprehensive summary of the book "${title}". Cover the main plot points, themes, and character arcs.`;
        const response = await ai.models.generateContent({ model: modelName, contents: prompt });
        return response.text || "Summary unavailable.";
    } catch (e) {
        return Fallback.getBookSummary(title);
    }
}

/**
 * Reader Tool: Recap
 */
export const getBookRecap = async (title: string): Promise<string> => {
    if (!process.env.API_KEY) return Fallback.getBookRecap(title);
    try {
        const prompt = `The user is reading "${title}" and has forgotten what happened previously. Provide a quick recap of the beginning/setup of the book to jog their memory.`;
        const response = await ai.models.generateContent({ model: modelName, contents: prompt });
        return response.text || "Recap unavailable.";
    } catch (e) {
        return Fallback.getBookRecap(title);
    }
}