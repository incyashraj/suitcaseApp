import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Book, Review, UserPreferences } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = 'gemini-3-flash-preview';

// Helper to safely parse JSON from AI response
const parseJSON = (text: string | undefined) => {
    if (!text) return [];
    try {
        return JSON.parse(text);
    } catch (e) {
        console.warn("JSON Parse failed, attempting cleanup", e);
        const clean = text.replace(/```json\n?|```/g, '').trim();
        try {
            return JSON.parse(clean);
        } catch (e2) {
            return [];
        }
    }
};

/**
 * Searches for books using Gemini based on a simple query.
 * Simulates searching a massive online library.
 */
export const searchBooks = async (query: string): Promise<Book[]> => {
  if (!process.env.API_KEY) {
    console.error("API Key missing");
    return [];
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
      },
      required: ["title", "author", "description", "publishedYear", "categories", "coverColor"],
    };

    const responseSchema: Schema = {
      type: Type.ARRAY,
      items: bookSchema,
    };

    const prompt = `
      You are a digital librarian with access to the world's largest public domain library. 
      The user is searching for: "${query}".
      Provide a list of 5 books that match this query. Prioritize public domain or open access classics.
      Ensure the description is catchy, about 30 words.
      The coverColor should be a valid, soft, premium hex code.
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
      description: item.description,
      isLocal: false,
      publishedYear: item.publishedYear,
      categories: item.categories || [],
      fileUrl: undefined 
    }));

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
};

/**
 * Suggests books based on user mood.
 */
export const getMoodRecommendations = async (mood: string): Promise<Book[]> => {
  if (!process.env.API_KEY) return [];

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
        reviewSnippet: { type: Type.STRING, description: "A summary of what real critics say about this book." },
        matchReason: { type: Type.STRING, description: "Why this fits the user's current mood." }
      },
      required: ["title", "author", "description", "publishedYear", "categories", "coverColor", "reviewSnippet", "matchReason"],
    };

    const responseSchema: Schema = {
      type: Type.ARRAY,
      items: bookSchema,
    };

    const prompt = `
      The user is in this mood/state: "${mood}".
      Recommend 4 books that perfectly fit this mood.
      Act as an aggregator of online reviews (like Goodreads/NYT). 
      For each book, include a 'reviewSnippet' that summarizes the critical consensus.
      Include a 'matchReason' telling the user why it suits their "${mood}" mood.
      Use soft, elegant colors for coverColor.
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
      id: `gemini-mood-${Date.now()}-${index}`,
      title: item.title,
      author: item.author,
      coverColor: item.coverColor || '#E2E8F0',
      description: item.description,
      isLocal: false,
      publishedYear: item.publishedYear,
      categories: item.categories || [],
      reviewSnippet: item.reviewSnippet,
      matchReason: item.matchReason,
      fileUrl: undefined
    }));

  } catch (error) {
    console.error("Gemini Mood Error:", error);
    return [];
  }
};

/**
 * Generates recommendations based on onboarding preferences
 */
export const getOnboardingRecommendations = async (prefs: UserPreferences): Promise<Book[]> => {
    if (!process.env.API_KEY) return [];
  
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
          matchReason: { type: Type.STRING, description: "Why this fits the user's onboarding choices." }
        },
        required: ["title", "author", "description", "publishedYear", "categories", "coverColor", "matchReason"],
      };
  
      const responseSchema: Schema = {
        type: Type.ARRAY,
        items: bookSchema,
      };
  
      const prompt = `
        The user loves these genres: ${prefs.genres.join(', ')}.
        Their reading goal is: ${prefs.readingGoal}.
        Recommend 4 classic books that fit this profile.
        Use soft, elegant colors for coverColor.
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
        description: item.description,
        isLocal: false,
        publishedYear: item.publishedYear,
        categories: item.categories || [],
        matchReason: item.matchReason,
        fileUrl: undefined
      }));
  
    } catch (error) {
      console.error("Gemini Onboarding Error:", error);
      return [];
    }
  };

/**
 * Generates mock reviews.
 */
export const generateReviews = async (title: string, author: string): Promise<Review[]> => {
  if (!process.env.API_KEY) return [];

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
      Style: Goodreads/Amazon. Mix of ratings.
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
    console.error("Review Gen Error:", error);
    return [];
  }
};

/**
 * Chat about a book
 */
export const chatAboutBook = async (bookTitle: string, userMessage: string, chatHistory: any[]): Promise<string> => {
     if (!process.env.API_KEY) return "API Key missing.";
     const prompt = `
        You are a helpful literary assistant.
        Context: User is reading "${bookTitle}".
        History: ${JSON.stringify(chatHistory.slice(-5))}
        User Question: "${userMessage}"
        
        Answer concisely and helpfully.
     `;
     const response = await ai.models.generateContent({
         model: modelName,
         contents: prompt,
     });
     return response.text || "I couldn't generate a response.";
};

/**
 * Reader Tool: Translate
 */
export const translateText = async (text: string, targetLang: string = "English"): Promise<string> => {
    if (!process.env.API_KEY) return "API Key missing";
    const prompt = `Translate the following text to ${targetLang}: "${text}"`;
    const response = await ai.models.generateContent({ model: modelName, contents: prompt });
    return response.text || "Translation failed.";
}

/**
 * Reader Tool: Explain Context
 */
export const explainContext = async (text: string, bookTitle: string): Promise<string> => {
    if (!process.env.API_KEY) return "API Key missing";
    const prompt = `Explain this excerpt from "${bookTitle}" in simple terms, providing necessary context: "${text}"`;
    const response = await ai.models.generateContent({ model: modelName, contents: prompt });
    return response.text || "Could not explain context.";
}

/**
 * Reader Tool: Generate Dummy Content for Demo
 * This is used when the user "reads" a book from the online search that has no actual file.
 */
export const generateBookContent = async (title: string): Promise<string> => {
    if (!process.env.API_KEY) return "Loading content...";
    const prompt = `Write the first 600 words of the book "${title}". Format it with HTML paragraphs <p>. Do not include markdown code blocks.`;
    const response = await ai.models.generateContent({ model: modelName, contents: prompt });
    return response.text?.replace(/```html|```/g, '') || "<p>Content unavailable.</p>";
}

/**
 * Reader Tool: Summary
 */
export const getBookSummary = async (title: string): Promise<string> => {
    if (!process.env.API_KEY) return "API Key missing";
    const prompt = `Provide a concise summary of the book "${title}".`;
    const response = await ai.models.generateContent({ model: modelName, contents: prompt });
    return response.text || "Summary unavailable.";
}

/**
 * Reader Tool: Recap
 */
export const getBookRecap = async (title: string): Promise<string> => {
    if (!process.env.API_KEY) return "API Key missing";
    const prompt = `The user is reading "${title}" and has forgotten what happened previously. Provide a quick recap of the first few chapters to jog their memory without spoiling the ending.`;
    const response = await ai.models.generateContent({ model: modelName, contents: prompt });
    return response.text || "Recap unavailable.";
}