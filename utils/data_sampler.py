import random
import re

# Regular expression to split strings into tokens based on common delimiters
TOKEN_SPLIT_RE = re.compile(r"[,\|;/]")

def is_useful_value(value: str) -> bool:
    """
    Determines if a string value is 'useful' for sampling.
    Filters out numbers, URLs, long strings, UUIDs, navigation keywords, 
    repeated characters, MIME types, and other non-informative tokens.
    """
    v = value.strip()

    if not v:
        return False

    # Reject merged identifiers (multiple values joined by common delimiters)
    if "," in v or "|" in v or ";" in v:
        return False

    # Reject query parameters or URL-like strings
    if "?" in v or "=" in v:
        return False

    # Reject pure numbers
    if v.isdigit():
        return False

    # Reject timestamps (e.g., "2023-01-26 12:30:00")
    if any(c.isdigit() for c in v) and "-" in v and ":" in v:
        return False

    # Reject UUID-like strings
    if len(v) > 30 and "-" in v:
        return False

    # Reject URLs or filesystem paths
    if "/" in v or "http" in v:
        return False

    # Reject MIME type fragments
    if "vnd." in v or "xml" in v:
        return False

    # Reject navigation keywords
    if v.lower() in {"next", "self", "prev"}:
        return False

    # Reject repeated-character flags (e.g., "aaaaaaa")
    if len(set(v)) == 1 and len(v) > 5:
        return False

    # Reject long sentences
    if len(v) > 35:
        return False

    # Must contain at least one letter
    if not any(c.isalpha() for c in v):
        return False

    return True

def extract_scalars(obj, results=None):
    """
    Recursively extract all scalar values (strings, numbers) from a nested structure 
    of dicts and lists, splitting merged fields into tokens, and filtering out
    non-useful values.
    """
    if results is None:
        results = []

    if isinstance(obj, dict):
        # Recursively process dictionary values
        for v in obj.values():
            extract_scalars(v, results)

    elif isinstance(obj, list):
        # Recursively process list elements
        for item in obj:
            extract_scalars(item, results)

    elif isinstance(obj, (str, int, float)):
        raw = str(obj).strip()

        if not raw:
            return results

        # Split merged strings using delimiters
        parts = TOKEN_SPLIT_RE.split(raw)

        for part in parts:
            token = part.strip()
            if is_useful_value(token):
                results.append(token)

    return results

def generate_samples(
    entries,
    max_samples=10,
    seed=None
):
    """
    Generate sample sets of high-quality tokens from a list of dictionary entries.

    Args:
        entries (list): List of dictionaries containing raw data.
        max_samples (int): Maximum number of sample sets to generate.
        seed (int, optional): Seed for reproducible random shuffling.

    Returns:
        list: List of sample sets, each containing 3 selected tokens.
    """
    if seed is not None:
        random.seed(seed)

    samples = []

    if not entries:
        return samples

    # Shuffle entries randomly
    entries = list(entries)
    random.shuffle(entries)

    for entry in entries:
        if len(samples) >= max_samples:
            break

        # Skip non-dictionary entries
        if not isinstance(entry, dict):
            continue

        # Extract all useful scalar values from the entry
        values = extract_scalars(entry)

        # Deduplicate while preserving order
        values = list(dict.fromkeys(values))

        # Sort values by length (longer values first)
        values.sort(key=len, reverse=True)

        # Scoring function to prioritize high-quality tokens
        def score(v):
            s = 0
            if v.isupper():       # Prefer all-caps identifiers
                s += 5
            if any(c.isdigit() for c in v):  # Prefer alphanumeric IDs
                s += 2
            if len(v) > 20:       # Penalize excessively long strings
                s -= 3
            if 4 <= len(v) <= 12: # Reward medium-length tokens
                s += 3
            if "/" in v or "http" in v: # Penalize paths/URLs
                s -= 5
            return s

        # Sort values by score
        values = sorted(values, key=score, reverse=True)

        # Strict filter: only uppercase letters, digits, and underscores
        strict = [
            v for v in values
            if re.fullmatch(r"[A-Z0-9_]+", v)
        ]

        # Relaxed filter: allow mixed-case, spaces, digits, and underscores
        relaxed = [
            v for v in values
            if re.fullmatch(r"[A-Za-z0-9_ ]+", v)
            and "/" not in v
            and "http" not in v
        ]

        final_vals = []

        # Prefer strict matches first
        for v in strict:
            if v not in final_vals:
                final_vals.append(v)

        # Fallback to relaxed matches if needed
        for v in relaxed:
            if len(final_vals) >= 3:
                break
            if v not in final_vals:
                final_vals.append(v)

        # Skip if fewer than 3 tokens remain
        if len(final_vals) < 3:
            continue

        # Select the first 3 tokens for the sample
        chosen = final_vals[:3]
        samples.append(chosen.copy())

    return samples
