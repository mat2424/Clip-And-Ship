from typing import Dict
import httpx

YOUTUBE_INIT_URL = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"

async def youtube_resumable_start(access_token: str, snippet: Dict, status: Dict) -> str:
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Upload-Content-Type": "video/mp4",
    }
    json_body = {"snippet": snippet, "status": status}
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(YOUTUBE_INIT_URL, headers=headers, json=json_body)
        r.raise_for_status()
        location = r.headers.get("location") or r.headers.get("Location")
        if not location:
            raise ValueError("No resumable upload location header returned")
        return location

async def youtube_upload_bytes(upload_url: str, access_token: str, data: bytes, content_type: str = "video/mp4") -> Dict:
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": content_type,
    }
    async with httpx.AsyncClient(timeout=None) as client:
        r = await client.post(upload_url, headers=headers, content=data)
        r.raise_for_status()
        return r.json() if r.content else {}

