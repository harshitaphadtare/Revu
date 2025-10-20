from unittest.mock import patch

from app.services.sentiment import analyze_sentiment


@patch("app.services.sentiment._get_transformers_pipeline", return_value=None)
def test_sentiment_positive_fallback(_mock_pipe):
	reviews = [{"clean_text": "This phone is excellent and I love it!"}]
	res = analyze_sentiment(reviews)
	assert len(res) == 1
	assert res[0]["sentiment"] == "POSITIVE"
	assert 0.5 <= res[0]["score"] <= 1.0


@patch("app.services.sentiment._get_transformers_pipeline", return_value=None)
def test_sentiment_negative_fallback(_mock_pipe):
	reviews = [{"clean_text": "Terrible battery and the worst camera. I hate it."}]
	res = analyze_sentiment(reviews)
	assert len(res) == 1
	assert res[0]["sentiment"] == "NEGATIVE"
	assert 0.5 <= res[0]["score"] <= 1.0


@patch("app.services.sentiment._get_transformers_pipeline", return_value=None)
def test_sentiment_neutral_when_no_cues(_mock_pipe):
	reviews = [{"clean_text": ""}]
	res = analyze_sentiment(reviews)
	assert len(res) == 1
	assert res[0]["sentiment"] == "NEUTRAL"
	# empty text may have low confidence
	assert 0.0 <= res[0]["score"] <= 0.5


@patch("app.services.sentiment._get_transformers_pipeline", return_value=None)
def test_sentiment_uses_rating_when_available(_mock_pipe):
	# High rating should map to POSITIVE
	reviews = [
		{"clean_text": "", "rating": 5},
		{"clean_text": "", "rating": 1},
		{"clean_text": "", "rating": 3},
	]
	res = analyze_sentiment(reviews)
	assert [r["sentiment"] for r in res] == ["POSITIVE", "NEGATIVE", "NEUTRAL"]


@patch("app.services.sentiment._get_transformers_pipeline", return_value=None)
def test_sentiment_batch_size_preserved(_mock_pipe):
	reviews = [
		{"clean_text": "good camera and excellent display"},
		{"clean_text": "bad battery and worst heating"},
		{"clean_text": "normal use, nothing special"},
	]
	res = analyze_sentiment(reviews)
	assert len(res) == len(reviews)
	assert all("sentiment" in r and "score" in r for r in res)

