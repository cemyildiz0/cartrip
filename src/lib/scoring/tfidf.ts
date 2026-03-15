import type {
  Stop,
  StopCategory,
  UserPreferences,
  TfIdfDocument,
} from "@/types";

function normalizeTerms(raw: string[]): string[] {
  return raw
    .flatMap((t) => t.toLowerCase().split(/[\s\-_/&,]+/))
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length > 1);
}

const GOOGLE_TYPE_TO_CUISINE: Record<string, string> = {
  meal_delivery: "delivery",
  meal_takeaway: "takeaway",
  bakery: "bakery",
  cafe: "coffee cafe",
  bar: "bar",
  night_club: "nightlife",
};

function priceLevelToTerm(level: number | null): string {
  if (level === null) return "moderate";
  if (level <= 1) return "budget";
  if (level === 2) return "moderate";
  return "premium";
}

function starRatingToBucket(rating: number): string {
  if (rating >= 4) return "luxury";
  if (rating >= 3) return "midrange";
  return "economy";
}

export function tokenizeStop(stop: Stop): string[] {
  const nameTerms = normalizeTerms([stop.name]);
  const attrs = stop.attributes;

  switch (attrs.category) {
    case "fuel": {
      const brandTerms = normalizeTerms([attrs.brand]);
      const amenityTerms = normalizeTerms(attrs.amenities);
      const priceTerm = priceLevelToTerm(stop.priceLevel);
      return [...nameTerms, ...brandTerms, ...amenityTerms, priceTerm, "fuel"];
    }
    case "restaurant": {
      const cuisineTerms = normalizeTerms(attrs.cuisineTypes);
      const mappedTerms = attrs.cuisineTypes.flatMap((c) => {
        const mapped = GOOGLE_TYPE_TO_CUISINE[c.toLowerCase()];
        return mapped ? normalizeTerms([mapped]) : [];
      });
      const priceTerm = normalizeTerms([attrs.priceRange]);
      return [
        ...nameTerms,
        ...cuisineTerms,
        ...mappedTerms,
        ...priceTerm,
        priceLevelToTerm(stop.priceLevel),
        "restaurant",
      ];
    }
    case "hotel": {
      const amenityTerms = normalizeTerms(attrs.amenities);
      const starBucket = starRatingToBucket(attrs.starRating);
      const priceTerm = priceLevelToTerm(stop.priceLevel);
      return [
        ...nameTerms,
        ...amenityTerms,
        starBucket,
        priceTerm,
        "hotel",
        "lodging",
      ];
    }
    case "rest": {
      const features: string[] = [];
      if (attrs.hasRestrooms) features.push("restrooms");
      if (attrs.hasPicnicArea) features.push("picnic");
      if (attrs.hasVendingMachines) features.push("vending");
      return [...nameTerms, ...features, "rest", "stop"];
    }
  }
}

export function tokenizePreferences(
  preferences: UserPreferences,
  category: StopCategory,
): string[] {
  switch (category) {
    case "fuel": {
      const brandTerms = normalizeTerms(preferences.preferredBrands);
      return [...brandTerms, preferences.fuelBudgetLevel];
    }
    case "restaurant": {
      const cuisineTerms = normalizeTerms(preferences.dining.cuisineTypes);
      const dietaryTerms = normalizeTerms(preferences.dining.dietaryRestrictions);
      return [...cuisineTerms, ...dietaryTerms, preferences.dining.budgetLevel];
    }
    case "hotel": {
      const amenityTerms = normalizeTerms(preferences.lodging.amenities);
      const starBucket = starRatingToBucket(preferences.lodging.minStarRating);
      return [...amenityTerms, starBucket, preferences.lodging.budgetLevel];
    }
    case "rest": {
      return ["restrooms", "rest"];
    }
  }
}

export function computeTf(terms: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const term of terms) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  const len = terms.length || 1;
  const tf = new Map<string, number>();
  counts.forEach((count, term) => {
    tf.set(term, count / len);
  });
  return tf;
}

export function computeIdf(documents: TfIdfDocument[]): Map<string, number> {
  const N = documents.length;
  const df = new Map<string, number>();

  for (const doc of documents) {
    const seen = new Set<string>();
    for (const term of doc.terms) {
      if (!seen.has(term)) {
        df.set(term, (df.get(term) ?? 0) + 1);
        seen.add(term);
      }
    }
  }

  const idf = new Map<string, number>();
  df.forEach((freq, term) => {
    idf.set(term, Math.log(N / (1 + freq)));
  });
  return idf;
}

function computeTfIdfVector(
  tf: Map<string, number>,
  idf: Map<string, number>,
): Map<string, number> {
  const vec = new Map<string, number>();
  tf.forEach((tfVal, term) => {
    const idfVal = idf.get(term) ?? 0;
    if (idfVal > 0) {
      vec.set(term, tfVal * idfVal);
    }
  });
  return vec;
}

export function cosineSimilarity(
  vecA: Map<string, number>,
  vecB: Map<string, number>,
): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  vecA.forEach((valA, term) => {
    magA += valA * valA;
    const valB = vecB.get(term);
    if (valB !== undefined) {
      dot += valA * valB;
    }
  });

  vecB.forEach((valB) => {
    magB += valB * valB;
  });

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  if (magnitude === 0) return 0;
  return dot / magnitude;
}

export function computePreferenceScores(
  stops: Stop[],
  preferences: UserPreferences,
  category: StopCategory,
): Map<string, number> {
  if (stops.length === 0) return new Map();

  const documents: TfIdfDocument[] = stops.map((stop) => {
    const terms = tokenizeStop(stop);
    return {
      stopId: stop.id,
      terms,
      tfVector: computeTf(terms),
    };
  });

  const queryTerms = tokenizePreferences(preferences, category);
  const queryTf = computeTf(queryTerms);

  const queryDoc: TfIdfDocument = {
    stopId: "__query__",
    terms: queryTerms,
    tfVector: queryTf,
  };
  const allDocs = [...documents, queryDoc];

  const idf = computeIdf(allDocs);

  const queryVec = computeTfIdfVector(queryTf, idf);

  const scores = new Map<string, number>();
  for (const doc of documents) {
    const docVec = computeTfIdfVector(doc.tfVector, idf);
    scores.set(doc.stopId, cosineSimilarity(queryVec, docVec));
  }

  return scores;
}
