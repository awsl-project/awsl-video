import logging
import uvicorn

from backend.app import app

logging.basicConfig(
    format="%(asctime)s: %(levelname)s: %(name)s: %(message)s",
    level=logging.INFO
)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
