# Flight Deals Finder

A powerful web app that searches **all dates** in the next 1-90 days to find the best nonstop roundtrip flight deals from Indianapolis International Airport (IND).

Unlike typical flight search engines where you pick specific dates, this app automatically searches across all date combinations in your chosen range and shows you the cheapest flights sorted by price.

## Features

- Search across **all dates** in the next 1-90 days
- Find nonstop roundtrip flights from Indianapolis (IND)
- Search to 50+ popular destinations
- Flexible trip length (1-30 days)
- Results automatically sorted by price (lowest first)
- Powered by Sky-Scanner3 API via RapidAPI

## Prerequisites

1. **Node.js** (version 18 or higher)
2. **RapidAPI Account** with Sky-Scanner3 API access

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Your RapidAPI Key

1. Go to [RapidAPI Sky-Scanner3](https://rapidapi.com/3b-data-3b-data-default/api/sky-scanner3)
2. Sign up or log in to RapidAPI
3. Subscribe to the Sky-Scanner3 API (there's a free tier available)
4. Copy your API key from the dashboard

### 3. Configure Environment Variables

1. Open the `.env.local` file in the project root
2. Add your RapidAPI key:

```
RAPIDAPI_KEY=your_actual_api_key_here
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. **Select a Destination**: Choose where you want to fly to from the dropdown
2. **Set Search Range**: Adjust the slider to search 7-90 days ahead
3. **Choose Trip Length**: Set minimum and maximum trip duration (e.g., 3-7 days)
4. **Nonstop Only**: Toggle if you only want direct flights (recommended)
5. **Find Deals**: Click "Find Best Deals" and wait 1-2 minutes while the app searches

The app will search all date combinations and display the top 50 cheapest deals, sorted by price.

## How It Works

The app searches multiple date combinations:
- **Departure dates**: Every 3 days within your chosen range (to avoid rate limits)
- **Trip lengths**: All durations between your min and max
- **Filtering**: Only nonstop flights if selected
- **Sorting**: Results ordered by price (cheapest first)

For example, searching 90 days ahead with 3-7 day trips will search approximately 150 different date combinations.

## API Rate Limits

The Sky-Scanner3 API has rate limits depending on your subscription tier:
- Free tier: Limited requests per month
- Paid tiers: Higher limits

The app includes a small delay between requests to avoid hitting rate limits.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **API**: Sky-Scanner3 via RapidAPI

## Project Structure

```
flight-deals-finder/
├── app/
│   ├── api/
│   │   ├── search-date-range/      # Main search endpoint
│   │   ├── search-flights/          # Single flight search
│   │   └── search-all-destinations/ # Multi-destination search
│   ├── page.tsx                     # Main UI
│   └── layout.tsx
├── lib/
│   └── airports.ts                  # Airport data
└── .env.local                       # Your API key (not committed)
```

## Customization

### Add More Destinations

Edit `lib/airports.ts` and add airports to the `DESTINATION_AIRPORTS` array:

```typescript
{ code: 'LAX', city: 'Los Angeles', state: 'CA', name: 'Los Angeles International Airport' }
```

### Change Origin Airport

Edit `lib/airports.ts` and update `ORIGIN_AIRPORT`:

```typescript
export const ORIGIN_AIRPORT = {
  code: 'ORD',  // Chicago
  city: 'Chicago',
  state: 'IL',
  name: "O'Hare International Airport"
};
```

### Adjust Search Interval

In `app/api/search-date-range/route.ts`, modify the `searchInterval` variable to search more or fewer dates (higher = fewer API calls).

## Troubleshooting

**No results found?**
- Try increasing the search range
- Disable "nonstop only" filter
- Try different trip lengths
- Check if your API key is valid

**API errors?**
- Verify your RapidAPI key is correct in `.env.local`
- Check your API subscription status
- Make sure you haven't exceeded rate limits

**App is slow?**
- Searching many date combinations takes time (1-2 minutes is normal)
- Consider reducing the search range for faster results

## Deploy on Vercel

1. Push your code to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add `RAPIDAPI_KEY` to environment variables
4. Deploy

## License

MIT
