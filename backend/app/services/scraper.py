"""Apify-backed scraper facade.

This module exposes a thin wrapper used by callers in the codebase and
contains the Apify-based implementation for fetching Amazon reviews and
product details.

Actor configuration is customizable via env vars:
- APIFY_REVIEWS_ACTOR (examples: "epctex/amazon-reviews-scraper", "axesso_data/amazon-reviews-scraper")

To be resilient across different actors (which use slightly different input
schemas), we automatically detect and retry with an alternative payload shape
if the first attempt fails validation (e.g., "Field input.input is required").
"""

import re
import math
import json
from typing import Any, Dict, List, Optional, Tuple

import os
from dotenv import load_dotenv
from apify_client import ApifyClient

# SingleReview model is not required in this module; worker handles normalization


# Load environment (APIFY_API_TOKEN etc.) if present in a .env file
load_dotenv()


def _normalize_price(raw: Optional[Any]) -> Dict[str, Any]:
    """Normalize a raw price value to a dict with amount (float) and currency.

    Returns { 'raw': original, 'amount': float|None, 'currency': str|None }
    """
    out = {"raw": raw, "amount": None, "currency": None}
    if raw is None:
        return out
    # If already numeric
    try:
        if isinstance(raw, (int, float)):
            out["amount"] = float(raw)
            return out
    except Exception:
        pass
    s = str(raw).strip()
    out["raw"] = s
    # Look for currency symbol or code and numeric amount
    # Examples: "₹1,299.00", "1,299.00", "$19.99", "INR 1,299"
    # Try to find a currency symbol (non-digit, non-sep) and number
    m = re.search(r"(?P<currency>[₹$£€]|INR|Rs\.?|USD|EUR|GBP)?\s*(?P<number>[\d,]+(?:[\.,]\d+)?)", s, re.IGNORECASE)
    if m:
        num = m.group("number")
        try:
            num = num.replace(",", "")
            out["amount"] = float(num.replace(" ", ""))
        except Exception:
            out["amount"] = None
        cur = m.group("currency")
        if cur:
            cur = cur.replace("rs.", "INR").replace("Rs.", "INR").replace("Rs", "INR")
            cur = cur.upper().replace("₹", "INR").replace("$", "USD").replace("£", "GBP").replace("€", "EUR")
            out["currency"] = cur
        return out
    # As a last attempt, try to parse any float in the string
    m2 = re.search(r"([\d,]+(?:[\.,]\d+)?)", s)
    if m2:
        num = m2.group(1).replace(",", "")
        try:
            out["amount"] = float(num.replace(" ", ""))
        except Exception:
            out["amount"] = None
    return out


def _country_from_domain(domain_code: str) -> str:
    domain_code = (domain_code or "com").lower()
    mapping = {
        "com": "US",
        "in": "IN",
        "co.uk": "UK",
        "ca": "CA",
        "de": "DE",
        "fr": "FR",
        "it": "IT",
        "es": "ES",
        "com.br": "BR",
        "com.au": "AU",
        "com.mx": "MX",
        "co.jp": "JP",
    }
    return mapping.get(domain_code, "US")


def fetch_product_details(asin: str, domain_code: str = "com") -> Dict[str, Any]:
    """Attempt to fetch product details (name, price) using a product actor.

    Tries a configurable actor via APIFY_PRODUCT_ACTOR, with robust input shapes
    similar to reviews. Falls back to empty info if unavailable or failing.
    """
    token = os.getenv("APIFY_API_TOKEN")
    if not token:
        return {"productName": None, "price": None}

    client = ApifyClient(token)
    product_actor = os.getenv("APIFY_PRODUCT_ACTOR", "axesso_data/amazon-product-details")

    flat_input = {"asin": [asin], "country": _country_from_domain(domain_code)}
    nested_list_input = {"input": [{"asin": asin, "domainCode": domain_code}]}
    nested_object_input = {"input": {"input": [{"asin": asin, "domainCode": domain_code}]}}

    attempts: List[Tuple[str, Dict[str, Any]]] = []
    if product_actor.startswith("axesso") or "/axesso" in product_actor or product_actor.startswith("axesso_data/"):
        attempts = [("nested_object", nested_object_input), ("nested_list", nested_list_input), ("flat", flat_input)]
    else:
        attempts = [("flat", flat_input), ("nested_list", nested_list_input), ("nested_object", nested_object_input)]

    actor = client.actor(product_actor)
    last_err = None
    run = None
    for _, payload in attempts:
        try:
            run = actor.call(run_input=payload)
            break
        except Exception as e:
            last_err = e
            run = None
    if not run:
        return {"productName": None, "price": None}

    dataset_id = run.get("defaultDatasetId") or (run.get("output") or {}).get("defaultDatasetId")
    if not dataset_id:
        return {"productName": None, "price": None}
    ds = client.dataset(dataset_id)
    items = []
    try:
        items = ds.list_items().items or []
    except Exception:
        items = []
    if not items:
        return {"productName": None, "price": None}
    it = items[0]
    name = (
        it.get("productTitle") or it.get("title") or it.get("name") or (it.get("product") or {}).get("title")
    )
    price = (
        it.get("productPrice") or it.get("currentPrice") or it.get("price") or (it.get("product") or {}).get("price")
    )
    # Try to extract total review count from the product dataset if present
    count_reviews = None
    for k in ("countReviews", "countRatings", "reviewsCount", "reviews_count", "reviewCount", "totalReviews", "reviewsTotal", "review_count", "numReviews", "total_review_count", "count_ratings", "count_reviews"):
        try:
            v = it.get(k) if isinstance(it, dict) else None
            if not v and isinstance(it.get("product"), dict):
                v = (it.get("product") or {}).get(k)
            if v:
                count_reviews = int(v)
                break
        except Exception:
            continue
    # NOTE: manual HTML scraping of Amazon pages was removed — rely on product actor dataset
    # The product actor (if available) should provide a price; otherwise leave price as-is (possibly None).

    # Normalize price into consistent structure
    normalized = _normalize_price(price)
    return {"productName": name, "price": normalized, "countReviews": count_reviews}


def fetch_amazon_reviews(asin: str, max_reviews: int = 300, domain_code: str = "com") -> Tuple[List[dict], Dict[str, Any]]:
    token = os.getenv("APIFY_API_TOKEN")
    if not token:
        raise ValueError("APIFY_API_TOKEN is not set. Please add it to your .env file.")

    client = ApifyClient(token)
    # Force or default to the user-preferred actor unless overridden via env
    reviews_actor = os.getenv("APIFY_REVIEWS_ACTOR", "axesso_data/amazon-reviews-scraper")

    # Prepare multiple known input shapes to maximize compatibility across actors.
    # Shape A (epctex and similar): flat object with asin list + country.
    flat_input: Dict[str, Any] = {
        "asin": [asin],
        "maxReviews": max_reviews,
        "country": _country_from_domain(domain_code),
    }
    # Shape B1 (axesso variant): nested list under top-level "input" with domainCode and maxPages.
    nested_list_input: Dict[str, Any] = {
        "input": [
            {
                "asin": asin,
                "domainCode": domain_code,
                # Map desired max_reviews to pages (axesso caps to 10 pages, ~10 reviews/page)
                "maxPages": max(1, min(10, math.ceil((max_reviews or 100) / 10))),
            }
        ]
    }
    # Shape B2 (axesso variant used by some forks): top-level "input" object that contains an "input" list
    nested_object_input: Dict[str, Any] = {
        "input": {
            "input": [
                {
                    "asin": asin,
                    "domainCode": domain_code,
                    # Map desired max_reviews to pages (axesso caps to 10 pages)
                    "maxPages": max(1, min(10, math.ceil((max_reviews or 100) / 10))),
                }
            ]
        }
    }

    # Optional extra input provided via env for advanced actor options
    extra_input_raw = os.getenv("APIFY_REVIEWS_EXTRA_INPUT")
    if extra_input_raw:
        try:
            extra = json.loads(extra_input_raw)
            if isinstance(extra, dict):
                # Merge into all shapes to cover either attempt
                try:
                    flat_input.update(extra)
                except Exception:
                    pass
                # Carefully merge into axesso shapes but preserve computed maxPages unless explicitly provided
                try:
                    if "maxPages" in extra:
                        nested_list_input["input"][0]["maxPages"] = extra["maxPages"]
                    else:
                        for k, v in extra.items():
                            if k != "maxPages":
                                nested_list_input["input"][0][k] = v
                except Exception:
                    pass
                try:
                    if "maxPages" in extra:
                        nested_object_input["input"]["input"][0]["maxPages"] = extra["maxPages"]
                    else:
                        for k, v in extra.items():
                            if k != "maxPages":
                                nested_object_input["input"]["input"][0][k] = v
                except Exception:
                    pass
        except Exception:
            # Ignore malformed extra JSON
            pass

    actor = client.actor(reviews_actor)

    # Choose first attempt based on actor hint, then retry with the other on validation failure
    attempts: List[Tuple[str, Dict[str, Any]]] = []
    if reviews_actor.startswith("axesso") or "/axesso" in reviews_actor or reviews_actor.startswith("axesso_data/"):
        # Try the most strict/likely axesso shapes first, then fall back
        attempts = [
            ("nested_object", nested_object_input),
            ("nested_list", nested_list_input),
            ("flat", flat_input),
        ]
    else:
        attempts = [
            ("flat", flat_input),
            ("nested_list", nested_list_input),
            ("nested_object", nested_object_input),
        ]

    last_err: Optional[Exception] = None
    last_err_msg: Optional[str] = None
    for shape_name, payload in attempts:
        try:
            run = actor.call(run_input=payload)
            break
        except Exception as e:
            # Capture and inspect error; retry with alternative shape if it's a validation error
            last_err = e
            last_err_msg = str(e)
            # Common Apify validation messages reference "Field input.input is required" or similar
            # We don't filter too aggressively; simply try the other shape next.
            run = None
    else:
        # Both attempts failed; raise a clearer error that includes context
        hint = (
            "Attempted both payload shapes (flat and nested) and actor input validation still failed. "
            f"Actor: {reviews_actor}. Last error: {last_err_msg}"
        )
        raise RuntimeError(hint) from last_err

    dataset_id = run.get("defaultDatasetId") or (run.get("output") or {}).get("defaultDatasetId")
    if not dataset_id:
        raise RuntimeError("Apify run did not return a defaultDatasetId")
    ds = client.dataset(dataset_id)
    items = ds.list_items().items or []
    # Quick scan across all returned items for any product-level hints (countReviews, price)
    scanned_count_reviews = None
    try:
        for scan_item in items:
            if not isinstance(scan_item, dict):
                continue
            for k in (
                    "countReviews",
                    "countRatings",
                    "reviewsCount",
                    "reviews_count",
                    "reviewCount",
                    "totalReviews",
                    "reviewsTotal",
                    "review_count",
                    "numReviews",
                    "total_review_count",
                    "count_ratings",
                    "count_reviews",
                ):
                try:
                    v = scan_item.get(k)
                    if not v and isinstance(scan_item.get("product"), dict):
                        v = (scan_item.get("product") or {}).get(k)
                    if v:
                        try:
                            scanned_count_reviews = int(v)
                            break
                        except Exception:
                            continue
                except Exception:
                    continue
            if scanned_count_reviews:
                break
    except Exception:
        scanned_count_reviews = None

    product_info: Dict[str, Any] = {"productName": None, "price": None}
    if items:
        first_item = items[0]
        # Prefer explicit product-specific fields over generic 'title' which may be a review title.
        def _from_product_dict(d: dict, *keys):
            if not isinstance(d, dict):
                return None
            for k in keys:
                v = d.get(k)
                if v:
                    return v
            return None

        product_dict = first_item.get("product") or first_item.get("productInfo") or first_item.get("details")

        pname = (
            first_item.get("productTitle")
            or first_item.get("productName")
            or _from_product_dict(product_dict, "title", "name")
            or first_item.get("itemName")
            or first_item.get("asin")
        )
        pprice = (
            first_item.get("productPrice")
            or first_item.get("currentPrice")
            or first_item.get("price")
            or _from_product_dict(product_dict, "price", "currentPrice", "amount")
            or first_item.get("priceString")
            or first_item.get("cost")
            or first_item.get("amount")
        )
        # Prefer any scan-found countReviews across all items; otherwise check first_item
        count_reviews = scanned_count_reviews
        if count_reviews is None:
            for k in ("countReviews", "countRatings", "reviewsCount", "reviews_count", "reviewCount", "totalReviews", "reviewsTotal", "review_count", "numReviews", "total_review_count", "count_ratings", "count_reviews"):
                try:
                    v = first_item.get(k)
                    if not v and isinstance(first_item.get("product"), dict):
                        v = (first_item.get("product") or {}).get(k)
                    if v:
                        count_reviews = int(v)
                        break
                except Exception:
                    continue

        # Normalize the extracted price
        normalized_price = _normalize_price(pprice)
        product_info = {"productName": pname, "price": normalized_price, "countReviews": count_reviews}
    if max_reviews and isinstance(max_reviews, int) and max_reviews > 0:
        items = items[: max_reviews]

    # Best-effort fallback to fetch missing product info via a product actor
    if not product_info.get("productName") or not (product_info.get("price") and product_info.get("price").get("amount") is not None):
        try:
            details = fetch_product_details(asin=asin, domain_code=domain_code)
            if details:
                if not product_info.get("productName"):
                    product_info["productName"] = details.get("productName")
                # details may return price as raw string or normalized; normalize consistently
                dprice = details.get("price") if isinstance(details.get("price"), dict) else _normalize_price(details.get("price"))
                if not (product_info.get("price") and product_info.get("price").get("amount") is not None):
                    product_info["price"] = dprice
                # propagate countReviews if available
                if details.get("countReviews") and not product_info.get("countReviews"):
                    product_info["countReviews"] = details.get("countReviews")
        except Exception:
            pass

    return items, product_info


# Legacy wrappers removed: `_extract_asin` and `scrape_reviews` were unused in the
# current codebase. The worker calls `fetch_amazon_reviews` directly, so keeping
# this module focused on Apify helpers.

