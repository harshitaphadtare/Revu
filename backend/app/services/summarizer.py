import os
import re
from typing import List, Optional, Tuple

summarizer_model = None
_gemini_model_cache: Optional[Tuple[str, str]] = None  # (api_version, model_name)

def chunk_text(text, max_tokens=500):
    """
    Split text into chunks for summarization.
    We chunk long inputs to keep prompts/results manageable for APIs and reducers.
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

def _normalize_sentences(text: str, max_sentences: int = 2) -> str:
    """Normalize capitalization/punctuation and trim to N sentences."""
    if not text:
        return ""
    # Split on sentence boundaries and clean
    parts = re.split(r"(?<=[.!?])\s+|\n+", text.strip())
    cleaned: List[str] = []
    for p in parts:
        s = p.strip()
        if not s:
            continue
        # Capitalize first letter
        s = s[0:1].upper() + s[1:]
        # Ensure ending punctuation
        if s and s[-1] not in ".!?":
            s += "."
        cleaned.append(s)
        if len(cleaned) >= max_sentences:
            break
    return " ".join(cleaned)


def _limit_sentences_and_words(text: str, *, max_sentences: int, max_words: int) -> str:
    """Cap the output to at most N sentences and M words, preserving sentence boundaries when possible."""
    if not text:
        return ""
    # Split into sentences first and cap count
    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", text.strip()) if s.strip()]
    if not sents:
        return ""
    # If we have only one long sentence and we are allowed more, try heuristic splitting
    if len(sents) == 1 and max_sentences > 1:
        s = sents[0]
        words = s.split()
        if len(words) > 20:  # only split if it's long enough to benefit
            # Try splitting on discourse markers first
            markers = [
                " and ", " but ", " however ", " though ", " although ",
                " while ", " yet ", " still ", " also ", " because ", " since ",
            ]
            temp = s
            for m in markers:
                temp = temp.replace(m, ". ")
            # Split again on periods we just introduced
            parts = [p.strip() for p in temp.split(".") if p.strip()]
            if len(parts) >= 2:
                sents = [p + "." for p in parts][:max_sentences]
            else:
                # Fallback: chunk by words into up to max_sentences parts
                k = max_sentences
                per = max(1, len(words) // k)
                chunks = []
                for i in range(0, len(words), per):
                    chunks.append(" ".join(words[i:i+per]).strip())
                    if len(chunks) >= k:
                        break
                sents = [c for c in chunks if c]
    sents = sents[: max(1, max_sentences)]
    # Join and then cap words
    joined = " ".join(sents).strip()
    words = joined.split()
    if len(words) <= max_words:
        return _normalize_sentences(joined, max_sentences=max_sentences)
    trimmed = " ".join(words[:max_words]).rstrip(',;:')
    if trimmed and trimmed[-1] not in ".!?":
        trimmed += "."
    return _normalize_sentences(trimmed, max_sentences=max_sentences)

def _ensure_max_lines(text: str, max_lines: int = 4) -> str:
    if not text:
        return ""
    lines = [l.strip() for l in re.split(r"[\r\n]+", text) if l.strip()]
    if len(lines) <= max_lines:
        return text.strip()
    return "\n".join(lines[:max_lines]).strip()

def _map_reduce_summaries(map_summaries: List[str], *,
                          local_pipe=None,
                          max_length: int = 120,
                          min_length: int = 40) -> str:
    """Second-pass summarize: summarize the summaries for better coherence."""
    joined = " ".join([s for s in map_summaries if s]).strip()
    if not joined:
        return ""
    try:
        if local_pipe is not None:
            res = local_pipe(
                joined,
                max_length=max_length,
                min_length=min_length,
                do_sample=False,
                num_beams=2,
                length_penalty=1.0,
                no_repeat_ngram_size=3,
            )
            if isinstance(res, (list, tuple)) and res:
                return res[0].get("summary_text", "")
        # No remote API fallback to keep things simple.
    except Exception as e:
        print(f"Reduce summarization failed: {e}")
    return joined

def _summarize_textrank(text_blob: str, sentences: int = 3) -> str:
    """Simple TextRank-like frequency summarizer as last-resort fallback."""
    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", text_blob.strip()) if s.strip()]
    if not sents:
        return "No reviews available for summary."
    words = re.findall(r"[a-zA-Z]+", text_blob.lower())
    stop = set(
        "a an the and or but if while is are was were to of in for on with by as at from that this it be have has had not no do does did so such very can will would should could".split()
    )
    freqs = {}
    for w in words:
        if w in stop:
            continue
        freqs[w] = freqs.get(w, 0) + 1
    scored = []
    for s in sents:
        score = 0
        for w in re.findall(r"[a-zA-Z]+", s.lower()):
            if w in stop:
                continue
            score += freqs.get(w, 0)
        scored.append((score, s))
    scored.sort(key=lambda x: x[0], reverse=True)
    take = [s for _, s in scored[:max(1, sentences)]]
    out = " ".join(take).strip()
    if out and out[-1] not in ".!?":
        out += "."
    return out

def _list_gemini_models(api_key: str) -> List[Tuple[str, str]]:
    """Return list of (api_version, model_name) available for this key.

    Tries v1 first, then v1beta. Returns a list of tuples preserving discovery order.
    """
    results: List[Tuple[str, str]] = []
    try:
        import requests  # type: ignore
    except Exception:
        return results
    for ver in ("v1", "v1beta"):
        try:
            url = f"https://generativelanguage.googleapis.com/{ver}/models?key={api_key}"
            r = requests.get(url, timeout=10)
            if r.status_code != 200:
                try:
                    print(f"Gemini ListModels error {ver} {r.status_code}: {r.text[:300]}")
                except Exception:
                    print(f"Gemini ListModels error {ver} {r.status_code}")
                continue
            data = r.json() if r.content else {}
            models = data.get("models", []) if isinstance(data, dict) else []
            for m in models:
                name = m.get("name") or m.get("model") or ""
                if not name:
                    continue
                # Filter to models that support generateContent when the field exists
                methods = m.get("supportedGenerationMethods") or []
                if isinstance(methods, list) and methods:
                    if "generateContent" not in methods:
                        continue
                results.append((ver, _normalize_model_name(name)))
        except Exception as e:
            try:
                print(f"Gemini ListModels exception {ver}: {str(e)[:200]}")
            except Exception:
                pass
    return results

def _normalize_model_name(name: str) -> str:
    """Strip the 'models/' prefix if present, since REST URLs and SDK expect bare names.

    Examples:
      'models/gemini-2.5-flash' -> 'gemini-2.5-flash'
      'gemini-pro' -> 'gemini-pro'
    """
    try:
        name = (name or "").strip()
        if name.startswith("models/"):
            return name.split("/", 1)[1]
        return name
    except Exception:
        return name

def _pick_best_gemini_model(models: List[Tuple[str, str]]) -> Optional[Tuple[str, str]]:
    """Choose a good default: prefer flash, then pro, then first available."""
    if not models:
        return None
    # Prefer flash
    for ver, name in models:
        if "flash" in name:
            return (ver, name)
    # Then pro
    for ver, name in models:
        if "pro" in name:
            return (ver, name)
    # Else first
    return models[0]

def _resolve_gemini_model(api_key: str) -> Optional[Tuple[str, str]]:
    """Resolve a compatible (api_version, model_name) using env or discovery, with caching."""
    global _gemini_model_cache
    env_model = os.getenv("GEMINI_MODEL")
    if env_model:
        # We don't know version; try v1 first then v1beta
        _gemini_model_cache = ("v1", _normalize_model_name(env_model))
        return _gemini_model_cache
    if _gemini_model_cache:
        return _gemini_model_cache
    discovered = _list_gemini_models(api_key)
    picked = _pick_best_gemini_model(discovered)
    if picked:
        _gemini_model_cache = picked
        try:
            print(f"Gemini selected model: {_gemini_model_cache[0]}/{_normalize_model_name(_gemini_model_cache[1])}")
        except Exception:
            pass
    return _gemini_model_cache

def summarize_gemini(text: str, max_lines: int = 4) -> str:
    """Summarize a block of text using Gemini (Google Generative) API.

    Reads `GEMINI_API_KEY` from env.
    Returns empty string on failure so caller can fallback to TextRank.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return ""
    try:
        # Try Google Generative AI python lib (Gemini) first if available
        try:
            import google.generativeai as genai  # type: ignore
            genai.configure(api_key=api_key)
            # Resolve a compatible model if possible
            resolved = _resolve_gemini_model(api_key)
            model_candidates = [resolved[1]] if resolved else [
                os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
                "gemini-1.5-flash-latest",
                "gemini-1.0-pro",
                "gemini-pro",
            ]
            prompt = (
                "You are a concise review summarizer. Summarize the following product reviews into at most "
                f"{max_lines} sentences. Focus on sentiment, key strengths, and weaknesses. Avoid repetition and keep it human-like and fluent. "
                "Prefer short, crisp sentences; use proper sentence punctuation; do not use bullet points. Return only plain sentences.\n\n"
                "Reviews:\n" + text.strip()
            )
            for m in model_candidates:
                try:
                    model = genai.GenerativeModel(m)
                    resp = model.generate_content(prompt)
                    content = getattr(resp, "text", None)
                    if not content:
                        # Older SDK shapes
                        candidates = getattr(resp, "candidates", None) or []
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts and isinstance(parts[0], dict):
                                content = parts[0].get("text")
                    content = (content or "").strip()
                    if content:
                        content = _ensure_max_lines(content, max_lines=max_lines)
                        return content
                except Exception as e:
                    try:
                        print(f"Gemini SDK failed for model {m}: {str(e)[:200]}")
                    except Exception:
                        pass
            # If all SDK attempts failed, fall through to REST
        except Exception:
            # If google.generativeai not available or failed, try a simple REST call as a last attempt
            try:
                import requests
                resolved = _resolve_gemini_model(api_key)
                if resolved:
                    api_versions = [resolved[0], "v1beta", "v1"]
                    model_candidates = [resolved[1]]
                else:
                    api_versions = ["v1", "v1beta"]
                    model_candidates = [
                        os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
                        "gemini-1.5-flash-latest",
                        "gemini-1.0-pro",
                        "gemini-pro",
                    ]
                prompt_text = (
                    "You are a concise review summarizer. Summarize the following product reviews into at most "
                    f"{max_lines} sentences. Focus on sentiment, key strengths, and weaknesses. Avoid repetition and keep it human-like and fluent. "
                    "Prefer short, crisp sentences; use proper sentence punctuation; do not use bullet points. Return only plain sentences.\n\n"
                    "Reviews:\n" + text.strip()
                )
                payload = {"contents": [{"parts": [{"text": prompt_text}]}]}
                for ver in api_versions:
                    for m in model_candidates:
                        try:
                            url = f"https://generativelanguage.googleapis.com/{ver}/models/{m}:generateContent?key={api_key}"
                            r = requests.post(url, json=payload, timeout=15)
                            if r.status_code != 200:
                                try:
                                    print(f"Gemini REST error {ver}/{m} {r.status_code}: {r.text[:400]}")
                                except Exception:
                                    print(f"Gemini REST error {ver}/{m} {r.status_code}")
                                # Try next model/version
                                continue
                            data = r.json() if r.content else {}
                            content = ""
                            try:
                                candidates = data.get("candidates", []) if isinstance(data, dict) else []
                                if candidates:
                                    parts = candidates[0].get("content", {}).get("parts", [])
                                    if parts and isinstance(parts[0], dict):
                                        content = parts[0].get("text", "")
                            except Exception:
                                content = ""
                            content = (content or "").strip()
                            if content:
                                content = _ensure_max_lines(content, max_lines=max_lines)
                                return content
                        except Exception as re:
                            try:
                                print(f"Gemini REST exception {ver}/{m}: {str(re)[:200]}")
                            except Exception:
                                pass
                return ""
            except Exception as e:
                print(f"Gemini summarization failed (REST): {e}")
                return ""
    except Exception as e:
        print(f"Gemini summarization failed: {e}")
        return ""
# (Removed: legacy extractive summarizer helpers; TextRank is the fallback now.)


def generate_summary(review_text: list, *, backend: Optional[str] = None, mode: str = "descriptive", max_length=60, min_length=25) -> str:
    """ 
    Generate a concise summary from a list of reviews.
    Returns a 2–3 line summary.
    """
    if not review_text:
        return "No reviews available for summary."

    text_blob = " ".join(review_text)

    # Backend selection: param > env > default("gemini")
    if backend is None:
        backend = os.getenv("SUMMARY_BACKEND", "gemini").lower()
    mode = (mode or "descriptive").lower()

    # 1) If a test injected a model, use it (keeps unit tests fast)
    if summarizer_model is not None:
        print("Using injected summarizer_model")
        model = summarizer_model
        chunks = chunk_text(text_blob, max_tokens=350)
        parts: List[str] = []
        for ch in chunks:
            try:
                res = model(
                    ch,
                    max_length=max_length,
                    min_length=min_length,
                    do_sample=False,
                    num_beams=4,
                    length_penalty=1.0,
                    no_repeat_ngram_size=3,
                )
                if isinstance(res, (list, tuple)) and res:
                    parts.append(res[0].get("summary_text", ""))
            except Exception as e:
                print(f"Error summarizing chunk (injected): {e}")
        # Second pass (reduce)
        reduced = _map_reduce_summaries(parts, local_pipe=model, max_length=120, min_length=40)
        if not reduced:
            reduced = _summarize_textrank(text_blob)
        # Enforce requested format
        if mode == "short":
            return _limit_sentences_and_words(reduced, max_sentences=2, max_words=40)
        else:
            return _limit_sentences_and_words(reduced, max_sentences=6, max_words=150)

    # 2) Gemini first (map-reduce), else TextRank
    if backend == "gemini":
        # Map
        chunks = chunk_text(text_blob, max_tokens=800)
        map_summaries: List[str] = []
        for ch in chunks:
            # For short, keep map to 1–2 sentences; for long, keep 2 sentences
            s = summarize_gemini(ch, max_lines=(2 if mode == "short" else 2))
            if s:
                map_summaries.append(s)
        # Reduce
        if map_summaries:
            if len(map_summaries) == 1:
                final = map_summaries[0]
            else:
                reduce_input = "\n".join(map_summaries)
                final = summarize_gemini(reduce_input, max_lines=(2 if mode == "short" else 6))
            if final:
                if mode == "short":
                    return _limit_sentences_and_words(final, max_sentences=2, max_words=40)
                else:
                    return _limit_sentences_and_words(final, max_sentences=6, max_words=150)
    # If Gemini failed or empty, fall through to TextRank
    # Fall back to TextRank (fast, offline)
    textrank = _summarize_textrank(text_blob, sentences=(2 if mode == "short" else 5))
    if mode == "short":
        return _limit_sentences_and_words(textrank, max_sentences=2, max_words=40)
    else:
        return _limit_sentences_and_words(textrank, max_sentences=6, max_words=150)