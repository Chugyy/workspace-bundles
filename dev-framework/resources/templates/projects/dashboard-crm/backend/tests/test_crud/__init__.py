"""
Tests CRUD

Tests unitaires pour les fonctions CRUD de chaque entité.

Convention:
- test_{entité}.py pour chaque entité
- Utiliser pytest-asyncio pour les tests async
- Utiliser fixtures from conftest.py

Exemple:
```python
# test_users.py
import pytest
from app.database.crud.users import create_user_crud, get_user_by_email_crud

@pytest.mark.asyncio
async def test_create_user(clean_users):
    # Given
    email = "test@test.com"
    password_hash = "hashed"
    name = "Test User"

    # When
    user = await create_user_crud(email, password_hash, name)

    # Then
    assert user['email'] == email
    assert user['name'] == name
```
"""
