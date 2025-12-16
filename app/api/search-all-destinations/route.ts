import { NextRequest, NextResponse } from 'next/server';
import { DESTINATION_AIRPORTS } from '@/lib/airports';

export interface SimplifiedFlightDeal {
  destinationCode: string;
  destinationCity: string;
  price: number;
  outboundDate: string;
  inboundDate: string;
  direct: boolean;
  carriers: string[];
  deepLink?: string;
}

async function searchFlightForDestination(
  destinationCode: string,
  outboundDate: string,
  inboundDate: string,
  apiKey: string
): Promise<SimplifiedFlightDeal | null> {
  try {
    const url = `https://flights-sky.p.rapidapi.com/flights/search-roundtrip`;

    const params = new URLSearchParams({
      fromEntityId: 'IND',
      toEntityId: destinationCode,
      departDate: outboundDate,
      returnDate: inboundDate,
      adults: '1',
      cabinClass: 'economy',
      currency: 'USD',
      market: 'US',
      locale: 'en-US'
    });

    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'flights-sky.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${destinationCode}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Extract the cheapest flight from the response
    // Sky-Scanner API structure varies, so we need to handle it carefully
    if (data?.data?.itineraries && data.data.itineraries.length > 0) {
      const cheapest = data.data.itineraries[0];
      const price = cheapest.price?.raw || cheapest.price?.formatted || 0;
      const isDirect = cheapest.legs?.every((leg: any) => leg.stopCount === 0) || false;
      const carriers: string[] = cheapest.legs?.flatMap((leg: any) =>
        leg.carriers?.marketing?.map((c: any) => c.name || c.alternateId) || []
      ) || [];

      return {
        destinationCode,
        destinationCity: DESTINATION_AIRPORTS.find(a => a.code === destinationCode)?.city || destinationCode,
        price,
        outboundDate,
        inboundDate,
        direct: isDirect,
        carriers: [...new Set(carriers)],
        deepLink: cheapest.deepLink
      };
    }

    return null;
  } catch (error) {
    console.error(`Error searching ${destinationCode}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, maxPrice, directOnly } = await request.json();

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'RapidAPI key not configured' },
        { status: 500 }
      );
    }

    // Search for flights to all destinations
    // Note: This will make many API calls. Consider rate limits!
    const searchPromises = DESTINATION_AIRPORTS.map(airport =>
      searchFlightForDestination(airport.code, startDate, endDate, apiKey)
    );

    const results = await Promise.all(searchPromises);

    // Filter out null results and apply user filters
    let deals = results.filter((deal): deal is SimplifiedFlightDeal => deal !== null);

    // Apply price filter
    if (maxPrice) {
      deals = deals.filter(deal => deal.price <= maxPrice);
    }

    // Apply direct flight filter
    if (directOnly) {
      deals = deals.filter(deal => deal.direct);
    }

    // Sort by price (cheapest first)
    deals.sort((a, b) => a.price - b.price);

    return NextResponse.json({ deals, total: deals.length });
  } catch (error) {
    console.error('Batch flight search error:', error);
    return NextResponse.json(
      { error: 'Failed to search flights' },
      { status: 500 }
    );
  }
}
