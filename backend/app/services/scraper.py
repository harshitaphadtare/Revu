import requests
from bs4 import BeautifulSoup
import time
import random
import re
from datetime import date, datetime
from dateutil import parser
from dateutil.relativedelta import relativedelta
from typing import List
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
def scrape_amazon_reviews(url:str,max_pages:int = 2) -> List[SingleReview]:
    """
    Scrape reviews from an Amazon product page.
    Args:
        url (str): The URL of the Amazon product page.
        max_pages (int): Maximum number of review pages to scrape.
    Returns:
        List[SingleReview]: A list of scraped reviews.
    """
    reviews: List[SingleReview] = []
    
    for page in range(1, max_pages + 1):
        page_url = f"{url}?pageNumber={page}"
        try:
            response = requests.get(page_url, headers=get_headers(), timeout=10)
            if response.status_code != 200:
                print(f"Failed to fetch page {page} (status: {response.status_code})")
                break

            soup = BeautifulSoup(response.text, "html.parser")
            review_blocks = soup.select(".review") or soup.select(".a-section.review.aok-relative")
            
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
            time.sleep(random.uniform(1, 3))
        except Exception as e:
            print(f"Error scraping Amazon page {page}: {e}")
            break
    return reviews


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


def scrape_flipkart_reviews(url: str, max_pages: int = 2) -> List[SingleReview]:
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

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, timeout=60000)

        # If the current URL doesn't have "product-reviews", try to navigate to the reviews page
        if "product-reviews" not in page.url:
            print("Not on a reviews page, trying to navigate...")
            try:
                # Click on the link that leads to all reviews.
                all_reviews_link = page.locator('a:has-text("All reviews")').first
                if all_reviews_link.count() > 0:
                   all_reviews_link.click()
                   page.wait_for_url("**/product-reviews/**", timeout=10000)
                   print(f"Navigated to reviews page: {page.url}")
                else: # Fallback for different layouts
                    read_all_reviews_span = page.locator("div > span:has-text('All Reviews')").first
                    if read_all_reviews_span.count() > 0:
                        read_all_reviews_span.click()
                        page.wait_for_url("**/product-reviews/**", timeout=10000)
                        print(f"Navigated to reviews page: {page.url}")

            except Exception as e:
                print(f"Could not automatically navigate to 'All reviews' page. Please provide the direct reviews page URL. Error: {e}")
                # It might be that the initial URL is the one we need, so we continue
        
        for page_num in range(1, max_pages + 1):
            print(f"Scraping page {page_num}...")
            # Scroll to the bottom to ensure all content is loaded
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(3) 

            try:
                # Wait for the main review container to be present
                page.wait_for_selector("div.RcXBOT", timeout=10000)
            except Exception:
                print(f"Review container 'div.RcXBOT' not found on page {page_num}. Ending scrape.")
                break
            
            html = page.content()
            soup = BeautifulSoup(html, "html.parser")
            # This is the main container for each individual review
            review_blocks = soup.select("div.RcXBOT")

            if not review_blocks:
                print(f"No review blocks found on page {page_num}.")
                break

            for block in review_blocks:
                # Using the new, correct selectors
                rating_elem = block.select_one("div.XQDdHH")
                review_title_elem = block.select_one("p.z9E0IG")
                text_elem = block.select_one("div.ZmyHeo > div > div")
                name_elem = block.select_one("p._2NsDsF.AwS1CA")
                # The date is the last p tag with the class _2NsDsF within its parent
                date_elem = block.select("p._2NsDsF")[-1] if block.select("p._2NsDsF") else None

                review_text = text_elem.get_text(strip=True) if text_elem else ""
                
                # We only want to add reviews that have text content
                if review_text:
                    rating = float(rating_elem.get_text(strip=True)) if rating_elem else None
                    review_title = review_title_elem.get_text(strip=True) if review_title_elem else ""
                    reviewer_name = name_elem.get_text(strip=True) if name_elem else "Anonymous"
                    date_str = date_elem.get_text(strip=True) if date_elem else None

                    # Parse date into a datetime.date where possible
                    review_date = _parse_date_string(date_str)

                    reviews.append(
                        SingleReview(
                            reviewer_name=reviewer_name,
                            review_title=review_title,
                            review_text=review_text,
                            rating=rating,
                            review_date=review_date
                        )
                    )
            
            # Find the "Next" button and click it if it's not disabled
            next_btn = page.locator("a:has-text('Next')")
            if next_btn.count() > 0 and page_num < max_pages:
                print("Navigating to the next page...")
                try:
                    next_btn.first.click()
                    # Wait for the URL to change or for a network idle state
                    page.wait_for_load_state("networkidle", timeout=10000)
                    time.sleep(3)
                except Exception as e:
                    print(f"Could not click 'Next' button or page took too long to load. Stopping. Error: {e}")
                    break
            else:
                print("No 'Next' button found or max pages reached. Ending scrape.")
                break

        browser.close()

    print(f"Scraping complete. Found {len(reviews)} reviews.")
    return reviews


# Generic Scraper
def scrape_reviews(url: str, max_pages: int = 2) -> List[SingleReview]:
    """
    Generic function to scrape reviews based on the product 
    URL (Amazon or Flipkart).
    """
    if "amazon" in url:
        return scrape_amazon_reviews(url, max_pages)
    elif "flipkart" in url:
        return scrape_flipkart_reviews(url, max_pages)
    else:
        raise ValueError("Currently only supports Amazon and Flipkart URLs")