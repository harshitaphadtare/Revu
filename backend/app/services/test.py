from app.services.scraper import scrape_reviews

url = "https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm6ac6485515ae4"
reviews = scrape_reviews(url, max_pages=2)


print(f"Fetched {len(reviews)} reviews.\n")
for r in reviews:
    print(r.review_text, r.rating, r.review_date)

