# suitcaseApp

Suitcase is a webapp for reading PDF books in a simple, interactive way. Upload your own files, search free online libraries, and dive in with tools that make reading more engaging. It's built for personal use right now—me and a few close people testing it out. Down the line, maybe we'll open it up or commercialize it.

## What It Does

You can drag and drop PDFs or upload them directly. Or search from big free PDF libraries online and start reading without hassle. Pull in reviews from Goodreads and similar spots to get a sense of what others think.

After signing up, we ask about your reading prefs during onboarding. That feeds into suggestions on the landing page, so you see books that fit what you like.

While reading, highlight text, save it, add notes. Search Google for more on a section, or ask the built-in AI to explain doubts, summarize chapters, or chat about the book. If you forget earlier parts, it can recap context. Finish a book? Write a note to the author if you want. Translate the whole thing if needed.

We track reading progress quietly. Top readers get rewarded with SUITCASE TOKENS (our Layer 3 crypto) and the book cover as an NFT—fun incentive for heavy users.

## Getting Started

Clone the repo, install dependencies with npm or whatever stack we're using (TBD—probably React frontend, Node backend). Set up your env vars for API keys (Goodreads, AI services, crypto wallet stuff). Run locally and sign up to test.

## Tech Stack

Frontend: HTML/CSS/JS, maybe React for the reader UI.
Backend: Node.js or similar for handling uploads, searches, and integrations.
AI: OpenAI or Grok for summaries and chats.
Crypto: Layer 3 setup for tokens and NFTs—details in the code.
Database: Something light like SQLite for user data and notes.

## Notes

This is early days. Focus is on clean PDF rendering and smooth interactions. No ads, no tracking beyond what's needed for rewards. Feedback welcome if you're in the loop. Let's build it step by step.