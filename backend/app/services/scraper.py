import requests
from bs4 import BeautifulSoup
import time
import random
from dateutil import parser
from typing import List
from app.models.schemas import SingleReview

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
                    try:
                        review_date = parser.parse(date_str).date()
                    except:
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
    
    for page in range(1, max_pages + 1):
        page_url = f"{url}&page={page}"
        try:
            response = requests.get(page_url, headers=get_headers(), timeout=10)
            if response.status_code != 200:
                print(f"Failed to fetch page {page} (status: {response.status_code})")
                break
            
            soup = BeautifulSoup(response.text, "html.parser")
            review_blocks = soup.select("div._16PBlm")
            
            for block in review_blocks:
                text_elem = block.select_one("div.qwjRop")
                rating_elem = block.select_one("div._3LWZlK")
                date_elem = block.select_one("p._2sc7ZR")
                
                review_text = text_elem.get_text(strip=True) if text_elem else ""
                rating = float(rating_elem.get_text(strip=True)) if rating_elem else None
                date_str = date_elem.get_text(strip=True) if date_elem else None
                
                review_date = None
                if date_str:
                    try:
                        review_date = parser.parse(date_str).date()
                    except:
                        review_date = None
                
                if review_text:
                    reviews.append(SingleReview(
                        review_text=review_text,
                        rating=rating,
                        review_date=review_date
                    ))
            time.sleep(random.uniform(1, 3))
        except Exception as e:
            print(f"Error scraping Flipkart page {page}: {e}")
            break
    
    return reviews

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