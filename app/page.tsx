'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DESTINATION_AIRPORTS, ORIGIN_AIRPORT } from '@/lib/airports';
import { AllDealsFlightDeal } from './api/search-all-dates-destinations/route';
import { MixMatchFlightDeal } from './api/search-mix-match/route';
import CalendarView from './components/CalendarView';
import MixMatchCalendarView from './components/MixMatchCalendarView';

export default function Home() {
  const [searchMode, setSearchMode] = useState<'specific' | 'flexible'>('specific');
  const [tripDuration, setTripDuration] = useState<number>(7);
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [departureTimeStart, setDepartureTimeStart] = useState(0); // 0-23 hours
  const [departureTimeEnd, setDepartureTimeEnd] = useState(23);
  const [returnTimeStart, setReturnTimeStart] = useState(0);
  const [returnTimeEnd, setReturnTimeEnd] = useState(23);
  const [nonstopOnly, setNonstopOnly] = useState(true);
  const [mixMatchMode, setMixMatchMode] = useState(false); // NEW: Mix-and-match mode
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<AllDealsFlightDeal[]>([]);
  const [mixMatchDeals, setMixMatchDeals] = useState<MixMatchFlightDeal[]>([]); // NEW: Mix-match deals
  const [error, setError] = useState('');
  const [searchProgress, setSearchProgress] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [destinationsSearched, setDestinationsSearched] = useState(0);

  // View mode states (separate for regular and mix-match)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [mixMatchViewMode, setMixMatchViewMode] = useState<'list' | 'calendar'>('list');

  // Filter states
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'date-asc' | 'date-desc' | 'destination'>('price-asc');
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(2000);
  const [filterDestinations, setFilterDestinations] = useState<string[]>([]);
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterAirlines, setFilterAirlines] = useState<string[]>([]);

  // Helper function to format hour (0-23) to readable time
  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const toggleDestination = (code: string) => {
    setSelectedDestinations(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code);
      } else if (prev.length < 5) {
        return [...prev, code];
      }
      return prev;
    });
  };

  const selectPopular = () => {
    setSelectedDestinations(['MCO', 'ATL', 'LAX', 'MIA', 'LAS']);
  };

  const selectBeach = () => {
    setSelectedDestinations(['MCO', 'MIA', 'FLL', 'SAN', 'HNL'].slice(0, 5));
  };

  const selectMajorCities = () => {
    setSelectedDestinations(['LAX', 'ORD', 'DFW', 'DEN', 'SFO'].slice(0, 5));
  };

  const clearDestinations = () => {
    setSelectedDestinations([]);
  };

  const selectTripStyle = (days: number) => {
    setSearchMode('flexible');
    setTripDuration(days);
    // Clear specific dates when using flexible mode
    setDepartureDate('');
    setReturnDate('');
  };

  const handleSearch = async () => {
    if (selectedDestinations.length === 0) {
      setError('Please select at least 1 destination');
      return;
    }

    if (selectedDestinations.length > 5) {
      setError('Please select no more than 5 destinations');
      return;
    }

    if (searchMode === 'specific' && (!departureDate || !returnDate)) {
      setError('Please select both departure and return dates');
      return;
    }

    setLoading(true);
    setError('');
    setDeals([]);
    setMixMatchDeals([]);
    setProgressPercentage(0);
    setSearchProgress('Initializing search...');

    try {
      // Choose API endpoint based on mix-match mode
      const endpoint = mixMatchMode ? '/api/search-mix-match' : '/api/search-all-dates-destinations';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchMode,
          tripDuration: searchMode === 'flexible' ? tripDuration : undefined,
          departureDate: searchMode === 'specific' ? departureDate : undefined,
          returnDate: searchMode === 'specific' ? returnDate : undefined,
          destinationCodes: selectedDestinations,
          departureTimeStart,
          departureTimeEnd,
          returnTimeStart,
          returnTimeEnd,
          nonstopOnly,
          maxResults: 100
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search flights');
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to read response');
      }

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
              if (mixMatchMode) {
                setMixMatchDeals(data.deals || []);
                const mixedCount = data.mixedAirlineDeals || 0;
                setSearchProgress(`Found ${data.deals?.length || 0} deals (${mixedCount} with mixed airlines)`);
              } else {
                setDeals(data.deals || []);
                setSearchProgress(`Found ${data.deals?.length || 0} deals across ${data.destinationsSearched || 0} destinations`);
              }
              setDestinationsSearched(data.destinationsSearched || 0);
              setProgressPercentage(100);
            }
          } catch (e) {
            console.error('Failed to parse stream data:', e);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search flights. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort deals
  const getFilteredAndSortedDeals = () => {
    let filtered = [...deals];

    // Filter by price range
    filtered = filtered.filter(deal => deal.price >= priceMin && deal.price <= priceMax);

    // Filter by destination
    if (filterDestinations.length > 0) {
      filtered = filtered.filter(deal => filterDestinations.includes(deal.destinationCode));
    }

    // Filter by date range
    if (filterDateStart) {
      filtered = filtered.filter(deal => new Date(deal.departureDate) >= new Date(filterDateStart));
    }
    if (filterDateEnd) {
      filtered = filtered.filter(deal => new Date(deal.departureDate) <= new Date(filterDateEnd));
    }

    // Filter by airlines
    if (filterAirlines.length > 0) {
      filtered = filtered.filter(deal => {
        // Check if any of the deal's carriers match the selected airlines
        return deal.carriers?.some(carrier => filterAirlines.includes(carrier));
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'date-asc':
          return new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime();
        case 'date-desc':
          return new Date(b.departureDate).getTime() - new Date(a.departureDate).getTime();
        case 'destination':
          return a.destinationCity.localeCompare(b.destinationCity);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredDeals = getFilteredAndSortedDeals();

  // Get unique destinations from results for filter
  const availableDestinations = Array.from(new Set(deals.map(d => d.destinationCode)))
    .sort();

  // Get unique airlines from results for filter
  const availableAirlines = Array.from(
    new Set(deals.flatMap(d => d.carriers || []))
  ).sort();

  // Get price range from results
  const dealPrices = deals.map(d => d.price);
  const minDealPrice = dealPrices.length > 0 ? Math.min(...dealPrices) : 0;
  const maxDealPrice = dealPrices.length > 0 ? Math.max(...dealPrices) : 2000;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-2xl">✈️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Flight Deals Finder
                </h1>
                <p className="text-sm text-slate-300">From {ORIGIN_AIRPORT.city}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Panel */}
        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6 mb-6">
          {/* Trip Style Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-200 mb-3">
              Trip Duration
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => selectTripStyle(3)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  searchMode === 'flexible' && tripDuration === 3
                    ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                    : 'border-slate-700 hover:border-slate-600 hover:bg-slate-700'
                }`}
              >
                <div className="text-sm font-semibold text-white">Weekend</div>
                <div className="text-xs text-slate-400 mt-1">3 days</div>
              </button>
              <button
                type="button"
                onClick={() => selectTripStyle(7)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  searchMode === 'flexible' && tripDuration === 7
                    ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                    : 'border-slate-700 hover:border-slate-600 hover:bg-slate-700'
                }`}
              >
                <div className="text-sm font-semibold text-white">Week</div>
                <div className="text-xs text-slate-400 mt-1">7 days</div>
              </button>
              <button
                type="button"
                onClick={() => selectTripStyle(10)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  searchMode === 'flexible' && tripDuration === 10
                    ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                    : 'border-slate-700 hover:border-slate-600 hover:bg-slate-700'
                }`}
              >
                <div className="text-sm font-semibold text-white">Extended</div>
                <div className="text-xs text-slate-400 mt-1">10 days</div>
              </button>
              <button
                type="button"
                onClick={() => selectTripStyle(14)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  searchMode === 'flexible' && tripDuration === 14
                    ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                    : 'border-slate-700 hover:border-slate-600 hover:bg-slate-700'
                }`}
              >
                <div className="text-sm font-semibold text-white">2 Weeks</div>
                <div className="text-xs text-slate-400 mt-1">14 days</div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Departure Date
              </label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                max={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
              <div className="text-xs text-slate-400 mt-1">
                Any date in the next 90 days
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Return Date
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                min={departureDate || new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
              <div className="text-xs text-slate-400 mt-1">
                When do you want to return?
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Select Destinations (1-5)
            </label>

            {/* Quick Select Buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={selectPopular}
                className="px-3 py-1.5 text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-md transition-colors border border-indigo-200"
              >
                Popular 5
              </button>
              <button
                type="button"
                onClick={selectBeach}
                className="px-3 py-1.5 text-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md transition-colors border border-emerald-200"
              >
                Beach Cities
              </button>
              <button
                type="button"
                onClick={selectMajorCities}
                className="px-3 py-1.5 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md transition-colors"
              >
                Major Cities
              </button>
              <button
                type="button"
                onClick={clearDestinations}
                className="px-3 py-1.5 text-sm bg-slate-200 hover:bg-gray-300 text-slate-200 rounded-md transition-colors"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-4 border border-slate-700 rounded-md bg-slate-700">
              {DESTINATION_AIRPORTS.map((airport) => (
                <label
                  key={airport.code}
                  className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                    selectedDestinations.includes(airport.code)
                      ? 'bg-indigo-100 border border-indigo-300'
                      : 'hover:bg-slate-700'
                  } ${
                    selectedDestinations.length >= 5 && !selectedDestinations.includes(airport.code)
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDestinations.includes(airport.code)}
                    onChange={() => toggleDestination(airport.code)}
                    disabled={selectedDestinations.length >= 5 && !selectedDestinations.includes(airport.code)}
                    className="w-4 h-4 text-indigo-700 border-slate-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm">
                    <span className="font-medium">{airport.city}</span>
                    <span className="text-slate-400 text-xs ml-1">({airport.code})</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              {selectedDestinations.length === 0 && 'Select at least 1 destination'}
              {selectedDestinations.length > 0 && selectedDestinations.length < 5 && `${selectedDestinations.length} selected - you can select ${5 - selectedDestinations.length} more`}
              {selectedDestinations.length === 5 && 'Maximum 5 destinations selected'}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Flight Preferences
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-slate-700 rounded">
                <input
                  type="radio"
                  name="flightType"
                  checked={nonstopOnly === true}
                  onChange={() => setNonstopOnly(true)}
                  className="w-4 h-4 text-indigo-700 border-slate-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-white">Nonstop only</span>
                  <span className="text-xs text-slate-400 block">Direct flights, faster search</span>
                </div>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-slate-700 rounded">
                <input
                  type="radio"
                  name="flightType"
                  checked={nonstopOnly === false}
                  onChange={() => setNonstopOnly(false)}
                  className="w-4 h-4 text-indigo-700 border-slate-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-white">Include connecting flights</span>
                  <span className="text-xs text-slate-400 block">More options, may involve multiple airlines</span>
                </div>
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-lg border-2 border-green-200 transition-all">
              <input
                type="checkbox"
                checked={mixMatchMode}
                onChange={(e) => setMixMatchMode(e.target.checked)}
                className="w-5 h-5 text-green-600 border-slate-600 rounded focus:ring-green-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">🔀 Mix & Match Airlines</span>
                  <span className="inline-block bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow-sm">CHEAPEST</span>
                </div>
                <span className="text-xs text-slate-300 block mt-1">
                  Search one-way flights separately and combine different airlines for outbound/return to find absolute lowest prices
                </span>
              </div>
            </label>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || selectedDestinations.length === 0}
            className="w-full bg-indigo-700 hover:bg-indigo-800 disabled:bg-gray-300 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:shadow-none text-base"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Searching {selectedDestinations.length} destination{selectedDestinations.length > 1 ? 's' : ''}...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>🔍</span>
                Find Best Deals
              </span>
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}

          {searchProgress && !loading && (
            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-md text-indigo-700">
              {searchProgress}
            </div>
          )}
        </div>

        {/* Loading State with Progress Bar */}
        {loading && (
          <div className="bg-slate-800 rounded-lg shadow-md p-8">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                Searching for Flights
              </h3>
              <p className="text-slate-300">{searchProgress}</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-indigo-700 h-4 rounded-full transition-all duration-300 ease-out flex items-center justify-center text-xs text-white font-medium"
                style={{ width: `${progressPercentage}%` }}
              >
                {progressPercentage > 10 && `${progressPercentage}%`}
              </div>
            </div>

            <p className="text-sm text-slate-400 mt-4 text-center">
              {progressPercentage < 100 ? 'Please wait...' : 'Finalizing results...'}
            </p>
          </div>
        )}

        {/* Mix-Match Results */}
        {!loading && mixMatchDeals.length > 0 && (
          <div>
            <div className="mb-4 text-center">
              <h2 className="text-2xl font-bold text-white">
                {mixMatchDeals.length} Mix & Match Deals Found
              </h2>
              <p className="text-slate-300 mt-1">
                {mixMatchDeals.filter(d => d.isMixedAirlines).length} with different airlines for outbound/return
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800 p-1 shadow-sm">
                <button
                  onClick={() => setMixMatchViewMode('list')}
                  className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                    mixMatchViewMode === 'list'
                      ? 'bg-indigo-700 text-white'
                      : 'text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  📋 List View
                </button>
                <button
                  onClick={() => setMixMatchViewMode('calendar')}
                  className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                    mixMatchViewMode === 'calendar'
                      ? 'bg-indigo-700 text-white'
                      : 'text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  📅 Calendar View
                </button>
              </div>
            </div>

            {/* Calendar View */}
            {mixMatchViewMode === 'calendar' && <MixMatchCalendarView deals={mixMatchDeals} />}

            {/* List View */}
            {mixMatchViewMode === 'list' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mixMatchDeals.map((deal, index) => {
                const destinationInfo = DESTINATION_AIRPORTS.find(a => a.code === deal.destinationCode);
                const tripLength = Math.ceil(
                  (new Date(deal.returnDate).getTime() - new Date(deal.departureDate).getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <div
                    key={`${deal.destinationCode}-${deal.departureDate}-${index}`}
                    className={`bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-5 border ${
                      deal.isMixedAirlines ? 'border-green-300 ring-2 ring-green-200' : 'border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">
                          {destinationInfo?.city || deal.destinationCity}
                        </h3>
                        <p className="text-xs text-slate-400">{deal.destinationCode}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <p className="text-2xl font-bold text-indigo-700">
                            ${deal.totalPrice}
                          </p>
                          {deal.isMixedAirlines && (
                            <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-medium px-2.5 py-1 rounded shadow-sm">
                              Mixed Airlines
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Outbound Flight */}
                    <div className="mb-3 pb-3 border-b border-slate-700">
                      <div className="text-xs font-semibold text-slate-400 mb-1">OUTBOUND</div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-white">{deal.outboundCarrier}</span>
                        <span className="text-sm font-bold text-indigo-700">${deal.outboundPrice}</span>
                      </div>
                      <div className="text-xs text-slate-300">
                        {new Date(deal.departureDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      {deal.outboundDepartureTime && (
                        <div className="text-xs font-mono text-slate-400 mt-1">
                          {deal.outboundDepartureTime}
                          {deal.outboundArrivalTime && ` → ${deal.outboundArrivalTime}`}
                        </div>
                      )}
                      {deal.outboundDirect && (
                        <span className="inline-block bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs px-2 py-0.5 rounded-full mt-1">
                          Nonstop
                        </span>
                      )}
                    </div>

                    {/* Return Flight */}
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-slate-400 mb-1">RETURN</div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-white">{deal.returnCarrier}</span>
                        <span className="text-sm font-bold text-indigo-700">${deal.returnPrice}</span>
                      </div>
                      <div className="text-xs text-slate-300">
                        {new Date(deal.returnDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      {deal.returnDepartureTime && (
                        <div className="text-xs font-mono text-slate-400 mt-1">
                          {deal.returnDepartureTime}
                          {deal.returnArrivalTime && ` → ${deal.returnArrivalTime}`}
                        </div>
                      )}
                      {deal.returnDirect && (
                        <span className="inline-block bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs px-2 py-0.5 rounded-full mt-1">
                          Nonstop
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 pt-3 border-t border-slate-700">
                      Trip Length: {tripLength} days
                    </div>

                    {/* Multi-site booking links */}
                    <div className="mt-4 space-y-3">
                      {/* Outbound Flight Booking Options */}
                      <div>
                        <div className="text-xs font-semibold text-slate-300 mb-2">BOOK OUTBOUND:</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {deal.bookingLinksOutbound?.skyscanner && (
                            <a
                              href={deal.bookingLinksOutbound.skyscanner}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-center bg-[#0770E3] hover:bg-[#0558B8] text-white text-xs font-medium py-1.5 px-2 rounded transition-colors"
                            >
                              Skyscanner
                            </a>
                          )}
                          {deal.bookingLinksOutbound?.googleFlights && (
                            <a
                              href={deal.bookingLinksOutbound.googleFlights}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-center bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium py-1.5 px-2 rounded transition-colors"
                            >
                              Google
                            </a>
                          )}
                          {deal.bookingLinksOutbound?.kayak && (
                            <a
                              href={deal.bookingLinksOutbound.kayak}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-center bg-[#FF690F] hover:bg-[#E65F0D] text-white text-xs font-medium py-1.5 px-2 rounded transition-colors"
                            >
                              Kayak
                            </a>
                          )}
                          {deal.bookingLinksOutbound?.expedia && (
                            <a
                              href={deal.bookingLinksOutbound.expedia}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-center bg-[#FFCB00] hover:bg-[#E6B800] text-white text-xs font-medium py-1.5 px-2 rounded transition-colors"
                            >
                              Expedia
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Return Flight Booking Options */}
                      <div>
                        <div className="text-xs font-semibold text-slate-300 mb-2">BOOK RETURN:</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {deal.bookingLinksReturn?.skyscanner && (
                            <a
                              href={deal.bookingLinksReturn.skyscanner}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-center bg-[#0770E3] hover:bg-[#0558B8] text-white text-xs font-medium py-1.5 px-2 rounded transition-colors"
                            >
                              Skyscanner
                            </a>
                          )}
                          {deal.bookingLinksReturn?.googleFlights && (
                            <a
                              href={deal.bookingLinksReturn.googleFlights}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-center bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium py-1.5 px-2 rounded transition-colors"
                            >
                              Google
                            </a>
                          )}
                          {deal.bookingLinksReturn?.kayak && (
                            <a
                              href={deal.bookingLinksReturn.kayak}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-center bg-[#FF690F] hover:bg-[#E65F0D] text-white text-xs font-medium py-1.5 px-2 rounded transition-colors"
                            >
                              Kayak
                            </a>
                          )}
                          {deal.bookingLinksReturn?.expedia && (
                            <a
                              href={deal.bookingLinksReturn.expedia}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-center bg-[#FFCB00] hover:bg-[#E6B800] text-white text-xs font-medium py-1.5 px-2 rounded transition-colors"
                            >
                              Expedia
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        )}

        {/* Regular Results */}
        {!loading && deals.length > 0 && (
          <div>
            <div className="mb-4 text-center">
              <h2 className="text-2xl font-bold text-white">
                {deals.length} Deals Found
              </h2>
              <p className="text-slate-300 mt-1">Showing {filteredDeals.length} after filters</p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800 p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-indigo-700 text-white'
                      : 'text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  📋 List View
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-indigo-700 text-white'
                      : 'text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  📅 Calendar View
                </button>
              </div>
            </div>

            {/* Filter Panel */}
            <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Filters & Sorting</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-800"
                  >
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="date-asc">Date: Earliest First</option>
                    <option value="date-desc">Date: Latest First</option>
                    <option value="destination">Destination: A-Z</option>
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Price Range: ${priceMin} - ${priceMax}
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={priceMin}
                      onChange={(e) => setPriceMin(Number(e.target.value))}
                      min={0}
                      max={priceMax}
                      className="w-20 px-2 py-2 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Min"
                    />
                    <span className="text-slate-400 text-sm">to</span>
                    <input
                      type="number"
                      value={priceMax}
                      onChange={(e) => setPriceMax(Number(e.target.value))}
                      min={priceMin}
                      className="w-20 px-2 py-2 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Max"
                    />
                  </div>
                  <input
                    type="range"
                    min={minDealPrice}
                    max={maxDealPrice}
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Departure Date Range
                  </label>
                  <div className="space-y-1">
                    <input
                      type="date"
                      value={filterDateStart}
                      onChange={(e) => setFilterDateStart(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="From"
                    />
                    <input
                      type="date"
                      value={filterDateEnd}
                      onChange={(e) => setFilterDateEnd(e.target.value)}
                      min={filterDateStart}
                      className="w-full px-2 py-1.5 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="To"
                    />
                  </div>
                </div>

                {/* Destination Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Destinations
                  </label>
                  <div className="max-h-24 overflow-y-auto border border-slate-600 rounded-lg p-2 space-y-1 bg-slate-700">
                    {availableDestinations.map(code => {
                      const airport = DESTINATION_AIRPORTS.find(a => a.code === code);
                      return (
                        <label key={code} className="flex items-center space-x-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={filterDestinations.includes(code)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilterDestinations([...filterDestinations, code]);
                              } else {
                                setFilterDestinations(filterDestinations.filter(c => c !== code));
                              }
                            }}
                            className="w-4 h-4 text-indigo-700"
                          />
                          <span>{airport?.city || code} ({code})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Airlines Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Airlines
                  </label>
                  <div className="max-h-24 overflow-y-auto border border-slate-600 rounded-lg p-2 space-y-1 bg-slate-700">
                    {availableAirlines.length > 0 ? (
                      availableAirlines.map(airline => (
                        <label key={airline} className="flex items-center space-x-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={filterAirlines.includes(airline)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilterAirlines([...filterAirlines, airline]);
                              } else {
                                setFilterAirlines(filterAirlines.filter(a => a !== airline));
                              }
                            }}
                            className="w-4 h-4 text-indigo-700"
                          />
                          <span>{airline}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">No airlines available</p>
                    )}
                  </div>
                  {/* Quick select for budget carriers */}
                  {(availableAirlines.includes('Spirit') || availableAirlines.includes('Frontier')) && (
                    <button
                      onClick={() => {
                        const budgetCarriers = availableAirlines.filter(a =>
                          a === 'Spirit' || a === 'Frontier'
                        );
                        setFilterAirlines(budgetCarriers);
                      }}
                      className="mt-2 w-full px-2 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-colors border border-emerald-200"
                    >
                      Spirit/Frontier Only
                    </button>
                  )}
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setSortBy('price-asc');
                    setPriceMin(minDealPrice);
                    setPriceMax(maxDealPrice);
                    setFilterDestinations([]);
                    setFilterDateStart('');
                    setFilterDateEnd('');
                    setFilterAirlines([]);
                  }}
                  className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-200 text-slate-200 rounded-lg transition-colors border border-slate-600"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Calendar View */}
            {viewMode === 'calendar' && <CalendarView deals={filteredDeals} />}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDeals.map((deal, index) => {
                const destinationInfo = DESTINATION_AIRPORTS.find(a => a.code === deal.destinationCode);
                const tripLength = Math.ceil(
                  (new Date(deal.returnDate).getTime() - new Date(deal.departureDate).getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <div
                    key={`${deal.destinationCode}-${deal.departureDate}-${index}`}
                    className="bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-5 border border-slate-700"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">
                          {destinationInfo?.city || deal.destinationCity}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {deal.destinationCode}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <p className="text-2xl font-bold text-indigo-700">
                            ${deal.price}
                          </p>
                          {deal.direct && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-xs font-medium px-2.5 py-1 rounded border border-emerald-200">
                              Nonstop
                            </span>
                          )}
                          {!deal.direct && deal.stops !== undefined && (
                            <span className="inline-block bg-slate-700 text-slate-300 text-xs font-medium px-2.5 py-1 rounded">
                              {deal.stops} {deal.stops === 1 ? 'stop' : 'stops'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-slate-300">
                      <div className="flex justify-between">
                        <span>Departure:</span>
                        <span className="font-medium">
                          {new Date(deal.departureDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      {deal.outboundDepartureTime && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Outbound:</span>
                          <span className="font-mono">
                            {deal.outboundDepartureTime}
                            {deal.outboundArrivalTime && ` → ${deal.outboundArrivalTime}`}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Return:</span>
                        <span className="font-medium">
                          {new Date(deal.returnDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      {deal.returnDepartureTime && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Return Flight:</span>
                          <span className="font-mono">
                            {deal.returnDepartureTime}
                            {deal.returnArrivalTime && ` → ${deal.returnArrivalTime}`}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Trip Length:</span>
                        <span className="font-medium">{tripLength} days</span>
                      </div>
                      {deal.carriers && deal.carriers.length > 0 && (
                        <div className="pt-2 border-t">
                          <span className="text-xs text-slate-400">
                            {deal.carriers.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                      {deal.deepLink && (
                        <a
                          href={deal.deepLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 block w-full text-center bg-indigo-700 hover:bg-indigo-800 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
                        >
                          View Details →
                        </a>
                      )}
                  </div>
                );
              })}
              </div>
            )}
          </div>
        )}

        {!loading && deals.length === 0 && searchProgress && (
          <div className="text-center py-12 bg-slate-800 rounded-lg shadow-sm border border-slate-700">
            <div className="text-slate-400 text-5xl mb-4">✈️</div>
            <p className="text-white text-lg font-semibold mb-2">
              No deals found
            </p>
            <p className="text-slate-400 text-sm">
              Try different dates or adjust your filters
            </p>
          </div>
        )}

        {/* Instructions */}
        {!loading && deals.length === 0 && !searchProgress && (
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              How It Works
            </h2>
            <div className="space-y-4 text-slate-300">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-white">Pick Your Travel Dates</h3>
                  <p>Choose your departure and return dates for your trip.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-white">Select Up to 5 Destinations</h3>
                  <p>Choose 1-5 destinations from our list of {DESTINATION_AIRPORTS.length} cities to compare prices.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-white">See the Best Deals</h3>
                  <p>Get instant results sorted by price showing the cheapest flights to your selected destinations!</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t">
              <h3 className="font-semibold text-white mb-3">We Search These Destinations</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {DESTINATION_AIRPORTS.slice(0, 16).map((airport) => (
                  <div
                    key={airport.code}
                    className="p-3 border border-slate-700 rounded-lg text-left bg-slate-700"
                  >
                    <div className="font-semibold text-white">
                      {airport.city}
                    </div>
                    <div className="text-sm text-slate-400">
                      {airport.code}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-400 mt-4 text-center">
                + {DESTINATION_AIRPORTS.length - 16} more destinations
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
