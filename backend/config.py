from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str
    AWSL_TELEGRAM_STORAGE_URL: str
    AWSL_TELEGRAM_API_TOKEN: str
    AWSL_TELEGRAM_CHAT_ID: str
    DATABASE_URL: str = "sqlite+aiosqlite:///./videos.db"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DEBUG: bool = False

    # OAuth Settings
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    LINUXDO_CLIENT_ID: str = ""
    LINUXDO_CLIENT_SECRET: str = ""

    # IP Country Blocking Settings
    BLOCKED_COUNTRIES: str = "CN"  # Comma-separated list of ISO 3166-1 alpha-2 country codes

    class Config:
        env_file = ".env"

settings = Settings()
