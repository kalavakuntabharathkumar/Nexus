import os


MIN_SECRET_LENGTH = 32


def load_secret_key() -> str:
    secret = os.environ.get("SESSION_SECRET", "")
    if len(secret) < MIN_SECRET_LENGTH:
        raise RuntimeError(
            "SESSION_SECRET must be configured with at least 32 characters before starting the API"
        )
    return secret