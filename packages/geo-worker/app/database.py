"""Wrapper de asyncpg para las queries SQL directas."""
import asyncpg
import os
from typing import Any, Optional


class Database:
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None

    @property
    def pool(self) -> Optional[asyncpg.Pool]:
        return self._pool

    @property
    def is_connected(self) -> bool:
        return self._pool is not None

    async def connect(self):
        if self._pool is None:
            self._pool = await asyncpg.create_pool(
                dsn=os.getenv("DATABASE_URL"),
                min_size=2,
                max_size=10,
            )

    async def disconnect(self):
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def fetchrow(self, query: str, *args: Any) -> Optional[asyncpg.Record]:
        assert self._pool, "DB no inicializada"
        async with self._pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def fetch(self, query: str, *args: Any) -> list[asyncpg.Record]:
        assert self._pool, "DB no inicializada"
        async with self._pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def execute(self, query: str, *args: Any) -> str:
        assert self._pool, "DB no inicializada"
        async with self._pool.acquire() as conn:
            return await conn.execute(query, *args)


db = Database()
