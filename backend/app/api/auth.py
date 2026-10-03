"""Authentication API Endpoints: Signup, Login, and Me."""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from backend.app.schemas import UserSignupRequest, UserLoginRequest, TokenResponse, UserResponse
from backend.app.auth.security import get_password_hash, verify_password, create_access_token
from backend.app.auth.dependencies import get_current_user
from backend.app.database.mongo import db

router = APIRouter(prefix="/auth")


@router.post("/signup", response_model=TokenResponse)
async def signup(payload: UserSignupRequest):
    """Register a new user account and initialize isolated workspace in MongoDB."""
    email_clean = payload.email.lower().strip()
    existing_user = await db.get_user_by_email(email_clean)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    user_id = f"usr_{uuid.uuid4().hex[:10]}"
    hashed_pwd = get_password_hash(payload.password)
    user_doc = {
        "_id": user_id,
        "email": email_clean,
        "full_name": payload.full_name.strip(),
        "hashed_password": hashed_pwd,
        "created_at": datetime.utcnow().isoformat(),
        "is_active": True,
    }

    created = await db.create_user(user_doc)
    token = create_access_token({"sub": user_id, "email": email_clean})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=created["_id"],
            email=created["email"],
            full_name=created["full_name"],
            created_at=created["created_at"],
            google_connected=False,
            auth_provider="local",
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLoginRequest):
    """Authenticate with email and password to receive a JWT access token."""
    email_clean = payload.email.lower().strip()
    user = await db.get_user_by_email(email_clean)
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user_id = user.get("_id", user.get("id"))
    token = create_access_token({"sub": user_id, "email": email_clean})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            email=user["email"],
            full_name=user.get("full_name", email_clean.split("@")[0]),
            created_at=user.get("created_at"),
            google_connected=bool(user.get("google_tokens")),
            auth_provider=user.get("auth_provider", "local"),
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Retrieve profile of the currently authenticated user."""
    return UserResponse(
        id=current_user.get("_id", current_user.get("id")),
        email=current_user["email"],
        full_name=current_user.get("full_name", current_user["email"].split("@")[0]),
        created_at=current_user.get("created_at"),
        google_connected=bool(current_user.get("google_tokens")),
        auth_provider=current_user.get("auth_provider", "local"),
    )
