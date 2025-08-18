import os
import json
from typing import List, Dict
import httpx

OPENAI_API_BASE = "https://api.openai.com/v1"

async def _chat(messages, model="gpt-4.1"):
    headers = {
        "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY','')}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            f"{OPENAI_API_BASE}/chat/completions",
            headers=headers,
            json={"model": model, "messages": messages}
        )
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"].strip()

async def generate_ideas(topic: str) -> List[Dict]:
    system = (
        "You generate one idea. Return a single-line JSON array as in the schema: "
        "[ { \"Caption\": ..., \"Idea\": ..., \"Environment\": ..., \"Sound\": ..., \"Status\": \"for production\" } ]"
    )
    user = f"Topic: {topic}"
    content = await _chat([
        {"role":"system","content":system},
        {"role":"user","content":user}
    ])
    try:
        arr = json.loads(content)
        assert isinstance(arr, list) and len(arr) >= 1
        return arr
    except Exception:
        # Fallback minimal structure
        return [{
            "Caption": f"{topic} ✨",
            "Idea": topic[:50],
            "Environment": "studio",
            "Sound": "crisp sounds",
            "Status": "for production"
        }]

async def generate_prompts(idea: str, environment: str, sound: str) -> Dict:
    system = "Return a JSON object with keys: Idea, Environment, Sound, Scene 1..13."
    user = f"Idea: {idea}\nEnvironment: {environment}\nSound: {sound}"
    content = await _chat([
        {"role":"system","content":system},
        {"role":"user","content":user}
    ])
    try:
        return json.loads(content)
    except Exception:
        return {
            "Idea": idea,
            "Environment": environment,
            "Sound": sound,
            "Scene 1": f"Close-up of {idea}",
            "Scene 2": f"Different angle {idea}",
            "Scene 3": f"Wide shot {idea}",
        }

async def generate_titles_descriptions(video_idea: str, caption: str, environment: str) -> Dict:
    system = "Return JSON with youtube, tiktok, instagram keys each with title and description fields."
    user = f"Video Idea: {video_idea}\nCaption: {caption}\nEnvironment: {environment}"
    content = await _chat([
        {"role":"system","content":system},
        {"role":"user","content":user}
    ])
    try:
        return json.loads(content)
    except Exception:
        return {
            "youtube": {"title": video_idea[:60], "description": caption[:120]},
            "tiktok": {"title": video_idea[:150], "description": caption[:300]},
            "instagram": {"title": video_idea[:125], "description": caption[:200]},
        }

