const { askLLM } = require("./llmService");
const { chunkText } = require("../utils/chunkUtils");

async function answerQuestion(transcript, question, language = "English") {
  // Take the first chunks up to 15000 characters to fit in LLM context
  const chunks = chunkText(transcript, 15000);
  const contextTranscript = chunks[0] || "";

  const prompt = `
  Answer ONLY using the transcript.
  If not found say:
  "This topic is not covered in the video."

  CRITICAL INSTRUCTIONS:
  - DO NOT use any markdown like asterisks (*), bold (**), or hashes (#).
  - Respond strictly in ${language} ONLY.

  Transcript:
  ${contextTranscript}

  Question:
  ${question}
  `;

  return await askLLM(prompt);
}

module.exports = { answerQuestion };