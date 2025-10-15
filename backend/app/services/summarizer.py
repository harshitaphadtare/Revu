from transformers import pipeline

summarizer_model = pipeline("summarization",model='sshleifer/distilbart-cnn-12-6')

def chunk_text(text,max_tokens=500):
    """
    Split text into chunks for summarization.
    HuggingFace models have a max token limit (~1024 tokens for distilbart-cnn).
    """
    words = text.split()
    chunks = []
    current_chunk = []
    current_len = 0

    for word in words: 
        current_chunk.append(word)
        current_len += 1
        
        if current_len >= max_tokens:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
            current_len = 0

    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    return chunks

def generate_summary(review_text: list,max_length=60,min_length=25) -> str:
    """ 
    Generate a concise summary from a list of reviews.
    Returns a 2–3 line summary.
    """
    if not review_text:
        return "No reviews available for summary."
    
    #combine all reviews into one text blob
    text_blob = " ".join(review_text)

    #split into chunks 
    chunks = chunk_text(text_blob,max_tokens=400)

    check_summaries = []
    for chunk in chunks:
        try:
            summary = summarizer_model(chunk, max_length=max_length, min_length=min_length, do_sample=False)
            check_summaries.append(summary[0]['summary_text'])
        except Exception as e:
            print(f"Error summarizing chunk: {e}")

    #combine chunk summaries into final summary
    final_text = " ".join(check_summaries)

    #truncate to first 2-3 sentences 
    sentences = final_text.split(". ")
    short_summary = ". ".join(sentences[:2]).strip()
    if not short_summary.endswith("."):
        short_summary += "."

    return short_summary