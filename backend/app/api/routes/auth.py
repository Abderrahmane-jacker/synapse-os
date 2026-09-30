from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from app.models.database import db_manager
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from typing import Optional

router = APIRouter()

class RegisterRequest(BaseModel):
    email: str
    password: str
    user_name: Optional[str] = "OPERATOR"
    assistant_name: Optional[str] = "Synapse"

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register")
async def register_user(req: RegisterRequest):
    email_clean = req.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="Invalid email address.")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long.")

    existing = await db_manager.get_user_by_email(email_clean)
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    hashed = hash_password(req.password)
    user = await db_manager.create_user(
        email=email_clean,
        hashed_password=hashed,
        user_name=req.user_name.strip() if req.user_name and req.user_name.strip() else "OPERATOR",
        assistant_name=req.assistant_name.strip() if req.assistant_name and req.assistant_name.strip() else "Synapse"
    )

    token = create_access_token({"sub": user["id"], "email": user["email"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "user_name": user["user_name"],
            "assistant_name": user["assistant_name"]
        }
    }

@router.post("/login")
async def login_user(req: LoginRequest):
    email_clean = req.email.strip().lower()
    user = await db_manager.get_user_by_email(email_clean)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({"sub": user["id"], "email": user["email"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "user_name": user["user_name"],
            "assistant_name": user["assistant_name"]
        }
    }

@router.get("/me")
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user = await db_manager.get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    return {
        "user": {
            "id": user["id"],
            "email": user["email"],
            "user_name": user["user_name"],
            "assistant_name": user["assistant_name"]
        }
    }

class DeleteAccountRequest(BaseModel):
    password: str

@router.post("/delete-account")
async def delete_account(req: DeleteAccountRequest, authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user = await db_manager.get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    if not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect password. Account deletion aborted.")

    await db_manager.delete_user(user["id"])
    return {"status": "deleted", "message": "Account successfully deleted."}
