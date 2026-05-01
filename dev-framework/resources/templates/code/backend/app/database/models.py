# models.py - SQLAlchemy ORM Models (Template)
# This file will be REPLACED by generate-database-models agent during Phase 2.1

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

# ============================
# USER MODEL (Template Example)
# ============================

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # Constraints
    __table_args__ = (
        Index('idx_users_email', 'email', postgresql_where=(Column('deleted_at').is_(None))),
        Index('idx_users_deleted_at', 'deleted_at'),
    )

# ============================
# PASSWORD RESET TOKEN MODEL (Template Example)
# ============================

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    token_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    token = Column(String(255), nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Integer, nullable=False, default=0)  # 0 = False, 1 = True (SQLite compat)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Constraints
    __table_args__ = (
        Index('idx_password_reset_tokens_user_id', 'user_id'),
        Index('idx_password_reset_tokens_token', 'token'),
    )

    # Relationships
    user = relationship("User")


# ============================
# IMPORTANT NOTE
# ============================
# This template file contains basic models for demonstration.
# During Phase 2.1 of /greenfield:6-create-infrastructure, the
# generate-database-models agent will:
# 1. Read docs/architecture/schema.md
# 2. REPLACE this entire file with proper SQLAlchemy models
# 3. Generate app/database/migrations/001_initial_schema.sql
#
# Do NOT manually edit this file if you plan to use the agent.
