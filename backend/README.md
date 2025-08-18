## Clip-And-Ship Python Backend (FastAPI)

This backend mirrors your n8n workflow endpoints and behavior:

- POST /video-generation: start orchestration (idea -> prompts -> generate clips via Wavespeed -> compose via FAL -> optional sounds -> log to Google Sheets -> generate titles/descriptions -> call Supabase handle-video-webhook with phase=approval -> email user)
- POST /video-approved: receive approval payload and upload the provided video_url to YouTube via resumable upload, using provided social_accounts.youtube.access_token

### Project layout
- backend/app.py: FastAPI app and orchestration logic
- backend/models.py: Pydantic request models aligned to your n8n payloads
- backend/services/*: thin wrappers for external services (LLM, Wavespeed, FAL, Sheets, Email, YouTube, Supabase webhook)
- backend/config.py: central settings loaded from environment

### Environment variables
Copy .env.example to .env and fill in values:
- OPENAI_API_KEY
- SUPABASE_SERVICE_BEARER (service key that n8n used in Authorization header)
- SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM
- GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_CREDENTIALS_JSON (or configure via ADC)

### Install & Run (local)
1. python -m venv .venv && source .venv/bin/activate (Windows: .venv\\Scripts\\activate)
2. pip install -U pip
3. pip install fastapi uvicorn[standard] httpx pydantic-settings aiosmtplib
4. uvicorn backend.app:app --reload --port 8000

### Test locally
- Start: POST http://localhost:8000/video-generation with JSON like below
- Approve: POST http://localhost:8000/video-approved with JSON like below

### Example payloads (match n8n)

/video-generation
{
  "video_idea": "Cutting obsidian rock",
  "user_email": "you@example.com",
  "upload_targets": ["YouTube"],
  "selected_platforms": ["YouTube"],
  "social_accounts": {},
  "use_ai_voice": true,
  "voice_file_url": null
}

/video-approved
{
  "video_url": "https://.../final.mp4",
  "idea": "Cutting obsidian rock",
  "caption": "...",
  "selected_platforms": ["YouTube"],
  "subscription_tier": "free",
  "social_accounts": {
    "youtube": {"access_token": "ya29..."}
  }
}

### Deploy options
- Fly.io / Render / Railway: containerize with a Dockerfile; set env vars; expose port 8000
- Vercel serverless Python or Cloud Run: convert to serverless entry; ensure async httpx and short timeouts
- Supabase Edge Functions alternative: keep using your existing Supabase functions for auth and YouTube OAuth; this backend only replaces n8n orchestration

### Notes
- Google Sheets service is stubbed; wire up with gspread or Google API client.
- Result schema mapping for Wavespeed/FAL may need minor tweaks based on live responses.
- For production, replace in-memory JOBS with Redis/Celery for retries and state.

