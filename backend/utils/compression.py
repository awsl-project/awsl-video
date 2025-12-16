"""
Chunk compression utilities for building compact streaming URLs.
Implements deflate-raw compression with base64url encoding.
"""
import zlib
import base64
from typing import List, Tuple


def compress_chunks(chunks_data: str) -> str:
    """
    Compress chunk data using deflate-raw and encode as base64url.

    Args:
        chunks_data: Comma-separated chunk info (fileId:size,fileId:size,...)

    Returns:
        Base64url-encoded compressed string
    """
    # Compress using deflate-raw (DEFLATED compression without zlib wrapper)
    # Use negative wbits to get raw deflate format
    compressed = zlib.compress(chunks_data.encode('utf-8'), level=9, wbits=-zlib.MAX_WBITS)

    # Encode as base64
    base64_bytes = base64.b64encode(compressed)
    base64_str = base64_bytes.decode('ascii')

    # Convert to base64url (URL-safe)
    # Replace + with -, / with _, and remove trailing =
    base64url = base64_str.replace('+', '-').replace('/', '_').rstrip('=')

    return base64url


def decompress_chunks(base64url_data: str) -> str:
    """
    Decompress base64url-encoded chunk data.

    Args:
        base64url_data: Base64url-encoded compressed string

    Returns:
        Decompressed chunk data string
    """
    # Convert base64url to standard base64
    base64_str = base64url_data.replace('-', '+').replace('_', '/')

    # Add padding if needed
    padding = '=' * ((4 - len(base64_str) % 4) % 4)
    base64_padded = base64_str + padding

    # Decode base64
    compressed = base64.b64decode(base64_padded)

    # Decompress using deflate-raw (negative wbits)
    decompressed = zlib.decompress(compressed, wbits=-zlib.MAX_WBITS)

    return decompressed.decode('utf-8')


def build_chunks_param(chunks: List[Tuple[str, int]], use_compression: bool = None) -> str:
    """
    Build chunks parameter for streaming URL.

    Args:
        chunks: List of (file_id, chunk_size) tuples
        use_compression: Whether to use compression. If None, auto-decide based on chunk count.

    Returns:
        Chunks parameter string (plain or compressed)
    """
    # Build plain format
    plain = ','.join(f"{file_id}:{size}" for file_id, size in chunks)

    # Auto-decide compression if not specified
    if use_compression is None:
        # Use compression for videos with many chunks (>5) or long plain string
        use_compression = len(chunks) > 5 or len(plain) > 200

    if use_compression:
        return compress_chunks(plain)
    else:
        return plain


def parse_chunks_param(chunks_param: str) -> List[Tuple[str, int]]:
    """
    Parse chunks parameter from streaming URL.
    Auto-detects whether it's compressed or plain format.

    Args:
        chunks_param: Chunks parameter string

    Returns:
        List of (file_id, chunk_size) tuples
    """
    data = chunks_param

    # Auto-detect compressed format
    # Plain format always has colons, compressed base64url doesn't
    if ':' not in chunks_param:
        try:
            data = decompress_chunks(chunks_param)
        except Exception as e:
            raise ValueError(f"Failed to decompress chunks data: {e}")

    # Parse plain format: fileId:size,fileId:size,...
    result = []
    for chunk_str in data.split(','):
        if not chunk_str:
            continue
        parts = chunk_str.split(':')
        if len(parts) != 2:
            raise ValueError(f"Invalid chunk format: {chunk_str}")
        file_id, size_str = parts
        try:
            size = int(size_str)
        except ValueError:
            raise ValueError(f"Invalid chunk size: {size_str}")
        result.append((file_id, size))

    return result
