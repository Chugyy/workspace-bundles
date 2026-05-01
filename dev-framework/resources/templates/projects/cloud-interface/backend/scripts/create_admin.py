#!/usr/bin/env python3
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import crud
from app.core.utils.auth import hash_password

async def create_admin():
    email = "admin@admin.admin"
    password = "admin"

    existing = await crud.get_user_by_email(email)
    if existing:
        print(f"Admin user already exists: {email}")
        return

    password_hash = hash_password(password)

    conn = await crud.get_async_db_connection()
    try:
        result = await conn.fetchrow(
            """INSERT INTO users (email, password_hash, first_name, last_name)
               VALUES ($1, $2, $3, $4) RETURNING id""",
            email, password_hash, "Admin", "User"
        )
        user_id = result['id'] if result else None
    finally:
        await conn.close()

    print(f"Admin user created successfully with ID: {user_id}")
    print(f"Email: {email}")
    print(f"Password: {password}")

if __name__ == "__main__":
    asyncio.run(create_admin())
