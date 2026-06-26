import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Define database URL, default is read from DATABASE_URL environment variable
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set!")

# Support postgres:// URL format for newer SQLAlchemy versions which expect postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create SQLAlchemy engine for PostgreSQL
engine = create_engine(DATABASE_URL)

# Configure the session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class for models
Base = declarative_base()

# FastAPI dependency to obtain a database session per request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
