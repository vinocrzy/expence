import { NextResponse } from 'next/server';

// Enhanced keyword mapping for fallback
const KEYWORD_MAP: Record<string, string> = {
  // Transport
  'uber': 'Transport',
  'lyft': 'Transport',
  'bus': 'Transport',
  'train': 'Transport',
  'fuel': 'Transport',
  'gas': 'Transport',
  'petrol': 'Transport',
  'diesel': 'Transport',
  'parking': 'Transport',
  'toll': 'Transport',
  
  // Groceries
  'grocery': 'Groceries',
  'market': 'Groceries',
  'supermarket': 'Groceries',
  'fruit': 'Groceries',
  'veg': 'Groceries',
  'milk': 'Groceries',
  
  // Food & Drink
  'food': 'Food',
  'dinner': 'Food',
  'lunch': 'Food',
  'breakfast': 'Food',
  'snack': 'Food',
  'restaurant': 'Food',
  'cafe': 'Food',
  'starbucks': 'Food',
  'coffee': 'Food',
  'pizza': 'Food',
  'burger': 'Food',
  'swiggy': 'Food',
  'zomato': 'Food',
  
  // Entertainment
  'netflix': 'Entertainment',
  'spotify': 'Entertainment',
  'movie': 'Entertainment',
  'cinema': 'Entertainment',
  'theatre': 'Entertainment',
  'prime': 'Entertainment',
  'hulu': 'Entertainment',
  'disney': 'Entertainment',
  'game': 'Entertainment',
  'steam': 'Entertainment',
  
  // Shopping
  'amazon': 'Shopping',
  'flipkart': 'Shopping',
  'myntra': 'Shopping',
  'shop': 'Shopping',
  'store': 'Shopping',
  'mall': 'Shopping',
  'cloth': 'Shopping',
  'shoe': 'Shopping',
  
  // Housing & Utilities
  'rent': 'Housing',
  'maintenance': 'Housing',
  'electric': 'Utilities',
  'power': 'Utilities',
  'water': 'Utilities',
  'internet': 'Utilities',
  'wifi': 'Utilities',
  'broadband': 'Utilities',
  'phone': 'Utilities',
  'mobile': 'Utilities',
  'recharge': 'Utilities',
  'bill': 'Utilities',
  
  // Health
  'doctor': 'Health',
  'hospital': 'Health',
  'pharmacy': 'Health',
  'medicine': 'Health',
  'gym': 'Health',
  'fitness': 'Health',
  
  // Income
  'salary': 'Income',
  'paycheck': 'Income',
  'dividend': 'Income',
  'interest': 'Income',
  'bonus': 'Income',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { description, categories } = body; // categories: string[]

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const lowerDesc = description.toLowerCase();
    
    // 1. Try to match against user provided category names (Partial match)
    // We prioritize longer matches to avoid matching "car" in "cart" if we had such categories, but here we just check inclusion.
    if (categories && Array.isArray(categories)) {
        // Sort categories by length descending to match specific ones first (e.g. "Public Transport" before "Transport")
        const sortedCats = [...categories].sort((a, b) => b.length - a.length);
        
        for (const cat of sortedCats) {
             if (lowerDesc.includes(cat.toLowerCase())) {
                 return NextResponse.json({ category: cat, confidence: 0.9, source: 'user-match' });
             }
        }
    }

    // 2. Fallback to Keyword Map
    for (const [keyword, category] of Object.entries(KEYWORD_MAP)) {
      if (lowerDesc.includes(keyword)) {
        // Check if mapped category exists in user categories to return the exact user casing/name
        const userCat = categories?.find((c: string) => c.toLowerCase() === category.toLowerCase());
        
        return NextResponse.json({ 
            category: userCat || category, 
            confidence: 0.7, 
            source: 'keyword-map' 
        });
      }
    }

    return NextResponse.json({ category: null, confidence: 0 });

  } catch (error) {
    console.error('Suggest Category Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
