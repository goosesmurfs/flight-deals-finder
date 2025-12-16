import { NextRequest, NextResponse } from 'next/server';
import { DESTINATION_AIRPORTS } from '@/lib/airports';

export interface BookingLinks {
  skyscanner: string;
  googleFlights: string;
  kayak: string;
  expedia: string;
}

export interface MixMatchFlightDeal {
  destinationCity: string;
  destinationCode: string;
  totalPrice: number;
  currency: string;
  departureDate: string;
  returnDate: string;

  // Outbound flight details
  outboundPrice: number;
  outboundCarrier: string;
  outboundDirect: boolean;
  outboundDepartureTime?: string;
  outboundArrivalTime?: string;
  outboundStops?: number;

  // Return flight details
  returnPrice: number;
  returnCarrier: string;
  returnDirect: boolean;
  returnDepartureTime?: string;
  returnArrivalTime?: string;
  returnStops?: number;

  // Metadata
  isMixedAirlines: boolean;
  savingsVsRoundTrip?: number;

  // Multi-site booking links
  bookingLinksOutbound?: BookingLinks;
  bookingLinksReturn?: BookingLinks;

  // Legacy fields for compatibility
  deepLinkOutbound?: string;
  deepLinkReturn?: string;
}

interface OneWayFlight {
  price: number;
  carrier: string;
  direct: boolean;
  departureTime?: string;
  arrivalTime?: string;
  stops?: number;
  deepLink?: string;
}

// Helper function to format date in local timezone
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to generate dates for flexible search
function generateFlexibleDates(tripDuration: number): Array<{ departureDate: string, returnDate: string }> {
  const dates: Array<{ departureDate: string, returnDate: string }> = [];
  const today = new Date();
  const minDaysAhead = 3; // Start searching 3 days ahead to avoid API rejections
  const maxDays = 30; // Search within next 30 days (reduced from 60 to avoid timeouts)

  if (tripDuration === 3) {
    // Weekend trips: Fridays only
    for (let i = minDaysAhead; i < maxDays; i++) {
      const departure = new Date(today);
      departure.setDate(today.getDate() + i);
      if (departure.getDay() === 5) {
        const returnDate = new Date(departure);
        returnDate.setDate(departure.getDate() + 2);
        dates.push({
          departureDate: formatLocalDate(departure),
          returnDate: formatLocalDate(returnDate)
        });
      }
    }
  } else if (tripDuration === 7) {
    // Week trips: Fri/Sat/Sun
    for (let i = minDaysAhead; i < maxDays; i++) {
      const departure = new Date(today);
      departure.setDate(today.getDate() + i);
      const dayOfWeek = departure.getDay();
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
    // Extended trips: Every 3rd day
    for (let i = minDaysAhead; i < maxDays; i += 3) {
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

// Booking link generators for different sites
function generateSkyscannerLink(originCode: string, destinationCode: string, date: string): string {
  const baseUrl = 'https://www.skyscanner.com/transport/flights';
  const dateParts = date.split('-');
  const dateFormatted = `${dateParts[0].slice(2)}${dateParts[1]}${dateParts[2]}`;
  return `${baseUrl}/${originCode}/${destinationCode}/${dateFormatted}/?adultsv2=1&cabinclass=economy&rtn=0`;
}

function generateGoogleFlightsLink(originCode: string, destinationCode: string, date: string): string {
  // Google Flights using search query
  const baseUrl = 'https://www.google.com/travel/flights';
  return `${baseUrl}?q=Flights%20from%20${originCode}%20to%20${destinationCode}%20on%20${date}%20one%20way`;
}

function generateKayakLink(originCode: string, destinationCode: string, date: string): string {
  // Kayak format: /flights/{ORIGIN}-{DEST}/{DATE}/1adults
  const baseUrl = 'https://www.kayak.com/flights';
  return `${baseUrl}/${originCode}-${destinationCode}/${date}/1adults?sort=bestflight_a`;
}

function generateExpediaLink(originCode: string, destinationCode: string, date: string): string {
  // Expedia format
  const baseUrl = 'https://www.expedia.com/Flights-Search';
  const params = new URLSearchParams({
    'flight-type': 'on',
    'mode': 'search',
    'trip': 'oneway',
    'leg1': `from:${originCode},to:${destinationCode},departure:${date}TANYT`,
    'passengers': 'adults:1',
    'options': 'cabinclass:economy'
  });
  return `${baseUrl}?${params.toString()}`;
}

// Keep old function name for compatibility but return all links
function generateGoogleFlightsOneWayLink(
  originCode: string,
  destinationCode: string,
  date: string
): string {
  return generateSkyscannerLink(originCode, destinationCode, date);
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
      nonstopOnly = false,
      maxResults = 100
    } = await request.json();

    // Validation
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

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      console.error('RAPIDAPI_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'RapidAPI key not configured. Please add RAPIDAPI_KEY to your environment variables and redeploy.' },
        { status: 500 }
      );
    }

    console.log('API Key configured:', apiKey ? `${apiKey.slice(0, 8)}...` : 'MISSING');

    const destinationsToSearch = DESTINATION_AIRPORTS.filter(airport =>
      destinationCodes.includes(airport.code)
    );

    const datePairs = searchMode === 'flexible'
      ? generateFlexibleDates(tripDuration!)
      : [{ departureDate: departureDate!, returnDate: returnDate! }];

    // Function to search one-way flight
    const searchOneWayFlight = async (
      origin: string,
      destination: string,
      date: string,
      timeStart: number,
      timeEnd: number
    ): Promise<OneWayFlight[]> => {
      try {
        const times = `${timeStart},${timeEnd}`;
        const params = new URLSearchParams({
          departure_id: origin,
          arrival_id: destination,
          outbound_date: date,
          flight_type: 'one_way',
          outbound_times: times,
          travel_class: 'ECONOMY',
          adults: '1',
          show_hidden: '1',
          currency: 'USD',
          language_code: 'en-US',
          country_code: 'US',
          search_type: 'best'
        });

        const url = `https://google-flights2.p.rapidapi.com/api/v1/searchFlights`;
        const response = await fetch(`${url}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'google-flights2.p.rapidapi.com'
          }
        });

        if (!response.ok) return [];

        const data = await response.json();
        const flights: OneWayFlight[] = [];

        if (data.status && data.data && data.data.itineraries) {
          const topFlights = data.data.itineraries.topFlights || [];

          // Get multiple options (top 3 cheapest)
          for (const flight of topFlights.slice(0, 3)) {
            const isDirect = flight.stops === 0 || flight.layovers === null;

            // Filter for nonstop if required
            if (nonstopOnly && !isDirect) continue;

            const carriers = flight.flights?.map((f: any) => f.airline).filter(Boolean) || [];
            const mainCarrier = carriers[0] || 'Unknown';

            let departureTime = '';
            let arrivalTime = '';
            if (flight.flights && flight.flights.length > 0) {
              const firstFlight = flight.flights[0];
              const lastFlight = flight.flights[flight.flights.length - 1];
              departureTime = firstFlight.departure_time || firstFlight.departureTime || '';
              arrivalTime = lastFlight.arrival_time || lastFlight.arrivalTime || '';
            }

            const deepLink = generateGoogleFlightsOneWayLink(origin, destination, date);

            flights.push({
              price: flight.price || 0,
              carrier: mainCarrier,
              direct: isDirect,
              departureTime,
              arrivalTime,
              stops: flight.stops || 0,
              deepLink
            });
          }
        }

        return flights;
      } catch (error) {
        console.error(`Error searching one-way ${origin}->${destination} on ${date}:`, error);
        return [];
      }
    };

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
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

        const allDeals: MixMatchFlightDeal[] = [];
        const totalTasks = destinationsToSearch.length * datePairs.length;
        let completed = 0;

        sendProgress(0, totalTasks, 'Starting mix-and-match search...');

        // Search all combinations
        for (const destination of destinationsToSearch) {
          for (const { departureDate: depDate, returnDate: retDate } of datePairs) {
            // Search outbound flights (IND -> Destination)
            const outboundFlights = await searchOneWayFlight(
              'IND',
              destination.code,
              depDate,
              departureTimeStart,
              departureTimeEnd
            );

            // Search return flights (Destination -> IND)
            const returnFlights = await searchOneWayFlight(
              destination.code,
              'IND',
              retDate,
              returnTimeStart,
              returnTimeEnd
            );

            // Mix and match all combinations
            for (const outbound of outboundFlights) {
              for (const returnFlight of returnFlights) {
                const totalPrice = outbound.price + returnFlight.price;
                const isMixedAirlines = outbound.carrier !== returnFlight.carrier;

                // Generate booking links for all sites
                const bookingLinksOutbound: BookingLinks = {
                  skyscanner: generateSkyscannerLink('IND', destination.code, depDate),
                  googleFlights: generateGoogleFlightsLink('IND', destination.code, depDate),
                  kayak: generateKayakLink('IND', destination.code, depDate),
                  expedia: generateExpediaLink('IND', destination.code, depDate)
                };

                const bookingLinksReturn: BookingLinks = {
                  skyscanner: generateSkyscannerLink(destination.code, 'IND', retDate),
                  googleFlights: generateGoogleFlightsLink(destination.code, 'IND', retDate),
                  kayak: generateKayakLink(destination.code, 'IND', retDate),
                  expedia: generateExpediaLink(destination.code, 'IND', retDate)
                };

                allDeals.push({
                  destinationCity: destination.city,
                  destinationCode: destination.code,
                  totalPrice,
                  currency: 'USD',
                  departureDate: depDate,
                  returnDate: retDate,

                  outboundPrice: outbound.price,
                  outboundCarrier: outbound.carrier,
                  outboundDirect: outbound.direct,
                  outboundDepartureTime: outbound.departureTime,
                  outboundArrivalTime: outbound.arrivalTime,
                  outboundStops: outbound.stops,

                  returnPrice: returnFlight.price,
                  returnCarrier: returnFlight.carrier,
                  returnDirect: returnFlight.direct,
                  returnDepartureTime: returnFlight.departureTime,
                  returnArrivalTime: returnFlight.arrivalTime,
                  returnStops: returnFlight.stops,

                  isMixedAirlines,

                  // Multi-site booking links
                  bookingLinksOutbound,
                  bookingLinksReturn,

                  // Legacy compatibility
                  deepLinkOutbound: bookingLinksOutbound.skyscanner,
                  deepLinkReturn: bookingLinksReturn.skyscanner
                });
              }
            }

            completed++;
            sendProgress(
              completed,
              totalTasks,
              `Searched ${completed} of ${totalTasks} combinations...`
            );
          }
        }

        // Sort by total price (lowest first)
        allDeals.sort((a, b) => a.totalPrice - b.totalPrice);
        const topDeals = allDeals.slice(0, maxResults);

        // Send final results
        const finalData = JSON.stringify({
          type: 'complete',
          deals: topDeals,
          totalFound: allDeals.length,
          destinationsSearched: destinationsToSearch.length,
          datesSearched: datePairs.length,
          mixedAirlineDeals: topDeals.filter(d => d.isMixedAirlines).length
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
    console.error('Mix-match search error:', error);
    return NextResponse.json(
      { error: 'Failed to search flights' },
      { status: 500 }
    );
  }
}
