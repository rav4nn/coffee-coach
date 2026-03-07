from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://user:password@localhost:5432/coffee_coach"

    model_config = {"env_file": ".env"}


settings = Settings()
