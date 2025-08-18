from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class VideoGenerationRequest(BaseModel):
    video_idea: str
    user_email: str
    upload_targets: Optional[List[str]] = None
    selected_platforms: Optional[List[str]] = None
    social_accounts: Optional[Dict] = None
    use_ai_voice: Optional[bool] = None
    voice_file_url: Optional[str] = None

class ApprovalRequest(BaseModel):
    video_url: str
    idea: Optional[str] = None
    caption: Optional[str] = None
    selected_platforms: Optional[List[str]] = None
    social_accounts: Dict = Field(default_factory=dict)
    subscription_tier: Optional[str] = None

