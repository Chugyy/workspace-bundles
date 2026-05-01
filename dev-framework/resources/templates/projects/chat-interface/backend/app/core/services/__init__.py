"""
Services - External APIs Layer

Les services encapsulent les appels vers des APIs externes (tierces).

Pattern:
- 1 service = 1 intégration externe (Cloudinary, SendGrid, OpenAI, etc.)
- Fonctions pures, synchrones ou asynchrones
- Gestion d'erreurs spécifique à chaque service
- Configuration via settings

Exemple:
```python
# cloudinary.py
from cloudinary import uploader
from config.config import settings

def upload_image(file_bytes: bytes, filename: str) -> str:
    '''Upload une image vers Cloudinary.'''
    result = uploader.upload(
        file_bytes,
        public_id=filename,
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret
    )
    return result['secure_url']
```
"""
