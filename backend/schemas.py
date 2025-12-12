"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ==================== User Schemas ====================

class UserCreate(BaseModel):
    """Schema for user registration"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    """Schema for user login"""
    username: str
    password: str


class Token(BaseModel):
    """Schema for JWT token response"""
    access_token: str
    token_type: str
    username: str


class UserResponse(BaseModel):
    """Schema for user data response"""
    user_id: int
    username: str
    email: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ==================== Question Schemas ====================

class QuestionCreate(BaseModel):
    """Schema for creating a question"""
    message: str = Field(..., min_length=1, max_length=1000)
    guest_name: Optional[str] = Field(None, max_length=100)


class QuestionResponse(BaseModel):
    """Schema for question response"""
    question_id: int
    message: str
    status: str
    created_at: datetime
    guest_name: Optional[str]
    username: Optional[str]
    response_count: int = 0
    
    class Config:
        from_attributes = True


class QuestionUpdate(BaseModel):
    """Schema for updating question status (admin only)"""
    status: str = Field(..., pattern="^(Pending|Escalated|Answered)$")


# ==================== Response Schemas ====================

class ResponseCreate(BaseModel):
    """Schema for creating a response to a question"""
    message: str = Field(..., min_length=1, max_length=1000)
    guest_name: Optional[str] = Field(None, max_length=100)


class ResponseResponse(BaseModel):
    """Schema for response data"""
    response_id: int
    question_id: int
    message: str
    created_at: datetime
    guest_name: Optional[str]
    username: Optional[str]
    
    class Config:
        from_attributes = True

