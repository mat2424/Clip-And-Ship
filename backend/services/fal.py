from typing import Dict, List
import httpx

FAL_COMPOSE_URL = "https://queue.fal.run/fal-ai/ffmpeg-api/compose"
FAL_COMPOSE_REQ_URL = "https://queue.fal.run/fal-ai/ffmpeg-api/requests/{request_id}"
FAL_SOUNDS_URL = "https://queue.fal.run/fal-ai/mmaudio-v2"
FAL_SOUNDS_REQ_URL = "https://queue.fal.run/fal-ai/mmaudio-v2/requests/{request_id}"

async def compose_sequence(client: httpx.AsyncClient, urls: List[str]) -> Dict:
    keyframes = []
    t = 0
    for u in urls:
        keyframes.append({"url": u, "timestamp": t, "duration": 10})
        t += 10
    body = {
        "tracks": [
            {"id": "1", "type": "video", "keyframes": keyframes}
        ]
    }
    r = await client.post(FAL_COMPOSE_URL, json=body)
    r.raise_for_status()
    return r.json()

async def get_request_result(client: httpx.AsyncClient, request_id: str) -> str:
    url = FAL_COMPOSE_REQ_URL.format(request_id=request_id)
    r = await client.get(url)
    r.raise_for_status()
    data = r.json()
    # Expect final video url at data.response?.video.url or similar
    if isinstance(data, dict):
        # Try common fields
        if "response" in data and isinstance(data["response"], dict):
            # custom mapping may be needed
            for k in ("video_url", "url", "output", "outputs"):
                if k in data["response"]:
                    v = data["response"][k]
                    if isinstance(v, str):
                        return v
                    if isinstance(v, list) and v:
                        return v[0]
        if "video_url" in data:
            return data["video_url"]
        if "data" in data and isinstance(data["data"], dict):
            outputs = data["data"].get("outputs")
            if isinstance(outputs, list) and outputs:
                return outputs[0]
    raise ValueError("Unexpected FAL compose result schema")

async def create_sound(client: httpx.AsyncClient, prompt: str, video_url: str) -> Dict:
    body = {"prompt": f"Sound effects. {prompt}", "duration": 10, "video_url": video_url}
    r = await client.post(FAL_SOUNDS_URL, json=body)
    r.raise_for_status()
    return r.json()

async def get_sound_result(client: httpx.AsyncClient, request_id: str) -> Dict:
    url = FAL_SOUNDS_REQ_URL.format(request_id=request_id)
    r = await client.get(url)
    r.raise_for_status()
    return r.json()

