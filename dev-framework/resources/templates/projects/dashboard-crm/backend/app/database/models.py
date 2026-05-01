"""
SQLAlchemy ORM Models - Simple CRM

This file serves as DOCUMENTATION for the database schema.
It is NOT used for actual database queries (asyncpg with connection pool is used instead).

Tables: users, leads, notes
Relations: users → leads → notes
Date: 2026-02-15
"""

from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


# ===================================
# MODELS
# ===================================


class User(Base):
    """
    User model - CRM user accounts with authentication credentials and profile.

    Relations:
    - 1 user → N leads (ON DELETE RESTRICT)
    """
    __tablename__ = 'users'

    # Columns
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(100), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default='NOW()')
    updated_at = Column(DateTime, nullable=False, server_default='NOW()')

    # Relations
    leads = relationship(
        "Lead",
        back_populates="user",
        cascade="save-update",  # No cascade delete (RESTRICT in DB)
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"


class Lead(Base):
    """
    Lead model - CRM leads with kanban status, heat level, and contact information.

    Relations:
    - N leads → 1 user (ON DELETE RESTRICT)
    - 1 lead → N notes (ON DELETE CASCADE)
    """
    __tablename__ = 'leads'

    # Columns
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey('users.id', ondelete='RESTRICT'),
        nullable=False
    )
    name = Column(String(255), nullable=False)
    first_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    company = Column(String(255), nullable=True)
    address = Column(String(500), nullable=True)
    instagram = Column(String(255), nullable=True)
    linkedin = Column(String(255), nullable=True)
    twitter = Column(String(255), nullable=True)
    youtube = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    status = Column(
        String(50),
        nullable=False,
        server_default='to_contact'
    )
    heat_level = Column(
        String(50),
        nullable=False,
        server_default='cold'
    )
    city = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default='NOW()')
    updated_at = Column(DateTime, nullable=False, server_default='NOW()')

    # Table-level constraints
    __table_args__ = (
        CheckConstraint(
            "status IN ('to_contact', 'contacted', 'no_response', 'to_call_back', 'action_required', 'appointment_scheduled')",
            name='ck_leads_status'
        ),
        CheckConstraint(
            "heat_level IN ('cold', 'warm', 'hot', 'very_hot')",
            name='ck_leads_heat_level'
        ),
        UniqueConstraint('email', 'user_id', name='uq_leads_email_user_id'),
    )

    # Relations
    user = relationship(
        "User",
        back_populates="leads"
    )
    notes = relationship(
        "Note",
        back_populates="lead",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Lead(id={self.id}, name='{self.name}', status='{self.status}', heat_level='{self.heat_level}')>"


class Note(Base):
    """
    Note model - Notes attached to leads with title, description, and content.

    Relations:
    - N notes → 1 lead (ON DELETE CASCADE)
    """
    __tablename__ = 'notes'

    # Columns
    id = Column(Integer, primary_key=True, autoincrement=True)
    lead_id = Column(
        Integer,
        ForeignKey('leads.id', ondelete='CASCADE'),
        nullable=False
    )
    title = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default='NOW()')
    updated_at = Column(DateTime, nullable=False, server_default='NOW()')

    # Table-level constraints
    __table_args__ = (
        CheckConstraint(
            "LENGTH(title) > 0",
            name='ck_notes_title_not_empty'
        ),
        CheckConstraint(
            "LENGTH(content) > 0",
            name='ck_notes_content_not_empty'
        ),
    )

    # Relations
    lead = relationship(
        "Lead",
        back_populates="notes"
    )

    def __repr__(self):
        return f"<Note(id={self.id}, lead_id={self.lead_id}, title='{self.title}')>"


# ===================================
# ENUM MAPPINGS (DB ↔ Frontend)
# ===================================

# Status enum mapping (English snake_case → French display)
STATUS_MAPPING = {
    'to_contact': 'À contacter',
    'contacted': 'Contacté',
    'no_response': 'Ne répond pas',
    'to_call_back': 'À rappeler',
    'action_required': 'Action à effectuer',
    'appointment_scheduled': 'Rendez-vous pris',
}

# Heat level enum mapping (English snake_case → French display)
HEAT_LEVEL_MAPPING = {
    'cold': 'Froid',
    'warm': 'Tiède',
    'hot': 'Chaud',
    'very_hot': 'Très chaud',
}
