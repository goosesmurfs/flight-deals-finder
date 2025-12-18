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

    if (range === 0) return 'bg-emerald-100 text-emerald-400 border border-emerald-200';

    const percentage = ((price - min) / range) * 100;

    if (percentage <= 25) return 'bg-emerald-100 text-emerald-400 border border-emerald-300';
    if (percentage <= 50) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
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
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  Deals for {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h3>
                <p className="text-slate-600 mt-1">{selectedDeals.length} deal{selectedDeals.length > 1 ? 's' : ''} found</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-slate-600 text-3xl leading-none"
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
                  <div key={index} className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow duration-200">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="text-xl font-bold text-slate-900 mb-1">{destinationInfo?.city || deal.destinationCity}</h4>
                        <p className="text-xs text-slate-500">{deal.destinationCode}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <p className="text-2xl font-bold text-indigo-600">${deal.price}</p>
                          {deal.direct && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded border border-emerald-200">
                              Nonstop
                            </span>
                          )}
                          {!deal.direct && deal.stops !== undefined && (
                            <span className="inline-block bg-gray-50 text-slate-700 text-xs font-medium px-2.5 py-1 rounded">
                              {deal.stops} {deal.stops === 1 ? 'stop' : 'stops'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-slate-700">
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
                          <span className="text-slate-500">Outbound:</span>
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
                          <span className="text-slate-500">Return Flight:</span>
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
                          <span className="text-xs text-slate-500">
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
          </div>
        </div>
      )}

      {months.map((monthDate) => {
        const { daysInMonth, startDayOfWeek, year, month } = getDaysInMonth(monthDate);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        return (
          <div key={`${year}-${month}`} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">{monthName}</h3>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-semibold text-slate-600 text-sm py-2">
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
                      isToday ? 'ring-2 ring-indigo-500' : ''
                    } ${
                      cheapestDeal
                        ? `${getPriceColor(cheapestDeal.price, allPrices)} cursor-pointer hover:shadow-lg hover:scale-105 transition-all`
                        : 'bg-gray-50 border-slate-200'
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-600 mb-1">{day}</div>
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
                <div className="w-4 h-4 bg-emerald-100 border border-emerald-300 rounded"></div>
                <span className="text-slate-600">Best Deals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-indigo-100 border border-indigo-300 rounded"></div>
                <span className="text-slate-600">Good Deals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span className="text-slate-600">Fair Deals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                <span className="text-slate-600">Higher Prices</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
