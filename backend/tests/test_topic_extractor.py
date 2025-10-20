from unittest.mock import patch

from app.services.topic_extractor import extract_keywords


@patch("app.services.topic_extractor._get_keybert", return_value=None)
def test_extract_keywords_basic_fallback(_mock_kb):
	texts = [
		"Battery life is good. Battery lasts long.",
		"The camera is good, camera quality excellent.",
		"Display is bright and amazing. Display looks great.",
	]
	keywords = extract_keywords(texts)

	# Should return a non-empty list of strings
	assert isinstance(keywords, list)
	assert all(isinstance(k, str) for k in keywords)
	assert len(keywords) > 0

	# High-frequency domain terms should appear
	expected = {"battery", "camera", "display"}
	assert expected.issubset(set(keywords))


@patch("app.services.topic_extractor._get_keybert", return_value=None)
def test_extract_keywords_stopwords_removed(_mock_kb):
	texts = ["The the the is is are in on a an and or to of"]
	keywords = extract_keywords(texts)
	# With only stopwords, fallback should produce empty list
	assert keywords == []


@patch("app.services.topic_extractor._get_keybert", return_value=None)
def test_extract_keywords_empty_input(_mock_kb):
	assert extract_keywords([]) == []

