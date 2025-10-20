from typing import Optional

summarizer_model = None
_summarizer_model = None


def _init_summarizer():
    global _summarizer_model
    # If a test or caller provided a pre-initialized summarizer, use it
    if 'summarizer_model' in globals() and summarizer_model is not None:
        _summarizer_model = summarizer_model
        return _summarizer_model
    if _summarizer_model is not None:
        return _summarizer_model
    try:
        from transformers import pipeline
        # Prefer TF if present to avoid forcing torch
        try:
            import tensorflow as tf  # type: ignore
            framework = "tf"
        except Exception:
            framework = None

        if framework:
            _summarizer_model = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6", framework=framework)
        else:
            _summarizer_model = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
        # keep the public alias in sync
        globals()["summarizer_model"] = _summarizer_model
    except Exception as e:
        print(f"Summarizer init failed: {e}")
        _summarizer_model = None
    return _summarizer_model


def chunk_text(text, max_tokens=500):
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

def generate_summary(review_text: list, max_length=60, min_length=25) -> str:
    """ 
    Generate a concise summary from a list of reviews.
    Returns a 2–3 line summary.
    """
    if not review_text:
        return "No reviews available for summary."

    text_blob = " ".join(review_text)

    model = summarizer_model or _init_summarizer()
    if model is None:
        sentences = text_blob.replace("\n", " ").split(". ")
        short_summary = ". ".join(sentences[:2]).strip()
        if not short_summary.endswith("."):
            short_summary += "."
        return short_summary

    chunks = chunk_text(text_blob, max_tokens=400)
    check_summaries = []
    for chunk in chunks:
        try:
            summary = model(chunk, max_length=max_length, min_length=min_length, do_sample=False)
            if isinstance(summary, (list, tuple)) and summary:
                check_summaries.append(summary[0].get('summary_text', ''))
        except Exception as e:
            print(f"Error summarizing chunk: {e}")

    final_text = " ".join(check_summaries).strip()
    if not final_text:
        sentences = text_blob.replace("\n", " ").split(". ")
        short_summary = ". ".join(sentences[:2]).strip()
        if not short_summary.endswith("."):
            short_summary += "."
        return short_summary

    sentences = final_text.split(". ")
    short_summary = ". ".join(sentences[:2]).strip()
    if not short_summary.endswith("."):
        short_summary += "."
    return short_summary