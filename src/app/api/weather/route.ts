import { NextRequest, NextResponse } from "next/server";

const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { weather: null, error: "lat and lng are required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { weather: null, error: "OpenWeather API key not configured" },
      { status: 500 },
    );
  }

  try {
    const params = new URLSearchParams({
      lat,
      lon: lng,
      appid: apiKey,
      units: "imperial",
    });

    const response = await fetch(`${OPENWEATHER_URL}?${params}`);
    const data = await response.json();

    if (data.cod && data.cod !== 200) {
      return NextResponse.json(
        { weather: null, error: `Weather API error: ${data.message}` },
        { status: 400 },
      );
    }

    const weather = {
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      temperature: data.main.temp,
      condition: data.weather[0].main,
      icon: data.weather[0].icon,
      windSpeedMph: data.wind.speed,
      visibility: (data.visibility || 10000) * 0.000621371,
      alerts: [],
    };

    return NextResponse.json({ weather, error: null });
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json(
      { weather: null, error: "Failed to fetch weather" },
      { status: 500 },
    );
  }
}
