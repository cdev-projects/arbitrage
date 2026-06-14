import { NextResponse } from 'next/server';

// Dashboard data model is not yet implemented.
// Returns empty structure so the UI renders its empty/placeholder states.
export async function GET() {
  return NextResponse.json({
    stats:            null,
    opportunityCards: [],
    momentumCards:    [],
    trendSeries:      [],
    scatterPoints:    [],
    barCards:         [],
    lastScanned:      null,
  });
}
