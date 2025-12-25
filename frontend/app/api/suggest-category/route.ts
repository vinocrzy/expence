import { NextResponse } from 'next/server';

// Simple keyword mapping for demonstration
// In a real app, this could call OpenAI or use a trained classifier
const KEYWORD_MAP: Record<string, string> = {
  'uber': 'Transport',
  'lyft': 'Transport',
  'bus': 'Transport',
  'train': 'Transport',
  'fuel': 'Transport',
  'gas': 'Transport',
  'grocery': 'Groceries',
  'market': 'Groceries',
  'food': 'Food',
  'dinner': 'Food',
  'lunch': 'Food',
  'starbucks': 'Food',
  'coffee': 'Food',
  'netflix': 'Entertainment',
  'spotify': 'Entertainment',
  'movie': 'Entertainment',
  'cinema': 'Entertainment',
  'amazon': 'Shopping',
  'shop': 'Shopping',
  'rent': 'Housing',
  'electric': 'Utilities',
  'water': 'Utilities',
  'internet': 'Utilities',
  'wifi': 'Utilities',
  'salary': 'Income',
  'paycheck': 'Income',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { description } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const lowerDesc = description.toLowerCase();
    
    // Find matching category
    let suggestedCategory = null;
    
    for (const [keyword, category] of Object.entries(KEYWORD_MAP)) {
      if (lowerDesc.includes(keyword)) {
        suggestedCategory = category;
        break; // Return first match
      }
    }

    // Simulate a bit of "AI" delay (optional, but realistic for testing loading states)
    // await new Promise(r => setTimeout(r, 500));

    return NextResponse.json({ 
      category: suggestedCategory,
      confidence: suggestedCategory ? 0.8 : 0 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
