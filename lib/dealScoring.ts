import { prisma } from './prisma';

export interface DealScore {
  score: number; // 0-100, higher is better
  badge: 'hot' | 'great' | 'good' | 'fair' | null;
  badgeText: string;
  badgeColor: string;
  savingsPercent?: number;
  averagePrice?: number;
}

/**
 * Calculate deal score based on historical price data
 * Returns a score from 0-100 and a badge designation
 */
export async function calculateDealScore(
  originCode: string,
  destinationCode: string,
  departureDate: string,
  currentPrice: number
): Promise<DealScore> {
  try {
    // Query historical prices for this route
    // Look at prices from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalPrices = await prisma.flightPrice.findMany({
      where: {
        originCode,
        destinationCode,
        recordedAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        price: true
      }
    });

    // Need at least 3 data points to make a meaningful comparison
    if (historicalPrices.length < 3) {
      return {
        score: 50,
        badge: null,
        badgeText: '',
        badgeColor: ''
      };
    }

    // Calculate average price
    const prices = historicalPrices.map(p => p.price);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Calculate savings percentage
    const savingsPercent = ((averagePrice - currentPrice) / averagePrice) * 100;

    // Calculate score (0-100)
    // If current price is average, score is 50
    // If current price is minimum, score is 100
    // If current price is maximum, score is 0
    const priceRange = maxPrice - minPrice;
    const score = priceRange > 0
      ? Math.round(((maxPrice - currentPrice) / priceRange) * 100)
      : 50;

    // Assign badge based on savings
    let badge: DealScore['badge'] = null;
    let badgeText = '';
    let badgeColor = '';

    if (savingsPercent >= 25) {
      badge = 'hot';
      badgeText = '🔥 Hot Deal!';
      badgeColor = 'bg-red-100 text-red-800 border-red-300';
    } else if (savingsPercent >= 15) {
      badge = 'great';
      badgeText = '⭐ Great Value';
      badgeColor = 'bg-green-100 text-green-800 border-green-300';
    } else if (savingsPercent >= 8) {
      badge = 'good';
      badgeText = '💰 Good Deal';
      badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (savingsPercent >= 0) {
      badge = 'fair';
      badgeText = '👍 Fair Price';
      badgeColor = 'bg-gray-100 text-gray-800 border-gray-300';
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      badge,
      badgeText,
      badgeColor,
      savingsPercent: Math.round(savingsPercent),
      averagePrice: Math.round(averagePrice)
    };
  } catch (error) {
    console.error('Error calculating deal score:', error);
    // Return neutral score on error
    return {
      score: 50,
      badge: null,
      badgeText: '',
      badgeColor: ''
    };
  }
}

/**
 * Calculate deal scores for multiple flights in parallel
 */
export async function calculateDealScores(
  flights: Array<{
    originCode?: string;
    destinationCode: string;
    departureDate: string;
    price: number;
  }>
): Promise<Map<string, DealScore>> {
  const scores = new Map<string, DealScore>();

  await Promise.all(
    flights.map(async (flight) => {
      const key = `${flight.originCode || 'IND'}-${flight.destinationCode}-${flight.departureDate}`;
      const score = await calculateDealScore(
        flight.originCode || 'IND',
        flight.destinationCode,
        flight.departureDate,
        flight.price
      );
      scores.set(key, score);
    })
  );

  return scores;
}
