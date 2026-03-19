# CARTriP

Context-aware road trip recommendation system for CS 125.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and add your keys:

```env
GOOGLE_MAPS_API_KEY=your_key_here
OPENWEATHER_API_KEY=your_key_here
```

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Notes

- Google Maps is used for directions, places, geocoding, and autocomplete.
- OpenWeather is used for weather context.
- Stop recommendations are fetched dynamically during the trip.
