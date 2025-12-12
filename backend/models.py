"""
Database models (tables) using SQLAlchemy ORM
"""
from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class QuestionStatus(str, enum.Enum):
    """Enum for question status"""
    PENDING = "Pending"
    ESCALATED = "Escalated"
    ANSWERED = "Answered"


class User(Base):
    """Users table - stores registered users"""
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    questions = relationship("Question", back_populates="user", foreign_keys="Question.user_id")
    responses = relationship("Response", back_populates="user")


class Question(Base):
    """Questions table - stores all questions"""
    __tablename__ = "questions"
    
    question_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    guest_name = Column(String(100), nullable=True)
    message = Column(Text, nullable=False)
    status = Column(Enum(QuestionStatus), default=QuestionStatus.PENDING, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    answered_at = Column(DateTime, nullable=True)
    answered_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="questions", foreign_keys=[user_id])
    responses = relationship("Response", back_populates="question", cascade="all, delete-orphan")


class Response(Base):
    """Responses table - stores answers to questions"""
    __tablename__ = "responses"
    
    response_id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.question_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    guest_name = Column(String(100), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    question = relationship("Question", back_populates="responses")
    user = relationship("User", back_populates="responses")

