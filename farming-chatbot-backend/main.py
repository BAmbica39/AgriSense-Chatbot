import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import chatbot
import config
import database
import limits
from auth import create_access_token, get_current_user, hash_password, verify_password
from models import ChatRequest, UserLogin, UserSignup

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app):
    if not config.JWT_SECRET:
        raise RuntimeError("JWT_SECRET is not set. Copy .env.example to .env and fill it in.")
    if not config.GEMINI_API_KEY:
        # Login still works; /ask returns a clear 503 until the key is added.
        logger.warning("GEMINI_API_KEY is not set. The chatbot cannot answer until it is added to .env.")
    else:
        logger.info("Chatbot using Gemini model %s", config.GEMINI_MODEL)
    try:
        database.init_db()
    except Exception as e:
        # Keep the server running so /health works and requests get a clear 503.
        logger.error("Could not initialise the database: %s", e)
    yield


app = FastAPI(title="Farming Chatbot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def db_unavailable(error):
    logger.error("Database error: %s", error)
    return HTTPException(status_code=503, detail="Database unavailable. Please try again later.")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/signup", status_code=201)
def signup(user: UserSignup):
    if user.password != user.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    try:
        database.create_user(user.username, user.name, user.email, hash_password(user.password))
    except database.DuplicateUserError:
        raise HTTPException(status_code=409, detail="Username or email already exists")
    except Exception as e:
        raise db_unavailable(e)

    return {"success": True, "message": "Signup successful"}


@app.post("/login")
def login(user: UserLogin):
    try:
        record = database.get_user_by_username(user.username)
    except Exception as e:
        raise db_unavailable(e)

    if not record or not verify_password(user.password, record["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return {
        "success": True,
        "message": "Login successful",
        "access_token": create_access_token(record["username"]),
        "token_type": "bearer",
        "username": record["username"],
        "name": record["name"],
    }


@app.get("/me")
def me(username: str = Depends(get_current_user)):
    return {"username": username}


@app.post("/ask")
def ask(request: ChatRequest, username: str = Depends(get_current_user)):
    history = [(turn.role, turn.text) for turn in request.history]
    with limits.chat_slot(username):
        try:
            reply = chatbot.get_reply(request.message, history)
        except chatbot.ChatbotError as e:
            raise HTTPException(status_code=e.status_code, detail=e.message)
    return {"reply": reply}
