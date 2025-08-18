import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # External endpoints and keys
    WAVESPEED_API_URL: str = "https://api.wavespeed.ai/api/v3/bytedance/seedance-v1-pro-t2v-480p"
    FAL_COMPOSE_URL: str = "https://queue.fal.run/fal-ai/ffmpeg-api/compose"
    FAL_REQUEST_URL: str = "https://queue.fal.run/fal-ai/ffmpeg-api/requests/{request_id}"
    FAL_SOUNDS_URL: str = "https://queue.fal.run/fal-ai/mmaudio-v2"
    FAL_SOUNDS_REQUEST_URL: str = "https://queue.fal.run/fal-ai/mmaudio-v2/requests/{request_id}"

    SUPABASE_APPROVAL_URL: str = "https://djmkzsxsfwyrqmhcgsyx.supabase.co/functions/v1/handle-video-webhook"
    SUPABASE_SERVICE_BEARER: str = ""  # set in env

    OPENAI_API_KEY: str = ""

    # Google Sheets
    GOOGLE_SHEETS_SPREADSHEET_ID: str = "1lv-_q7gVNO4Kq1UTI-Q9wnxfAh5Z-qli6z4sNyLGbII"
    GOOGLE_SHEETS_SHEET_GID: str = "0"  # gid=0
    GOOGLE_CREDENTIALS_JSON: str = ""  # path or JSON string

    # SMTP
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "mathew.kasbarian@gmail.com"

    class Config:
        env_file = ".env"

