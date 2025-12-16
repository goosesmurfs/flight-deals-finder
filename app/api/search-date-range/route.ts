import { NextRequest, NextResponse } from 'next/server';

export interface DateRangeFlightDeal {
  destinationCity: string;
  destinationCode: string;
  price: number;
  currency: string;
  departureDate: string;
  returnDate: string;
  direct: boolean;
  deepLink?: string;
  carriers?: string[];
  stops?: number;
}

export async function POST(request: NextRequest) {
  try {
    const {
      destinationCode,
      daysAhead = 90,
      tripLengthMin = 3,
      tripLengthMax = 7,
      nonstopOnly = true
    } = await request.json();

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'RapidAPI key not configured. Please add RAPIDAPI_KEY to your .env.local file' },
        { status: 500 }
      );
    }

    const deals: DateRangeFlightDeal[] = [];
    const today = new Date();

    // Search through date ranges
    // To avoid hitting rate limits, we'll sample dates (every 3-5 days)
    const searchInterval = 3; // Search every 3 days

    for (let daysOut = 1; daysOut <= daysAhead; daysOut += searchInterval) {
      for (let tripLength = tripLengthMin; tripLength <= tripLengthMax; tripLength++) {
        const departureDate = new Date(today);
        departureDate.setDate(today.getDate() + daysOut);

        const returnDate = new Date(departureDate);
        returnDate.setDate(departureDate.getDate() + tripLength);

        const departureDateStr = departureDate.toISOString().split('T')[0];
        const returnDateStr = returnDate.toISOString().split('T')[0];

        try {
          // Flights-Sky API endpoint
          const url = `https://flights-sky.p.rapidapi.com/flights/search-roundtrip`;

          const params = new URLSearchParams({
            fromEntityId: 'IND', // Indianapolis
            toEntityId: destinationCode,
            departDate: departureDateStr,
            returnDate: returnDateStr,
            adults: '1',
            cabinClass: 'economy',
            currency: 'USD',
            market: 'US',
            locale: 'en-US'
          });

          const options = {
            method: 'GET',
            headers: {
              'x-rapidapi-key': apiKey,
              'x-rapidapi-host': 'flights-sky.p.rapidapi.com'
            }
          };

          const response = await fetch(`${url}?${params.toString()}`, options);

          if (response.ok) {
            const data = await response.json();

            // Parse Sky-Scanner response
            // Note: Sky-Scanner3 response format may vary - adjust based on actual API response
            if (data.data && data.data.itineraries) {
              for (const itinerary of data.data.itineraries) {
                const price = itinerary.price?.raw || itinerary.price?.formatted;
                const isDirect = itinerary.legs?.every((leg: any) => leg.stopCount === 0);

                // Filter for nonstop if required
                if (nonstopOnly && !isDirect) {
                  continue;
                }

                const carriers: string[] = itinerary.legs?.flatMap((leg: any) =>
                  leg.carriers?.marketing?.map((c: any) => c.name) || []
                ) || [];

                deals.push({
                  destinationCity: destinationCode, // You may want to map this to city name
                  destinationCode,
                  price: typeof price === 'number' ? price : parseFloat(price),
                  currency: 'USD',
                  departureDate: departureDateStr,
                  returnDate: returnDateStr,
                  direct: isDirect,
                  deepLink: itinerary.deepLink,
                  carriers: [...new Set(carriers)],
                  stops: itinerary.legs?.[0]?.stopCount || 0
                });
              }
            }
          }

          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Error searching ${departureDateStr} to ${returnDateStr}:`, error);
          // Continue with other date searches even if one fails
        }
      }
    }

    // Sort by price (lowest first) and return top deals
    deals.sort((a, b) => a.price - b.price);
    const topDeals = deals.slice(0, 50); // Return top 50 deals

    return NextResponse.json({
      deals: topDeals,
      totalSearched: deals.length,
      searchParams: { destinationCode, daysAhead, tripLengthMin, tripLengthMax, nonstopOnly }
    });

  } catch (error) {
    console.error('Date range search error:', error);
    return NextResponse.json(
      { error: 'Failed to search date range' },
      { status: 500 }
    );
  }
}
