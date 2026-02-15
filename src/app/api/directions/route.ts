import { NextRequest, NextResponse } from "next/server";

const GOOGLE_DIRECTIONS_URL =
  "https://maps.googleapis.com/maps/api/directions/json";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const waypoints = searchParams.get("waypoints");
  const avoidHighways = searchParams.get("avoidHighways") === "true";

  if (!origin || !destination) {
    return NextResponse.json(
      { route: null, error: "Origin and destination are required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { route: null, error: "Google Maps API key not configured" },
      { status: 500 },
    );
  }

  try {
    const params = new URLSearchParams({
      origin,
      destination,
      key: apiKey,
      units: "imperial",
      departure_time: "now",
    });

    if (waypoints) {
      params.set("waypoints", waypoints);
    }

    if (avoidHighways) {
      params.set("avoid", "highways");
    }

    const response = await fetch(`${GOOGLE_DIRECTIONS_URL}?${params}`);
    const data = await response.json();

    if (data.status !== "OK") {
      return NextResponse.json(
        { route: null, error: `Directions API error: ${data.status}` },
        { status: 400 },
      );
    }

    const route = data.routes[0];
    const legs = route.legs;

    const routeData = {
      polyline: route.overview_polyline.points,
      totalDistanceMiles: legs.reduce(
        (sum: number, leg: { distance: { value: number } }) =>
          sum + leg.distance.value * 0.000621371,
        0,
      ),
      totalDurationMinutes: legs.reduce(
        (sum: number, leg: { duration: { value: number } }) =>
          sum + leg.duration.value / 60,
        0,
      ),
      bounds: {
        northeast: route.bounds.northeast,
        southwest: route.bounds.southwest,
      },
      legs: legs.map(
        (leg: {
          start_location: { lat: number; lng: number };
          end_location: { lat: number; lng: number };
          distance: { value: number };
          duration: { value: number };
          steps: Array<{
            start_location: { lat: number; lng: number };
            end_location: { lat: number; lng: number };
            distance: { value: number };
            duration: { value: number };
            html_instructions: string;
            polyline: { points: string };
          }>;
        }) => ({
          startLocation: leg.start_location,
          endLocation: leg.end_location,
          distanceMiles: leg.distance.value * 0.000621371,
          durationMinutes: leg.duration.value / 60,
          steps: leg.steps.map((step) => ({
            startLocation: step.start_location,
            endLocation: step.end_location,
            distanceMiles: step.distance.value * 0.000621371,
            durationMinutes: step.duration.value / 60,
            instruction: step.html_instructions,
            polyline: step.polyline.points,
          })),
        }),
      ),
    };

    return NextResponse.json({ route: routeData, error: null });
  } catch (error) {
    console.error("Directions API error:", error);
    return NextResponse.json(
      { route: null, error: "Failed to fetch directions" },
      { status: 500 },
    );
  }
}
