"""
Service to convert video transcripts into structured lecture notes.
Groups transcript segments into logical sections with timestamps.
"""
import re
from typing import List, Dict

def format_timestamp(seconds: float) -> str:
    """Format seconds into [M:SS] timestamp."""
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m}:{s:02d}"

def generate_lecture_notes(title: str, author: str, transcript: List[Dict]) -> str:
    """
    Convert a flat transcript into structured HTML lecture notes.
    Groups lines into paragraphs and creates section headings based on pauses.
    """
    if not transcript:
        return f"<h1>{title}</h1><p><em>No transcript available to generate notes from.</em></p>"
    
    # Build sections by detecting natural pauses (gaps > 3s between segments)
    sections = []
    current_section_lines = []
    current_section_start = transcript[0]["start"]
    
    for i, entry in enumerate(transcript):
        current_section_lines.append(entry)
        
        # Detect section boundary: gap > 5 seconds or every ~60 seconds of content
        next_start = transcript[i + 1]["start"] if i + 1 < len(transcript) else None
        elapsed = entry["start"] - current_section_start
        
        is_gap = next_start is not None and (next_start - (entry["start"] + entry["duration"])) > 5
        is_long = elapsed > 90
        is_last = next_start is None
        
        if (is_gap or is_long or is_last) and len(current_section_lines) >= 3:
            sections.append({
                "start": current_section_start,
                "lines": current_section_lines,
            })
            current_section_lines = []
            if next_start is not None:
                current_section_start = next_start
    
    # If there are remaining lines, add them as a final section
    if current_section_lines:
        sections.append({
            "start": current_section_start,
            "lines": current_section_lines,
        })
    
    # If we only got 1 section, try splitting more aggressively
    if len(sections) <= 1 and len(transcript) > 20:
        sections = []
        chunk_size = max(8, len(transcript) // 6)
        for i in range(0, len(transcript), chunk_size):
            chunk = transcript[i:i + chunk_size]
            sections.append({
                "start": chunk[0]["start"],
                "lines": chunk,
            })
    
    # Build HTML output
    html_parts = []
    
    # Title and overview
    html_parts.append(f'<h1>{title}</h1>')
    html_parts.append(f'<p>Lecture by <strong>{author}</strong></p>')
    html_parts.append('<hr>')
    
    for idx, section in enumerate(sections):
        ts = format_timestamp(section["start"])
        
        # Generate a section heading from the first few words
        first_line_text = section["lines"][0]["text"].strip()
        # Clean up and capitalize
        heading_text = first_line_text[:80]
        if len(first_line_text) > 80:
            heading_text = heading_text.rsplit(' ', 1)[0] + "..."
        heading_text = heading_text.strip().capitalize()
        
        # Remove trailing punctuation for heading
        heading_text = heading_text.rstrip('.,;:!?')
        
        html_parts.append(f'<h2>{idx + 1}. {heading_text} <code>[{ts}]</code></h2>')
        
        # Group lines into paragraph chunks
        paragraph_lines = []
        for line in section["lines"]:
            text = line["text"].strip()
            if not text:
                continue
            paragraph_lines.append(text)
        
        # Create bullet points for key content
        if len(paragraph_lines) > 3:
            # First line as intro paragraph
            intro = " ".join(paragraph_lines[:2])
            html_parts.append(f'<p>{intro}</p>')
            
            # Remaining as bullet points
            html_parts.append('<ul>')
            # Group remaining lines into bullet points (2-3 lines each)
            remaining = paragraph_lines[2:]
            bullet_size = max(2, len(remaining) // 4)
            for j in range(0, len(remaining), bullet_size):
                bullet_text = " ".join(remaining[j:j + bullet_size])
                html_parts.append(f'<li>{bullet_text}</li>')
            html_parts.append('</ul>')
        else:
            # Short section, just make a paragraph
            html_parts.append(f'<p>{" ".join(paragraph_lines)}</p>')
    
    # Add a notes section at the end
    html_parts.append('<hr>')
    html_parts.append('<h2>📝 My Notes</h2>')
    html_parts.append('<p><em>Add your own notes, questions, and insights below...</em></p>')
    html_parts.append('<ul><li>&nbsp;</li></ul>')
    
    return "\n".join(html_parts)
