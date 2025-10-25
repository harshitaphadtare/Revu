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


def test_generate_summary_modes_textrank():
    reviews = [
        "Battery life is solid. Lasts all day with moderate use.",
        "Camera is decent, but low-light performance could be better.",
        "Display is bright and colors pop nicely.",
        "Build quality feels premium and sturdy.",
    ]
    # Short mode: 1 line max
    short = generate_summary(reviews, backend="textrank", mode="short")
    assert isinstance(short, str)
    short_lines = [l for l in short.splitlines() if l.strip()]
    assert len(short_lines) <= 1

    # Descriptive mode: up to 4 lines
    desc = generate_summary(reviews, backend="textrank", mode="descriptive")
    assert isinstance(desc, str)
    desc_lines = [l for l in desc.splitlines() if l.strip()]
    assert 1 <= len(desc_lines) <= 4


@patch("app.services.summarizer.summarize_gemini")
def test_generate_summary_gemini_map_reduce(mock_ds):
    # Side effect varies output by requested max_lines to simulate map vs reduce
    def _fake_gemini(text: str, max_lines: int = 4) -> str:
        if max_lines == 1:
            return "One line."
        elif max_lines == 2:
            return "Map line 1.\nMap line 2."
        elif max_lines == 4:
            return "Reduced 1.\nReduced 2.\nReduced 3.\nReduced 4."
        return ""

    mock_ds.side_effect = _fake_gemini

    # Create a long text to ensure multiple chunks (chunk size ~800 words)
    long_reviews = [" ".join(["word"] * 900), " ".join(["word"] * 900)]  # ~1800 words

    summary = generate_summary(long_reviews, backend="gemini", mode="descriptive")
    assert isinstance(summary, str)
    lines = [l for l in summary.splitlines() if l.strip()]
    assert 1 <= len(lines) <= 4
    assert mock_ds.called


@patch("app.services.summarizer.summarize_gemini")
def test_generate_summary_gemini_single_chunk_short(mock_ds):
    mock_ds.return_value = "Only one line."
    reviews = [
        "Camera is great. Display is vivid. Battery lasts long.",
    ]
    summary = generate_summary(reviews, backend="gemini", mode="short")
    assert isinstance(summary, str)
    lines = [l for l in summary.splitlines() if l.strip()]
    assert len(lines) <= 1
    mock_ds.assert_called()
