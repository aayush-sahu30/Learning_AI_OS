import warnings
warnings.filterwarnings("ignore")

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import time
from collections import defaultdict

from youtube_service import extract_video_id, get_video_metadata, get_video_transcript, get_video_info
from code_service import run_code, DEFAULT_CODE
from ai_service import get_ai_service
from cache import video_cache, notes_cache

app = FastAPI(
    title="LearnOS API",
    description="Backend for the LearnOS Student Learning Workspace"
)

# ─── CORS ──────────────────────────────────────────────────────────────────── #
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Simple In-Memory Rate Limiter ─────────────────────────────────────────── #
_rate_store: Dict[str, List[float]] = defaultdict(list)
RATE_LIMIT_REQUESTS = 60
RATE_LIMIT_WINDOW = 60

def _check_rate_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    window_start = now - RATE_LIMIT_WINDOW
    timestamps = _rate_store[ip]
    _rate_store[ip] = [t for t in timestamps if t > window_start]
    if len(_rate_store[ip]) >= RATE_LIMIT_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests — max {RATE_LIMIT_REQUESTS} per {RATE_LIMIT_WINDOW}s.",
        )
    _rate_store[ip].append(now)

# ─── Models ────────────────────────────────────────────────────────────────── #

class VideoRequest(BaseModel):
    url: str

class TranscriptEntry(BaseModel):
    text: str
    start: float
    duration: float

class VideoInfo(BaseModel):
    video_id: str
    title: str
    author: str
    thumbnail: str
    embed_url: str
    transcript: List[TranscriptEntry]

class FlashcardsRequest(BaseModel):
    url: str
    count: Optional[int] = 8
    difficulty: Optional[str] = "intermediate"
    title: Optional[str] = None
    transcript: Optional[List[Dict[str, Any]]] = None

class MindMapRequest(BaseModel):
    url: str
    title: Optional[str] = None
    transcript: Optional[List[Dict[str, Any]]] = None

class SummaryRequest(BaseModel):
    url: str
    title: Optional[str] = None
    author: Optional[str] = None
    transcript: Optional[List[Dict[str, Any]]] = None

class CodeRunRequest(BaseModel):
    language: str
    code: str

class CodeRunResult(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    timed_out: bool
    execution_time_ms: int

# ─── Health Route ──────────────────────────────────────────────────────────── #

@app.get("/")
def read_root():
    return {
        "app": "LearnOS",
        "status": "online",
        "description": "Student learning workspace API"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "cache_entries": {
            "video": video_cache.size,
            "notes": notes_cache.size
        }
    }

# ─── Video Route ───────────────────────────────────────────────────────────── #

@app.post("/video/info", response_model=VideoInfo)
def get_video_info_endpoint(req: VideoRequest, request: Request):
    _check_rate_limit(request)
    video_id = extract_video_id(req.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    info = get_video_info(video_id)
    return VideoInfo(
        video_id=info["video_id"],
        title=info["title"],
        author=info["author"],
        thumbnail=info["thumbnail"],
        embed_url=info["embed_url"],
        transcript=[TranscriptEntry(**t) for t in info["transcript"]],
    )

# ─── AI Summary Route ──────────────────────────────────────────────────────── #

@app.post("/video/summary")
def get_video_summary(req: SummaryRequest, request: Request):
    _check_rate_limit(request)
    video_id = extract_video_id(req.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    cache_key = f"summary_v2:{video_id}"
    cached = notes_cache.get(cache_key)
    if cached is not None:
        return {"summary": cached, "cached": True}

    title = req.title
    author = req.author
    transcript = req.transcript

    if not title or not author:
        meta = get_video_metadata(video_id)
        title = title or meta.get("title", "Lecture")
        author = author or meta.get("author", "Instructor")

    if not transcript:
        transcript = get_video_transcript(video_id)

    ai_service = get_ai_service()
    summary = ai_service.generate_summary(title, author, transcript)
    notes_cache.set(cache_key, summary)
    return {"summary": summary, "cached": False}

# ─── AI Flashcards Route ───────────────────────────────────────────────────── #

@app.post("/video/flashcards")
def get_video_flashcards(req: FlashcardsRequest, request: Request):
    _check_rate_limit(request)
    video_id = extract_video_id(req.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    count = max(3, min(req.count or 8, 20))
    difficulty = (req.difficulty or "intermediate").lower()

    cache_key = f"flashcards_v2:{video_id}:{count}:{difficulty}"
    cached = notes_cache.get(cache_key)
    if cached is not None:
        return {"flashcards": cached, "cached": True}

    title = req.title
    transcript = req.transcript

    if not title:
        meta = get_video_metadata(video_id)
        title = meta.get("title", "Lecture")

    if not transcript:
        transcript = get_video_transcript(video_id)

    ai_service = get_ai_service()
    cards = ai_service.generate_flashcards(title, transcript, count=count, difficulty=difficulty)
    notes_cache.set(cache_key, cards)
    return {"flashcards": cards, "cached": False}

# ─── AI Mind Map Route ─────────────────────────────────────────────────────── #

@app.post("/video/mindmap")
def get_video_mindmap(req: MindMapRequest, request: Request):
    _check_rate_limit(request)
    video_id = extract_video_id(req.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    cache_key = f"mindmap_v2:{video_id}"
    cached = notes_cache.get(cache_key)
    if cached is not None:
        return {"mindmap": cached, "cached": True}

    title = req.title
    transcript = req.transcript

    if not title:
        meta = get_video_metadata(video_id)
        title = meta.get("title", "Lecture")

    if not transcript:
        transcript = get_video_transcript(video_id)

    ai_service = get_ai_service()
    mindmap = ai_service.generate_mindmap(title, transcript)
    notes_cache.set(cache_key, mindmap)
    return {"mindmap": mindmap, "cached": False}

# ─── Code Execution Route ──────────────────────────────────────────────────── #

@app.post("/code/run", response_model=CodeRunResult)
async def execute_code(req: CodeRunRequest, request: Request):
    _check_rate_limit(request)
    result = await run_code(req.language, req.code)
    return CodeRunResult(**result)

@app.get("/code/default/{language}")
def get_default_code(language: str):
    code = DEFAULT_CODE.get(language.lower(), "# Start coding...")
    return {"language": language, "code": code}

# ─── Legacy / Compatibility Route ──────────────────────────────────────────── #

@app.post("/video/notes")
def get_video_notes_legacy(req: VideoRequest, request: Request):
    video_id = extract_video_id(req.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    meta = get_video_metadata(video_id)
    transcript = get_video_transcript(video_id)
    ai_service = get_ai_service()
    summary = ai_service.generate_summary(meta.get("title", "Lecture"), meta.get("author", "Instructor"), transcript)
    # Render basic HTML for legacy compatibility
    html_parts = [
        f"<h2>{meta.get('title', 'Lecture Notes')}</h2>",
        f"<p>{summary.get('overview', '')}</p>",
        "<h3>Key Concepts</h3><ul>",
        "".join(f"<li><strong>{c.get('concept')}:</strong> {c.get('description')}</li>" for c in summary.get('key_concepts', [])),
        "</ul><h3>Important Points</h3><ul>",
        "".join(f"<li>{pt}</li>" for pt in summary.get('important_points', [])),
        "</ul>"
    ]
    return {"notes_html": "".join(html_parts)}
