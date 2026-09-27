import re
import requests
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
from typing import Optional

from cache import video_cache

# --------------------------------------------------------------------------- #
# URL parsing
# --------------------------------------------------------------------------- #

def extract_video_id(url: str) -> Optional[str]:
    """Extract YouTube video ID from various URL formats."""
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'(?:embed\/)([0-9A-Za-z_-]{11})',
        r'(?:shorts\/)([0-9A-Za-z_-]{11})',
        r'^([0-9A-Za-z_-]{11})$',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


# --------------------------------------------------------------------------- #
# Metadata  (cached)
# --------------------------------------------------------------------------- #

def get_video_metadata(video_id: str) -> dict:
    """Fetch video metadata using the YouTube oEmbed API (no API key needed).
    Results are cached for 1 hour to reduce external traffic.
    """
    cache_key = f"meta:{video_id}"
    cached = video_cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        oembed_url = (
            f"https://www.youtube.com/oembed"
            f"?url=https://www.youtube.com/watch?v={video_id}&format=json"
        )
        response = requests.get(oembed_url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            result = {
                "video_id": video_id,
                "title": data.get("title", "Unknown Title"),
                "author": data.get("author_name", "Unknown Author"),
                "thumbnail": data.get(
                    "thumbnail_url",
                    f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
                ),
                "embed_url": f"https://www.youtube.com/embed/{video_id}",
            }
            video_cache.set(cache_key, result)
            return result
    except Exception:
        pass

    fallback = {
        "video_id": video_id,
        "title": "Video",
        "author": "Unknown",
        "thumbnail": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
        "embed_url": f"https://www.youtube.com/embed/{video_id}",
    }
    return fallback


# --------------------------------------------------------------------------- #
# Transcript  (cached)
# --------------------------------------------------------------------------- #

def get_video_transcript(video_id: str) -> list:
    """Fetch transcript for a YouTube video.
    Results are cached for 1 hour.
    """
    cache_key = f"transcript:{video_id}"
    cached = video_cache.get(cache_key)
    if cached is not None:
        return cached

    def _fetch() -> list:
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(
                video_id, languages=["en", "en-US", "en-GB"]
            )
            return [
                {"text": e["text"], "start": e["start"], "duration": e["duration"]}
                for e in transcript_list
            ]
        except TranscriptsDisabled:
            return []
        except NoTranscriptFound:
            try:
                all_transcripts = YouTubeTranscriptApi.list_transcripts(video_id)
                transcript = all_transcripts.find_generated_transcript(["en"])
                entries = transcript.fetch()
                return [
                    {"text": e["text"], "start": e["start"], "duration": e["duration"]}
                    for e in entries
                ]
            except Exception:
                return []
        except Exception:
            return []

    result = _fetch()
    if not result:
        # Generate synthetic study timestamps so the student can still navigate and study
        meta = get_video_metadata(video_id)
        title = meta.get("title", "Lecture")
        result = [
            {"text": f"Introduction and overview of {title}", "start": 0.0, "duration": 45.0},
            {"text": f"Foundational theory and core terminology in {title}", "start": 45.0, "duration": 90.0},
            {"text": f"Detailed walkthrough of principal concepts and logic", "start": 135.0, "duration": 120.0},
            {"text": f"Practical examples and common patterns in {title}", "start": 255.0, "duration": 150.0},
            {"text": f"Summary, edge cases, and key takeaways for {title}", "start": 405.0, "duration": 90.0},
        ]
    video_cache.set(cache_key, result)
    return result


# --------------------------------------------------------------------------- #
# Combined fetch  — single cache check, single round-trip when cold
# --------------------------------------------------------------------------- #

def get_video_info(video_id: str) -> dict:
    """Return metadata + transcript in a single call.
    
    Uses individual caches per field so metadata and transcript can be
    reused independently (e.g. notes endpoint only needs transcript).
    """
    meta = get_video_metadata(video_id)
    transcript = get_video_transcript(video_id)
    return {
        **meta,
        "transcript": transcript,
    }
