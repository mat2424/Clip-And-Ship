from typing import Dict
import httpx

WAVESPEED_URL = "https://api.wavespeed.ai/api/v3/bytedance/seedance-v1-pro-t2v-480p"

async def create_clip(client: httpx.AsyncClient, prompt: str) -> Dict:
    # Mirrors the n8n body
    body = {
        "aspect_ratio": "9:16",
        "duration": 10,
        "prompt": prompt,
    }
    r = await client.post(WAVESPEED_URL, json=body)
    r.raise_for_status()
    return r.json()

async def get_clip_result(client: httpx.AsyncClient, prediction_id: str) -> str:
    url = f"https://api.wavespeed.ai/api/v3/predictions/{prediction_id}/result"
    r = await client.get(url)
    r.raise_for_status()
    data = r.json()
    # Assuming schema similar to n8n result: data.outputs[0]?.url or data.video.url
    if isinstance(data, dict):
        if "video" in data and isinstance(data["video"], dict) and "url" in data["video"]:
            return data["video"]["url"]
        if "data" in data and isinstance(data["data"], dict):
            outputs = data["data"].get("outputs")
            if isinstance(outputs, list) and outputs:
                return outputs[0]
    raise ValueError("Unexpected Wavespeed result schema")

