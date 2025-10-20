import requests
from bs4 import BeautifulSoup
import time
import random
import re
from datetime import date, datetime
from dateutil import parser
from dateutil.relativedelta import relativedelta
from typing import List, Optional, Callable
from urllib.parse import urljoin, urlparse, parse_qs
from app.models.schemas import SingleReview
from playwright.sync_api import sync_playwright

def get_headers():
    """
    Generate random headers to mimic different browsers.
    """
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101 Firefox/119.0"
    ]
    return {"User-Agent": random.choice(user_agents)}

# Amazon Scraper
def scrape_amazon_reviews(url: str, max_pages: int = 2, *, max_reviews: Optional[int] = None, progress_cb: Optional[Callable[[int], None]] = None) -> tuple:
    """
    Scrape reviews from an Amazon product page.
    Args:
        url (str): The URL of the Amazon product page.
        max_pages (int): Maximum number of review pages to scrape.
    Returns:
        List[SingleReview]: A list of scraped reviews.
    """
    reviews: List[SingleReview] = []

    total_pages = max_pages
    if max_reviews:
        # estimate pages required; Amazon typically 10 reviews per page
        total_pages = max(1, (max_reviews // 10) + 1)

    product_meta = {"name": None, "price": None, "price_value": None, "currency": None}

    for idx, page in enumerate(range(1, total_pages + 1), start=1):
        page_url = f"{url}?pageNumber={page}"
        try:
            response = requests.get(page_url, headers=get_headers(), timeout=10)
            if response.status_code != 200:
                print(f"Failed to fetch page {page} (status: {response.status_code})")
                break

            soup = BeautifulSoup(response.text, "html.parser")
            review_blocks = soup.select(".review") or soup.select(".a-section.review.aok-relative")

            # extract metadata on first page
            if idx == 1:
                title_elem = soup.select_one('#productTitle') or soup.select_one('span#productTitle') or soup.select_one('h1.a-size-large')
                raw_title = title_elem.get_text(strip=True) if title_elem else None
                product_meta["name"] = _clean_product_name(raw_title) if raw_title else None

                price_elem = soup.select_one('#priceblock_ourprice') or soup.select_one('#priceblock_dealprice') or soup.select_one('.a-price .a-offscreen')
                raw_price = price_elem.get_text(strip=True) if price_elem else None
                price_parsed = _parse_price_string(raw_price)
                product_meta.update(price_parsed)

            for block in review_blocks:
                text_elem = block.select_one(".review-text-content span")
                rating_elem = block.select_one(".a-icon-alt")
                date_elem = block.select_one(".review-date")

                review_text = text_elem.get_text(strip=True) if text_elem else ""
                rating = float(rating_elem.get_text(strip=True).split()[0]) if rating_elem else None
                date_str = date_elem.get_text(strip=True) if date_elem else None

                review_date = None
                if date_str:
                    if "on" in date_str:
                        date_part = date_str.split("on")[-1].strip()
                        try:
                            review_date = parser.parse(date_part).date()
                        except Exception:
                            review_date = None

                if review_text:
                    reviews.append(SingleReview(
                        review_text=review_text,
                        rating=rating,
                        review_date=review_date
                    ))
                    # stop if we've reached the requested max_reviews
                    if max_reviews and len(reviews) >= max_reviews:
                        if progress_cb:
                            try:
                                progress_cb(100)
                            except Exception:
                                pass
                        return product_meta, reviews

            # small delay between pages
            time.sleep(random.uniform(1, 3))

            # report intermediate progress based on pages
            if progress_cb:
                try:
                    pct = int((idx / total_pages) * 100)
                    progress_cb(min(99, pct))
                except Exception:
                    pass

        except Exception as e:
            print(f"Error scraping Amazon page {page}: {e}")
            break

    return product_meta, reviews


# Flipkart Scraper
def _parse_date_string(date_str: str):
    """
    Parse absolute and relative date strings into a datetime.date.
    Handles strings like "8 months ago", "2 days ago", "Yesterday", and
    normal absolute dates that dateutil.parser can handle.
    Returns a datetime.date or None if parsing fails.
    """
    if not date_str:
        return None
    s = date_str.strip()
    # Try absolute parsing first
    try:
        dt = parser.parse(s, fuzzy=True)
        return dt.date()
    except Exception:
        pass

    # Relative patterns like '8 months ago', 'a month ago', '2 days ago'
    m = re.search(r"(?P<num>\d+|a|an)\s+(?P<unit>hour|hours|day|days|month|months|year|years)\s+ago", s, flags=re.I)
    if m:
        num = m.group("num")
        num = 1 if num.lower() in ("a", "an") else int(num)
        unit = m.group("unit").lower()
        now = datetime.now()
        if unit.startswith("hour"):
            return (now - relativedelta(hours=num)).date()
        if unit.startswith("day"):
            return (now - relativedelta(days=num)).date()
        if unit.startswith("month"):
            return (now - relativedelta(months=num)).date()
        if unit.startswith("year"):
            return (now - relativedelta(years=num)).date()

    # Common words
    if re.search(r"\btoday\b", s, flags=re.I):
        return date.today()
    if re.search(r"\byesterday\b", s, flags=re.I):
        return date.today() - relativedelta(days=1)

    # If all else fails, return None so Pydantic sees null instead of invalid string
    return None


def _clean_product_name(raw: str) -> str:
    """Heuristic to extract a concise product name from a long title."""
    if not raw:
        return ""
    s = raw.strip()
    for sep in ["---", "|", "—", "–", " - ", "(", "[", "\n"]:
        if sep in s:
            s = s.split(sep)[0].strip()
    s = re.sub(r"\b\d{1,3}(?:\.\d+)?\s*(cm|inch|inches|mm)\b", "", s, flags=re.I).strip()
    for kw in [" with ", " Edition", " HD", " HD Ready", " Smart", " Smart TV", " Display", " Series"]:
        idx = s.lower().find(kw.strip().lower())
        if idx != -1:
            s = s[:idx].strip()
    s = re.sub(r"\s+", " ", s)
    return s


def _parse_price_string(price_str: Optional[str]):
    if not price_str:
        return {"price": None, "price_value": None, "currency": None}
    s = price_str.strip()
    m = re.search(r"([₹$£€]|Rs\.?|INR)\s*([\d,]+(?:[\.\d]+)?)", s)
    if m:
        currency = m.group(1)
        num = m.group(2)
        try:
            val = float(num.replace(",", ""))
        except Exception:
            val = None
        return {"price": s, "price_value": val, "currency": currency}
    m2 = re.search(r"([\d,]+(?:[\.\d]+)?)", s)
    if m2:
        num = m2.group(1)
        try:
            val = float(num.replace(",", ""))
        except Exception:
            val = None
        return {"price": s, "price_value": val, "currency": None}
    return {"price": s, "price_value": None, "currency": None}


def scrape_flipkart_reviews(
    url: str,
    max_pages: int = 3,
    *,
    start_page: Optional[int] = None,
    end_page: Optional[int] = None,
    max_reviews: Optional[int] = None,
    progress_cb: Optional[Callable[[int], None]] = None,
) -> tuple:
    """
    Scrape reviews from a Flipkart product page.

    Args:
        url (str): The URL of the Flipkart product page.
        max_pages (int): Maximum number of review pages to scrape.

    Returns:
        List[SingleReview]: A list of scraped reviews.
    """
    reviews: List[SingleReview] = []
    print(f"Starting scrape for URL: {url}")

    # Determine page range: prefer explicit start/end if provided; else use max_pages from page 1
    s_page = start_page if start_page is not None else 1
    e_page = end_page if end_page is not None else (max_pages if max_pages is not None else 1)
    if e_page < s_page:
        e_page = s_page

    # If max_reviews is supplied, we don't strictly need to know total pages; we'll stop when we reach the target
    total_pages = max(1, e_page - s_page + 1)

    product_meta = {"name": None, "price": None, "price_value": None, "currency": None}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, timeout=60000)

        # Attempt to extract product title and price from the main product page.
        try:
            initial_html = page.content()
            initial_soup = BeautifulSoup(initial_html, "html.parser")

            # 1) Common DOM selectors for product title
            title_elem = (
                initial_soup.select_one('span.B_NuCI')
                or initial_soup.select_one('span._35KyD6')
                or initial_soup.select_one('h1._2-cx7L')
                or initial_soup.select_one('title')
            )
            raw_title = title_elem.get_text(strip=True) if title_elem else None
            if raw_title:
                product_meta["name"] = _clean_product_name(raw_title)

            # 2) JSON-LD structured data
            if not product_meta.get("name") or not product_meta.get("price"):
                ld = initial_soup.find('script', type='application/ld+json')
                if ld and ld.string:
                    try:
                        import json as _json
                        data = _json.loads(ld.string)
                        if isinstance(data, list) and data:
                            data = data[0]
                        if isinstance(data, dict):
                            nm = data.get('name')
                            if nm and not product_meta.get("name"):
                                product_meta["name"] = _clean_product_name(nm)
                            offers = data.get('offers')
                            if isinstance(offers, dict):
                                price = offers.get('price')
                                curr = offers.get('priceCurrency')
                                if price and not product_meta.get("price"):
                                    try:
                                        pv = float(str(price).replace(',', ''))
                                    except Exception:
                                        pv = None
                                    product_meta.update({"price": str(price), "price_value": pv, "currency": curr})
                    except Exception:
                        pass

            # 3) Meta/OG tags for title and price
            if not product_meta.get("name"):
                og_title = initial_soup.select_one('meta[property="og:title"]') or initial_soup.select_one('meta[name="title"]')
                if og_title and og_title.get('content'):
                    product_meta["name"] = _clean_product_name(og_title.get('content'))

            if not product_meta.get("price"):
                price_elem = initial_soup.select_one('div._30jeq3._16Jk6d') or initial_soup.select_one('div._30jeq3')
                raw_price = price_elem.get_text(strip=True) if price_elem else None
                if raw_price:
                    product_meta.update(_parse_price_string(raw_price))
                else:
                    og_price = initial_soup.select_one('meta[property="product:price:amount"]')
                    if og_price and og_price.get('content'):
                        product_meta.update(_parse_price_string(og_price.get('content')))

            # 4) If meta still missing and we're on a reviews page, visit canonical product URL
            if (not product_meta.get("name") or not product_meta.get("price")) and "product-reviews" in page.url:
                canon = initial_soup.select_one('link[rel="canonical"]')
                canon_href = canon.get('href') if canon else None
                try:
                    if canon_href:
                        prod_url = canon_href if canon_href.startswith('http') else urljoin(page.url, canon_href)
                        page.goto(prod_url, timeout=15000)
                        page.wait_for_load_state("networkidle", timeout=10000)
                        prod_html = page.content()
                        prod_soup = BeautifulSoup(prod_html, "html.parser")
                        t2 = (
                            prod_soup.select_one('span.B_NuCI')
                            or prod_soup.select_one('span._35KyD6')
                            or prod_soup.select_one('h1._2-cx7L')
                            or prod_soup.select_one('title')
                        )
                        rt2 = t2.get_text(strip=True) if t2 else None
                        if rt2 and not product_meta.get("name"):
                            product_meta["name"] = _clean_product_name(rt2)
                        p2 = prod_soup.select_one('div._30jeq3._16Jk6d') or prod_soup.select_one('div._30jeq3')
                        rp2 = p2.get_text(strip=True) if p2 else None
                        if rp2 and not product_meta.get("price"):
                            product_meta.update(_parse_price_string(rp2))
                        # Go back to reviews base later when we compute it
                except Exception:
                    pass
        except Exception:
            pass

        # If the current URL doesn't have "product-reviews", try to navigate to the reviews page
        reviews_base_url = None
        if "product-reviews" not in page.url:
            print("Not on a reviews page, trying to navigate...")
            try:
                all_reviews_link = page.locator('a:has-text("All reviews")').first
                if all_reviews_link.count() > 0:
                    href = all_reviews_link.get_attribute('href')
                    if href:
                        reviews_base_url = href if href.startswith('http') else urljoin(page.url, href)
                        page.goto(reviews_base_url, timeout=10000)
                        page.wait_for_url("**/product-reviews/**", timeout=10000)
                        print(f"Navigated to reviews page: {page.url}")
                else:
                    read_all_reviews_span = page.locator("div > span:has-text('All Reviews')").first
                    if read_all_reviews_span.count() > 0:
                        read_all_reviews_span.click()
                        page.wait_for_url("**/product-reviews/**", timeout=10000)
                        reviews_base_url = page.url
                        print(f"Navigated to reviews page: {page.url}")
            except Exception as e:
                print(f"Could not automatically navigate to 'All reviews' page: {e}")
        else:
            reviews_base_url = page.url

        # Normalize base reviews URL by stripping query parameters
        if reviews_base_url and ("?" in reviews_base_url):
            reviews_base_url = reviews_base_url.split('?')[0]
        if not reviews_base_url:
            reviews_base_url = page.url

        next_url = None
        page_num = s_page
        idx = 0
        while True:
            idx += 1
            print(f"Scraping page {page_num}...")
            # Navigate to the appropriate page: first iteration use base, then use discovered next_url
            try:
                if page_num == s_page and idx == 1:
                    page.goto(reviews_base_url, timeout=20000)
                elif next_url:
                    page.goto(next_url, timeout=20000)
                else:
                    # fallback: append page param
                    fallback = reviews_base_url + ("&" if "?" in reviews_base_url else "?") + f"page={page_num}"
                    page.goto(fallback, timeout=20000)
                page.wait_for_load_state("networkidle", timeout=10000)
            except Exception:
                pass

            # Try to ensure content is loaded
            try:
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(2)
            except Exception:
                pass

            html = page.content()
            soup = BeautifulSoup(html, "html.parser")
            # Try multiple possible review card selectors (Flipkart changes classes)
            review_blocks = soup.select("div.RcXBOT, div._27M-vq, div.col.EYb05o, div._1AtVbE")
            if not review_blocks:
                print(f"No review blocks found on page {page_num}.")
                break

            for block in review_blocks:
                rating_elem = block.select_one("div.XQDdHH") or block.select_one("div._3LWZlK")
                text_elem = (
                    block.select_one("div.ZmyHeo > div > div")
                    or block.select_one("div.t-ZTKy > div > div")
                    or block.select_one("div.t-ZTKy")
                )
                date_elems = block.select("p._2NsDsF") or block.select("p._2sc7ZR")
                date_elem = date_elems[-1] if date_elems else None

                review_text = text_elem.get_text(strip=True) if text_elem else ""
                if not review_text:
                    continue

                rating = float(rating_elem.get_text(strip=True)) if rating_elem else None
                date_str = date_elem.get_text(strip=True) if date_elem else None

                review_date = _parse_date_string(date_str)

                reviews.append(SingleReview(
                    review_text=review_text,
                    rating=rating,
                    review_date=review_date
                ))

                if max_reviews and len(reviews) >= max_reviews:
                    if progress_cb:
                        try:
                            progress_cb(100)
                        except Exception:
                            pass
                    print(f"Reached target of {max_reviews} reviews. Stopping.")
                    try:
                        browser.close()
                    except Exception:
                        pass
                    return product_meta, reviews

            # Determine next page URL by scanning anchors that contain product-reviews and a page parameter
            try:
                anchors = soup.find_all('a', href=True)
                candidates = []
                for a in anchors:
                    href = a.get('href')
                    if not href or 'product-reviews' not in href:
                        continue
                    abs_href = urljoin(page.url, href)
                    qs = parse_qs(urlparse(abs_href).query)
                    if 'page' in qs and qs['page']:
                        try:
                            pnum = int(qs['page'][0])
                            candidates.append((pnum, abs_href))
                        except Exception:
                            continue
                target = [(p, u) for (p, u) in candidates if p == page_num + 1]
                if target:
                    next_url = target[0][1]
                else:
                    higher = [t for t in candidates if t[0] > page_num]
                    next_url = min(higher, default=(None, None))[1] if higher else None
            except Exception:
                next_url = None

            # progress
            if progress_cb:
                try:
                    if max_reviews:
                        pct = int((len(reviews) / max_reviews) * 100)
                        pct = min(99, pct)
                    else:
                        pct = int((idx / total_pages) * 100)
                        pct = min(99, pct)
                    progress_cb(pct)
                except Exception:
                    pass

            # Decide to continue or stop
            if page_num >= e_page or not next_url:
                break
            page_num += 1

        try:
            browser.close()
        except Exception:
            pass

    print(f"Scraping complete. Found {len(reviews)} reviews.")
    return product_meta, reviews


# Generic Scraper
def scrape_reviews(url: str, max_pages: int = 2, *, max_reviews: Optional[int] = None, progress_cb: Optional[Callable[[int], None]] = None) -> tuple:
    """
    Generic function to scrape reviews based on the product 
    URL (Amazon or Flipkart).
    """
    if "amazon" in url:
        return scrape_amazon_reviews(url, max_pages, max_reviews=max_reviews, progress_cb=progress_cb)
    elif "flipkart" in url:
        return scrape_flipkart_reviews(url, max_pages, max_reviews=max_reviews, progress_cb=progress_cb)
    else:
        raise ValueError("Currently only supports Amazon and Flipkart URLs")