'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ParseResult {
  amount?: number;
  date?: string; // YYYY-MM-DD
  description?: string;
  type?: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'INVESTMENT' | 'DEBT';
  categoryName?: string;
  accountName?: string;
  isSplit?: boolean;
  splits?: Array<{
    amount: number;
    categoryName?: string;
    note?: string;
  }>;
}

export async function isGeminiConfigured(): Promise<boolean> {
    return !!process.env.GEMINI_API_KEY;
}

export async function parseTransactionWithGemini(
  text: string, 
  context: { categories: string[], accounts: string[] }
): Promise<ParseResult | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is missing');
    return null;
  }

  try {
    const prompt = `
    You are a financial assistant. Parse the following natural language transaction into a structured JSON object.
    
    User Input: "${text}"
    
    Context:
    - Available Categories: ${context.categories.join(', ')}
    - Available Accounts: ${context.accounts.join(', ')}
    
    Rules:
    1. Extract 'amount', 'date' (YYYY-MM-DD, default to today if not specified), 'description', 'type' (EXPENSE, INCOME, TRANSFER, INVESTMENT, DEBT).
    2. Match 'categoryName' from the provided list if possible. If not found, use a reasonable guess or leave empty.
    3. Match 'accountName' from the provided list.
    4. If the input implies multiple items with specific amounts (e.g. "500 total, 200 for food, 300 for fuel"), set 'isSplit' to true and fill 'splits' array.
    5. 'splits' should act like line items. Sum of splits must equal total amount.
    6. Return ONLY the raw JSON object, no markdown formatting.
    
    JSON Structure:
    {
      "amount": number,
      "date": "YYYY-MM-DD",
      "description": "string",
      "type": "string",
      "categoryName": "string",
      "accountName": "string",
      "isSplit": boolean,
      "splits": [ { "amount": number, "categoryName": "string", "note": "string" } ]
    }
    `;

    const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    let result;
    
    for (const modelName of modelsToTry) {
        try {
            console.log(`Attempting to use Gemini model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            result = await model.generateContent(prompt);
            break; // If successful, exit loop
        } catch (e: any) {
            // If it's a 404/not found, continue to next model
            if (e.message?.includes('404') || e.message?.includes('not found')) {
                console.warn(`Model ${modelName} not found, trying next...`);
                continue;
            }
            throw e; // Rethrow other errors (like auth) immediately
        }
    }

    if (!result) {
        throw new Error('404 Model not found: All attempted Gemini models failed.');
    }

    const response = await result.response;
    let textResponse = response.text();
    
    // Clean up potential markdown code blocks
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    console.log('Gemini Parsed:', textResponse);
    
    return JSON.parse(textResponse);
  } catch (error: any) {
    // Check for API key validity error specifically
    if (error.message?.includes('API key not valid') || error.toString().includes('API_KEY_INVALID')) {
        console.error('Gemini Error: Invalid API Key. Please check your .env file.');
        return null; 
    }

    // Check for Model Not Found (404)
    if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.error('Gemini Error: Model not found. This might be due to region restrictions or API version.');
        return null;
    }

    console.error('Gemini Parse Error:', error);
    return null;
  }
}
