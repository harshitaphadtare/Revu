/// <reference types="node" />
// Node-only utility to fetch Amazon reviews via SerpApi.
// Do NOT import this directly into client-side code; it requires a server/Node environment.

import { getJson } from "google-search-results-nodejs";

export interface Review {
  id?: string;
  title?: string;
  body?: string;
  rating?: number;
  rating_stars?: number;
  review_date?: string; // ISO date or localized string
  author?: string;
  author_profile?: string;
  verified_purchase?: boolean;
  images?: string[];
  videos?: string[];
  location?: string;
  helpful_vote_count?: number;
  [key: string]: any; // Forward-compatibility with SerpApi fields
}

export const MAX_REVIEWS_TO_FETCH = 100;
export const MAX_PAGES = 10;

/**
 * Fetch up to 100 most recent Amazon reviews for a given ASIN using SerpApi's amazon_reviews engine.
 *
 * Contract:
 * - Input: asin (string)
 * - Output: Promise<Review[]> (length <= 100)
 * - Errors: logs network/API errors and stops early; returns what was collected so far
 */
export async function fetchAmazonReviewsSerpApi(asin: string): Promise<Review[]> {
  if (!asin || typeof asin !== "string") {
    throw new Error("asin must be a non-empty string");
  }

  const apiKey = process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY || process.env.SERPAPI;
  if (!apiKey) {
    throw new Error("Missing SERPAPI_API_KEY in environment");
  }

  const collected: Review[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    console.log(`[SerpApi] Fetching amazon_reviews page ${page} for ASIN ${asin}`);

    const params: Record<string, string> = {
      api_key: apiKey,
      engine: "amazon_reviews",
      asin,
      page: String(page),
      sort_by: "recent",
    };

    try {
      const data: any = await getJson(params);

      const reviews: Review[] = Array.isArray(data?.reviews) ? (data.reviews as Review[]) : [];
      if (!reviews.length) {
        console.log(`[SerpApi] No reviews on page ${page}; stopping.`);
        break;
      }

      collected.push(...reviews);

      if (collected.length >= MAX_REVIEWS_TO_FETCH) {
        console.log(`[SerpApi] Reached MAX_REVIEWS_TO_FETCH=${MAX_REVIEWS_TO_FETCH}; stopping.`);
        break;
      }

      const hasNext = Boolean(data?.pagination && data.pagination.next_page);
      if (!hasNext) {
        console.log(`[SerpApi] No next page after ${page}; stopping.`);
        break;
      }
    } catch (err: any) {
      console.error(`[SerpApi] Error fetching page ${page} for ASIN ${asin}:`, err?.message || err);
      break; // Stop on error to avoid repeated failures
    }
  }

  return collected.slice(0, MAX_REVIEWS_TO_FETCH);
}
