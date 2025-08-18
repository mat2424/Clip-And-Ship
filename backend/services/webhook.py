import os
import httpx

SUPABASE_URL = os.getenv("SUPABASE_APPROVAL_URL", "https://djmkzsxsfwyrqmhcgsyx.supabase.co/functions/v1/handle-video-webhook")
SUPABASE_BEARER = os.getenv("SUPABASE_SERVICE_BEARER", "")

async def post_supabase_approval(video_url: str, caption: str, execution_id: str):
    headers = {
        "Authorization": f"Bearer {SUPABASE_BEARER}",
        "Content-Type": "application/json",
    }
    payload = {
        "phase": "approval",
        "execution_id": execution_id,
        "video_url": video_url,
        "caption": caption,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(SUPABASE_URL, headers=headers, json=payload)
        r.raise_for_status()
        return r.json() if r.content else {}

