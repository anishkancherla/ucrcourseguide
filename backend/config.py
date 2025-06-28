import os
from dotenv import load_dotenv

# load env vars from .env file
load_dotenv()

class Config:
    REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
    REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
    REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT", "repflaws:v1.0.0 (by u/repflaws_user)")
    
    # openai stuff
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-nano")
    
    # debug env vars
    def __init__(self):
        if not self.OPENAI_API_KEY:
            print("WARNING: OPENAI_API_KEY not found in environment variables!")
        if not self.REDDIT_CLIENT_ID:
            print("WARNING: REDDIT_CLIENT_ID not found in environment variables!")
        if not self.REDDIT_CLIENT_SECRET:
            print("WARNING: REDDIT_CLIENT_SECRET not found in environment variables!")
    
    # api config
    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("API_PORT", 8000))
    
    # cors settings
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

config = Config() 