"""Wrapper de redis.asyncio para el geo worker."""
import redis.asyncio as aioredis
import os
from typing import Optional, Any


class RedisClient:
    def __init__(self):
        self._client: Optional[aioredis.Redis] = None

    @property
    def client(self) -> Optional[aioredis.Redis]:
        return self._client

    @property
    def is_connected(self) -> bool:
        return self._client is not None

    async def connect(self):
        if self._client is None:
            self._client = aioredis.from_url(
                os.getenv("REDIS_URL", "redis://localhost:6380/0"),
                decode_responses=True,
            )

    async def disconnect(self):
        if self._client:
            await self._client.aclose()
            self._client = None

    async def get(self, key: str) -> Optional[str]:
        if not self._client:
            return None
        val: Any = await self._client.get(key)
        if val is None:
            return None
        return val.decode("utf-8") if isinstance(val, bytes) else str(val)

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> None:
        assert self._client
        await self._client.set(key, value, ex=ex)

    async def setex(self, key: str, seconds: int, value: str) -> None:
        assert self._client
        await self._client.setex(key, seconds, value)

    async def ttl(self, key: str) -> int:
        assert self._client
        return await self._client.ttl(key)

    async def delete(self, key: str) -> None:
        assert self._client
        await self._client.delete(key)


redis_client = RedisClient()
