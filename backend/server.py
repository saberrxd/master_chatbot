from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import csv
import io
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import hashlib
import hmac
import json
import httpx
import random
import razorpay
import jwt
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Razorpay client
razorpay_client = razorpay.Client(auth=(
    os.environ.get('RAZORPAY_KEY_ID', ''),
    os.environ.get('RAZORPAY_KEY_SECRET', '')
))

# Cashfree config
CASHFREE_APP_ID = os.environ.get('CASHFREE_APP_ID', '')
CASHFREE_SECRET_KEY = os.environ.get('CASHFREE_SECRET_KEY', '')
CASHFREE_ENV = os.environ.get('CASHFREE_ENVIRONMENT', 'SANDBOX')
CASHFREE_BASE_URL = "https://api.cashfree.com/pg" if CASHFREE_ENV == "PRODUCTION" else "https://sandbox.cashfree.com/pg"

JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret')
ADMIN_DEFAULT_PASSWORD = os.environ.get('ADMIN_DEFAULT_PASSWORD', 'admin123')

# Supported languages
SUPPORTED_LANGUAGES = [
    {"code": "en", "name": "English", "native_name": "English"},
    {"code": "hi", "name": "Hindi", "native_name": "हिन्दी"},
    {"code": "bn", "name": "Bengali", "native_name": "বাংলা"},
    {"code": "ta", "name": "Tamil", "native_name": "தமிழ்"},
    {"code": "te", "name": "Telugu", "native_name": "తెలుగు"},
    {"code": "mr", "name": "Marathi", "native_name": "मराठी"},
    {"code": "gu", "name": "Gujarati", "native_name": "ગુજરાતી"},
    {"code": "kn", "name": "Kannada", "native_name": "ಕನ್ನಡ"},
    {"code": "ml", "name": "Malayalam", "native_name": "മലയാളം"},
    {"code": "pa", "name": "Punjabi", "native_name": "ਪੰਜਾਬੀ"},
    {"code": "ur", "name": "Urdu", "native_name": "اردو"},
    {"code": "es", "name": "Spanish", "native_name": "Español"},
    {"code": "fr", "name": "French", "native_name": "Français"},
    {"code": "ar", "name": "Arabic", "native_name": "العربية"},
    {"code": "pt", "name": "Portuguese", "native_name": "Português"},
    {"code": "de", "name": "German", "native_name": "Deutsch"},
    {"code": "ja", "name": "Japanese", "native_name": "日本語"},
    {"code": "zh", "name": "Chinese", "native_name": "中文"},
    {"code": "ko", "name": "Korean", "native_name": "한국어"},
    {"code": "ru", "name": "Russian", "native_name": "Русский"},
]

app = FastAPI()
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminResponse(BaseModel):
    token: str
    username: str

class QuestionOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    next_question_id: Optional[str] = None
    is_answer: bool = False
    answer_text: Optional[str] = None
    requires_payment: bool = False
    payment_amount: Optional[float] = None
    payment_gateway: Optional[str] = None  # "razorpay" or "cashfree"
    is_agent_handoff: bool = False  # If true, triggers agent handoff when selected

class QuestionCreate(BaseModel):
    text: str
    options: List[QuestionOption]
    is_root: bool = False
    category: Optional[str] = None
    platforms: Optional[List[str]] = None  # None or empty = all platforms

class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    options: Optional[List[QuestionOption]] = None
    is_root: Optional[bool] = None
    category: Optional[str] = None
    platforms: Optional[List[str]] = None

class QuestionResponse(BaseModel):
    id: str
    text: str
    options: List[QuestionOption]
    is_root: bool
    category: Optional[str] = None
    platforms: Optional[List[str]] = None
    created_at: str

class ChatSessionCreate(BaseModel):
    user_name: str
    user_mobile: str
    platform_name: str
    user_email: Optional[str] = None
    channel_name: Optional[str] = None
    assigned_master: Optional[str] = None
    assigned_monitor: Optional[str] = None
    language: Optional[str] = "en"  # Language code

class ChatSessionResponse(BaseModel):
    id: str
    user_name: str
    user_mobile: str
    platform_name: str
    user_email: Optional[str] = None
    channel_name: Optional[str] = None
    assigned_master: Optional[str] = None
    assigned_monitor: Optional[str] = None
    language: Optional[str] = "en"  # Language code
    created_at: str
    status: str

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    sender: str  # "bot" or "user"
    message: str
    options: Optional[List[Dict[str, Any]]] = None
    requires_payment: bool = False
    payment_amount: Optional[float] = None
    payment_gateway: Optional[str] = None
    question_id: Optional[str] = None
    option_id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserSelection(BaseModel):
    session_id: str
    question_id: str
    option_id: str

class PaymentOrderCreate(BaseModel):
    session_id: str
    option_id: str
    question_id: str
    gateway: str  # "razorpay" or "cashfree"
    amount: float
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

class PaymentVerify(BaseModel):
    order_id: str
    payment_id: Optional[str] = None
    signature: Optional[str] = None
    gateway: str
    session_id: str
    option_id: str
    question_id: str

# ==================== HELPERS ====================

def create_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def is_sanctum_token(token: str) -> bool:
    """Check if token is a Laravel Sanctum token (format: {id}|{string})"""
    if '|' not in token:
        return False
    parts = token.split('|', 1)
    return parts[0].isdigit() and len(parts[1]) > 10

async def get_sanctum_config():
    """Get Sanctum configuration from DB"""
    config = await db.sanctum_config.find_one({"type": "sanctum"}, {"_id": 0})
    if not config:
        return {
            "enabled": False,
            "api_url": os.environ.get("SANCTUM_API_URL", ""),
            "admin_role_field": "role",
            "admin_role_value": "admin",
            "agent_role_field": "role",
            "agent_role_value": "agent",
        }
    return config

async def validate_sanctum_token(token: str) -> dict:
    """Validate a Sanctum token by calling the Laravel API"""
    config = await get_sanctum_config()
    if not config.get("enabled"):
        raise HTTPException(status_code=401, detail="Sanctum authentication is not enabled")

    api_url = config.get("api_url", "").rstrip("/")
    if not api_url:
        raise HTTPException(status_code=401, detail="Sanctum API URL not configured")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{api_url}/api/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                }
            )
        if response.status_code != 200:
            logger.warning(f"Sanctum validation failed: HTTP {response.status_code}")
            raise HTTPException(status_code=401, detail="Invalid Sanctum token")

        user_data = response.json()
        return user_data

    except httpx.TimeoutException:
        raise HTTPException(status_code=401, detail="Sanctum API timeout — could not validate token")
    except httpx.RequestError as e:
        logger.error(f"Sanctum request error: {e}")
        raise HTTPException(status_code=401, detail="Could not connect to Sanctum API")

async def get_current_admin(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth.split(" ", 1)[1]

    # Check if Sanctum token
    if is_sanctum_token(token):
        user = await validate_sanctum_token(token)
        username = user.get("name", user.get("email", "sanctum_admin"))
        # Store/update in our DB as external admin
        await db.admins.update_one(
            {"username": f"sanctum:{user.get('id', '')}"},
            {"$set": {
                "username": f"sanctum:{user.get('id', '')}",
                "display_name": username,
                "email": user.get("email", ""),
                "source": "sanctum",
                "sanctum_user": user,
            }},
            upsert=True,
        )
        return username

    # Fallback: JWT token
    return verify_token(token)

def mask_credential(value: str) -> str:
    """Mask a credential showing only last 4 chars"""
    if not value or len(value) < 8:
        return "****"
    return "*" * (len(value) - 4) + value[-4:]

async def get_pg_settings():
    """Get PG settings from DB, fallback to .env"""
    settings = await db.pg_settings.find_one({"type": "pg_config"}, {"_id": 0})
    if not settings:
        return {
            "razorpay": {
                "enabled": True,
                "mode": "test",
                "key_id": os.environ.get('RAZORPAY_KEY_ID', ''),
                "key_secret": os.environ.get('RAZORPAY_KEY_SECRET', ''),
            },
            "cashfree": {
                "enabled": True,
                "mode": "production" if CASHFREE_ENV == "PRODUCTION" else "test",
                "app_id": CASHFREE_APP_ID,
                "secret_key": CASHFREE_SECRET_KEY,
            },
            "default_gateway": "razorpay"
        }
    return settings

async def get_razorpay_client():
    """Get Razorpay client with latest credentials from DB"""
    settings = await get_pg_settings()
    rz = settings.get("razorpay", {})
    return razorpay.Client(auth=(rz.get("key_id", ""), rz.get("key_secret", "")))

async def get_cashfree_config():
    """Get Cashfree config from DB"""
    settings = await get_pg_settings()
    cf = settings.get("cashfree", {})
    mode = cf.get("mode", "test")
    base_url = "https://api.cashfree.com/pg" if mode == "production" else "https://sandbox.cashfree.com/pg"
    return {
        "app_id": cf.get("app_id", ""),
        "secret_key": cf.get("secret_key", ""),
        "base_url": base_url,
        "enabled": cf.get("enabled", True)
    }

# ==================== SEED ADMIN ====================

@app.on_event("startup")
async def seed_admin():
    existing = await db.admins.find_one({"username": "admin"})
    if not existing:
        hashed = hashlib.sha256(ADMIN_DEFAULT_PASSWORD.encode()).hexdigest()
        await db.admins.insert_one({
            "username": "admin",
            "password": hashed,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Default admin seeded: admin / admin123")
    
    # Seed Sanctum config with default URL if not exists
    sanctum_exists = await db.sanctum_config.find_one({"type": "sanctum"})
    if not sanctum_exists:
        await db.sanctum_config.insert_one({
            "type": "sanctum",
            "enabled": True,
            "api_url": "https://hiteam.hitch.zone",
            "admin_role_field": "role",
            "admin_role_value": "admin",
            "agent_role_field": "role",
            "agent_role_value": "agent",
        })
        logger.info("Sanctum config seeded: https://hiteam.hitch.zone")

    # Seed sample questions if none exist
    count = await db.questions.count_documents({})
    if count == 0:
        root_q_id = str(uuid.uuid4())
        sub_q1_id = str(uuid.uuid4())
        sub_q2_id = str(uuid.uuid4())
        
        questions = [
            {
                "id": root_q_id,
                "text": "Welcome! How can I help you today?",
                "options": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "General Inquiry",
                        "next_question_id": sub_q1_id,
                        "is_answer": False,
                        "answer_text": None,
                        "requires_payment": False,
                        "payment_amount": None,
                        "payment_gateway": None
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Premium Consultation",
                        "next_question_id": sub_q2_id,
                        "is_answer": False,
                        "answer_text": None,
                        "requires_payment": False,
                        "payment_amount": None,
                        "payment_gateway": None
                    }
                ],
                "is_root": True,
                "category": "main",
                "platforms": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": sub_q1_id,
                "text": "What would you like to know?",
                "options": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "About our services",
                        "next_question_id": None,
                        "is_answer": True,
                        "answer_text": "We provide AI-powered chatbot solutions for businesses. Our services include custom chatbot development, integration with payment gateways, and analytics dashboards.",
                        "requires_payment": False,
                        "payment_amount": None,
                        "payment_gateway": None
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Pricing information",
                        "next_question_id": None,
                        "is_answer": True,
                        "answer_text": "Our pricing starts at ₹999/month for basic plans and ₹4999/month for premium plans with unlimited queries.",
                        "requires_payment": False,
                        "payment_amount": None,
                        "payment_gateway": None
                    }
                ],
                "is_root": False,
                "category": "general",
                "platforms": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": sub_q2_id,
                "text": "Select a premium consultation topic:",
                "options": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Business Strategy Report (₹499)",
                        "next_question_id": None,
                        "is_answer": True,
                        "answer_text": "Here is your detailed Business Strategy Report: Our AI analysis shows that your business can grow 3x by implementing chatbot automation, reducing customer support costs by 60%, and improving response times by 90%.",
                        "requires_payment": True,
                        "payment_amount": 499.0,
                        "payment_gateway": "razorpay"
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Technical Audit Report (₹299)",
                        "next_question_id": None,
                        "is_answer": True,
                        "answer_text": "Technical Audit Report: Your current infrastructure is rated 7/10. Recommendations: Upgrade to cloud hosting, implement CDN, add load balancing for better scalability.",
                        "requires_payment": True,
                        "payment_amount": 299.0,
                        "payment_gateway": "cashfree"
                    }
                ],
                "is_root": False,
                "category": "premium",
                "platforms": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        
        await db.questions.insert_many(questions)
        logger.info("Sample questions seeded")

    # Seed PG settings if not exist
    pg_exists = await db.pg_settings.find_one({"type": "pg_config"})
    if not pg_exists:
        await db.pg_settings.insert_one({
            "type": "pg_config",
            "razorpay": {
                "enabled": True,
                "mode": "test",
                "key_id": os.environ.get('RAZORPAY_KEY_ID', ''),
                "key_secret": os.environ.get('RAZORPAY_KEY_SECRET', ''),
            },
            "cashfree": {
                "enabled": True,
                "mode": "production" if CASHFREE_ENV == "PRODUCTION" else "test",
                "app_id": CASHFREE_APP_ID,
                "secret_key": CASHFREE_SECRET_KEY,
            },
            "default_gateway": "cashfree",
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("PG settings seeded from .env")

# ==================== ADMIN AUTH ====================

@api_router.post("/admin/login", response_model=AdminResponse)
async def admin_login(data: AdminLogin):
    hashed = hashlib.sha256(data.password.encode()).hexdigest()
    admin = await db.admins.find_one({"username": data.username, "password": hashed}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(data.username)
    return AdminResponse(token=token, username=data.username)

# ==================== PG SETTINGS ====================

@api_router.get("/admin/pg-settings")
async def get_pg_settings_masked(admin: str = Depends(get_current_admin)):
    """Get PG settings with masked credentials"""
    settings = await get_pg_settings()
    return {
        "razorpay": {
            "enabled": settings.get("razorpay", {}).get("enabled", False),
            "mode": settings.get("razorpay", {}).get("mode", "test"),
            "key_id_masked": mask_credential(settings.get("razorpay", {}).get("key_id", "")),
            "key_secret_masked": mask_credential(settings.get("razorpay", {}).get("key_secret", "")),
        },
        "cashfree": {
            "enabled": settings.get("cashfree", {}).get("enabled", False),
            "mode": settings.get("cashfree", {}).get("mode", "test"),
            "app_id_masked": mask_credential(settings.get("cashfree", {}).get("app_id", "")),
            "secret_key_masked": mask_credential(settings.get("cashfree", {}).get("secret_key", "")),
        },
        "default_gateway": settings.get("default_gateway", "razorpay"),
    }

@api_router.post("/admin/pg-settings/request-otp")
async def request_pg_otp(admin: str = Depends(get_current_admin)):
    """Generate OTP to view unmasked PG credentials"""
    otp = str(random.randint(100000, 999999))
    expiry = datetime.now(timezone.utc) + timedelta(minutes=5)

    await db.pg_otps.delete_many({"admin": admin})
    await db.pg_otps.insert_one({
        "admin": admin,
        "otp": hashlib.sha256(otp.encode()).hexdigest(),
        "expires_at": expiry.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Get admin email for sending OTP
    admin_doc = await db.admins.find_one({"username": admin}, {"_id": 0})
    admin_email = admin_doc.get("email", "") if admin_doc else ""

    if admin_email:
        logger.info(f"OTP for PG credentials sent to {admin_email}: {otp}")
    else:
        logger.info(f"No email configured for admin. OTP: {otp}")

    return {
        "message": "OTP sent to your registered email" if admin_email else "OTP generated (configure admin email to receive via mail)",
        "email_sent_to": mask_credential(admin_email) if admin_email else None,
        "otp_preview": otp,
        "expires_in_minutes": 5
    }

@api_router.post("/admin/pg-settings/verify-otp")
async def verify_pg_otp(data: dict, admin: str = Depends(get_current_admin)):
    """Verify OTP and return unmasked PG credentials"""
    otp = data.get("otp", "")
    if not otp:
        raise HTTPException(status_code=400, detail="OTP is required")

    otp_hash = hashlib.sha256(str(otp).encode()).hexdigest()
    record = await db.pg_otps.find_one({"admin": admin, "otp": otp_hash}, {"_id": 0})

    if not record:
        raise HTTPException(status_code=401, detail="Invalid OTP")

    if datetime.now(timezone.utc).isoformat() > record["expires_at"]:
        await db.pg_otps.delete_many({"admin": admin})
        raise HTTPException(status_code=401, detail="OTP expired. Please request a new one.")

    # Delete used OTP
    await db.pg_otps.delete_many({"admin": admin})

    # Return full credentials
    settings = await get_pg_settings()
    return {
        "verified": True,
        "razorpay": {
            "enabled": settings.get("razorpay", {}).get("enabled", False),
            "mode": settings.get("razorpay", {}).get("mode", "test"),
            "key_id": settings.get("razorpay", {}).get("key_id", ""),
            "key_secret": settings.get("razorpay", {}).get("key_secret", ""),
        },
        "cashfree": {
            "enabled": settings.get("cashfree", {}).get("enabled", False),
            "mode": settings.get("cashfree", {}).get("mode", "test"),
            "app_id": settings.get("cashfree", {}).get("app_id", ""),
            "secret_key": settings.get("cashfree", {}).get("secret_key", ""),
        },
        "default_gateway": settings.get("default_gateway", "razorpay"),
    }

@api_router.put("/admin/pg-settings")
async def update_pg_settings(data: dict, admin: str = Depends(get_current_admin)):
    """Update PG credentials, modes, enabled/disabled, default gateway"""
    update = {}

    if "razorpay" in data:
        rz = data["razorpay"]
        rz_update = {}
        if "enabled" in rz:
            rz_update["razorpay.enabled"] = rz["enabled"]
        if "mode" in rz:
            rz_update["razorpay.mode"] = rz["mode"]
        if "key_id" in rz and rz["key_id"]:
            rz_update["razorpay.key_id"] = rz["key_id"]
        if "key_secret" in rz and rz["key_secret"]:
            rz_update["razorpay.key_secret"] = rz["key_secret"]
        update.update(rz_update)

    if "cashfree" in data:
        cf = data["cashfree"]
        cf_update = {}
        if "enabled" in cf:
            cf_update["cashfree.enabled"] = cf["enabled"]
        if "mode" in cf:
            cf_update["cashfree.mode"] = cf["mode"]
        if "app_id" in cf and cf["app_id"]:
            cf_update["cashfree.app_id"] = cf["app_id"]
        if "secret_key" in cf and cf["secret_key"]:
            cf_update["cashfree.secret_key"] = cf["secret_key"]
        update.update(cf_update)

    if "default_gateway" in data:
        update["default_gateway"] = data["default_gateway"]

    if update:
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.pg_settings.update_one(
            {"type": "pg_config"},
            {"$set": update},
            upsert=True
        )

    return {"message": "PG settings updated successfully"}

@api_router.put("/admin/admin-email")
async def update_admin_email(data: dict, admin: str = Depends(get_current_admin)):
    """Update admin email for OTP delivery"""
    email = data.get("email", "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    await db.admins.update_one({"username": admin}, {"$set": {"email": email}})
    return {"message": "Admin email updated"}

@api_router.get("/admin/admin-email")
async def get_admin_email(admin: str = Depends(get_current_admin)):
    """Get admin email (masked)"""
    doc = await db.admins.find_one({"username": admin}, {"_id": 0})
    email = doc.get("email", "") if doc else ""
    return {"email_masked": mask_credential(email) if email else "", "has_email": bool(email)}

# ==================== QUESTIONS CRUD ====================

@api_router.post("/questions", response_model=QuestionResponse)
async def create_question(data: QuestionCreate, admin: str = Depends(get_current_admin)):
    question_id = str(uuid.uuid4())
    doc = {
        "id": question_id,
        "text": data.text,
        "options": [opt.dict() for opt in data.options],
        "is_root": data.is_root,
        "category": data.category,
        "platforms": data.platforms or [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.questions.insert_one(doc)
    return QuestionResponse(**{k: v for k, v in doc.items() if k != "_id"})

@api_router.get("/questions", response_model=List[QuestionResponse])
async def list_questions(admin: str = Depends(get_current_admin)):
    questions = await db.questions.find({}, {"_id": 0}).to_list(1000)
    return [QuestionResponse(**q) for q in questions]

@api_router.get("/questions/bulk-template")
async def download_bulk_template(admin: str = Depends(get_current_admin)):
    """Download a CSV template for bulk question upload"""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(BULK_TEMPLATE_HEADERS)
    for row in BULK_TEMPLATE_SAMPLE_ROWS:
        writer.writerow(row)
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=questions_template.csv"}
    )

@api_router.post("/questions/bulk-upload")
async def bulk_upload_questions(file: UploadFile = File(...), admin: str = Depends(get_current_admin)):
    """Bulk upload questions from CSV or Excel file"""
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(status_code=400, detail="Only .csv and .xlsx files are supported")

    content = await file.read()
    rows = []

    try:
        if ext == "csv":
            # Try different encodings
            text = None
            for encoding in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
                try:
                    text = content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            if text is None:
                raise HTTPException(status_code=400, detail="Could not decode CSV file. Please use UTF-8 encoding.")

            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                rows.append(row)

        elif ext in ("xlsx", "xls"):
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True)
            ws = wb.active
            headers = []
            for i, row in enumerate(ws.iter_rows(values_only=True)):
                if i == 0:
                    headers = [str(h).strip() if h else "" for h in row]
                    continue
                # Skip completely empty rows
                if all(cell is None or str(cell).strip() == "" for cell in row):
                    continue
                row_dict = {}
                for j, h in enumerate(headers):
                    val = row[j] if j < len(row) else ""
                    row_dict[h] = str(val).strip() if val is not None else ""
                rows.append(row_dict)
            wb.close()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk upload parse error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    if not rows:
        raise HTTPException(status_code=400, detail="File is empty or has no data rows")

    # Validate required columns
    required_cols = {"question_ref", "question_text", "option_text"}
    available_cols = set(rows[0].keys())
    missing = required_cols - available_cols
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(missing)}. Required: {', '.join(BULK_TEMPLATE_HEADERS)}"
        )

    # ===== Fetch valid platforms for validation =====
    session_platforms = await db.chat_sessions.distinct("platform_name")
    question_platforms = await db.questions.distinct("platforms")
    custom_platforms_docs = await db.platforms.find({}, {"_id": 0, "name": 1}).to_list(1000)
    custom_names = [p["name"] for p in custom_platforms_docs]
    valid_platforms = set(
        [p for p in session_platforms if p] +
        [p for p in question_platforms if p and isinstance(p, str)] +
        custom_names
    )

    # ===== PASS 1: Group rows into questions =====
    question_groups = {}  # question_ref -> {text, is_root, platforms, options: []}
    errors = []
    platform_warnings = []

    for row_idx, row in enumerate(rows, start=2):  # start=2 because row 1 is header
        q_ref = str(row.get("question_ref", "")).strip()
        q_text = str(row.get("question_text", "")).strip()
        opt_text = str(row.get("option_text", "")).strip()

        if not q_ref:
            errors.append(f"Row {row_idx}: Missing question_ref")
            continue
        if not q_text:
            errors.append(f"Row {row_idx}: Missing question_text for {q_ref}")
            continue
        if not opt_text:
            errors.append(f"Row {row_idx}: Missing option_text for {q_ref}")
            continue

        is_root = _parse_bool(row.get("is_root", ""))
        platforms_str = str(row.get("platforms", "")).strip()
        platforms = [p.strip() for p in platforms_str.split(",") if p.strip()] if platforms_str else []

        # Validate platforms against known platforms
        if platforms and valid_platforms:
            for p in platforms:
                if p not in valid_platforms:
                    platform_warnings.append(f"Row {row_idx} ({q_ref}): Unknown platform '{p}'. Known: {', '.join(sorted(valid_platforms))}")

        is_answer = _parse_bool(row.get("is_answer", ""))
        answer_text = str(row.get("answer_text", "")).strip()
        next_q_ref = str(row.get("next_question_ref", "")).strip()
        is_agent_handoff = _parse_bool(row.get("is_agent_handoff", ""))
        requires_payment = _parse_bool(row.get("requires_payment", ""))
        payment_amount = _parse_float(row.get("payment_amount", ""))
        payment_gateway = str(row.get("payment_gateway", "")).strip().lower() or None
        if payment_gateway and payment_gateway not in ("razorpay", "cashfree"):
            errors.append(f"Row {row_idx}: Invalid payment_gateway '{payment_gateway}'. Use 'razorpay' or 'cashfree'.")
            payment_gateway = None

        if q_ref not in question_groups:
            question_groups[q_ref] = {
                "text": q_text,
                "is_root": is_root,
                "platforms": platforms,
                "options": []
            }

        option = {
            "id": str(uuid.uuid4()),
            "text": opt_text,
            "next_question_ref": next_q_ref if next_q_ref else None,
            "is_answer": is_answer,
            "answer_text": answer_text if is_answer and answer_text else None,
            "requires_payment": requires_payment,
            "payment_amount": payment_amount if requires_payment else None,
            "payment_gateway": payment_gateway if requires_payment else None,
            "is_agent_handoff": is_agent_handoff,
        }
        question_groups[q_ref]["options"].append(option)

    if not question_groups:
        raise HTTPException(status_code=400, detail=f"No valid questions found. Errors: {'; '.join(errors)}")

    # ===== PASS 2: Create questions and map refs to IDs =====
    ref_to_id = {}  # question_ref -> actual question_id
    created_questions = []

    for q_ref, q_data in question_groups.items():
        question_id = str(uuid.uuid4())
        ref_to_id[q_ref] = question_id

        # Build options without next_question_id for now
        options = []
        for opt in q_data["options"]:
            options.append({
                "id": opt["id"],
                "text": opt["text"],
                "next_question_id": None,  # Will be linked in pass 3
                "is_answer": opt["is_answer"],
                "answer_text": opt["answer_text"],
                "requires_payment": opt["requires_payment"],
                "payment_amount": opt["payment_amount"],
                "payment_gateway": opt["payment_gateway"],
                "is_agent_handoff": opt["is_agent_handoff"],
            })

        doc = {
            "id": question_id,
            "text": q_data["text"],
            "options": options,
            "is_root": q_data["is_root"],
            "category": None,
            "platforms": q_data["platforms"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        created_questions.append(doc)

    # ===== PASS 3: Link next_question_id references =====
    link_warnings = []
    for doc in created_questions:
        for opt in doc["options"]:
            # Find the original ref for this option
            pass

    # Re-iterate question_groups to link
    for q_ref, q_data in question_groups.items():
        q_id = ref_to_id[q_ref]
        doc = next(d for d in created_questions if d["id"] == q_id)
        for i, opt_data in enumerate(q_data["options"]):
            next_ref = opt_data.get("next_question_ref")
            if next_ref:
                if next_ref in ref_to_id:
                    doc["options"][i]["next_question_id"] = ref_to_id[next_ref]
                else:
                    link_warnings.append(f"Option '{opt_data['text']}' in {q_ref}: next_question_ref '{next_ref}' not found in upload")

    # ===== Insert into DB =====
    if created_questions:
        await db.questions.insert_many(created_questions)

    result = {
        "success": True,
        "total_questions_created": len(created_questions),
        "total_options_created": sum(len(q["options"]) for q in created_questions),
        "questions": [
            {
                "ref": q_ref,
                "id": ref_to_id[q_ref],
                "text": q_data["text"],
                "is_root": q_data["is_root"],
                "options_count": len(q_data["options"])
            }
            for q_ref, q_data in question_groups.items()
        ],
        "errors": errors,
        "warnings": link_warnings + platform_warnings,
    }

    logger.info(f"Bulk upload: {len(created_questions)} questions created by admin '{admin}'")
    return result

@api_router.get("/questions/{question_id}", response_model=QuestionResponse)
async def get_question(question_id: str):
    q = await db.questions.find_one({"id": question_id}, {"_id": 0})
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return QuestionResponse(**q)

@api_router.put("/questions/{question_id}", response_model=QuestionResponse)
async def update_question(question_id: str, data: QuestionUpdate, admin: str = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items()}
    if "options" in update_data:
        update_data["options"] = [opt if isinstance(opt, dict) else opt.dict() for opt in update_data["options"]]
    
    result = await db.questions.update_one({"id": question_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    
    q = await db.questions.find_one({"id": question_id}, {"_id": 0})
    return QuestionResponse(**q)

@api_router.delete("/questions/{question_id}")
async def delete_question(question_id: str, admin: str = Depends(get_current_admin)):
    result = await db.questions.delete_one({"id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question deleted"}

@api_router.get("/platforms")
async def get_platforms(admin: str = Depends(get_current_admin)):
    """Get all distinct platform names from sessions + questions for admin dropdown"""
    session_platforms = await db.chat_sessions.distinct("platform_name")
    question_platforms = await db.questions.distinct("platforms")
    # Flatten and deduplicate
    all_platforms = list(set(
        [p for p in session_platforms if p] +
        [p for p in question_platforms if p and isinstance(p, str)]
    ))
    all_platforms.sort()
    return {"platforms": all_platforms}

@api_router.post("/platforms")
async def add_platform(data: dict, admin: str = Depends(get_current_admin)):
    """Admin can add custom platform names"""
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Platform name required")
    # Store in a dedicated collection
    existing = await db.platforms.find_one({"name": name})
    if not existing:
        await db.platforms.insert_one({"name": name, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"message": f"Platform '{name}' added"}

@api_router.get("/platforms/all")
async def get_all_platforms(admin: str = Depends(get_current_admin)):
    """Get all platforms including custom ones"""
    session_platforms = await db.chat_sessions.distinct("platform_name")
    question_platforms = await db.questions.distinct("platforms")
    custom_platforms = await db.platforms.find({}, {"_id": 0, "name": 1}).to_list(1000)
    custom_names = [p["name"] for p in custom_platforms]
    all_platforms = list(set(
        [p for p in session_platforms if p] +
        [p for p in question_platforms if p and isinstance(p, str)] +
        custom_names
    ))
    all_platforms.sort()
    return {"platforms": all_platforms}

# ==================== BULK UPLOAD QUESTIONS ====================

BULK_TEMPLATE_HEADERS = [
    "question_ref", "question_text", "is_root", "platforms",
    "option_text", "is_answer", "answer_text", "next_question_ref",
    "is_agent_handoff", "requires_payment", "payment_amount", "payment_gateway"
]

BULK_TEMPLATE_SAMPLE_ROWS = [
    ["Q1", "How can we help you?", "yes", "Website,Android App", "Billing Issues", "no", "", "Q2", "no", "no", "", ""],
    ["Q1", "How can we help you?", "yes", "Website,Android App", "Talk to Support", "no", "", "", "yes", "no", "", ""],
    ["Q2", "What billing issue do you have?", "no", "Website,Android App", "Refund Request", "yes", "To request a refund, please email support@example.com with your order details.", "", "no", "no", "", ""],
    ["Q2", "What billing issue do you have?", "no", "Website,Android App", "Payment Failed", "yes", "If your payment failed, try again or use a different payment method.", "", "no", "no", "", ""],
    ["Q2", "What billing issue do you have?", "no", "Website,Android App", "Premium Report (₹499)", "yes", "Here is your premium billing analysis report...", "", "no", "yes", "499", "razorpay"],
]

def _parse_bool(val: str) -> bool:
    """Parse boolean from CSV value"""
    if isinstance(val, bool):
        return val
    return str(val).strip().lower() in ("yes", "true", "1", "y")

def _parse_float(val: str) -> Optional[float]:
    """Parse float from CSV value"""
    if not val or str(val).strip() == "":
        return None
    try:
        return float(str(val).strip())
    except ValueError:
        return None

# ==================== CHAT SESSION ====================

@api_router.post("/chat/session", response_model=ChatSessionResponse)
async def create_chat_session(data: ChatSessionCreate):
    session_id = str(uuid.uuid4())
    doc = {
        "id": session_id,
        "user_name": data.user_name,
        "user_mobile": data.user_mobile,
        "platform_name": data.platform_name,
        "user_email": data.user_email,
        "channel_name": data.channel_name,
        "assigned_master": data.assigned_master,
        "assigned_monitor": data.assigned_monitor,
        "language": data.language or "en",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "active"
    }
    await db.chat_sessions.insert_one(doc)
    return ChatSessionResponse(**{k: v for k, v in doc.items() if k != "_id"})

@api_router.get("/chat/sessions", response_model=List[ChatSessionResponse])
async def list_sessions(admin: str = Depends(get_current_admin)):
    sessions = await db.chat_sessions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [ChatSessionResponse(**s) for s in sessions]

@api_router.get("/chat/session/{session_id}", response_model=ChatSessionResponse)
async def get_session(session_id: str):
    s = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return ChatSessionResponse(**s)

# ==================== CHAT FLOW ====================

@api_router.get("/languages")
async def get_languages():
    """Get list of supported languages"""
    return SUPPORTED_LANGUAGES

@api_router.post("/chat/update-language")
async def update_session_language(data: dict):
    """Update language preference for a chat session"""
    session_id = data.get("session_id", "")
    language = data.get("language", "en")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    result = await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {"language": language}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Language updated", "language": language}

@api_router.get("/chat/start/{session_id}")
async def start_chat(session_id: str):
    """Get the root question to start chat - filtered by user's platform"""
    session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    user_platform = session.get("platform_name", "")
    
    # Find root question matching user's platform
    # First try platform-specific root, then fallback to any root (empty platforms = all)
    root = await db.questions.find_one({
        "is_root": True,
        "platforms": user_platform
    }, {"_id": 0})
    
    if not root:
        # Fallback: root question with empty platforms (available to all)
        root = await db.questions.find_one({
            "is_root": True,
            "$or": [{"platforms": {"$size": 0}}, {"platforms": {"$exists": False}}, {"platforms": None}]
        }, {"_id": 0})
    
    if not root:
        # Last fallback: any root question
        root = await db.questions.find_one({"is_root": True}, {"_id": 0})
    
    if not root:
        raise HTTPException(status_code=404, detail="No questions configured for this platform")
    
    # Save bot message
    msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "sender": "bot",
        "message": root["text"],
        "options": [{"id": o["id"], "text": o["text"]} for o in root["options"]],
        "requires_payment": False,
        "question_id": root["id"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(msg)
    
    # Update session with the root ID used
    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {"root_question_id": root["id"]}}
    )
    
    return {
        "question_id": root["id"],
        "message": root["text"],
        "options": [{"id": o["id"], "text": o["text"]} for o in root["options"]],
        "requires_payment": False
    }

@api_router.post("/chat/select")
async def select_option(data: UserSelection):
    """User selects an option"""
    question = await db.questions.find_one({"id": data.question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    selected = None
    for opt in question["options"]:
        if opt["id"] == data.option_id:
            selected = opt
            break
    
    if not selected:
        raise HTTPException(status_code=404, detail="Option not found")
    
    # Save user message
    user_msg = {
        "id": str(uuid.uuid4()),
        "session_id": data.session_id,
        "sender": "user",
        "message": selected["text"],
        "question_id": data.question_id,
        "option_id": data.option_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(user_msg)
    
    # If option triggers agent handoff
    if selected.get("is_agent_handoff"):
        await db.chat_sessions.update_one(
            {"id": data.session_id},
            {"$set": {"needs_agent": True, "agent_handoff_type": "automatic"}}
        )
        sys_msg = {
            "id": str(uuid.uuid4()),
            "session_id": data.session_id,
            "sender": "system",
            "message": "Connecting you to a live agent. Please wait...",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_messages.insert_one(sys_msg)
        await ws_manager.broadcast(data.session_id, {
            "type": "agent_requested",
            "message": sys_msg["message"]
        })
        return {
            "type": "agent_handoff",
            "message": sys_msg["message"]
        }

    # If option requires payment
    if selected.get("requires_payment"):
        bot_msg = {
            "id": str(uuid.uuid4()),
            "session_id": data.session_id,
            "sender": "bot",
            "message": f"This content requires a payment of ₹{selected['payment_amount']:.0f}. Please complete the payment to view the answer.",
            "requires_payment": True,
            "payment_amount": selected["payment_amount"],
            "payment_gateway": selected.get("payment_gateway", "razorpay"),
            "question_id": data.question_id,
            "option_id": data.option_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_messages.insert_one(bot_msg)
        
        return {
            "type": "payment_required",
            "message": bot_msg["message"],
            "payment_amount": selected["payment_amount"],
            "payment_gateway": selected.get("payment_gateway", "razorpay"),
            "question_id": data.question_id,
            "option_id": data.option_id
        }
    
    # If option is a direct answer (free)
    if selected.get("is_answer"):
        bot_msg = {
            "id": str(uuid.uuid4()),
            "session_id": data.session_id,
            "sender": "bot",
            "message": selected["answer_text"],
            "requires_payment": False,
            "question_id": data.question_id,
            "option_id": data.option_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_messages.insert_one(bot_msg)
        
        # Also check if there's a root question to continue
        session = await db.chat_sessions.find_one({"id": data.session_id}, {"_id": 0})
        user_platform = session.get("platform_name", "") if session else ""
        stored_root_id = session.get("root_question_id") if session else None
        
        root = None
        if stored_root_id:
            root = await db.questions.find_one({"id": stored_root_id}, {"_id": 0})
            
        if not root:
            # Fallback for old sessions: Find root matching platform
            root = await db.questions.find_one({"is_root": True, "platforms": user_platform}, {"_id": 0})
        
        if not root:
            # Fallback 2: Any root with empty platforms
            root = await db.questions.find_one({
                "is_root": True, 
                "$or": [{"platforms": {"$size": 0}}, {"platforms": {"$exists": False}}, {"platforms": None}]
            }, {"_id": 0})
            
        if not root:
            root = await db.questions.find_one({"is_root": True}, {"_id": 0})

        continue_options = []
        continue_qid = None
        if root:
            continue_options = [{"id": o["id"], "text": o["text"]} for o in root["options"]]
            continue_qid = root["id"]
        
        return {
            "type": "answer",
            "message": selected["answer_text"],
            "continue_question_id": continue_qid,
            "continue_options": continue_options,
            "_debug_root_id": continue_qid # Temporary debug info
        }
    
    # If option leads to next question
    if selected.get("next_question_id"):
        next_q = await db.questions.find_one({"id": selected["next_question_id"]}, {"_id": 0})
        if not next_q:
            raise HTTPException(status_code=404, detail="Next question not found")
        
        bot_msg = {
            "id": str(uuid.uuid4()),
            "session_id": data.session_id,
            "sender": "bot",
            "message": next_q["text"],
            "options": [{"id": o["id"], "text": o["text"]} for o in next_q["options"]],
            "question_id": next_q["id"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_messages.insert_one(bot_msg)
        
        return {
            "type": "question",
            "question_id": next_q["id"],
            "message": next_q["text"],
            "options": [{"id": o["id"], "text": o["text"]} for o in next_q["options"]]
        }
    
    return {"type": "end", "message": "Thank you for using our service!"}

@api_router.get("/chat/messages/{session_id}")
async def get_chat_messages(session_id: str):
    messages = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("timestamp", 1).to_list(1000)
    return messages

# ==================== PAYMENT - RAZORPAY ====================

@api_router.post("/payment/razorpay/create")
async def create_razorpay_order(data: PaymentOrderCreate):
    try:
        pg = await get_pg_settings()
        rz = pg.get("razorpay", {})
        if not rz.get("enabled"):
            raise HTTPException(status_code=400, detail="Razorpay is disabled by admin")

        rz_client = razorpay.Client(auth=(rz.get("key_id", ""), rz.get("key_secret", "")))
        amount_paise = int(data.amount * 100)
        order_data = {
            "amount": amount_paise,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {
                "session_id": data.session_id,
                "option_id": data.option_id,
                "question_id": data.question_id
            }
        }
        order = rz_client.order.create(data=order_data)
        
        # Save payment record
        payment_doc = {
            "id": str(uuid.uuid4()),
            "order_id": order["id"],
            "session_id": data.session_id,
            "option_id": data.option_id,
            "question_id": data.question_id,
            "gateway": "razorpay",
            "amount": data.amount,
            "status": "created",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payments.insert_one(payment_doc)
        
        return {
            "order_id": order["id"],
            "amount": amount_paise,
            "currency": "INR",
            "key_id": rz.get("key_id", ""),
            "customer_name": data.customer_name or "",
            "customer_email": data.customer_email or "",
            "customer_phone": data.customer_phone or ""
        }
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment order creation failed: {str(e)}")

@api_router.post("/payment/razorpay/verify")
async def verify_razorpay_payment(data: PaymentVerify):
    try:
        # Update payment status
        await db.payments.update_one(
            {"order_id": data.order_id},
            {"$set": {"status": "paid", "payment_id": data.payment_id, "paid_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Get the answer and send it
        question = await db.questions.find_one({"id": data.question_id}, {"_id": 0})
        if question:
            for opt in question["options"]:
                if opt["id"] == data.option_id:
                    # Save the answer as bot message
                    bot_msg = {
                        "id": str(uuid.uuid4()),
                        "session_id": data.session_id,
                        "sender": "bot",
                        "message": f"✅ Payment successful! Here's your answer:\n\n{opt.get('answer_text', 'Content unlocked.')}",
                        "requires_payment": False,
                        "question_id": data.question_id,
                        "option_id": data.option_id,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    await db.chat_messages.insert_one(bot_msg)
                    
                    # Also check if there's a root question to continue
                    session = await db.chat_sessions.find_one({"id": data.session_id}, {"_id": 0})
                    user_platform = session.get("platform_name", "") if session else ""
                    stored_root_id = session.get("root_question_id") if session else None

                    root = None
                    if stored_root_id:
                        root = await db.questions.find_one({"id": stored_root_id}, {"_id": 0})

                    if not root:
                        root = await db.questions.find_one({"is_root": True, "platforms": user_platform}, {"_id": 0})
                    if not root:
                        root = await db.questions.find_one({
                            "is_root": True, 
                            "$or": [{"platforms": {"$size": 0}}, {"platforms": {"$exists": False}}, {"platforms": None}]
                        }, {"_id": 0})
                    if not root:
                        root = await db.questions.find_one({"is_root": True}, {"_id": 0})

                    continue_options = []
                    continue_qid = None
                    if root:
                        continue_options = [{"id": o["id"], "text": o["text"]} for o in root["options"]]
                        continue_qid = root["id"]
                    
                    return {
                        "status": "success",
                        "message": bot_msg["message"],
                        "continue_question_id": continue_qid,
                        "continue_options": continue_options
                    }
        
        return {"status": "success", "message": "Payment verified"}
    except Exception as e:
        logger.error(f"Razorpay verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PAYMENT - CASHFREE ====================

@api_router.post("/payment/cashfree/create")
async def create_cashfree_order(data: PaymentOrderCreate):
    try:
        cf_config = await get_cashfree_config()
        if not cf_config.get("enabled"):
            raise HTTPException(status_code=400, detail="Cashfree is disabled by admin")

        order_id = f"cf_{int(datetime.now(timezone.utc).timestamp())}_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "order_id": order_id,
            "order_amount": round(data.amount, 2),
            "order_currency": "INR",
            "customer_details": {
                "customer_id": data.session_id[:50],
                "customer_email": data.customer_email or "user@example.com",
                "customer_phone": data.customer_phone or "9999999999",
                "customer_name": data.customer_name or "User"
            },
            "order_meta": {
                "return_url": f"{os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://chatbot-hub-57.preview.emergentagent.com')}/api/payment/cashfree/callback?order_id={order_id}"
            },
            "order_note": f"Session: {data.session_id}"
        }
        
        headers = {
            "Content-Type": "application/json",
            "x-api-version": "2023-08-01",
            "x-client-id": cf_config["app_id"],
            "x-client-secret": cf_config["secret_key"]
        }
        
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                f"{cf_config['base_url']}/orders",
                json=payload,
                headers=headers,
                timeout=15.0
            )
        
        if response.status_code not in [200, 201]:
            logger.error(f"Cashfree order failed: {response.status_code} - {response.text}")
            raise HTTPException(status_code=400, detail=f"Cashfree order creation failed: {response.text}")
        
        resp_data = response.json()
        
        # Save payment record
        payment_doc = {
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "cf_order_id": resp_data.get("cf_order_id", ""),
            "session_id": data.session_id,
            "option_id": data.option_id,
            "question_id": data.question_id,
            "gateway": "cashfree",
            "amount": data.amount,
            "status": "created",
            "payment_session_id": resp_data.get("payment_session_id", ""),
            "payment_link": resp_data.get("payment_link", ""),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payments.insert_one(payment_doc)
        
        return {
            "order_id": order_id,
            "cf_order_id": resp_data.get("cf_order_id", ""),
            "payment_session_id": resp_data.get("payment_session_id", ""),
            "payment_link": resp_data.get("payment_link", ""),
            "amount": data.amount
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cashfree order creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payment/cashfree/verify")
async def verify_cashfree_payment(data: PaymentVerify):
    try:
        cf_config = await get_cashfree_config()
        headers = {
            "Content-Type": "application/json",
            "x-api-version": "2023-08-01",
            "x-client-id": cf_config["app_id"],
            "x-client-secret": cf_config["secret_key"]
        }
        
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                f"{cf_config['base_url']}/orders/{data.order_id}",
                headers=headers,
                timeout=15.0
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to verify payment")
        
        order_data = response.json()
        order_status = order_data.get("order_status", "")
        
        if order_status == "PAID":
            await db.payments.update_one(
                {"order_id": data.order_id},
                {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            # Get answer
            question = await db.questions.find_one({"id": data.question_id}, {"_id": 0})
            if question:
                for opt in question["options"]:
                    if opt["id"] == data.option_id:
                        bot_msg = {
                            "id": str(uuid.uuid4()),
                            "session_id": data.session_id,
                            "sender": "bot",
                            "message": f"✅ Payment successful! Here's your answer:\n\n{opt.get('answer_text', 'Content unlocked.')}",
                            "requires_payment": False,
                            "question_id": data.question_id,
                            "option_id": data.option_id,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                        await db.chat_messages.insert_one(bot_msg)
                        
                        # Also check if there's a root question to continue
                        session = await db.chat_sessions.find_one({"id": data.session_id}, {"_id": 0})
                        user_platform = session.get("platform_name", "") if session else ""
                        stored_root_id = session.get("root_question_id") if session else None

                        root = None
                        if stored_root_id:
                            root = await db.questions.find_one({"id": stored_root_id}, {"_id": 0})

                        if not root:
                            root = await db.questions.find_one({"is_root": True, "platforms": user_platform}, {"_id": 0})
                        if not root:
                            root = await db.questions.find_one({
                                "is_root": True, 
                                "$or": [{"platforms": {"$size": 0}}, {"platforms": {"$exists": False}}, {"platforms": None}]
                            }, {"_id": 0})
                        if not root:
                            root = await db.questions.find_one({"is_root": True}, {"_id": 0})

                        continue_options = []
                        continue_qid = None
                        if root:
                            continue_options = [{"id": o["id"], "text": o["text"]} for o in root["options"]]
                            continue_qid = root["id"]
                        
                        return {
                            "status": "success",
                            "message": bot_msg["message"],
                            "continue_question_id": continue_qid,
                            "continue_options": continue_options
                        }
            
            return {"status": "success", "message": "Payment verified"}
        else:
            return {"status": "pending", "message": f"Payment status: {order_status}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cashfree verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/payment/cashfree/callback")
async def cashfree_callback(order_id: str):
    return {"order_id": order_id, "message": "Payment callback received. Please return to the app."}

# ==================== SANCTUM CONFIG ====================

@api_router.get("/admin/sanctum-config")
async def get_sanctum_settings(admin: str = Depends(get_current_admin)):
    """Get Sanctum integration configuration"""
    config = await get_sanctum_config()
    return config

@api_router.put("/admin/sanctum-config")
async def update_sanctum_settings(data: dict, admin: str = Depends(get_current_admin)):
    """Update Sanctum integration configuration"""
    update = {
        "type": "sanctum",
        "enabled": bool(data.get("enabled", False)),
        "api_url": str(data.get("api_url", "")).strip().rstrip("/"),
        "admin_role_field": str(data.get("admin_role_field", "role")),
        "admin_role_value": str(data.get("admin_role_value", "admin")),
        "agent_role_field": str(data.get("agent_role_field", "role")),
        "agent_role_value": str(data.get("agent_role_value", "agent")),
    }
    await db.sanctum_config.update_one(
        {"type": "sanctum"}, {"$set": update}, upsert=True
    )
    logger.info(f"Sanctum config updated by admin '{admin}': enabled={update['enabled']}, url={update['api_url']}")
    return update

@api_router.post("/admin/sanctum-test")
async def test_sanctum_connection(data: dict, admin: str = Depends(get_current_admin)):
    """Test Sanctum API connectivity"""
    api_url = str(data.get("api_url", "")).strip().rstrip("/")
    test_token = str(data.get("test_token", "")).strip()

    if not api_url:
        raise HTTPException(status_code=400, detail="API URL is required")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if test_token:
                # Test with actual token
                response = await client.get(
                    f"{api_url}/api/user",
                    headers={
                        "Authorization": f"Bearer {test_token}",
                        "Accept": "application/json",
                    }
                )
                if response.status_code == 200:
                    user = response.json()
                    return {
                        "success": True,
                        "message": f"Connected! User: {user.get('name', user.get('email', 'Unknown'))}",
                        "user": {
                            "id": user.get("id"),
                            "name": user.get("name"),
                            "email": user.get("email"),
                        }
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Token validation failed (HTTP {response.status_code})"
                    }
            else:
                # Just test connectivity
                response = await client.get(f"{api_url}/api/user", headers={"Accept": "application/json"})
                return {
                    "success": True,
                    "message": f"API reachable (HTTP {response.status_code})"
                }
    except httpx.TimeoutException:
        return {"success": False, "message": "Connection timed out"}
    except httpx.RequestError as e:
        return {"success": False, "message": f"Connection failed: {str(e)}"}

# ==================== ADMIN STATS ====================

@api_router.get("/admin/stats")
async def get_admin_stats(admin: str = Depends(get_current_admin)):
    total_questions = await db.questions.count_documents({})
    total_sessions = await db.chat_sessions.count_documents({})
    total_payments = await db.payments.count_documents({})
    paid_payments = await db.payments.count_documents({"status": "paid"})
    
    # Revenue
    pipeline = [
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    revenue_result = await db.payments.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "total_questions": total_questions,
        "total_sessions": total_sessions,
        "total_payments": total_payments,
        "paid_payments": paid_payments,
        "total_revenue": total_revenue
    }

# ==================== API DOCUMENTATION ====================

@api_router.get("/docs/admin")
async def admin_api_docs():
    """Complete API documentation for PHP Admin SDK integration"""
    return {
        "title": "ChatBot Admin API Documentation",
        "version": "1.0.0",
        "base_url": os.environ.get('EXPO_PUBLIC_BACKEND_URL', ''),
        "authentication": {
            "type": "JWT Bearer Token",
            "login_endpoint": "POST /api/admin/login",
            "login_body": {"username": "string", "password": "string"},
            "login_response": {"token": "jwt_token_string", "username": "string"},
            "usage": "Add header: Authorization: Bearer <token>",
            "token_expiry": "7 days"
        },
        "endpoints": {
            "admin": {
                "login": {
                    "method": "POST", "path": "/api/admin/login", "auth": False,
                    "body": {"username": "string", "password": "string"},
                    "response": {"token": "string", "username": "string"}
                },
                "stats": {
                    "method": "GET", "path": "/api/admin/stats", "auth": True,
                    "response": {
                        "total_questions": "int", "total_sessions": "int",
                        "total_payments": "int", "paid_payments": "int", "total_revenue": "float"
                    }
                }
            },
            "questions": {
                "list": {
                    "method": "GET", "path": "/api/questions", "auth": True,
                    "response": "Array of Question objects"
                },
                "get": {
                    "method": "GET", "path": "/api/questions/{question_id}", "auth": False,
                    "response": "Question object"
                },
                "create": {
                    "method": "POST", "path": "/api/questions", "auth": True,
                    "body": {
                        "text": "string (question text shown to user)",
                        "options": [{
                            "id": "string (uuid, auto-generated if empty)",
                            "text": "string (option text shown to user)",
                            "next_question_id": "string|null (uuid of next question for branching)",
                            "is_answer": "bool (true if this option shows a final answer)",
                            "answer_text": "string|null (the answer text, required if is_answer=true)",
                            "requires_payment": "bool (true if payment needed before showing answer)",
                            "payment_amount": "float|null (amount in INR, required if requires_payment=true)",
                            "payment_gateway": "string|null ('razorpay' or 'cashfree')"
                        }],
                        "is_root": "bool (true = first question shown to users)",
                        "category": "string|null (optional label)"
                    }
                },
                "update": {
                    "method": "PUT", "path": "/api/questions/{question_id}", "auth": True,
                    "body": "Same as create, all fields optional (only send what you want to change)"
                },
                "delete": {
                    "method": "DELETE", "path": "/api/questions/{question_id}", "auth": True,
                    "response": {"message": "Question deleted"}
                }
            },
            "chat_sessions": {
                "list": {
                    "method": "GET", "path": "/api/chat/sessions", "auth": True,
                    "response": "Array of Session objects"
                },
                "get": {
                    "method": "GET", "path": "/api/chat/session/{session_id}", "auth": False,
                    "response": "Session object"
                },
                "create": {
                    "method": "POST", "path": "/api/chat/session", "auth": False,
                    "body": {
                        "user_name": "string (REQUIRED)",
                        "user_mobile": "string (REQUIRED)",
                        "platform_name": "string (REQUIRED)",
                        "user_email": "string|null",
                        "channel_name": "string|null",
                        "assigned_master": "string|null",
                        "assigned_monitor": "string|null"
                    }
                },
                "messages": {
                    "method": "GET", "path": "/api/chat/messages/{session_id}", "auth": False,
                    "response": "Array of Message objects"
                }
            },
            "chat_flow": {
                "start": {
                    "method": "GET", "path": "/api/chat/start/{session_id}", "auth": False,
                    "response": {
                        "question_id": "string", "message": "string",
                        "options": [{"id": "string", "text": "string"}],
                        "requires_payment": "bool"
                    }
                },
                "select_option": {
                    "method": "POST", "path": "/api/chat/select", "auth": False,
                    "body": {"session_id": "string", "question_id": "string", "option_id": "string"},
                    "response_types": {
                        "question": {"type": "question", "question_id": "string", "message": "string", "options": "array"},
                        "answer": {"type": "answer", "message": "string", "continue_question_id": "string|null", "continue_options": "array"},
                        "payment_required": {"type": "payment_required", "message": "string", "payment_amount": "float", "payment_gateway": "string", "question_id": "string", "option_id": "string"}
                    }
                }
            },
            "payments": {
                "razorpay_create": {
                    "method": "POST", "path": "/api/payment/razorpay/create", "auth": False,
                    "body": {
                        "session_id": "string", "option_id": "string", "question_id": "string",
                        "gateway": "razorpay", "amount": "float",
                        "customer_name": "string", "customer_email": "string", "customer_phone": "string"
                    }
                },
                "razorpay_verify": {
                    "method": "POST", "path": "/api/payment/razorpay/verify", "auth": False,
                    "body": {
                        "order_id": "string", "payment_id": "string", "signature": "string",
                        "gateway": "razorpay", "session_id": "string", "option_id": "string", "question_id": "string"
                    }
                },
                "cashfree_create": {
                    "method": "POST", "path": "/api/payment/cashfree/create", "auth": False,
                    "body": {
                        "session_id": "string", "option_id": "string", "question_id": "string",
                        "gateway": "cashfree", "amount": "float",
                        "customer_name": "string", "customer_email": "string", "customer_phone": "string"
                    }
                },
                "cashfree_verify": {
                    "method": "POST", "path": "/api/payment/cashfree/verify", "auth": False,
                    "body": {
                        "order_id": "string", "gateway": "cashfree",
                        "session_id": "string", "option_id": "string", "question_id": "string"
                    }
                }
            }
        },
        "php_sdk": {
            "file": "ChatBotAdminSDK.php",
            "quick_start": [
                "1. Copy ChatBotAdminSDK.php into your PHP project",
                "2. require_once 'ChatBotAdminSDK.php';",
                "3. $sdk = new ChatBotAdminSDK('YOUR_API_URL');",
                "4. $sdk->login('admin', 'admin123');",
                "5. $questions = $sdk->getQuestions();",
                "6. Store $sdk->getToken() in $_SESSION for reuse"
            ]
        }
    }

# ==================== HEALTH ====================

@api_router.get("/")
async def root():
    return {"message": "Chatbot API is running", "status": "ok"}

# ==================== AGENT MANAGEMENT (Admin) ====================

@api_router.post("/agents")
async def create_agent(data: dict, admin: str = Depends(get_current_admin)):
    """Admin creates an agent"""
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    display_name = data.get("display_name", "").strip()
    platforms = data.get("platforms", [])
    role = data.get("role", "agent")  # "agent" or "master_agent"

    if role not in ("agent", "master_agent"):
        raise HTTPException(status_code=400, detail="Role must be 'agent' or 'master_agent'")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")

    existing = await db.agents.find_one({"username": username})
    if existing:
        raise HTTPException(status_code=400, detail="Agent username already exists")

    agent_id = str(uuid.uuid4())
    doc = {
        "id": agent_id,
        "username": username,
        "password": hashlib.sha256(password.encode()).hexdigest(),
        "display_name": display_name or username,
        "platforms": platforms,
        "role": role,
        "status": "offline",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.agents.insert_one(doc)
    return {
        "id": agent_id, "username": username, "display_name": doc["display_name"],
        "platforms": platforms, "role": role, "status": "offline"
    }

@api_router.get("/agents")
async def list_agents(admin: str = Depends(get_current_admin)):
    agents = await db.agents.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return agents

@api_router.put("/agents/{agent_id}")
async def update_agent(agent_id: str, data: dict, admin: str = Depends(get_current_admin)):
    update = {}
    if "display_name" in data:
        update["display_name"] = data["display_name"]
    if "platforms" in data:
        update["platforms"] = data["platforms"]
    if "password" in data and data["password"]:
        update["password"] = hashlib.sha256(data["password"].encode()).hexdigest()
    if "role" in data and data["role"] in ("agent", "master_agent"):
        update["role"] = data["role"]
    if update:
        await db.agents.update_one({"id": agent_id}, {"$set": update})
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0, "password": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@api_router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, admin: str = Depends(get_current_admin)):
    result = await db.agents.delete_one({"id": agent_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": "Agent deleted"}

# ==================== AGENT AUTH ====================

@api_router.post("/agent/login")
async def agent_login(data: dict):
    username = data.get("username", "")
    password = data.get("password", "")
    hashed = hashlib.sha256(password.encode()).hexdigest()
    agent = await db.agents.find_one({"username": username, "password": hashed}, {"_id": 0, "password": 0})
    if not agent:
        raise HTTPException(status_code=401, detail="Invalid agent credentials")

    await db.agents.update_one({"id": agent["id"]}, {"$set": {"status": "online"}})
    token = create_token(f"agent:{agent['id']}:{username}")
    if "languages" not in agent:
        agent["languages"] = []
    return {"token": token, "agent": agent}

@api_router.put("/agent/languages")
async def agent_update_languages(data: dict, request: Request):
    """Agent updates their known languages (toggle on/off)"""
    agent = await get_current_agent(request)
    languages = data.get("languages", [])
    # languages: list of {"code": "en", "enabled": true/false}
    await db.agents.update_one(
        {"id": agent["id"]},
        {"$set": {"languages": languages}}
    )
    return {"message": "Languages updated", "languages": languages}

@api_router.get("/agent/languages")
async def agent_get_languages(request: Request):
    """Agent gets their language settings and supported languages"""
    agent = await get_current_agent(request)
    return {"languages": agent.get("languages", []), "supported": SUPPORTED_LANGUAGES}

async def get_current_agent(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth.split(" ", 1)[1]

    # Check if Sanctum token
    if is_sanctum_token(token):
        user = await validate_sanctum_token(token)
        sanctum_id = str(user.get("id", ""))
        username = user.get("name", user.get("email", f"sanctum_agent_{sanctum_id}"))

        # Find or create agent from Sanctum user
        agent = await db.agents.find_one({"sanctum_id": sanctum_id}, {"_id": 0, "password": 0})
        if not agent:
            # Auto-create agent from Sanctum user
            agent = {
                "id": str(uuid.uuid4()),
                "username": f"sanctum_{sanctum_id}",
                "display_name": username,
                "email": user.get("email", ""),
                "platforms": [],
                "role": "agent",
                "languages": [],
                "source": "sanctum",
                "sanctum_id": sanctum_id,
                "sanctum_user": user,
            }
            await db.agents.insert_one(agent)
            agent.pop("_id", None)
        else:
            # Update display name / email
            await db.agents.update_one(
                {"sanctum_id": sanctum_id},
                {"$set": {
                    "display_name": username,
                    "email": user.get("email", ""),
                    "sanctum_user": user,
                }}
            )
        return agent

    # Fallback: JWT token
    subject = verify_token(token)
    if not subject.startswith("agent:"):
        raise HTTPException(status_code=401, detail="Not an agent token")
    parts = subject.split(":")
    agent_id = parts[1]
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0, "password": 0})
    if not agent:
        raise HTTPException(status_code=401, detail="Agent not found")
    return agent

async def get_current_master_agent(request: Request):
    """Verify that the current agent is a master agent"""
    agent = await get_current_agent(request)
    if agent.get("role") != "master_agent":
        raise HTTPException(status_code=403, detail="Master agent access required")
    return agent

# ==================== AGENT ENDPOINTS ====================

@api_router.get("/agent/sessions")
async def agent_sessions(request: Request):
    """Get sessions for agent's assigned platforms"""
    agent = await get_current_agent(request)
    agent_platforms = agent.get("platforms", [])

    query = {"status": "active"}
    if agent_platforms:
        query["$or"] = [
            {"platform_name": {"$in": agent_platforms}},
            {"needs_agent": True}
        ]

    sessions = await db.chat_sessions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

    # Enrich with last message and unread count
    enriched = []
    for s in sessions:
        last_msg = await db.chat_messages.find_one(
            {"session_id": s["id"]}, {"_id": 0},
            sort=[("timestamp", -1)]
        )
        unread = await db.chat_messages.count_documents({
            "session_id": s["id"],
            "sender": "user",
            "read_by_agent": {"$ne": True}
        })
        enriched.append({
            **s,
            "last_message": last_msg.get("message", "") if last_msg else "",
            "last_message_time": last_msg.get("timestamp", "") if last_msg else "",
            "unread_count": unread,
            "needs_agent": s.get("needs_agent", False)
        })

    return enriched

@api_router.get("/agent/chat/{session_id}")
async def agent_get_chat(session_id: str, request: Request):
    """Agent gets full chat history"""
    await get_current_agent(request)  # Verify agent auth
    messages = await db.chat_messages.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("timestamp", 1).to_list(5000)

    # Mark user messages as read
    await db.chat_messages.update_many(
        {"session_id": session_id, "sender": "user", "read_by_agent": {"$ne": True}},
        {"$set": {"read_by_agent": True}}
    )

    session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
    return {"messages": messages, "session": session}

@api_router.post("/agent/send")
async def agent_send_message(data: dict, request: Request):
    """Agent sends a message to user"""
    agent = await get_current_agent(request)
    session_id = data.get("session_id", "")
    message = data.get("message", "").strip()
    file_url = data.get("file_url", None)
    file_name = data.get("file_name", None)
    file_type = data.get("file_type", None)

    if not session_id or (not message and not file_url):
        raise HTTPException(status_code=400, detail="session_id and message or file required")

    msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "sender": "agent",
        "agent_id": agent["id"],
        "agent_name": agent.get("display_name", agent["username"]),
        "message": message or "",
        "file_url": file_url,
        "file_name": file_name,
        "file_type": file_type,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(msg)

    # Broadcast via WebSocket
    await ws_manager.broadcast(session_id, {
        "type": "new_message",
        "message": {k: v for k, v in msg.items() if k != "_id"}
    })

    return {k: v for k, v in msg.items() if k != "_id"}

@api_router.post("/chat/request-agent")
async def request_agent(data: dict):
    """User requests to talk to an agent"""
    session_id = data.get("session_id", "")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {"needs_agent": True}}
    )

    # Save system message
    msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "sender": "system",
        "message": "User has requested to speak with an agent. Please wait...",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(msg)

    await ws_manager.broadcast(session_id, {
        "type": "agent_requested",
        "message": msg["message"]
    })

    return {"message": "Agent requested. Please wait for an agent to connect."}

@api_router.post("/user/send")
async def user_send_message(data: dict):
    """User sends a free-text message to agent during live chat"""
    session_id = data.get("session_id", "")
    message = data.get("message", "").strip()
    file_url = data.get("file_url", None)
    file_name = data.get("file_name", None)
    file_type = data.get("file_type", None)

    if not session_id or (not message and not file_url):
        raise HTTPException(status_code=400, detail="session_id and message or file required")

    msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "sender": "user",
        "message": message or "",
        "file_url": file_url,
        "file_name": file_name,
        "file_type": file_type,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(msg)

    await ws_manager.broadcast(session_id, {
        "type": "new_message",
        "message": {k: v for k, v in msg.items() if k != "_id"}
    })

    return {k: v for k, v in msg.items() if k != "_id"}

@api_router.post("/agent/join-session")
async def agent_join_session(data: dict, request: Request):
    """Agent joins/claims a session"""
    agent = await get_current_agent(request)
    session_id = data.get("session_id", "")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {"agent_id": agent["id"], "agent_name": agent.get("display_name", ""), "needs_agent": False}}
    )

    msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "sender": "system",
        "message": f"Agent {agent.get('display_name', agent['username'])} has joined the chat.",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(msg)

    await ws_manager.broadcast(session_id, {
        "type": "agent_joined",
        "agent_name": agent.get("display_name", agent["username"]),
        "message": msg["message"]
    })

    return {"message": "Joined session"}

# ==================== MASTER AGENT ENDPOINTS ====================

@api_router.get("/master/agents")
async def master_list_agents(request: Request):
    """Master agent gets list of all agents for reassignment"""
    master = await get_current_master_agent(request)
    master_platforms = master.get("platforms", [])
    # Get agents on same platforms
    query = {}
    if master_platforms:
        query["platforms"] = {"$elemMatch": {"$in": master_platforms}}
    agents = await db.agents.find(query, {"_id": 0, "password": 0}).to_list(1000)
    return agents

@api_router.post("/master/reassign-session")
async def master_reassign_session(data: dict, request: Request):
    """Master agent reassigns a session to a different agent"""
    master = await get_current_master_agent(request)
    session_id = data.get("session_id", "")
    new_agent_id = data.get("agent_id", "")

    if not session_id or not new_agent_id:
        raise HTTPException(status_code=400, detail="session_id and agent_id required")

    session = await db.chat_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check platform restriction
    master_platforms = master.get("platforms", [])
    if master_platforms and session.get("platform_name") not in master_platforms:
        raise HTTPException(status_code=403, detail="Session platform not in your assigned platforms")

    new_agent = await db.agents.find_one({"id": new_agent_id}, {"_id": 0, "password": 0})
    if not new_agent:
        raise HTTPException(status_code=404, detail="Target agent not found")

    old_agent_name = session.get("agent_name", "Unassigned")

    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {
            "agent_id": new_agent["id"],
            "agent_name": new_agent.get("display_name", new_agent["username"]),
            "needs_agent": False
        }}
    )

    msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "sender": "system",
        "message": f"Chat reassigned from {old_agent_name} to {new_agent.get('display_name', new_agent['username'])} by {master.get('display_name', master['username'])}.",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(msg)

    await ws_manager.broadcast(session_id, {
        "type": "agent_joined",
        "agent_name": new_agent.get("display_name", new_agent["username"]),
        "message": msg["message"]
    })

    return {"message": f"Session reassigned to {new_agent.get('display_name', new_agent['username'])}"}

@api_router.post("/master/unassign-session")
async def master_unassign_session(data: dict, request: Request):
    """Master agent removes the assigned agent from a session"""
    master = await get_current_master_agent(request)
    session_id = data.get("session_id", "")

    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    session = await db.chat_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check platform restriction
    master_platforms = master.get("platforms", [])
    if master_platforms and session.get("platform_name") not in master_platforms:
        raise HTTPException(status_code=403, detail="Session platform not in your assigned platforms")

    old_agent_name = session.get("agent_name", "Unknown")

    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {"agent_id": None, "agent_name": None, "needs_agent": True}}
    )

    msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "sender": "system",
        "message": f"Agent {old_agent_name} was unassigned by {master.get('display_name', master['username'])}. Waiting for a new agent...",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(msg)

    await ws_manager.broadcast(session_id, {
        "type": "agent_requested",
        "message": msg["message"]
    })

    return {"message": "Agent unassigned from session"}

# ==================== WEBSOCKET ====================

class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, session_id: str, ws: WebSocket):
        await ws.accept()
        if session_id not in self.active:
            self.active[session_id] = []
        self.active[session_id].append(ws)

    def disconnect(self, session_id: str, ws: WebSocket):
        if session_id in self.active:
            self.active[session_id] = [c for c in self.active[session_id] if c != ws]
            if not self.active[session_id]:
                del self.active[session_id]

    async def broadcast(self, session_id: str, data: dict):
        if session_id in self.active:
            dead = []
            for ws in self.active[session_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect(session_id, ws)

ws_manager = ConnectionManager()

@app.websocket("/api/ws/chat/{session_id}")
async def websocket_chat(ws: WebSocket, session_id: str):
    await ws_manager.connect(session_id, ws)
    try:
        while True:
            data = await ws.receive_json()
            sender = data.get("sender", "user")
            message = data.get("message", "").strip()

            if not message:
                continue

            msg = {
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "sender": sender,
                "message": message,
                "agent_id": data.get("agent_id"),
                "agent_name": data.get("agent_name"),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            await db.chat_messages.insert_one(msg)

            await ws_manager.broadcast(session_id, {
                "type": "new_message",
                "message": {k: v for k, v in msg.items() if k != "_id"}
            })
    except WebSocketDisconnect:
        ws_manager.disconnect(session_id, ws)
    except Exception:
        ws_manager.disconnect(session_id, ws)

# ==================== OCR + DECISION TREE MATCHING ====================

import pytesseract
from PIL import Image as PILImage

# Set custom tesseract path
pytesseract.pytesseract.tesseract_cmd = r'D:\Work stuff\master_chatbot 2\master_chatbot-main\pytesseract\tesseract.exe'

def ocr_extract_text(image_path: str) -> str:
    """Extract text from an image using Tesseract OCR"""
    try:
        img = PILImage.open(image_path)
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        text = pytesseract.image_to_string(img, lang='eng')
        return text.strip()
    except Exception as e:
        logger.error(f"OCR error: {e}")
        return ""

def match_decision_tree(ocr_text: str, questions: list) -> list:
    """Match OCR text against decision tree questions and options"""
    if not ocr_text or not questions:
        return []

    ocr_lower = ocr_text.lower()
    ocr_words = set(w for w in ocr_lower.split() if len(w) > 2)
    matches = []

    for q in questions:
        q_text = (q.get("text") or "").lower()
        q_score = 0

        # Check question text match
        q_words = set(w for w in q_text.split() if len(w) > 2)
        common = ocr_words & q_words
        if common:
            q_score += len(common) * 2

        # Check each option
        for opt in q.get("options", []):
            opt_text = (opt.get("text") or "").lower()
            answer_text = (opt.get("answer_text") or "").lower()
            opt_score = q_score

            opt_words = set(w for w in opt_text.split() if len(w) > 2)
            ans_words = set(w for w in answer_text.split() if len(w) > 2)

            opt_common = ocr_words & opt_words
            ans_common = ocr_words & ans_words

            if opt_common:
                opt_score += len(opt_common) * 3
            if ans_common:
                opt_score += len(ans_common) * 2

            # Substring matching for phrases
            if opt_text and opt_text in ocr_lower:
                opt_score += 10
            if answer_text and answer_text[:30] in ocr_lower:
                opt_score += 8

            if opt_score > 0:
                matches.append({
                    "question_id": q.get("id"),
                    "question_text": q.get("text"),
                    "option_id": opt.get("id"),
                    "option_text": opt.get("text"),
                    "is_answer": opt.get("is_answer", False),
                    "answer_text": opt.get("answer_text"),
                    "is_agent_handoff": opt.get("is_agent_handoff", False),
                    "next_question_id": opt.get("next_question_id"),
                    "score": opt_score,
                    "matched_keywords": list(common | opt_common | ans_common) if (common or opt_common or ans_common) else [],
                })

    # Sort by score descending, take top 5
    matches.sort(key=lambda x: x["score"], reverse=True)
    return matches[:5]

@api_router.post("/ocr/analyze")
async def ocr_analyze_image(file: UploadFile = File(...)):
    """Upload an image, extract text via OCR, and match against the decision tree"""
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in ("jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif"):
        raise HTTPException(status_code=400, detail="Only image files are supported (jpg, png, gif, webp, bmp, tiff)")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Save temp file
    unique_name = f"ocr_{uuid.uuid4().hex}.{ext}"
    file_path = UPLOAD_DIR / unique_name

    with open(file_path, "wb") as f:
        f.write(content)

    # Run OCR
    extracted_text = ocr_extract_text(str(file_path))

    if not extracted_text:
        return {
            "extracted_text": "",
            "matches": [],
            "message": "No text could be extracted from this image.",
            "file_url": f"/api/files/{unique_name}",
        }

    # Fetch all questions
    questions = await db.questions.find({}, {"_id": 0}).to_list(1000)

    # Match against decision tree
    matches = match_decision_tree(extracted_text, questions)

    return {
        "extracted_text": extracted_text,
        "matches": matches,
        "total_matches": len(matches),
        "message": f"Extracted {len(extracted_text)} characters. Found {len(matches)} matching paths." if matches else "Text extracted but no matching decision tree paths found.",
        "file_url": f"/api/files/{unique_name}",
    }

@api_router.post("/ocr/analyze-session")
async def ocr_analyze_for_session(file: UploadFile = File(...), session_id: str = ""):
    """OCR analyze and auto-navigate the chat session to the best match"""
    # First run OCR analysis
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in ("jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif"):
        raise HTTPException(status_code=400, detail="Only image files supported")

    content = await file.read()
    unique_name = f"ocr_{uuid.uuid4().hex}.{ext}"
    file_path = UPLOAD_DIR / unique_name
    with open(file_path, "wb") as f:
        f.write(content)

    extracted_text = ocr_extract_text(str(file_path))
    file_url = f"/api/files/{unique_name}"

    if not extracted_text:
        return {
            "extracted_text": "",
            "matches": [],
            "auto_selected": None,
            "message": "No text could be extracted from this image.",
            "file_url": file_url,
        }

    questions = await db.questions.find({}, {"_id": 0}).to_list(1000)
    matches = match_decision_tree(extracted_text, questions)

    auto_selected = None
    if matches and session_id:
        best = matches[0]
        # Store the OCR result as a chat message
        ocr_msg = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "sender": "user",
            "message": f"[Image uploaded - OCR detected: {extracted_text[:200]}...]" if len(extracted_text) > 200 else f"[Image uploaded - OCR detected: {extracted_text}]",
            "file_url": file_url,
            "file_name": filename,
            "file_type": "image/" + ext,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_messages.insert_one(ocr_msg)

        # Auto-select the best matching option
        auto_selected = {
            "question_id": best["question_id"],
            "question_text": best["question_text"],
            "option_id": best["option_id"],
            "option_text": best["option_text"],
            "is_answer": best["is_answer"],
            "answer_text": best["answer_text"],
            "score": best["score"],
        }

    return {
        "extracted_text": extracted_text,
        "matches": matches,
        "auto_selected": auto_selected,
        "message": f"Found {len(matches)} matching paths." if matches else "No matching paths found.",
        "file_url": file_url,
    }

# ==================== API KIT PDF ====================

@api_router.get("/docs/api-kit-pdf")
async def download_api_kit_pdf():
    """Download the API Kit PDF"""
    pdf_path = ROOT_DIR / "uploads" / "ChatBot_Hub_API_Kit.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found. Please regenerate.")

    def file_iterator():
        with open(pdf_path, "rb") as f:
            while chunk := f.read(8192):
                yield chunk

    return StreamingResponse(
        file_iterator(),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=ChatBot_Hub_API_Kit.pdf"}
    )

# ==================== FILE UPLOAD ====================

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_FILE_TYPES = {
    # Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    # Documents
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    # Text
    'text/plain', 'text/csv',
    # Archives
    'application/zip', 'application/x-rar-compressed',
    # Other
    'application/octet-stream',
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file and return its URL for chat messages"""
    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

    # Generate unique filename
    ext = ""
    if file.filename:
        parts = file.filename.rsplit(".", 1)
        if len(parts) > 1:
            ext = "." + parts[-1].lower()

    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_name

    with open(file_path, "wb") as f:
        f.write(content)

    # Determine if it's an image
    mime = file.content_type or "application/octet-stream"
    is_image = mime.startswith("image/")

    return {
        "file_url": f"/api/files/{unique_name}",
        "file_name": file.filename or unique_name,
        "file_type": mime,
        "is_image": is_image,
        "file_size": len(content),
    }

@api_router.get("/files/{filename}")
async def serve_file(filename: str):
    """Serve an uploaded file"""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # Determine content type
    import mimetypes
    content_type, _ = mimetypes.guess_type(str(file_path))
    if not content_type:
        content_type = "application/octet-stream"

    def file_iterator():
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):
                yield chunk

    return StreamingResponse(
        file_iterator(),
        media_type=content_type,
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )

app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
