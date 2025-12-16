import { NextRequest, NextResponse } from 'next/server';
import { DESTINATION_AIRPORTS } from '@/lib/airports';

export interface AllDealsFlightDeal {
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
  outboundDepartureTime?: string;
  outboundArrivalTime?: string;
  returnDepartureTime?: string;
  returnArrivalTime?: string;
}

// Helper function to format date in local timezone (not UTC)
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to generate dates for flexible search
function generateFlexibleDates(tripDuration: number): Array<{ departureDate: string, returnDate: string }> {
  const dates: Array<{ departureDate: string, returnDate: string }> = [];
  const today = new Date();
  const maxDays = 60; // Search within next 60 days

  // Different strategies based on trip duration
  if (tripDuration === 3) {
    // Weekend trips: ONLY Fridays departing, returning Sunday (2 nights)
    for (let i = 0; i < maxDays; i++) {
      const departure = new Date(today);
      departure.setDate(today.getDate() + i);
      const dayOfWeek = departure.getDay();

      // ONLY Fridays (5) - depart Friday, return Sunday
      if (dayOfWeek === 5) {
        const returnDate = new Date(departure);
        returnDate.setDate(departure.getDate() + 2); // Friday + 2 = Sunday

        dates.push({
          departureDate: formatLocalDate(departure),
          returnDate: formatLocalDate(returnDate)
        });
      }
    }
  } else if (tripDuration === 7) {
    // Week trips: Search all Fridays, Saturdays, and Sundays
    for (let i = 0; i < maxDays; i++) {
      const departure = new Date(today);
      departure.setDate(today.getDate() + i);
      const dayOfWeek = departure.getDay();

      // Fridays (5), Saturdays (6), Sundays (0)
      if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
        const returnDate = new Date(departure);
        returnDate.setDate(departure.getDate() + tripDuration);

        if (returnDate.getTime() - today.getTime() <= (maxDays + tripDuration) * 24 * 60 * 60 * 1000) {
          dates.push({
            departureDate: formatLocalDate(departure),
            returnDate: formatLocalDate(returnDate)
          });
        }
      }
    }
  } else {
    // Extended trips (10+ days): Search every 3rd day to reduce API calls
    for (let i = 0; i < maxDays; i += 3) {
      const departure = new Date(today);
      departure.setDate(today.getDate() + i);

      const returnDate = new Date(departure);
      returnDate.setDate(departure.getDate() + tripDuration);

      if (returnDate.getTime() - today.getTime() <= (maxDays + tripDuration) * 24 * 60 * 60 * 1000) {
        dates.push({
          departureDate: formatLocalDate(departure),
          returnDate: formatLocalDate(returnDate)
        });
      }
    }
  }

  return dates;
}

// Helper function to generate Google Flights booking link
function generateGoogleFlightsLink(
  originCode: string,
  destinationCode: string,
  departureDate: string,
  returnDate: string
): string {
  // Format dates as YYYY-MM-DD for Google Flights
  const baseUrl = 'https://www.google.com/travel/flights';

  // Build the search URL with parameters
  const params = new URLSearchParams({
    'tfs': `CBwQAhopEgoyMDI1LTAxLTAxagcIARIDSU5EcgcIARID${destinationCode}*CBwQAhopEgoyMDI1LTAxLTAxagcIARID${destinationCode}cgcIARIDSU5E`,
    'hl': 'en',
    'curr': 'USD'
  });

  // Simpler approach - use direct Google Flights URL format
  // Example: https://www.google.com/travel/flights?q=flights from IND to MCO on 2025-01-15 to 2025-01-18
  const query = `flights from ${originCode} to ${destinationCode} on ${departureDate} to ${returnDate}`;
  return `${baseUrl}?q=${encodeURIComponent(query)}`;
}

export async function POST(request: NextRequest) {
  try {
    const {
      searchMode = 'specific',
      tripDuration,
      departureDate,
      returnDate,
      destinationCodes = [],
      departureTimeStart = 0,
      departureTimeEnd = 23,
      returnTimeStart = 0,
      returnTimeEnd = 23,
      nonstopOnly = true,
      maxResults = 100
    } = await request.json();

    // Validation based on search mode
    if (searchMode === 'specific' && (!departureDate || !returnDate)) {
      return NextResponse.json(
        { error: 'Departure and return dates are required for specific search' },
        { status: 400 }
      );
    }

    if (searchMode === 'flexible' && !tripDuration) {
      return NextResponse.json(
        { error: 'Trip duration is required for flexible search' },
        { status: 400 }
      );
    }

    if (!destinationCodes || destinationCodes.length === 0) {
      return NextResponse.json(
        { error: 'At least one destination is required' },
        { status: 400 }
      );
    }

    if (destinationCodes.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 destinations allowed' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      console.error('RAPIDAPI_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'RapidAPI key not configured. Please add RAPIDAPI_KEY to your environment variables and redeploy.' },
        { status: 500 }
      );
    }

    console.log('API Key configured:', apiKey ? `${apiKey.slice(0, 8)}...` : 'MISSING');

    const allDeals: AllDealsFlightDeal[] = [];

    // Only search selected destinations
    const destinationsToSearch = DESTINATION_AIRPORTS.filter(airport =>
      destinationCodes.includes(airport.code)
    );

    // Generate date pairs based on search mode
    const datePairs = searchMode === 'flexible'
      ? generateFlexibleDates(tripDuration!)
      : [{ departureDate: departureDate!, returnDate: returnDate! }];

    // Create all search tasks
    const searchTasks: Array<{
      destination: typeof destinationsToSearch[0];
      depDate: string;
      retDate: string;
      departureTimeStart?: number;
      departureTimeEnd?: number;
      returnTimeStart?: number;
      returnTimeEnd?: number;
    }> = [];
    for (const destination of destinationsToSearch) {
      for (const { departureDate: depDate, returnDate: retDate } of datePairs) {
        searchTasks.push({
          destination,
          depDate,
          retDate,
          departureTimeStart,
          departureTimeEnd,
          returnTimeStart,
          returnTimeEnd
        });
      }
    }

    // Function to search a single destination/date combination
    const searchFlight = async (task: any) => {
      try {
        const url = `https://google-flights2.p.rapidapi.com/api/v1/searchFlights`;

        // Format time parameters for API (format: "start,end")
        // API expects hours 0-23
        const outboundTimes = task.departureTimeStart !== undefined && task.departureTimeEnd !== undefined
          ? `${task.departureTimeStart},${task.departureTimeEnd}`
          : '0,23';

        const returnTimes = task.returnTimeStart !== undefined && task.returnTimeEnd !== undefined
          ? `${task.returnTimeStart},${task.returnTimeEnd}`
          : '0,23';

        const params = new URLSearchParams({
          departure_id: 'IND',
          arrival_id: task.destination.code,
          outbound_date: task.depDate,
          return_date: task.retDate,
          outbound_times: outboundTimes,
          return_times: returnTimes,
          travel_class: 'ECONOMY',
          adults: '1',
          show_hidden: '1',
          currency: 'USD',
          language_code: 'en-US',
          country_code: 'US',
          search_type: 'best'
        });

        const options = {
          method: 'GET' as const,
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'google-flights2.p.rapidapi.com'
          }
        };

        const response = await fetch(`${url}?${params.toString()}`, options);

        if (!response.ok) {
          console.error(`API request failed for ${task.destination.code}: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error('Error response:', errorText);
          return null;
        }

        if (response.ok) {
          const data = await response.json();

          // Parse Google Flights response
          if (data.status && data.data && data.data.itineraries) {
            const topFlights = data.data.itineraries.topFlights || [];

            // Only take the cheapest nonstop option
            for (const flight of topFlights) {
              const isDirect = flight.stops === 0 || (flight.layovers === null);

              // Filter for nonstop if required
              if (nonstopOnly && !isDirect) {
                continue;
              }

              // Extract airline names and flight times from flights array
              const carriers: string[] = flight.flights?.map((f: any) => f.airline).filter(Boolean) || [];

              // Extract all times for display and filtering
              let outboundDepartureTime = '';
              let outboundArrivalTime = '';
              let returnDepartureTime = '';
              let returnArrivalTime = '';

              // Extract departure times for time filtering
              // flights array contains [outbound leg(s), return leg(s)]
              if (flight.flights && flight.flights.length > 0) {
                // Find outbound departure (first flight)
                const outboundFlight = flight.flights[0];
                outboundDepartureTime = outboundFlight.departure_time || outboundFlight.departureTime || '';
                outboundArrivalTime = outboundFlight.arrival_time || outboundFlight.arrivalTime || '';

                // Find return departure - look for flight going back to IND
                // The return leg should have arrival at IND or origin at destination
                let returnFlight = null;
                if (flight.flights.length > 1) {
                  // Find the flight that arrives at IND (the return leg)
                  returnFlight = flight.flights.find((f: any, idx: number) => {
                    // Check if this flight arrives at IND
                    const arrivesAtIND = f.destination === 'IND' ||
                                        f.arrival === 'IND' ||
                                        f.arrival_id === 'IND' ||
                                        f.arrival?.code === 'IND';
                    // Or departs from the destination
                    const departsFromDest = f.origin === task.destination.code ||
                                           f.departure === task.destination.code ||
                                           f.departure_id === task.destination.code ||
                                           f.departure?.code === task.destination.code;
                    return idx > 0 && (arrivesAtIND || departsFromDest);
                  });

                  // If we still can't find it, for direct flights the second flight is the return
                  if (!returnFlight && flight.stops === 0) {
                    returnFlight = flight.flights[1];
                  }

                  if (returnFlight) {
                    returnDepartureTime = returnFlight.departure_time || returnFlight.departureTime || '';
                    returnArrivalTime = returnFlight.arrival_time || returnFlight.arrivalTime || '';
                  }
                }
              }

              // Generate Google Flights booking link
              const bookingLink = generateGoogleFlightsLink('IND', task.destination.code, task.depDate, task.retDate);

              // Only take the first (cheapest) matching flight
              return {
                destinationCity: task.destination.city,
                destinationCode: task.destination.code,
                price: flight.price || 0,
                currency: 'USD',
                departureDate: task.depDate,
                returnDate: task.retDate,
                direct: isDirect,
                deepLink: bookingLink,
                carriers: [...new Set(carriers)],
                stops: flight.stops || 0,
                outboundDepartureTime,
                outboundArrivalTime,
                returnDepartureTime,
                returnArrivalTime
              };
            }
          }
        }
      } catch (error) {
        console.error(`Error searching ${task.destination.code} on ${task.depDate}:`, error);
      }
      return null;
    };

    // Create a streaming response with progress updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial progress
        const sendProgress = (completed: number, total: number, message: string) => {
          const data = JSON.stringify({
            type: 'progress',
            completed,
            total,
            percentage: Math.round((completed / total) * 100),
            message
          }) + '\n';
          controller.enqueue(encoder.encode(data));
        };

        sendProgress(0, searchTasks.length, 'Starting search...');

        // Process searches in batches of 10 for faster performance
        const BATCH_SIZE = 10;
        let completed = 0;

        for (let i = 0; i < searchTasks.length; i += BATCH_SIZE) {
          const batch = searchTasks.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(batch.map(task => searchFlight(task)));

          // Add successful results to allDeals
          results.forEach(deal => {
            if (deal) allDeals.push(deal);
          });

          completed += batch.length;
          sendProgress(
            completed,
            searchTasks.length,
            `Searched ${completed} of ${searchTasks.length} combinations...`
          );

          // Reduced delay between batches for faster results
          if (i + BATCH_SIZE < searchTasks.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }

        // Sort by price (lowest first) and return top deals
        allDeals.sort((a, b) => a.price - b.price);
        const topDeals = allDeals.slice(0, maxResults);

        // Prepare response based on search mode
        const searchParams = searchMode === 'flexible'
          ? { searchMode, tripDuration, departureTimeStart, departureTimeEnd, returnTimeStart, returnTimeEnd, nonstopOnly }
          : { searchMode, departureDate, returnDate, departureTimeStart, departureTimeEnd, returnTimeStart, returnTimeEnd, nonstopOnly };

        // Send final results
        const finalData = JSON.stringify({
          type: 'complete',
          deals: topDeals,
          totalFound: allDeals.length,
          destinationsSearched: destinationsToSearch.length,
          datesSearched: datePairs.length,
          searchParams
        }) + '\n';
        controller.enqueue(encoder.encode(finalData));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('All destinations search error:', error);
    return NextResponse.json(
      { error: 'Failed to search all destinations' },
      { status: 500 }
    );
  }
}
