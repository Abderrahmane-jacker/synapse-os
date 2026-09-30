import hmac
import hashlib
import json
import base64
from datetime import datetime, timedelta
from typing import Optional
import os
from app.config import settings

SECRET_KEY = os.getenv("SECRET_KEY", settings.SECRET_KEY)
ACCESS_TOKEN_EXPIRE_DAYS = 30

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)

def hash_password(password: str) -> str:
    """
    Hashes password securely using SHA-256 with salt.
    """
    salted = f"synapse_salt_{password}_imperial_2026"
    return hashlib.sha256(salted.encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against hashed password.
    """
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a JWT access token using pure Python HMAC-SHA256.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": int(expire.timestamp())})
    
    header = base64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode('utf-8'))
    payload = base64url_encode(json.dumps(to_encode).encode('utf-8'))
    
    signature_input = f"{header}.{payload}".encode('utf-8')
    signature = base64url_encode(hmac.new(SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest())
    
    return f"{header}.{payload}.{signature}"

def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodes and validates a JWT token.
    """
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature_b64 = parts
        
        signature_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = base64url_encode(hmac.new(SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest())
        
        if not hmac.compare_digest(signature_b64, expected_sig):
            return None
            
        payload_bytes = base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        if "exp" in payload and datetime.utcnow().timestamp() > payload["exp"]:
            return None
            
        return payload
    except Exception:
        return None
