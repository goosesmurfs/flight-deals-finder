'use client';

import { useState } from 'react';
import { AllDealsFlightDeal } from '../api/search-all-dates-destinations/route';
import { DESTINATION_AIRPORTS } from '@/lib/airports';

interface CalendarViewProps {
  deals: AllDealsFlightDeal[];
}

export default function CalendarView({ deals }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  // Group deals by departure date
  const dealsByDate = deals.reduce((acc, deal) => {
    const date = deal.departureDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(deal);
    return acc;
  }, {} as Record<string, AllDealsFlightDeal[]>);

  // Get date range from deals
  const dates = Object.keys(dealsByDate).sort();
  if (dates.length === 0) return null;

  const firstDate = new Date(dates[0]);
  const lastDate = new Date(dates[dates.length - 1]);

  // Generate calendar months
  const months: Date[] = [];
  const current = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const end = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);

  while (current <= end) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  // Helper to get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    return { daysInMonth, startDayOfWeek, year, month };
  };

  // Format date as YYYY-MM-DD
  const formatDate = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Get cheapest deal for a date
  const getCheapestDeal = (dateStr: string): AllDealsFlightDeal | null => {
    const dealsForDate = dealsByDate[dateStr];
    if (!dealsForDate || dealsForDate.length === 0) return null;
    return dealsForDate.reduce((min, deal) =>
      deal.price < min.price ? deal : min
    , dealsForDate[0]);
  };

  // Get price color
  const getPriceColor = (price: number, allPrices: number[]): string => {
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const range = max - min;

    if (range === 0) return 'bg-green-100 text-green-800';

    const percentage = ((price - min) / range) * 100;

    if (percentage <= 25) return 'bg-green-100 text-green-800 border-green-300';
    if (percentage <= 50) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (percentage <= 75) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const allPrices = deals.map(d => d.price);

  const handleDateClick = (dateStr: string) => {
    if (dealsByDate[dateStr] && dealsByDate[dateStr].length > 0) {
      setSelectedDate(dateStr);
      setShowModal(true);
    }
  };

  const selectedDeals = selectedDate ? dealsByDate[selectedDate] || [] : [];

  return (
    <div className="space-y-8">
      {/* Modal for selected date */}
      {showModal && selectedDate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Deals for {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h3>
                <p className="text-gray-600 mt-1">{selectedDeals.length} deal{selectedDeals.length > 1 ? 's' : ''} found</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {selectedDeals.map((deal, index) => {
                const destinationInfo = DESTINATION_AIRPORTS.find(a => a.code === deal.destinationCode);
                const tripLength = Math.ceil(
                  (new Date(deal.returnDate).getTime() - new Date(deal.departureDate).getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <div key={index} className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">{destinationInfo?.city || deal.destinationCity}</h4>
                        <p className="text-sm text-gray-500">{deal.destinationCode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-blue-600">${deal.price}</p>
                        {deal.direct && (
                          <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mt-1">
                            Nonstop
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-500">Departure</p>
                        <p className="font-medium">{new Date(deal.departureDate).toLocaleDateString()}</p>
                        {deal.outboundDepartureTime && (
                          <p className="text-xs text-gray-500">{deal.outboundDepartureTime}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-500">Return</p>
                        <p className="font-medium">{new Date(deal.returnDate).toLocaleDateString()}</p>
                        {deal.returnDepartureTime && (
                          <p className="text-xs text-gray-500">{deal.returnDepartureTime}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                      <span className="text-sm text-gray-600">Trip Length: {tripLength} days</span>
                      {deal.deepLink && (
                        <a
                          href={deal.deepLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          View on Google Flights →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {months.map((monthDate) => {
        const { daysInMonth, startDayOfWeek, year, month } = getDaysInMonth(monthDate);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        return (
          <div key={`${year}-${month}`} className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{monthName}</h3>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
                  {day}
                </div>
              ))}

              {/* Empty cells for days before month starts */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = formatDate(year, month, day);
                const cheapestDeal = getCheapestDeal(dateStr);
                const dealsCount = dealsByDate[dateStr]?.length || 0;
                const isToday = new Date().toDateString() === new Date(dateStr).toDateString();

                return (
                  <div
                    key={day}
                    onClick={() => cheapestDeal && handleDateClick(dateStr)}
                    className={`aspect-square border rounded-lg p-2 ${
                      isToday ? 'ring-2 ring-blue-500' : ''
                    } ${
                      cheapestDeal
                        ? `${getPriceColor(cheapestDeal.price, allPrices)} cursor-pointer hover:shadow-lg hover:scale-105 transition-all`
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-700 mb-1">{day}</div>
                    {cheapestDeal && (
                      <div className="text-xs space-y-1">
                        <div className="font-bold">${cheapestDeal.price}</div>
                        <div className="truncate text-xs opacity-75">
                          {DESTINATION_AIRPORTS.find(a => a.code === cheapestDeal.destinationCode)?.city}
                        </div>
                        {cheapestDeal.outboundDepartureTime && (
                          <div className="text-xs opacity-75 font-mono">
                            {cheapestDeal.outboundDepartureTime}
                          </div>
                        )}
                        {dealsCount > 1 && (
                          <div className="text-xs opacity-75">+{dealsCount - 1} more</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span className="text-gray-600">Best Deals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span className="text-gray-600">Good Deals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span className="text-gray-600">Fair Deals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                <span className="text-gray-600">Higher Prices</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
