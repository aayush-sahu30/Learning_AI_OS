"""
LearnOS AI Service Layer.
Centralized, provider-independent architecture for generating:
- Lecture summaries (overview, key concepts, important points, definitions)
- Flashcards (configurable card count & difficulty)
- Interactive Mind Maps (concepts as nodes with explanations, relationships as edges)

Supports Google Gemini API, with a robust heuristic NLP fallback if GEMINI_API_KEY
is not provided, and prepared for future NotebookLM Enterprise integration.
"""

from abc import ABC, abstractmethod
import os
import re
import json
import uuid
from typing import List, Dict, Any, Optional

try:
    import google.generativeai as genai
    _GENAI_AVAILABLE = True
except ImportError:
    _GENAI_AVAILABLE = False


# ─── Abstract Base AI Service ──────────────────────────────────────────────── #

class BaseAIService(ABC):
    @abstractmethod
    def generate_summary(self, title: str, author: str, transcript: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate structured summary containing:
        - overview: str
        - key_concepts: List[{"concept": str, "description": str}]
        - important_points: List[str]
        - definitions: List[{"term": str, "definition": str}]
        """
        pass

    @abstractmethod
    def generate_flashcards(
        self, title: str, transcript: List[Dict[str, Any]], count: int = 8, difficulty: str = "intermediate"
    ) -> List[Dict[str, Any]]:
        """
        Generate question/answer flashcards containing:
        - id: str
        - front: str (question)
        - back: str (answer)
        - difficulty: str
        """
        pass

    @abstractmethod
    def generate_mindmap(self, title: str, transcript: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate structured mind map containing:
        - nodes: List[{"id": str, "label": str, "explanation": str, "depth": int, "category": str}]
        - edges: List[{"id": str, "source": str, "target": str, "label": str}]
        """
        pass


def _extract_transcript_text(transcript: List[Dict[str, Any]], max_chars: int = 7000) -> str:
    if not transcript:
        return ""
    text = " ".join(f"[{entry.get('start', 0):.0f}s] {entry.get('text', '')}" for entry in transcript)
    return text[:max_chars]


# ─── Heuristic Rule-Based NLP Service (Independent Fallback) ───────────────── #

class HeuristicAIService(BaseAIService):
    """
    Intelligent rule-based extractor that provides immediate, rich results
    even without external API keys or during offline/fallback usage.
    """

    def generate_summary(self, title: str, author: str, transcript: List[Dict[str, Any]]) -> Dict[str, Any]:
        text_entries = [e.get("text", "").strip() for e in transcript if len(e.get("text", "").strip()) > 15]
        full_text = " ".join(text_entries)

        # Overview
        if text_entries:
            first_few = text_entries[:min(6, len(text_entries))]
            overview = f"In this lecture on '{title}', the speaker covers essential principles and techniques. " + " ".join(first_few)
            if len(overview) > 420:
                overview = overview[:417] + "..."
        else:
            overview = f"This session covers core foundations and key concepts of '{title}' by {author or 'the instructor'}."

        # Extract capitalized technical terms and frequent phrases
        phrases = re.findall(r'\b[A-Z][a-zA-Z0-9_-]+(?:\s+[A-Z][a-zA-Z0-9_-]+)*\b', full_text or title)
        freq: Dict[str, int] = {}
        for p in phrases:
            if 3 < len(p) < 35 and p.lower() not in {"this", "that", "there", "here", "video", "youtube", "lecture"}:
                freq[p] = freq.get(p, 0) + 1
        top_terms = [k for k, _ in sorted(freq.items(), key=lambda x: -x[1])[:8]]

        # Key Concepts
        concepts = []
        if top_terms:
            for term in top_terms[:4]:
                concepts.append({
                    "concept": term,
                    "description": f"A foundational concept in {title} explaining how underlying structures and behaviors operate."
                })
        else:
            concepts = [
                {"concept": f"{title} Fundamentals", "description": "Core mechanics and foundational theory introduced in the lecture."},
                {"concept": "Architecture & Workflow", "description": "How the key elements connect and execute in practical environments."},
                {"concept": "Optimization Principles", "description": "Techniques for achieving higher efficiency, stability, and correctness."},
                {"concept": "Real-world Applications", "description": "Methods to apply these patterns directly in production and practice."}
            ]

        # Important Points
        important_points = []
        if len(text_entries) >= 5:
            # Pick evenly spaced informative statements
            step = max(1, len(text_entries) // 5)
            for i in range(0, min(len(text_entries), step * 5), step):
                clean_s = text_entries[i].strip()
                if clean_s and not clean_s.endswith('.'):
                    clean_s += '.'
                important_points.append(clean_s)
        if len(important_points) < 3:
            important_points = [
                f"Mastering the baseline concepts of '{title}' is essential before moving to advanced applications.",
                "Structure and modularity ensure code and systems remain maintainable.",
                "Always verify inputs and validate system invariants before execution.",
                "Continuous practice and testing consolidate conceptual mastery."
            ]

        # Definitions
        definitions = []
        def_patterns = [
            r'([A-Za-z\s]{3,25})\s+(?:is|are|means|refers to)\s+([^.,;]+)',
        ]
        found_defs = set()
        for pat in def_patterns:
            for m in re.finditer(pat, full_text):
                term = m.group(1).strip()
                desc = m.group(2).strip()
                if 2 < len(term) < 25 and len(desc) > 15 and term.lower() not in found_defs:
                    found_defs.add(term.lower())
                    definitions.append({"term": term.title(), "definition": desc})
                    if len(definitions) >= 4:
                        break

        if len(definitions) < 3:
            sample_terms = top_terms[:3] if top_terms else ["Core Model", "State Management", "Execution Pipeline"]
            for term in sample_terms:
                definitions.append({
                    "term": term,
                    "definition": f"The primary operational element in '{title}' responsible for state changes and data flow."
                })

        return {
            "overview": overview,
            "key_concepts": concepts,
            "important_points": important_points[:5],
            "definitions": definitions[:5]
        }

    def generate_flashcards(
        self, title: str, transcript: List[Dict[str, Any]], count: int = 8, difficulty: str = "intermediate"
    ) -> List[Dict[str, Any]]:
        text_entries = [e.get("text", "").strip() for e in transcript if len(e.get("text", "").strip()) > 15]
        full_text = " ".join(text_entries)

        summary_data = self.generate_summary(title, "Instructor", transcript)
        cards: List[Dict[str, Any]] = []

        # Card from overview
        cards.append({
            "id": f"card-{uuid.uuid4().hex[:6]}",
            "front": f"What is the primary objective of '{title}'?",
            "back": summary_data["overview"][:180] + ("..." if len(summary_data["overview"]) > 180 else ""),
            "difficulty": difficulty
        })

        # Cards from key concepts
        for item in summary_data.get("key_concepts", []):
            cards.append({
                "id": f"card-{uuid.uuid4().hex[:6]}",
                "front": f"How does '{item['concept']}' work in this context?",
                "back": item["description"],
                "difficulty": difficulty
            })

        # Cards from definitions
        for item in summary_data.get("definitions", []):
            cards.append({
                "id": f"card-{uuid.uuid4().hex[:6]}",
                "front": f"Define: {item['term']}",
                "back": item["definition"],
                "difficulty": difficulty
            })

        # Cards from important points
        for i, pt in enumerate(summary_data.get("important_points", [])):
            cards.append({
                "id": f"card-{uuid.uuid4().hex[:6]}",
                "front": f"Key Takeaway #{i+1} regarding {title}?",
                "back": pt,
                "difficulty": difficulty
            })

        # Slice to requested count or pad if necessary
        result_cards = cards[:count]
        while len(result_cards) < count:
            idx = len(result_cards) + 1
            result_cards.append({
                "id": f"card-{uuid.uuid4().hex[:6]}",
                "front": f"Practice Question {idx}: What edge cases should you consider in {title}?",
                "back": f"Consider computational overhead, memory allocations, and edge bounds during implementation.",
                "difficulty": difficulty
            })

        return result_cards

    def generate_mindmap(self, title: str, transcript: List[Dict[str, Any]]) -> Dict[str, Any]:
        summary_data = self.generate_summary(title, "Instructor", transcript)

        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []

        root_id = "node-root"
        nodes.append({
            "id": root_id,
            "label": title[:30] + ("..." if len(title) > 30 else ""),
            "explanation": f"Central topic covering '{title}'. Explore connected nodes to see key concepts and relationships.",
            "depth": 0,
            "category": "root"
        })

        # Level 1: Key concepts
        concept_list = summary_data.get("key_concepts", [])
        if not concept_list:
            concept_list = [
                {"concept": "Fundamentals", "description": "Core background knowledge and starting definitions."},
                {"concept": "Methodology", "description": "Step-by-step logic, structures, and algorithmic patterns."},
                {"concept": "Practical Practice", "description": "Implementation, code workflows, and debugging."},
                {"concept": "Key Takeaways", "description": "Best practices, trade-offs, and future expansions."}
            ]

        for i, c in enumerate(concept_list[:4]):
            cid = f"node-c-{i}"
            nodes.append({
                "id": cid,
                "label": c["concept"][:25],
                "explanation": c["description"],
                "depth": 1,
                "category": "concept"
            })
            edges.append({
                "id": f"e-{root_id}-{cid}",
                "source": root_id,
                "target": cid,
                "label": ["introduces", "branches into", "requires", "leads to"][i % 4]
            })

            # Level 2: Sub-concepts from definitions or important points
            defs = summary_data.get("definitions", [])
            sub_term = defs[i % len(defs)] if defs else {"term": f"Detail {i+1}", "definition": f"Detailed mechanism of {c['concept']}"}
            sid = f"node-sub-{i}"
            nodes.append({
                "id": sid,
                "label": sub_term["term"][:22],
                "explanation": sub_term["definition"],
                "depth": 2,
                "category": "detail"
            })
            edges.append({
                "id": f"e-{cid}-{sid}",
                "source": cid,
                "target": sid,
                "label": "defines"
            })

        return {"nodes": nodes, "edges": edges}


# ─── Gemini AI Service Provider ────────────────────────────────────────────── #

class GeminiAIService(BaseAIService):
    def __init__(self, api_key: str):
        self.api_key = api_key
        genai.configure(api_key=api_key)
        self.fallback = HeuristicAIService()

    def _get_model(self):
        # Preferred fast generative models
        try:
            return genai.GenerativeModel("gemini-1.5-flash")
        except Exception:
            return genai.GenerativeModel("gemini-pro")

    def generate_summary(self, title: str, author: str, transcript: List[Dict[str, Any]]) -> Dict[str, Any]:
        ctx = _extract_transcript_text(transcript, 6500)
        if not ctx:
            return self.fallback.generate_summary(title, author, transcript)

        prompt = f"""You are LearnOS, an AI learning assistant.
Analyze this lecture titled "{title}" by {author or 'the instructor'}.
Transcript excerpt:
{ctx}

Generate a concise, high-value learning summary.
Respond strictly with valid JSON with this exact schema:
{{
  "overview": "2-3 concise paragraphs summarizing the lecture core message",
  "key_concepts": [
    {{"concept": "Concept Name", "description": "Clear 1-2 sentence explanation"}}
  ],
  "important_points": [
    "Key takeaway point 1",
    "Key takeaway point 2",
    "Key takeaway point 3",
    "Key takeaway point 4"
  ],
  "definitions": [
    {{"term": "Term Name", "definition": "Precise definition based on the lecture"}}
  ]
}}
Do NOT wrap in markdown backticks or any other text. Output ONLY the JSON object.
"""
        try:
            model = self._get_model()
            res = model.generate_content(prompt)
            raw = res.text.strip()
            raw = re.sub(r"^```(?:json)?", "", raw).strip()
            raw = re.sub(r"```$", "", raw).strip()
            data = json.loads(raw)
            if "overview" in data and "key_concepts" in data:
                return data
            return self.fallback.generate_summary(title, author, transcript)
        except Exception as e:
            print(f"[GeminiAIService.generate_summary error: {e}] - falling back to heuristic")
            return self.fallback.generate_summary(title, author, transcript)

    def generate_flashcards(
        self, title: str, transcript: List[Dict[str, Any]], count: int = 8, difficulty: str = "intermediate"
    ) -> List[Dict[str, Any]]:
        ctx = _extract_transcript_text(transcript, 6500)
        if not ctx:
            return self.fallback.generate_flashcards(title, transcript, count, difficulty)

        prompt = f"""You are LearnOS. Generate exactly {count} student study flashcards from this lecture.
Difficulty level: {difficulty}.
Lecture title: "{title}"
Transcript excerpt:
{ctx}

Return strictly a valid JSON array of objects:
[
  {{
    "front": "Question testing a concept, mechanism, or principle from the lecture",
    "back": "Clear, concise answer and explanation",
    "difficulty": "{difficulty}"
  }}
]
Do NOT include markdown fences. Output ONLY the valid JSON array.
"""
        try:
            model = self._get_model()
            res = model.generate_content(prompt)
            raw = res.text.strip()
            raw = re.sub(r"^```(?:json)?", "", raw).strip()
            raw = re.sub(r"```$", "", raw).strip()
            cards = json.loads(raw)
            if isinstance(cards, list) and len(cards) > 0:
                for i, c in enumerate(cards):
                    if "id" not in c:
                        c["id"] = f"card-{uuid.uuid4().hex[:6]}"
                    if "difficulty" not in c:
                        c["difficulty"] = difficulty
                return cards[:count]
            return self.fallback.generate_flashcards(title, transcript, count, difficulty)
        except Exception as e:
            print(f"[GeminiAIService.generate_flashcards error: {e}] - falling back to heuristic")
            return self.fallback.generate_flashcards(title, transcript, count, difficulty)

    def generate_mindmap(self, title: str, transcript: List[Dict[str, Any]]) -> Dict[str, Any]:
        ctx = _extract_transcript_text(transcript, 6500)
        if not ctx:
            return self.fallback.generate_mindmap(title, transcript)

        prompt = f"""You are LearnOS. Create a structured mind map for the lecture "{title}".
Transcript excerpt:
{ctx}

Return strictly a valid JSON object representing an interactive concept map with nodes and connecting edges:
{{
  "nodes": [
    {{
      "id": "node-root",
      "label": "Short Root Name (max 4 words)",
      "explanation": "Summary of the whole lecture topic",
      "depth": 0,
      "category": "root"
    }},
    {{
      "id": "node-1",
      "label": "Key Concept 1",
      "explanation": "Short 1-2 sentence explanation of this concept",
      "depth": 1,
      "category": "concept"
    }},
    {{
      "id": "node-2",
      "label": "Sub-concept",
      "explanation": "Explanation of sub-concept",
      "depth": 2,
      "category": "detail"
    }}
  ],
  "edges": [
    {{
      "id": "e-node-root-node-1",
      "source": "node-root",
      "target": "node-1",
      "label": "comprises"
    }},
    {{
      "id": "e-node-1-node-2",
      "source": "node-1",
      "target": "node-2",
      "label": "leads to"
    }}
  ]
}}
Provide between 8 and 14 total nodes, with clear educational explanations for each node.
Output ONLY the valid JSON object with NO markdown wrapper.
"""
        try:
            model = self._get_model()
            res = model.generate_content(prompt)
            raw = res.text.strip()
            raw = re.sub(r"^```(?:json)?", "", raw).strip()
            raw = re.sub(r"```$", "", raw).strip()
            data = json.loads(raw)
            if "nodes" in data and "edges" in data:
                return data
            return self.fallback.generate_mindmap(title, transcript)
        except Exception as e:
            print(f"[GeminiAIService.generate_mindmap error: {e}] - falling back to heuristic")
            return self.fallback.generate_mindmap(title, transcript)


# ─── Service Factory ───────────────────────────────────────────────────────── #

def get_ai_service(provider: Optional[str] = None) -> BaseAIService:
    """
    Factory function returning the configured AI service provider.
    Allows easy switching between Gemini, future NotebookLM Enterprise, or Heuristic fallback.
    """
    requested = (provider or os.environ.get("AI_PROVIDER", "gemini")).lower()
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()

    if requested == "gemini" and api_key and _GENAI_AVAILABLE:
        return GeminiAIService(api_key)

    # NotebookLM Enterprise placeholder / extension point
    if requested == "notebooklm":
        # When enterprise endpoints/credentials become available, instantiate here:
        # return NotebookLMAIService(...)
        pass

    return HeuristicAIService()
