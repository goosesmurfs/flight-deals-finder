import { NextRequest, NextResponse } from 'next/server';

export interface FlightDeal {
  destination: string;
  destinationCode: string;
  price: number;
  currency: string;
  outboundDate: string;
  inboundDate: string;
  direct: boolean;
  deepLink?: string;
  carriers?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { destinationCode, outboundDate, inboundDate } = await request.json();

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'RapidAPI key not configured' },
        { status: 500 }
      );
    }

    // Flights-Sky API endpoint for browsing quotes
    const url = `https://flights-sky.p.rapidapi.com/flights/search-roundtrip`;

    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'flights-sky.p.rapidapi.com'
      }
    };

    // Construct the query parameters
    const params = new URLSearchParams({
      fromEntityId: 'IND', // Indianapolis
      toEntityId: destinationCode,
      departDate: outboundDate,
      returnDate: inboundDate,
      adults: '1',
      cabinClass: 'economy',
      currency: 'USD',
      market: 'US',
      locale: 'en-US'
    });

    const response = await fetch(`${url}?${params.toString()}`, options);

    if (!response.ok) {
      throw new Error(`Sky-Scanner API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Flight search error:', error);
    return NextResponse.json(
      { error: 'Failed to search flights' },
      { status: 500 }
    );
  }
}
