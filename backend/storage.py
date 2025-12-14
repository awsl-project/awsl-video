import httpx
from typing import BinaryIO, List
from .config import settings

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

            response = await client.post(
                f"{self.base_url}/api/upload",
                files=files,
                data=data,
                headers=headers
            )
            response.raise_for_status()
            result = response.json()

            if result.get('success') and result.get('files'):
                # Return the first file_id (document file_id)
                return result['files'][0]['file_id']
            else:
                raise Exception("Failed to upload chunk to Telegram")

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
