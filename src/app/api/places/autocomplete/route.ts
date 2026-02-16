import { NextRequest, NextResponse } from "next/server";

const GOOGLE_AUTOCOMPLETE_URL =
  "https://maps.googleapis.com/maps/api/place/autocomplete/json";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input");

  if (!input || input.trim().length < 2) {
    return NextResponse.json({ predictions: [], error: null });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { predictions: [], error: "Google Maps API key not configured" },
      { status: 500 },
    );
  }

  try {
    const params = new URLSearchParams({
      input: input.trim(),
      key: apiKey,
      types: "geocode|establishment",
      components: "country:us",
    });

    const response = await fetch(`${GOOGLE_AUTOCOMPLETE_URL}?${params}`);
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json(
        { predictions: [], error: `Autocomplete API error: ${data.status}` },
        { status: 400 },
      );
    }

    const predictions = (data.predictions || []).map(
      (p: { place_id: string; description: string }) => ({
        placeId: p.place_id,
        description: p.description,
      }),
    );

    return NextResponse.json({ predictions, error: null });
  } catch (error) {
    console.error("Autocomplete API error:", error);
    return NextResponse.json(
      { predictions: [], error: "Failed to fetch suggestions" },
      { status: 500 },
    );
  }
}
