import pytest
from app.services.preprocessing import clean_text

@pytest.mark.parametrize("input_text,expected", [
    ("  Hello   World  ", "hello world"),
    ("<b>Bold</b> Text", "bold text"),
    ("Check this https://example.com now!", "check this now"),
    ("@user this is #cool", "this is"),
    ("Love ❤️ Python!!!", "love python"),
    ("Check <b>this</b> link: https://example.com @user #fun 😎", "check this link"),
])
def test_clean_text(input_text, expected):
    assert clean_text(input_text) == expected

