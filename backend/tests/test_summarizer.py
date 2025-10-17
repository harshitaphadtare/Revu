from unittest.mock import patch

from app.services.summarizer import chunk_text, generate_summary

def test_chunk_text_basic():
    text = " ".join(["word"] * 1050)  # 1050 words
    chunks = chunk_text(text, max_tokens=500)
    assert len(chunks) == 3
    assert all(isinstance(c, str) for c in chunks)
    assert sum(len(c.split()) for c in chunks) == 1050

@patch("app.services.summarizer.summarizer_model")
def test_generate_summary_mock(mock_model):
    """
    Mock the summarizer model to avoid slow real model inference.
    """
    mock_model.return_value = [{"summary_text": "This is a mock summary of reviews."}]

    reviews = [
        "The phone is great and has a good battery life.",
        "Camera performance is excellent with sharp photos.",
        "Display is bright and vibrant.",
    ]

    summary = generate_summary(reviews)

    assert isinstance(summary, str)
    assert "mock summary" in summary.lower()
    mock_model.assert_called()  # ensure summarizer was used


def test_generate_summary_empty_list():
    summary = generate_summary([])
    assert summary == "No reviews available for summary."
