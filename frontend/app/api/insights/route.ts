import { NextResponse } from 'next/server';
import { generateInsights } from '@/lib/insights';
import { Transaction, Category } from '@/lib/db-types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactions, categories } = body;

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Transactions array is required' }, { status: 400 });
    }

    if (!categories || !Array.isArray(categories)) {
        return NextResponse.json({ error: 'Categories array is required' }, { status: 400 });
    }

    // Call v2 Engine
    const response = generateInsights(transactions as Transaction[], categories as Category[]);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Insights API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
