'use client';

import { useState, useEffect } from 'react';
import { DESTINATION_AIRPORTS, type DestinationCategory } from '@/lib/airports';
import { AllDealsFlightDeal } from '../api/search-all-dates-destinations/route';
import Link from 'next/link';

const CATEGORY_ICONS: Record<DestinationCategory, string> = {
  beach: '🏖️',
  city: '🏙️',
  mountain: '⛰️',
  entertainment: '🎭',
  historic: '🏛️',
  adventure: '🎒'
};

const CATEGORY_LABELS: Record<DestinationCategory, string> = {
  beach: 'Beach',
  city: 'City',
  mountain: 'Mountain',
  entertainment: 'Entertainment',
  historic: 'Historic',
  adventure: 'Adventure'
};

interface DestinationDeal {
  code: string;
  city: string;
  state: string;
  categories: DestinationCategory[];
  cheapestPrice: number | null;
  cheapestDeal: AllDealsFlightDeal | null;
  totalDeals: number;
}

export default function ExplorerPage() {
  const [maxBudget, setMaxBudget] = useState(500);
  const [selectedCategories, setSelectedCategories] = useState<DestinationCategory[]>([]);
  const [tripDuration, setTripDuration] = useState(7);
  const [loading, setLoading] = useState(false);
  const [searchProgress, setSearchProgress] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [destinationDeals, setDestinationDeals] = useState<DestinationDeal[]>([]);
  const [sortBy, setSortBy] = useState<'price' | 'alpha'>('price');

  const toggleCategory = (category: DestinationCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleExplore = async () => {
    setLoading(true);
    setSearchProgress('Searching top destinations...');
    setProgressPercentage(0);
    setDestinationDeals([]);

    try {
      // Search top 25 most popular destinations to avoid timeouts
      // (Searching all 52 destinations takes too long for Vercel's limits)
      const topDestinations = DESTINATION_AIRPORTS.slice(0, 25);

      const response = await fetch('/api/search-all-dates-destinations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchMode: 'flexible',
          tripDuration,
          destinationCodes: topDestinations.map(d => d.code),
          departureTimeStart: 0,
          departureTimeEnd: 23,
          returnTimeStart: 0,
          returnTimeEnd: 23,
          nonstopOnly: false,
          maxResults: 500
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('Failed to read response');

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);

            if (data.type === 'progress') {
              setProgressPercentage(data.percentage);
              setSearchProgress(data.message);
            } else if (data.type === 'complete') {
              const deals: AllDealsFlightDeal[] = data.deals || [];

              // Group deals by destination and find cheapest for each
              const destMap = new Map<string, DestinationDeal>();

              DESTINATION_AIRPORTS.forEach(airport => {
                const airportDeals = deals.filter(d => d.destinationCode === airport.code);
                const cheapest = airportDeals.length > 0
                  ? airportDeals.reduce((min, deal) => deal.price < min.price ? deal : min)
                  : null;

                destMap.set(airport.code, {
                  code: airport.code,
                  city: airport.city,
                  state: airport.state,
                  categories: airport.categories || [],
                  cheapestPrice: cheapest?.price || null,
                  cheapestDeal: cheapest,
                  totalDeals: airportDeals.length
                });
              });

              setDestinationDeals(Array.from(destMap.values()));
              setProgressPercentage(100);
              setSearchProgress(`Found deals to ${Array.from(destMap.values()).filter(d => d.cheapestPrice).length} destinations`);
            }
          } catch (e) {
            console.error('Failed to parse stream data:', e);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setSearchProgress('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort destinations
  const filteredDestinations = destinationDeals
    .filter(dest => {
      // Filter by budget
      if (dest.cheapestPrice === null) return false;
      if (dest.cheapestPrice > maxBudget) return false;

      // Filter by categories
      if (selectedCategories.length > 0) {
        return selectedCategories.some(cat => dest.categories.includes(cat));
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price') {
        return (a.cheapestPrice || Infinity) - (b.cheapestPrice || Infinity);
      } else {
        return a.city.localeCompare(b.city);
      }
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-sm text-purple-600 hover:text-purple-800 mb-4">
            ← Back to Search
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🌍 Destination Explorer
          </h1>
          <p className="text-gray-600">
            Where can you go? Set your budget and discover amazing destinations
          </p>
        </div>

        {/* Search Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          {/* Budget Slider */}
          <div className="mb-6">
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              What's your budget?
            </label>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-purple-600">${maxBudget}</span>
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={maxBudget}
                onChange={(e) => setMaxBudget(Number(e.target.value))}
                className="flex-1 h-3 bg-purple-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-gray-500">per person</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>$100</span>
              <span>$1,000</span>
            </div>
          </div>

          {/* Trip Duration */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trip Length
            </label>
            <div className="flex gap-2">
              {[3, 7, 10, 14].map(days => (
                <button
                  key={days}
                  onClick={() => setTripDuration(days)}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${
                    tripDuration === days
                      ? 'bg-purple-500 text-white'
                      : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>

          {/* Category Filters */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What kind of trip? (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_ICONS) as DestinationCategory[]).map(category => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategories.includes(category)
                      ? 'bg-purple-600 text-white shadow-md scale-105'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {CATEGORY_ICONS[category]} {CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>
            {selectedCategories.length > 0 && (
              <button
                onClick={() => setSelectedCategories([])}
                className="mt-2 text-xs text-purple-600 hover:text-purple-800"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Search Button */}
          <button
            onClick={handleExplore}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-md transition-all shadow-md"
          >
            {loading ? 'Exploring Destinations...' : '🔍 Explore Destinations'}
          </button>

          {searchProgress && !loading && (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-md text-purple-700">
              {searchProgress}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Searching Top Destinations
              </h3>
              <p className="text-gray-600">{searchProgress}</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-600 to-pink-600 h-4 rounded-full transition-all duration-300 ease-out flex items-center justify-center text-xs text-white font-medium"
                style={{ width: `${progressPercentage}%` }}
              >
                {progressPercentage > 10 && `${progressPercentage}%`}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && filteredDestinations.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {filteredDestinations.length} Destinations Under ${maxBudget}
              </h2>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'price' | 'alpha')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="price">Price: Low to High</option>
                <option value="alpha">City: A-Z</option>
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredDestinations.map(dest => (
                <div
                  key={dest.code}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-4 cursor-pointer border-2 border-transparent hover:border-purple-400"
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      ${dest.cheapestPrice}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {dest.city}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">{dest.code}</p>

                    {/* Categories */}
                    <div className="flex flex-wrap gap-1 justify-center mb-2">
                      {dest.categories.slice(0, 3).map(cat => (
                        <span
                          key={cat}
                          className="text-xs bg-gray-100 px-2 py-0.5 rounded-full"
                          title={CATEGORY_LABELS[cat]}
                        >
                          {CATEGORY_ICONS[cat]}
                        </span>
                      ))}
                    </div>

                    <div className="text-xs text-gray-500">
                      {dest.totalDeals} deals found
                    </div>

                    {/* View Deals Button */}
                    {dest.cheapestDeal && (
                      <a
                        href={dest.cheapestDeal.deepLink || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 block w-full bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm font-medium py-2 rounded-md transition-colors"
                      >
                        View Deals →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && destinationDeals.length > 0 && filteredDestinations.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-600 text-lg mb-2">
              No destinations found under ${maxBudget}
            </p>
            <p className="text-gray-500">
              Try increasing your budget or changing the filters
            </p>
          </div>
        )}

        {!loading && !searchProgress && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              How Explorer Mode Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">💰</div>
                <h3 className="font-semibold text-gray-900 mb-2">Set Your Budget</h3>
                <p className="text-sm text-gray-600">
                  Use the slider to set your maximum price per person
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="font-semibold text-gray-900 mb-2">Choose Your Vibe</h3>
                <p className="text-sm text-gray-600">
                  Filter by beach, city, mountain, or other categories
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">✈️</div>
                <h3 className="font-semibold text-gray-900 mb-2">Discover & Book</h3>
                <p className="text-sm text-gray-600">
                  See all destinations within your budget and book the best deals
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
