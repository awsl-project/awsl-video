#!/usr/bin/env python3
"""Run database migration to add is_admin column"""
import asyncio
from sqlalchemy import text
from backend.database import engine


async def run_migration():
    """Add is_admin column to users table"""
    async with engine.begin() as conn:
        # Add is_admin column
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE"
        ))

        # Create index for faster admin user queries
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE"
        ))

        print("✅ Migration completed: Added is_admin column to users table")


if __name__ == "__main__":
    asyncio.run(run_migration())
