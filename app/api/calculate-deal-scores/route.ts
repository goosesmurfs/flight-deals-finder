import { NextRequest, NextResponse } from 'next/server';
import { calculateDealScores } from '@/lib/dealScoring';

export async function POST(request: NextRequest) {
  try {
    const { flights } = await request.json();

    if (!flights || !Array.isArray(flights)) {
      return NextResponse.json(
        { error: 'Invalid request: flights array is required' },
        { status: 400 }
      );
    }

    // Calculate deal scores for all flights
    const scores = await calculateDealScores(flights);

    // Convert Map to object for JSON response
    const scoresObject: Record<string, any> = {};
    scores.forEach((value, key) => {
      scoresObject[key] = value;
    });

    return NextResponse.json({ scores: scoresObject });
  } catch (error) {
    console.error('Error calculating deal scores:', error);
    return NextResponse.json(
      { error: 'Failed to calculate deal scores' },
      { status: 500 }
    );
  }
}
