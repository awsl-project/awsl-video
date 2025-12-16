import httpx
from typing import BinaryIO, List
from .config import settings
import logging

logger = logging.getLogger(__name__)

CHUNK_SIZE = 10 * 1024 * 1024  # 10MB

class TelegramStorage:
    def __init__(self):
        self.base_url = settings.AWSL_TELEGRAM_STORAGE_URL
        self.api_token = settings.AWSL_TELEGRAM_API_TOKEN
        self.chat_id = settings.AWSL_TELEGRAM_CHAT_ID

    async def upload_chunk(self, chunk_data: bytes, filename: str) -> str:
        """
        Upload a video chunk to Telegram storage.
        Returns the file_id from Telegram.
        """
        async with httpx.AsyncClient(timeout=300.0) as client:
            files = {
                'file': (filename, chunk_data, 'application/octet-stream')
            }
            data = {
                'media_type': 'document',
                'chat_id': self.chat_id
            }
            headers = {
                'X-Api-Token': self.api_token
            }

            try:
                logger.info(f"Uploading file: {filename}, size: {len(chunk_data)} bytes")
                logger.info(f"Upload URL: {self.base_url}/api/upload")
                logger.info(f"Media type: document, Chat ID: {self.chat_id}")

                response = await client.post(
                    f"{self.base_url}/api/upload",
                    files=files,
                    data=data,
                    headers=headers
                )

                logger.info(f"Response status: {response.status_code}")
                logger.info(f"Response body: {response.text}")

                response.raise_for_status()
                result = response.json()

                if result.get('success') and result.get('files'):
                    # Return the first file_id (document file_id)
                    file_id = result['files'][0]['file_id']
                    logger.info(f"Upload successful, file_id: {file_id}")
                    return file_id
                else:
                    logger.error(f"Upload failed: response missing success or files field: {result}")
                    raise Exception("Failed to upload chunk to Telegram")
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error during upload: {e.response.status_code} - {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"Unexpected error during upload: {str(e)}")
                raise

    async def download_chunk(self, file_id: str) -> bytes:
        """
        Download a video chunk from Telegram storage by file_id.
        """
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.get(
                f"{self.base_url}/file/{file_id}"
            )
            response.raise_for_status()
            return response.content

    async def upload_file_in_chunks(self, file: BinaryIO, filename: str) -> List[dict]:
        """
        Split a video file into 10MB chunks and upload to Telegram.
        Returns a list of chunk information: [{'chunk_index': 0, 'file_id': '...', 'chunk_size': 1024}, ...]
        """
        chunks_info = []
        chunk_index = 0

        while True:
            chunk_data = file.read(CHUNK_SIZE)
            if not chunk_data:
                break

            chunk_filename = f"{filename}.part{chunk_index}"
            file_id = await self.upload_chunk(chunk_data, chunk_filename)

            chunks_info.append({
                'chunk_index': chunk_index,
                'file_id': file_id,
                'chunk_size': len(chunk_data)
            })

            chunk_index += 1

        return chunks_info

telegram_storage = TelegramStorage()
