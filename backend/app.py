import os
import asyncio
import uuid
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from .config import Settings
from .models import (
    VideoGenerationRequest,
    ApprovalRequest,
)
from .services.llm import generate_ideas, generate_titles_descriptions, generate_prompts
from .services.sheets import append_idea_row, update_final_output_by_idea, find_row_by_final_output
from .services.wavespeed import create_clip, get_clip_result
from .services.fal import compose_sequence, get_request_result, create_sound, get_sound_result
from .services.emailer import send_email
from .services.youtube import youtube_resumable_start, youtube_upload_bytes
from .services.webhook import post_supabase_approval
import httpx

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Clip-And-Ship Backend")
# CORS for Vercel app and Supabase Edge Functions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your domains as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings = Settings()

# In-memory job tracking (replace with Redis/Celery in production)
JOBS: Dict[str, Dict[str, Any]] = {}


@app.get("/health")
async def health():
    return {"ok": True}


async def orchestrate_video_job(execution_id: str, payload: VideoGenerationRequest):
    state = JOBS.setdefault(execution_id, {"status": "started"})
    state.update({"input": payload.model_dump()})
    try:
        # 1) Generate one idea
        ideas = await generate_ideas(topic=payload.video_idea)
        idea_obj = ideas[0]
        state["idea"] = idea_obj

        # 2) Log idea to Google Sheets
        try:
            await append_idea_row(
                idea=idea_obj["Idea"],
                status=idea_obj.get("Status", "for production"),
                environment=idea_obj.get("Environment", ""),
                sound=idea_obj.get("Sound", ""),
                caption=idea_obj.get("Caption", ""),
            )
        except Exception as e:
            state["sheets_append_error"] = str(e)

        # 3) Generate prompts (multi-scene)
        prompts = await generate_prompts(
            idea=idea_obj["Idea"],
            environment=idea_obj.get("Environment", ""),
            sound=idea_obj.get("Sound", ""),
        )
        # Extract Scene X fields
        scenes = [v for k, v in prompts.items() if k.lower().startswith("scene ")]
        if not scenes:
            raise RuntimeError("No scenes generated")
        # Limit to first 3 scenes to mirror current composition
        scenes = scenes[:3]
        state["scenes"] = scenes

        # 4) Create clips for each scene (Wavespeed)
        clip_request_ids: List[str] = []
        async with httpx.AsyncClient(timeout=120) as client:
            for scene in scenes:
                req = await create_clip(client, prompt=scene)
                clip_request_ids.append(req["data"]["id"])  # adjust to real schema
        state["clip_request_ids"] = clip_request_ids

        # 5) Wait and fetch clip results
        clip_urls: List[str] = []
        async with httpx.AsyncClient(timeout=120) as client:
            for rid in clip_request_ids:
                url = await get_clip_result(client, prediction_id=rid)
                clip_urls.append(url)
        if len(clip_urls) < 3:
            state["warning"] = "Fewer than 3 clips returned; sequencing what we have"
        state["clip_urls"] = clip_urls

        # 6) Sequence video with FAL ffmpeg compose
        async with httpx.AsyncClient(timeout=120) as client:
            compose_req = await compose_sequence(client, urls=clip_urls)
            compose_id = compose_req["request_id"]
            state["compose_request_id"] = compose_id
            final_video_url = await get_request_result(client, compose_id)
        state["final_video_url"] = final_video_url

        # 7) Create sound effects (optional)
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                snd_req = await create_sound(client, prompt=idea_obj.get("Sound", ""), video_url=final_video_url)
                snd_id = snd_req["request_id"]
                _ = await get_sound_result(client, snd_id)
        except Exception as e:
            state["sound_error"] = str(e)

        # 8) Update Google Sheets with final_output and ready
        try:
            await update_final_output_by_idea(
                idea=idea_obj["Idea"], final_output=final_video_url, ready="Yes", production="Done"
            )
        except Exception as e:
            state["sheets_update_error"] = str(e)

        # 9) Generate platform titles/descriptions
        td = await generate_titles_descriptions(
            video_idea=idea_obj["Idea"],
            caption=idea_obj.get("Caption", ""),
            environment=idea_obj.get("Environment", ""),
        )
        state["titles_descriptions"] = td

        # 10) Send for approval to Supabase function
        try:
            await post_supabase_approval(
                video_url=final_video_url,
                caption=td["youtube"]["description"],
                execution_id=execution_id,
            )
        except Exception as e:
            state["approval_webhook_error"] = str(e)

        # 11) Email the user
        try:
            subj = f"Your video \"{payload.video_idea}\" is ready for approval"
            html = (
                "<!DOCTYPE html><html><body>"
                "<p>Hi there!</p>"
                "<p>Your video has been processed and is ready for your approval.</p>"
                "<p>Please review and approve your video.</p>"
                "<p>Best regards,<br>ClipAndShip Team</p>"
                "</body></html>"
            )
            await send_email(to_email=payload.user_email, subject=subj, html=html)
        except Exception as e:
            state["email_error"] = str(e)

        state["status"] = "completed"
    except Exception as e:
        state["status"] = "error"
        state["error"] = str(e)


@app.post("/video-generation")
async def video_generation(req: VideoGenerationRequest):
    execution_id = f"py-{uuid.uuid4()}"
    # Fire-and-forget background orchestration
    asyncio.create_task(orchestrate_video_job(execution_id, req))
    return {"status": "accepted", "execution_id": execution_id}


@app.post("/video-approved")
async def video_approved(req: ApprovalRequest):
    # Download the video URL
    video_bytes: bytes
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.get(req.video_url)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to download video")
        video_bytes = r.content

    # Prepare YouTube resumable upload
    snippet = {
        "title": req.idea or "Clip-And-Ship Upload",
        "description": req.caption or "",
        "categoryId": "22",
    }
    status = {"privacyStatus": "public"}

    try:
        location_url = await youtube_resumable_start(
            access_token=req.social_accounts.get("youtube", {}).get("access_token", ""),
            snippet=snippet,
            status=status,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"YouTube init failed: {e}")

    try:
        await youtube_upload_bytes(
            upload_url=location_url,
            access_token=req.social_accounts.get("youtube", {}).get("access_token", ""),
            data=video_bytes,
            content_type="video/mp4",
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"YouTube upload failed: {e}")

    # Optional: update Sheets row matching final_output == video_url
    try:
        await find_row_by_final_output(final_output=req.video_url)  # placeholder use / extend as needed
    except Exception:
        pass

    return JSONResponse({
        "ok": True,
        "video_url": req.video_url,
    })

