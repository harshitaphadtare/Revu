"""Product review scraper.

Consolidated manual HTML scraper (requests + BeautifulSoup) for Amazon reviews.
SerpApi integration has been removed from the codebase.

Features:
- Extract reviewer name, star rating, review date, title, and body
- Simple pagination via pageNumber until ~max_reviews (default 300)
- IP protection: user-agent rotation, configurable delays, retry logic
- Basic error handling for network and parsing issues
- Progress tracking and cancellation support
"""
import os
import random
import re
import time
from typing import List, Optional, Callable, Tuple, Dict, Any
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

from app.models.schemas import SingleReview

# Pool of user agents for rotation to avoid detection
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]


def get_asin_from_url(url: str) -> Optional[str]:
    """Extract a 10-character ASIN from an Amazon product URL.

    Returns the ASIN (string) if found, otherwise None.
    """
    try:
        m = re.search(r"/(?:dp|gp/product|product-reviews)/([A-Za-z0-9]{10})", url)
        return m.group(1) if m else None
    except Exception:
        return None


def _extract_asin_from_url(url: str) -> Optional[str]:
    """Wrapper that uses get_asin_from_url helper.

    Keeps a private name for backward compatibility with existing callers in this module.
    """
    return get_asin_from_url(url)


def _scrape_amazon_reviews_raw(
    url: str,
    *,
    max_reviews: int = 300,
    session: Optional[requests.Session] = None,
    timeout: int = 20,
    pause_seconds: float = 1.0,
    progress_cb: Optional[Callable[[int], None]] = None,
    cancel_cb: Optional[Callable[[], None]] = None,
) -> List[Dict[str, Optional[str]]]:
    """Scrape reviews from an Amazon product URL using requests + BeautifulSoup.

    Returns a list of dicts with keys: reviewer, rating, date, title, body

    Raises:
        ValueError: if URL invalid
        requests.exceptions.RequestException: for network errors
    """
    # If the provided URL is not already a reviews page, try to find the
    # canonical "all reviews" link on the product page and use that as the
    # base for pagination. This keeps the behavior closer to what a browser
    # would follow and handles localized domains.
    def find_reviews_base(prod_url: str, sess: requests.Session) -> Optional[str]:
        # If URL already looks like a reviews URL, use it
        if "/product-reviews/" in prod_url or "/reviews/" in prod_url:
            return prod_url

        try:
            headers = {"User-Agent": random.choice(USER_AGENTS), "Accept-Language": "en-US,en;q=0.9"}
            r = sess.get(prod_url, headers=headers, timeout=15)
            r.raise_for_status()
            s = BeautifulSoup(r.text, "html.parser")
            # Common anchors pointing to all reviews
            selectors = [
                "a[data-hook='see-all-reviews-link-foot']",
                "a[data-hook='see-all-reviews-link']",
                "a[href*='/product-reviews/']",
                "a:has(span#acrCustomerReviewText)",
            ]
            for sel in selectors:
                el = s.select_one(sel)
                if el and el.get('href'):
                    href = el.get('href')
                    # Build absolute URL if necessary
                    if href.startswith('http'):
                        return href
                    parsed = urlparse(prod_url)
                    base = f"{parsed.scheme}://{parsed.netloc}"
                    return base + href
            # Fallback: search for text links that look like "See all reviews"
            for a in s.find_all('a'):
                txt = (a.get_text() or '').strip().lower()
                if 'see all reviews' in txt or 'see all customer reviews' in txt or 'all reviews' == txt:
                    href = a.get('href')
                    if href:
                        if href.startswith('http'):
                            return href
                        parsed = urlparse(prod_url)
                        base = f"{parsed.scheme}://{parsed.netloc}"
                        return base + href
        except Exception:
            return None
        return None

    sess = session or requests.Session()

    reviews_base = find_reviews_base(url, sess)
    if not reviews_base:
        # If we couldn't find a dedicated reviews page, attempt to use the
        # product URL directly — some sites render reviews on the product page.
        reviews_base = url

    # Derive a function that composes the paginated reviews URL. Amazon uses
    # `pageNumber` as a query param on most locales; so append/replace it.
    def reviews_url(page_num: int) -> str:
        parsed = urlparse(reviews_base)
        q = f"reviewerType=all_reviews&sortBy=recent&pageNumber={page_num}"
        # If reviews_base already has query params, preserve them when possible
        if parsed.query:
            # Strip existing pageNumber if present
            base_q = re.sub(r'pageNumber=\d+', '', parsed.query).strip('&')
            if base_q:
                return f"{parsed.scheme}://{parsed.netloc}{parsed.path}?{base_q}&{q}"
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path}?{q}"

    sess = session or requests.Session()
    
    results: List[Dict[str, Optional[str]]] = []
    page = 1
    consecutive_failures = 0
    max_consecutive_failures = 3

    while len(results) < max_reviews:
        # Check for cancellation
        if cancel_cb:
            try:
                cancel_cb()
            except Exception:
                raise
        
        # Rotate user agent for each request
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }
        
        url_page = reviews_url(page)
        
        # Retry logic with exponential backoff
        retry_count = 0
        max_retries = 3
        backoff_base = 2.0
        
        while retry_count < max_retries:
            try:
                # Add random delay between requests (1-3 seconds base + jitter)
                if page > 1 or retry_count > 0:
                    delay = pause_seconds + random.uniform(0.5, 2.0)
                    time.sleep(delay)
                
                resp = sess.get(url_page, headers=headers, timeout=timeout)
                resp.raise_for_status()
                consecutive_failures = 0  # Reset on success
                break
            except requests.exceptions.RequestException as e:
                retry_count += 1
                consecutive_failures += 1
                
                if retry_count >= max_retries:
                    print(f"Failed to fetch page {page} after {max_retries} retries: {e}")
                    if consecutive_failures >= max_consecutive_failures:
                        # Too many consecutive failures, stop scraping
                        print(f"Stopping scrape due to {consecutive_failures} consecutive failures")
                        return results
                    break
                
                # Exponential backoff
                backoff = backoff_base ** retry_count + random.uniform(0, 1)
                print(f"Retry {retry_count}/{max_retries} for page {page}, waiting {backoff:.2f}s")
                time.sleep(backoff)
        else:
            # Failed all retries, skip this page
            continue

        soup = BeautifulSoup(resp.text, "html.parser")

        # Detect potential bot-block or unexpected page
        if soup.select_one("form[action*='captcha']") or "Enter the characters you see" in resp.text:
            print("Captcha detected, stopping scrape to avoid blocking")
            break

        review_divs = soup.select("div[data-hook='review']")
        if not review_divs:
            # If no reviews found on first page, either wrong domain/path or structure changed
            if page == 1:
                print(f"No reviews found on first page for URL {reviews_base}")
                break
            # If later pages have none, stop pagination
            else:
                print(f"No more reviews found on page {page}, ending pagination")
                break

        for div in review_divs:
            # Reviewer name
            reviewer = None
            el = div.select_one("span.a-profile-name")
            if el:
                reviewer = el.get_text(strip=True)

            # Rating
            rating = None
            star_el = div.select_one("i[data-hook='review-star-rating'] span") or div.select_one(
                "i.a-icon-star-small span"
            )
            if star_el:
                m = re.search(r"([0-9]+(?:\.[0-9]+)?)", star_el.get_text(strip=True))
                if m:
                    rating = m.group(1)

            # Date
            date = None
            date_el = div.select_one("span[data-hook='review-date']")
            if date_el:
                date = date_el.get_text(strip=True)

            # Title
            title = None
            title_el = div.select_one("a[data-hook='review-title'] span") or div.select_one(
                "a[data-hook='review-title']"
            )
            if title_el:
                title = title_el.get_text(strip=True)

            # Body
            body = None
            body_el = div.select_one("span[data-hook='review-body'] span") or div.select_one(
                "span[data-hook='review-body']"
            )
            if body_el:
                body = body_el.get_text(" ", strip=True)

            results.append(
                {
                    "reviewer": reviewer,
                    "rating": rating,
                    "date": date,
                    "title": title,
                    "body": body,
                }
            )

            if len(results) >= max_reviews:
                break

        # Update progress based on reviews collected
        if progress_cb and max_reviews > 0:
            progress_pct = min(90, int((len(results) / max_reviews) * 80) + 10)
            try:
                progress_cb(progress_pct)
            except Exception:
                pass

        # Stop if we've reached the target
        if len(results) >= max_reviews:
            break

        # Next page
        page += 1

    return results


def _scrape_with_playwright(
    url: str,
    *,
    max_reviews: int = 300,
    pause_seconds: float = 1.5,
    progress_cb: Optional[Callable[[int], None]] = None,
    cancel_cb: Optional[Callable[[], None]] = None,
) -> List[Dict[str, Optional[str]]]:
    """Fallback scraper that uses Playwright to render pages when static
    requests fail (CAPTCHA, heavy JS, or different layout). Playwright is
    optional — this function will raise ImportError if it's not installed.
    """
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:
        raise ImportError("Playwright is not installed or available") from e

    results: List[Dict[str, Optional[str]]] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(user_agent=random.choice(USER_AGENTS))
        page = context.new_page()

        # If given a product URL, attempt to follow the reviews link same as
        # the requests-based finder; otherwise use the URL directly.
        try:
            page.goto(url, timeout=30000)
        except Exception:
            # give up early
            browser.close()
            return results

        # Try to click the 'see all reviews' link if present
        try:
            # Several selectors — try them in order
            selectors = [
                "a[data-hook='see-all-reviews-link-foot']",
                "a[data-hook='see-all-reviews-link']",
                "a[href*='/product-reviews/']",
            ]
            reviews_href = None
            for sel in selectors:
                el = page.query_selector(sel)
                if el:
                    try:
                        el.click()
                        page.wait_for_load_state('networkidle', timeout=10000)
                        break
                    except Exception:
                        href = el.get_attribute('href')
                        if href:
                            reviews_href = href
                            break
            if reviews_href:
                # build absolute
                parsed = urlparse(url)
                if not reviews_href.startswith('http'):
                    reviews_href = f"{parsed.scheme}://{parsed.netloc}{reviews_href}"
                page.goto(reviews_href, timeout=30000)
        except Exception:
            pass

        page_num = 1
        while len(results) < max_reviews:
            if cancel_cb:
                try:
                    cancel_cb()
                except Exception:
                    raise

            # Wait a short, jittered amount to mimic a human
            time.sleep(pause_seconds + random.uniform(0.3, 1.0))

            html = page.content()
            soup = BeautifulSoup(html, 'html.parser')
            # Reuse the same selectors as the requests path
            review_divs = soup.select("div[data-hook='review']")
            if not review_divs:
                # If nothing, try alternate selectors
                review_divs = soup.select("li[data-hook='review']") or soup.select("div[id^='customer_review-']")
            if not review_divs:
                break

            for div in review_divs:
                reviewer = None
                el = div.select_one("span.a-profile-name")
                if el:
                    reviewer = el.get_text(strip=True)

                rating = None
                star_el = div.select_one("i[data-hook='review-star-rating'] span") or div.select_one("i.a-icon-star-small span")
                if star_el:
                    m = re.search(r"([0-9]+(?:\.[0-9]+)?)", star_el.get_text(strip=True))
                    if m:
                        rating = m.group(1)

                date = None
                date_el = div.select_one("span[data-hook='review-date']")
                if date_el:
                    date = date_el.get_text(strip=True)

                title = None
                title_el = div.select_one("a[data-hook='review-title'] span") or div.select_one("a[data-hook='review-title']")
                if title_el:
                    title = title_el.get_text(strip=True)

                body = None
                body_el = div.select_one("span[data-hook='review-body'] span") or div.select_one("span[data-hook='review-body']")
                if body_el:
                    body = body_el.get_text(" ", strip=True)

                results.append({"reviewer": reviewer, "rating": rating, "date": date, "title": title, "body": body})
                if len(results) >= max_reviews:
                    break

            # Try to navigate to next page using the standard pageNumber param
            try:
                page_num += 1
                parsed = urlparse(page.url)
                next_q = f"reviewerType=all_reviews&sortBy=recent&pageNumber={page_num}"
                next_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}?{next_q}"
                page.goto(next_url, timeout=30000)
            except Exception:
                break

        try:
            browser.close()
        except Exception:
            pass

    return results


def scrape_amazon_reviews(
    url: str,
    max_pages: int = 2,
    *,
    max_reviews: Optional[int] = None,
    progress_cb: Optional[Callable[[int], None]] = None,
    cancel_cb: Optional[Callable[[], None]] = None,
) -> Tuple[Dict[str, Any], List[SingleReview]]:
    """Fetch Amazon reviews using the manual HTML scraper.

    Args:
        url: Amazon product URL
        max_reviews: Maximum number of reviews to fetch (default from env, capped at 300)
        progress_cb: Optional callback for progress updates
        cancel_cb: Optional callback to check for cancellation

    Returns:
        Tuple of (product_metadata, reviews_list)

    Raises:
        ValueError: If no ASIN found in URL or no reviews found
    """
    # We accept a product or reviews URL directly. The internal raw scraper will
    # follow the URL to the reviews section when necessary.
    # Get max_reviews from env if not specified, cap at 300
    if max_reviews is None:
        try:
            max_reviews = int(os.getenv("SCRAPER_MAX_REVIEWS", "300"))
        except Exception:
            max_reviews = 300
    
    # Hard cap at 300 reviews per scrape
    max_reviews = min(int(max_reviews), 300)
    
    print(f"Fetching Amazon reviews for URL: {url} (max: {max_reviews})")
    
    # Report initial progress
    if progress_cb:
        try:
            progress_cb(5)
        except Exception:
            pass
    
    # Check for cancellation
    if cancel_cb:
        try:
            cancel_cb()
        except Exception:
            raise
    
    # Scrape reviews using internal raw scraper
    product_meta = {}
    reviews_raw = []
    try:
        reviews_raw = _scrape_amazon_reviews_raw(
            url,
            max_reviews=max_reviews,
            pause_seconds=1.5,  # Increased delay to avoid IP blocking
            progress_cb=progress_cb,
            cancel_cb=cancel_cb,
        )
    except Exception as e:
        print(f"Scraper failed: {e}")
        raise

    # If the requests-based scraper returned nothing (or hit a captcha), try
    # a Playwright-based renderer when available. Playwright is optional.
    if not reviews_raw:
        try:
            try:
                reviews_raw = _scrape_with_playwright(
                    url,
                    max_reviews=max_reviews,
                    pause_seconds=1.5,
                    progress_cb=progress_cb,
                    cancel_cb=cancel_cb,
                )
                print(f"Playwright fallback fetched {len(reviews_raw)} reviews")
            except ImportError:
                print("Playwright not available; skipping rendered fallback")
        except Exception as ex:
            print(f"Playwright fallback failed: {ex}")
    
    # Convert to SingleReview objects
    reviews_list = []
    for review_data in reviews_raw:
        if cancel_cb:
            try:
                cancel_cb()
            except Exception:
                raise
        
        # Extract text from body or title
        text = (review_data.get("body") or review_data.get("title") or "").strip()
        
        # Parse rating
        rating_val = None
        rraw = review_data.get("rating")
        try:
            if isinstance(rraw, (int, float)):
                rating_val = float(rraw)
            elif isinstance(rraw, str):
                rating_val = float(rraw.split()[0])
        except Exception:
            rating_val = None
        
        reviews_list.append(SingleReview(
            review_text=text,
            rating=rating_val,
            review_date=review_data.get("date"),
        ))

    if len(reviews_list) == 0:
        print(f"No review bodies available for URL {url}; returning product metadata with empty reviews.")
    else:
        print(f"Successfully fetched {len(reviews_list)} Amazon reviews")
    
    if progress_cb:
        try:
            progress_cb(100)
        except Exception:
            pass
    
    return product_meta, reviews_list





def scrape_reviews(
    url: str,
    max_pages: int = 2,
    *,
    max_reviews: Optional[int] = None,
    progress_cb: Optional[Callable[[int], None]] = None,
    cancel_cb: Optional[Callable[[], None]] = None,
) -> Tuple[Dict[str, Any], List[SingleReview]]:
    """Generic function to scrape reviews based on the product URL.

    Supports Amazon only via the built-in manual scraper.
    Limited to 300 reviews per scrape to avoid IP blocking.

    Args:
        url: Product URL (Amazon)
        max_pages: Ignored (pagination handled by the scraper)
        max_reviews: Maximum number of reviews to fetch (capped at 300)
        progress_cb: Optional callback for progress updates
        cancel_cb: Optional callback to check for cancellation

    Returns:
        Tuple of (product_metadata, reviews_list)

    Raises:
        ValueError: If URL is not supported
    """
    # Get max_reviews from env if not specified, cap at 300
    if max_reviews is None:
        try:
            max_reviews = int(os.getenv("SCRAPER_MAX_REVIEWS", "300"))
        except Exception:
            max_reviews = 300
    
    # Hard cap at 300 reviews per scrape
    max_reviews = min(int(max_reviews), 300)
    
    url_lower = url.lower()

    if "amazon" in url_lower:
        return scrape_amazon_reviews(
            url,
            max_pages,
            max_reviews=max_reviews,
            progress_cb=progress_cb,
            cancel_cb=cancel_cb
        )
    else:
        raise ValueError(
            f"Unsupported URL: {url}. "
            f"Currently supported platform: Amazon. "
            f"Please provide a valid Amazon product URL."
        )


def scrapeAmazon(productUrl: str, **kwargs):
    """Alias for scrape_amazon_reviews (backward compatibility)."""
    return scrape_amazon_reviews(productUrl, **kwargs)
