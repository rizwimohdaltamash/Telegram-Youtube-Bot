const axios = require("axios");
require("dotenv").config();

async function askLLM(prompt) {
    try {
        console.log(`Sending to Ollama [Model: ${process.env.MODEL || 'mistral'}] - Prompt Length: ${prompt.length} chars...`);
        const response = await axios.post(
            `${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/generate`,
            {
                model: process.env.MODEL || 'mistral',
                prompt,
                stream: false,
                options: {
                    temperature: 0.3, // Lower temperature for more deterministic/strict formatting
                    top_p: 0.9
                }
            },
            { timeout: 300000 } // 5 mins timeout
        );

        console.log(`Ollama Response Received:`, response.data.response ? response.data.response.substring(0, 100) + '...' : 'EMPTY/NULL');
        return response.data.response;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error("❌ Ollama connection refused. Is Ollama running?");
            return "❌ Error: Could not connect to local LLM (Ollama). Make sure Ollama is running.";
        }
        console.error("LLM Error:", error.message);
        return "❌ Error: Something went wrong while generating the response.";
    }
}

module.exports = { askLLM };