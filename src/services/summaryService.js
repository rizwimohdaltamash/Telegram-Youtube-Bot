const { askLLM } = require("./llmService");
const { chunkText } = require("../utils/chunkUtils");

async function summarizeChunk(textChunk, language) {
    const prompt = `
  You are an AI research assistant.

  Summarize the following transcript strictly and only in ${language}.

  CRITICAL INSTRUCTIONS:
  - DO NOT use markdown like asterisks (*), bold (**), or hashes (#). Use only simple text, emojis, or unicode styling instead.
  - The Output MUST BE IN ${language} ONLY. If ${language} is Hindi, write in Hindi script.
  - DO NOT say "Here is the summary" or add any conversational filler.
  - Just output the exact formatted text below.

  Format exactly like this:
  🎥 Video Title: [title]

  📌 5 Key Points:
  1. [point 1]
  2. [point 2]
  ...

  ⏱ Important Timestamps:
  [timestamp]: [event]
  ...

  🧠 Core Takeaway: [takeaway sentence]

  Transcript:
  ${textChunk}
  `;
    return await askLLM(prompt);
}

async function generateSummary(transcript, language = "English") {
    const chunks = chunkText(transcript, 6000); // chunk to approx 6k chars to prevent local LLM hanging

    if (chunks.length === 1) {
        return await summarizeChunk(chunks[0], language);
    }

    // To prevent extremely long processing/timeouts, summarize up to 4 chunks max and combine
    let combinedSummary = "";
    const maxChunks = Math.min(chunks.length, 4);

    for (let i = 0; i < maxChunks; i++) {
        const chunkSummary = await summarizeChunk(chunks[i], language);
        if (maxChunks > 1) {
            combinedSummary += `${chunkSummary}\n\n`;
        } else {
            combinedSummary = chunkSummary;
        }
    }

    if (chunks.length > 3) {
        combinedSummary += `*(Note: Transcript was very long, summarized the first 4 parts)*`;
    }

    return combinedSummary.trim();
}

module.exports = { generateSummary };