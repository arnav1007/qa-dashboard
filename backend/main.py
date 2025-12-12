"""
Main FastAPI application - Q&A Dashboard Backend
"""
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import case, desc
from datetime import timedelta, datetime
from typing import List, Optional
import logging
import os

from database import engine, Base, get_db
import models
import schemas
import auth
from websocket_manager import manager

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Q&A Dashboard API",
    description="Real-time Q&A Dashboard Backend with WebSocket support",
    version="1.0.0"
)

# CORS middleware - allows frontend to access backend
# Set ALLOW_ALL_ORIGINS=true in .env to allow all origins (not recommended for production)
allow_all_origins = os.getenv("ALLOW_ALL_ORIGINS", "false").lower() == "true"

if allow_all_origins:
    # Allow all origins (cannot use credentials with wildcard)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,  # Must be False when using "*"
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Use specific origins (recommended for production)
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ==================== Health Check ====================

@app.get("/")
def read_root():
    """API health check endpoint"""
    return {
        "message": "Q&A Dashboard API is running",
        "version": "1.0.0",
        "status": "healthy"
    }


# ==================== Authentication Routes ====================

@app.post("/api/register", response_model=schemas.Token, tags=["Authentication"])
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user
    
    - **username**: Unique username (3-50 characters)
    - **email**: Valid email address
    - **password**: Password (minimum 6 characters)
    """
    # Check if username already exists
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )
    
    # Check if email already exists
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    logger.info(f"New user registered: {new_user.username}")
    
    # Create access token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": new_user.username},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": new_user.username
    }


@app.post("/api/login", response_model=schemas.Token, tags=["Authentication"])
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Login with username and password
    
    - **username**: Your username
    - **password**: Your password
    """
    # Find user by username
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    
    # Verify user exists and password is correct
    if not db_user or not auth.verify_password(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    logger.info(f"User logged in: {db_user.username}")
    
    # Create access token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": db_user.username},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": db_user.username
    }


@app.get("/api/me", response_model=schemas.UserResponse, tags=["Authentication"])
def get_me(current_user: models.User = Depends(auth.get_current_user_required)):
    """Get current user information (requires authentication)"""
    return current_user


# ==================== Question Routes ====================

@app.post("/api/questions", response_model=schemas.QuestionResponse, tags=["Questions"])
async def create_question(
    question: schemas.QuestionCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    """
    Create a new question (guests and logged-in users)
    
    - **message**: Question text (1-1000 characters)
    - **guest_name**: Name for guest users (optional if logged in)
    """
    # Validate: either user is logged in OR guest_name is provided
    if not current_user and not question.guest_name:
        raise HTTPException(
            status_code=400,
            detail="Guest name is required for non-logged-in users"
        )
    
    # Create question
    new_question = models.Question(
        message=question.message,
        user_id=current_user.user_id if current_user else None,
        guest_name=question.guest_name if not current_user else None
    )
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    
    logger.info(f"New question created: ID {new_question.question_id}")
    
    # Prepare response data
    response_data = {
        "question_id": new_question.question_id,
        "message": new_question.message,
        "status": new_question.status.value,
        "created_at": new_question.created_at,
        "guest_name": new_question.guest_name,
        "username": new_question.user.username if new_question.user else None,
        "response_count": 0
    }
    
    # Broadcast to all connected WebSocket clients
    await manager.broadcast({
        "type": "new_question",
        "data": {
            **response_data,
            "created_at": new_question.created_at.isoformat()
        }
    })
    
    return response_data


@app.get("/api/questions", response_model=List[schemas.QuestionResponse], tags=["Questions"])
def get_questions(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all questions (ordered by: Escalated first, then by timestamp)
    
    - **status**: Optional filter by status (Pending, Escalated, Answered)
    """
    query = db.query(models.Question)
    
    # Filter by status if provided
    if status:
        try:
            status_enum = models.QuestionStatus(status)
            query = query.filter(models.Question.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status value")
    
    # Order by: Escalated first, then by timestamp (newest first)
    questions = query.order_by(
        case(
            (models.Question.status == models.QuestionStatus.ESCALATED, 0),
            (models.Question.status == models.QuestionStatus.PENDING, 1),
            (models.Question.status == models.QuestionStatus.ANSWERED, 2)
        ),
        desc(models.Question.created_at)
    ).all()
    
    # Build response with response counts
    result = []
    for q in questions:
        result.append({
            "question_id": q.question_id,
            "message": q.message,
            "status": q.status.value,
            "created_at": q.created_at,
            "guest_name": q.guest_name,
            "username": q.user.username if q.user else None,
            "response_count": len(q.responses)
        })
    
    return result


@app.get("/api/questions/{question_id}", response_model=schemas.QuestionResponse, tags=["Questions"])
def get_question(question_id: int, db: Session = Depends(get_db)):
    """Get a specific question by ID"""
    question = db.query(models.Question).filter(
        models.Question.question_id == question_id
    ).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return {
        "question_id": question.question_id,
        "message": question.message,
        "status": question.status.value,
        "created_at": question.created_at,
        "guest_name": question.guest_name,
        "username": question.user.username if question.user else None,
        "response_count": len(question.responses)
    }


@app.put("/api/questions/{question_id}", response_model=schemas.QuestionResponse, tags=["Questions"])
async def update_question_status(
    question_id: int,
    update: schemas.QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user_required)
):
    """
    Update question status (Logged-in users only)
    
    - **status**: New status (Pending, Escalated, or Answered)
    """
    question = db.query(models.Question).filter(
        models.Question.question_id == question_id
    ).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Update status
    question.status = models.QuestionStatus(update.status)
    
    # If marking as answered, record timestamp and user who answered
    if update.status == "Answered":
        question.answered_at = datetime.utcnow()
        question.answered_by = current_user.user_id
    
    db.commit()
    db.refresh(question)
    
    logger.info(f"Question {question_id} status updated to {update.status} by {current_user.username}")
    
    # Prepare response
    response_data = {
        "question_id": question.question_id,
        "message": question.message,
        "status": question.status.value,
        "created_at": question.created_at,
        "guest_name": question.guest_name,
        "username": question.user.username if question.user else None,
        "response_count": len(question.responses)
    }
    
    # Broadcast update to all clients
    await manager.broadcast({
        "type": "question_updated",
        "data": {
            **response_data,
            "created_at": question.created_at.isoformat()
        }
    })
    
    return response_data


# ==================== Response Routes ====================

@app.post("/api/questions/{question_id}/responses", response_model=schemas.ResponseResponse, tags=["Responses"])
async def create_response(
    question_id: int,
    response: schemas.ResponseCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    """
    Create a response to a question (guests and logged-in users)
    
    - **message**: Response text (1-1000 characters)
    - **guest_name**: Name for guest users (optional if logged in)
    """
    # Check if question exists
    question = db.query(models.Question).filter(
        models.Question.question_id == question_id
    ).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Validate: either user is logged in OR guest_name is provided
    if not current_user and not response.guest_name:
        raise HTTPException(
            status_code=400,
            detail="Guest name is required for non-logged-in users"
        )
    
    # Create response
    new_response = models.Response(
        question_id=question_id,
        message=response.message,
        user_id=current_user.user_id if current_user else None,
        guest_name=response.guest_name if not current_user else None
    )
    db.add(new_response)
    db.commit()
    db.refresh(new_response)
    
    logger.info(f"New response created for question {question_id}")
    
    # Prepare response data
    response_data = {
        "response_id": new_response.response_id,
        "question_id": new_response.question_id,
        "message": new_response.message,
        "created_at": new_response.created_at,
        "guest_name": new_response.guest_name,
        "username": new_response.user.username if new_response.user else None
    }
    
    # Broadcast new response
    await manager.broadcast({
        "type": "new_response",
        "data": {
            **response_data,
            "created_at": new_response.created_at.isoformat()
        }
    })
    
    return response_data


@app.get("/api/questions/{question_id}/responses", response_model=List[schemas.ResponseResponse], tags=["Responses"])
def get_responses(question_id: int, db: Session = Depends(get_db)):
    """Get all responses for a specific question"""
    # Check if question exists
    question = db.query(models.Question).filter(
        models.Question.question_id == question_id
    ).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Get responses ordered by creation time
    responses = db.query(models.Response).filter(
        models.Response.question_id == question_id
    ).order_by(models.Response.created_at).all()
    
    return [{
        "response_id": r.response_id,
        "question_id": r.question_id,
        "message": r.message,
        "created_at": r.created_at,
        "guest_name": r.guest_name,
        "username": r.user.username if r.user else None
    } for r in responses]


# ==================== WebSocket Route ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time updates
    
    Clients connect here to receive:
    - new_question: When a question is created
    - question_updated: When a question status changes
    - new_response: When a response is added
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and listen for messages
            data = await websocket.receive_text()
            # Optional: Handle client messages (ping/pong, etc.)
            logger.info(f"Received WebSocket message: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")


# ==================== Admin Utilities ====================
# Note: All logged-in users have equal permissions (no admin distinction)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

