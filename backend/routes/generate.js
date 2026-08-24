import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'AdGPT',
    },
});

// Ready-made prompt template
function buildPrompt(productName) {
    return `You are a creative social media marketing expert. Generate trendy, youth-style social media content for the product: "${productName}".

Return ONLY valid JSON (no extra text, no markdown):
{
  "title": "A catchy, exciting product title with emojis",
  "caption": "Line 1 of caption with emoji\\nLine 2 of caption with emoji\\nLine 3 of caption with emoji",
  "hashtags": {
    "instagram": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8"],
    "twitter": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7"],
    "youtube": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8"]
  }
}

Rules:
- Title must be punchy, fun, max 10 words with emojis
- Caption must be exactly 3 lines, each line with relevant emojis
- Instagram: 8 trending hashtags relevant to product
- Twitter: 7 concise hashtags
- YouTube: 8 hashtags good for video SEO
- All hashtags must be CamelCase and product-relevant
- Be creative, trendy, and youth-oriented`;
}

// Models to try in order — more options = higher chance one works
const MODELS = [
    'google/gemma-3-4b-it:free',
    'openai/gpt-oss-20b:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'google/gemma-3-12b-it:free',
    'openai/gpt-oss-120b:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-3-27b-it:free',
    'qwen/qwen3.6-plus:free',
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

router.post('/', async (req, res) => {
    const { productName } = req.body;

    if (!productName || productName.trim() === '') {
        return res.status(400).json({ error: 'Product name is required' });
    }

    let lastError = null;

    for (const model of MODELS) {
        try {
            console.log(`Trying model: ${model}`);
            const completion = await openai.chat.completions.create({
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a social media marketing expert. Always respond with valid JSON only, no extra text.',
                    },
                    {
                        role: 'user',
                        content: buildPrompt(productName.trim()),
                    },
                ],
                temperature: 0.8,
                max_tokens: 800,
            });

            const raw = completion.choices[0].message.content;

            // Clean and parse JSON
            const cleaned = raw.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleaned);

            console.log(`Success with model: ${model}`);
            return res.json({ success: true, data: parsed, productName: productName.trim() });
        } catch (err) {
            lastError = err;
            console.error(`Model ${model} failed (${err.message}) — trying next...`);
            await sleep(500);
        }
    }

    console.error('All models failed:', lastError?.message);
    res.status(500).json({ error: 'Failed to generate content. All models are busy, please try again in a moment.' });
});

export default router;