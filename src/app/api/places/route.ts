import { NextRequest, NextResponse } from "next/server";
import type { StopCategory } from "@/types";

const GOOGLE_PLACES_NEARBY_URL =
  "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

const CATEGORY_TO_PLACE_TYPE: Record<StopCategory, string> = {
  fuel: "gas_station",
  restaurant: "restaurant",
  rest: "park",
  hotel: "lodging",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const category = searchParams.get("category") as StopCategory | null;
  const radius = searchParams.get("radius") || "8047";

  if (!lat || !lng || !category) {
    return NextResponse.json(
      { stops: [], error: "lat, lng, and category are required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { stops: [], error: "Google Maps API key not configured" },
      { status: 500 },
    );
  }

  const placeType = CATEGORY_TO_PLACE_TYPE[category];
  if (!placeType) {
    return NextResponse.json(
      { stops: [], error: `Invalid category: ${category}` },
      { status: 400 },
    );
  }

  try {
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      radius,
      type: placeType,
      key: apiKey,
    });

    const response = await fetch(`${GOOGLE_PLACES_NEARBY_URL}?${params}`);
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json(
        { stops: [], error: `Places API error: ${data.status}` },
        { status: 400 },
      );
    }

    const stops = (data.results || [])
      .slice(0, 10)
      .map(
        (place: {
          place_id: string;
          name: string;
          geometry: { location: { lat: number; lng: number } };
          vicinity: string;
          rating?: number;
          price_level?: number;
          photos?: Array<{ photo_reference: string }>;
          opening_hours?: { open_now: boolean };
          types?: string[];
        }) => ({
          id: place.place_id,
          placeId: place.place_id,
          category,
          name: place.name,
          location: {
            latLng: place.geometry.location,
            address: place.vicinity || "",
            placeId: place.place_id,
          },
          detourDistanceMiles: 0,
          detourDurationMinutes: 0,
          rating: place.rating ?? null,
          priceLevel: place.price_level ?? null,
          photos: (place.photos || [])
            .slice(0, 3)
            .map(
              (p: { photo_reference: string }) =>
                `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photo_reference}&key=${apiKey}`,
            ),
          openNow: place.opening_hours?.open_now ?? null,
          attributes: buildAttributes(category, place),
        }),
      );

    return NextResponse.json({ stops, error: null });
  } catch (error) {
    console.error("Places API error:", error);
    return NextResponse.json(
      { stops: [], error: "Failed to fetch places" },
      { status: 500 },
    );
  }
}

function buildAttributes(
  category: StopCategory,
  place: { types?: string[]; name?: string; price_level?: number },
) {
  switch (category) {
    case "fuel":
      return {
        category: "fuel" as const,
        brand: place.name || "Unknown",
        fuelPrice: null,
        amenities: [],
      };
    case "restaurant":
      return {
        category: "restaurant" as const,
        cuisineTypes: (place.types || []).filter(
          (t: string) =>
            ![
              "restaurant",
              "food",
              "point_of_interest",
              "establishment",
            ].includes(t),
        ),
        priceRange:
          place.price_level != null ? "$".repeat(place.price_level + 1) : "N/A",
        estimatedWaitMinutes: null,
      };
    case "rest":
      return {
        category: "rest" as const,
        hasRestrooms: true,
        hasPicnicArea: (place.types || []).includes("park"),
        hasVendingMachines: false,
      };
    case "hotel":
      return {
        category: "hotel" as const,
        starRating: 3,
        amenities: [],
        pricePerNight: null,
        checkInTime: null,
      };
  }
}
