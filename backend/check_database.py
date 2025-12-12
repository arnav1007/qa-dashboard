#!/usr/bin/env python3
"""
Script to check and view database contents
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
import models
from database import SQLALCHEMY_DATABASE_URL

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create session
session = Session(engine)

print("=" * 60)
print("Q&A DASHBOARD - DATABASE CHECKER")
print("=" * 60)

# Check Users
print("\n📊 USERS TABLE:")
print("-" * 60)
users = session.query(models.User).all()
if users:
    for user in users:
        print(f"  ID: {user.user_id}")
        print(f"  Username: {user.username}")
        print(f"  Email: {user.email}")
        print(f"  Is Admin: {'✅ Yes' if user.is_admin else '❌ No'}")
        print(f"  Created: {user.created_at}")
        print("-" * 60)
else:
    print("  ❌ No users found")

# Check Questions
print("\n📊 QUESTIONS TABLE:")
print("-" * 60)
questions = session.query(models.Question).all()
if questions:
    for q in questions:
        author = q.user.username if q.user else q.guest_name or "Anonymous"
        print(f"  ID: {q.question_id}")
        print(f"  Author: {author}")
        print(f"  Message: {q.message[:50]}..." if len(q.message) > 50 else f"  Message: {q.message}")
        print(f"  Status: {q.status.value}")
        print(f"  Created: {q.created_at}")
        print(f"  Responses: {len(q.responses)}")
        print("-" * 60)
else:
    print("  ❌ No questions found")

# Check Responses
print("\n📊 RESPONSES TABLE:")
print("-" * 60)
responses = session.query(models.Response).all()
if responses:
    for r in responses:
        author = r.user.username if r.user else r.guest_name or "Anonymous"
        print(f"  ID: {r.response_id}")
        print(f"  Question ID: {r.question_id}")
        print(f"  Author: {author}")
        print(f"  Message: {r.message[:50]}..." if len(r.message) > 50 else f"  Message: {r.message}")
        print(f"  Created: {r.created_at}")
        print("-" * 60)
else:
    print("  ❌ No responses found")

# Summary
print("\n📈 SUMMARY:")
print("-" * 60)
print(f"  Total Users: {len(users)}")
print(f"  Total Questions: {len(questions)}")
print(f"  Total Responses: {len(responses)}")
print("=" * 60)

session.close()

