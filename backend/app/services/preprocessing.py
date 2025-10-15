import re

def clean_text(text: str) -> str:
    """
    Cleans the input text:
    - Converts to lowercase
    - Removes HTML tags
    - Removes URLs
    - Removes mentions and hashtags
    - Removes emojis and non-alphanumeric symbols
    - Normalizes spaces
    """
    text = text.lower()
    text = re.sub(r"<.*?>", "", text)                    # remove HTML
    text = re.sub(r'http\S+|www\S+|https\S+', '', text)  # remove URLs
    text = re.sub(r'@\w+|#\w+', '', text)                # remove mentions and hashtags
    text = re.sub(r'[^\w\s]', '', text)                  # Remove emojis and other non-alphanumeric characters
    text = re.sub(r'\s+', ' ', text).strip()             # normalize spaces
    
    return text
