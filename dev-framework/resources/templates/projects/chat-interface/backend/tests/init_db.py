from app.database.db import init_db

try:
    init_db()
except Exception as e:
    print(e)