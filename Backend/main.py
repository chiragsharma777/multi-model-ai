
import os
import requests

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# =========================================================
# LOAD ENVIRONMENT
# =========================================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")


SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

MODEL_NAME = os.getenv(
    "MODEL_NAME",
    "sarvam-105b"
)

# =========================================================
# CHECK ENVIRONMENT
# =========================================================

def require_configuration():
    """Return a useful API error instead of failing while the module imports."""
    missing = [name for name, value in {
        "SUPABASE_URL": SUPABASE_URL,
        "SUPABASE_SECRET_KEY": SUPABASE_SECRET_KEY,
        "SARVAM_API_KEY": SARVAM_API_KEY,
    }.items() if not value]
    if missing:
        raise HTTPException(
            status_code=503,
            detail=f"Backend configuration is missing: {', '.join(missing)}.",
        )


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="AI Backend",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# REQUEST MODELS
# =========================================================

class ChatRequest(BaseModel):
    message: str
    model: str | None = None
    temperature: float = 0.7
    conversation_id: str | None = None


class ConversationRequest(BaseModel):
    title: str = "New Chat"


# =========================================================
# SUPABASE AUTHENTICATION
# =========================================================

def get_user_from_token(
    authorization: str | None
):
    require_configuration()
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is missing."
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid Authorization header."
        )

    token = authorization.split(
        " ",
        1
    )[1].strip()

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Access token is empty."
        )

    try:
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_SECRET_KEY,
                "Authorization": f"Bearer {token}",
            },
            timeout=15,
        )

    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to Supabase Auth."
        )

    # Don't expose the token.
    # Only print the status and safe error information.
    if response.status_code != 200:

        try:
            error_data = response.json()
        except ValueError:
            error_data = {}

        safe_error = {}

        if isinstance(error_data, dict):
            for key in [
                "error",
                "error_code",
                "msg",
            ]:
                if key in error_data:
                    safe_error[key] = error_data[key]

        print(
            "SUPABASE AUTH STATUS:",
            response.status_code
        )

        print(
            "SUPABASE AUTH ERROR:",
            safe_error
        )

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token."
        )

    try:
        user = response.json()

    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid Supabase response."
        )

    user_id = user.get("id")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid authenticated user."
        )

    return {
        "id": user_id,
        "email": user.get("email"),
    }


# =========================================================
# SUPABASE DATABASE HEADERS
# =========================================================

def database_headers():
    require_configuration()
    return {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": (
            f"Bearer {SUPABASE_SECRET_KEY}"
        ),
        "Content-Type": "application/json",
    }


# =========================================================
# CREATE CONVERSATION
# =========================================================

def create_conversation(
    user_id: str,
    title: str
):
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/conversations",
            headers={
                **database_headers(),
                "Prefer": "return=representation",
            },
            json={
                "user_id": user_id,
                "title": title[:100],
            },
            timeout=15,
        )

    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to Supabase database."
        )

    if response.status_code not in [200, 201]:

        print(
            "DATABASE CREATE CONVERSATION STATUS:",
            response.status_code
        )

        raise HTTPException(
            status_code=500,
            detail="Could not create conversation."
        )

    try:
        data = response.json()

    except ValueError:
        raise HTTPException(
            status_code=500,
            detail="Invalid response from Supabase database."
        )

    if not data:
        raise HTTPException(
            status_code=500,
            detail="Conversation was not created."
        )

    return data[0]["id"]


def get_conversation_messages(conversation_id: str, user_id: str):
    verify_conversation(conversation_id, user_id)
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/messages",
            headers=database_headers(),
            params={
                "conversation_id": f"eq.{conversation_id}",
                "user_id": f"eq.{user_id}",
                "select": "id,role,content,model,created_at",
                "order": "created_at.asc",
            },
            timeout=15,
        )
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Could not load messages.")
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Could not load messages.")
    try:
        return response.json()
    except ValueError:
        raise HTTPException(status_code=500, detail="Invalid database response.")


# =========================================================
# VERIFY CONVERSATION
# =========================================================

def verify_conversation(
    conversation_id: str,
    user_id: str
):
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/conversations",
            headers=database_headers(),
            params={
                "id": f"eq.{conversation_id}",
                "user_id": f"eq.{user_id}",
                "select": "id",
            },
            timeout=15,
        )

    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail="Could not check conversation."
        )

    if response.status_code != 200:

        print(
            "DATABASE VERIFY STATUS:",
            response.status_code
        )

        raise HTTPException(
            status_code=500,
            detail="Could not check conversation."
        )

    try:
        data = response.json()

    except ValueError:
        raise HTTPException(
            status_code=500,
            detail="Invalid database response."
        )

    if not data:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found."
        )

    return True


# =========================================================
# SAVE MESSAGE
# =========================================================

def save_message(
    conversation_id: str,
    user_id: str,
    role: str,
    content: str,
    model: str | None = None
):
    payload = {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "role": role,
        "content": content,
    }

    if model:
        payload["model"] = model

    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/messages",
            headers={
                **database_headers(),
                "Prefer": "return=minimal",
            },
            json=payload,
            timeout=15,
        )

    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to Supabase database."
        )

    if response.status_code not in [
        200,
        201,
        204,
    ]:

        print(
            "DATABASE SAVE MESSAGE STATUS:",
            response.status_code
        )

        raise HTTPException(
            status_code=500,
            detail="Could not save message."
        )


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "name": "EnigmaAI Backend",
        "status": "running",
        "docs": "/docs",
        "model": MODEL_NAME,
        "database": "Supabase PostgreSQL",
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "configured": all([SUPABASE_URL, SUPABASE_SECRET_KEY, SARVAM_API_KEY]),
    }


# =========================================================
# AUTH ME
# =========================================================

@app.get("/auth/me")
def auth_me(
    authorization: str | None = Header(
        default=None
    )
):
    user = get_user_from_token(
        authorization
    )

    return {
        "authenticated": True,
        "user": user,
    }


@app.get("/conversations")
def list_conversations(authorization: str | None = Header(default=None)):
    user = get_user_from_token(authorization)
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/conversations",
            headers=database_headers(),
            params={"user_id": f"eq.{user['id']}", "select": "id,title,created_at,updated_at", "order": "updated_at.desc,created_at.desc"},
            timeout=15,
        )
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Could not load conversations.")
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Could not load conversations.")
    return response.json()


@app.post("/conversations")
def new_conversation(request: ConversationRequest, authorization: str | None = Header(default=None)):
    user = get_user_from_token(authorization)
    title = request.title.strip() or "New Chat"
    conversation_id = create_conversation(user["id"], title)
    return {"id": conversation_id, "title": title[:100]}


@app.get("/conversations/{conversation_id}/messages")
def list_messages(conversation_id: str, authorization: str | None = Header(default=None)):
    user = get_user_from_token(authorization)
    return get_conversation_messages(conversation_id, user["id"])


@app.patch("/conversations/{conversation_id}")
def update_conversation(conversation_id: str, request: ConversationRequest, authorization: str | None = Header(default=None)):
    user = get_user_from_token(authorization)
    verify_conversation(conversation_id, user["id"])
    title = request.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Conversation title cannot be empty.")
    response = requests.patch(
        f"{SUPABASE_URL}/rest/v1/conversations",
        headers={**database_headers(), "Prefer": "return=representation"},
        params={"id": f"eq.{conversation_id}", "user_id": f"eq.{user['id']}"},
        json={"title": title[:100]}, timeout=15,
    )
    if response.status_code not in [200, 204]:
        raise HTTPException(status_code=500, detail="Could not rename conversation.")
    return response.json()[0] if response.content else {"id": conversation_id, "title": title[:100]}


@app.delete("/conversations/{conversation_id}")
def remove_conversation(conversation_id: str, authorization: str | None = Header(default=None)):
    user = get_user_from_token(authorization)
    verify_conversation(conversation_id, user["id"])
    response = requests.delete(
        f"{SUPABASE_URL}/rest/v1/conversations", headers=database_headers(),
        params={"id": f"eq.{conversation_id}", "user_id": f"eq.{user['id']}"}, timeout=15,
    )
    if response.status_code not in [200, 204]:
        raise HTTPException(status_code=500, detail="Could not delete conversation.")
    return {"deleted": True}


# =========================================================
# CHAT
# =========================================================

@app.post("/chat")
def chat(
    request: ChatRequest,
    authorization: str | None = Header(
        default=None
    )
):
    # -----------------------------------------------------
    # 1. Authenticate user
    # -----------------------------------------------------

    user = get_user_from_token(
        authorization
    )

    user_id = user["id"]

    # -----------------------------------------------------
    # 2. Validate message
    # -----------------------------------------------------

    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    model = request.model or MODEL_NAME

    # -----------------------------------------------------
    # 3. Get or create conversation
    # -----------------------------------------------------

    conversation_id = request.conversation_id
    history = []

    if conversation_id:

        verify_conversation(
            conversation_id,
            user_id
        )
        history = get_conversation_messages(
            conversation_id,
            user_id
        )[-20:]

    else:

        conversation_id = create_conversation(
            user_id,
            message
        )

    # -----------------------------------------------------
    # 4. Save user message
    # -----------------------------------------------------

    save_message(
        conversation_id=conversation_id,
        user_id=user_id,
        role="user",
        content=message,
        model=model,
    )

    # -----------------------------------------------------
    # 5. Call Sarvam's OpenAI-compatible chat completion API
    # -----------------------------------------------------

    try:
        response = requests.post(
            "https://api.sarvam.ai/v1/chat/completions",

            headers={
                "api-subscription-key": SARVAM_API_KEY,
                "Content-Type": "application/json",
            },

            json={
                "model": model,

                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are EnigmaAI, "
                            "a helpful AI assistant. "
                            "Give clear, accurate "
                            "and useful answers."
                        ),
                    },
                    *[
                        {
                            "role": item["role"],
                            "content": item["content"],
                        }
                        for item in history
                        if item.get("role") in {"user", "assistant"}
                        and item.get("content")
                    ],
                    {
                        "role": "user",
                        "content": message,
                    },
                ],

                "temperature": request.temperature,
            },

            timeout=120,
        )

    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to the AI provider."
        )

    # -----------------------------------------------------
    # 6. Handle OpenRouter errors
    # -----------------------------------------------------

    if response.status_code >= 400:

        try:
            error_data = response.json()
        except ValueError:
            error_data = {}

        error_message = None

        if isinstance(
            error_data.get("error"),
            dict
        ):
            error_message = (
                error_data["error"].get(
                    "message"
                )
            )

        raise HTTPException(
            status_code=502,
            detail=(
                error_message
                or "AI provider request failed."
            )
        )

    # -----------------------------------------------------
    # 7. Read AI response
    # -----------------------------------------------------

    try:
        data = response.json()

    except ValueError:
        raise HTTPException(
            status_code=502,
            detail="Invalid response from the AI provider."
        )

    choices = data.get(
        "choices",
        []
    )

    if not choices:
        raise HTTPException(
            status_code=502,
            detail="The AI provider returned no answer."
        )

    answer = (
        choices[0]
        .get("message", {})
        .get("content", "")
    )

    if not answer:
        raise HTTPException(
            status_code=502,
            detail="AI returned an empty answer."
        )

    # -----------------------------------------------------
    # 8. Save AI response
    # -----------------------------------------------------

    save_message(
        conversation_id=conversation_id,
        user_id=user_id,
        role="assistant",
        content=answer,
        model=model,
    )

    # -----------------------------------------------------
    # 9. Return to React
    # -----------------------------------------------------

    return {
        "answer": answer,
        "model": model,
        "conversation_id": conversation_id,
    }
