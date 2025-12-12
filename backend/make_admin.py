#!/usr/bin/env python3
"""
Script to make a user an admin
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
import models
from database import SQLALCHEMY_DATABASE_URL
import sys

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)
session = Session(engine)

print("=" * 60)
print("MAKE USER ADMIN")
print("=" * 60)

# Get username from command line or ask
if len(sys.argv) > 1:
    username = sys.argv[1]
else:
    # List all users
    users = session.query(models.User).all()
    if not users:
        print("❌ No users found in database!")
        print("Please register a user first.")
        session.close()
        exit(1)
    
    print("\n👥 Available users:")
    for i, user in enumerate(users, 1):
        admin_status = "✅ ADMIN" if user.is_admin else "❌ Not admin"
        print(f"{i}. {user.username} ({user.email}) - {admin_status}")
    
    print("\nEnter username to make admin:")
    username = input("Username: ").strip()

# Find user
user = session.query(models.User).filter(models.User.username == username).first()

if not user:
    print(f"❌ User '{username}' not found!")
    session.close()
    exit(1)

if user.is_admin:
    print(f"✅ User '{username}' is already an admin!")
else:
    user.is_admin = True
    session.commit()
    print(f"✅ User '{username}' is now an admin!")

session.close()

