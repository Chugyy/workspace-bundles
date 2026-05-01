"""
Jobs - Business Logic Layer

Les jobs orchestrent la logique métier en appelant des fonctions pures (CRUD, Utils, Services).

Pattern:
- 1 job = 1 action métier complexe
- Jobs appellent CRUD (database), Utils (validation, transformation), Services (APIs externes)
- Jobs gèrent les transactions et erreurs métier
- Jobs retournent des objets Pydantic (DTO/Response)

Exemple:
```python
async def create_user_job(dto: UserCreateDTO) -> UserResponse:
    # 1. Validation
    if not validate_email(dto.email):
        raise ValueError("Email invalide")

    # 2. Hash password
    hashed_password = hash_password(dto.password)

    # 3. Créer en DB
    user = await create_user_crud(email=dto.email, password_hash=hashed_password, name=dto.name)

    # 4. Retourner
    return UserResponse(**user)
```
"""
