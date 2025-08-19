from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import secrets
import traceback
import jwt
import os
import asyncio
from dotenv import load_dotenv
import logging
from contextlib import asynccontextmanager
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json

# Load environment variables
load_dotenv('/opt/telegram-shop-bot/.env')

app = FastAPI(title="AnabolicPizza API - Enhanced with Notifications")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan event handler (replaces deprecated on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from bot_modules.public_notifications import fake_order_scheduler
    asyncio.create_task(fake_order_scheduler())
    logger.info("Started fake order scheduler")
    yield
    # Shutdown
    logger.info("Shutting down...")

app = FastAPI(
    title="AnabolicPizza API - Enhanced with Notifications",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Config
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/telegram_shop")
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-this")
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@anabolicpizza.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "password123")

# Database
mongo_client = AsyncIOMotorClient(MONGODB_URI)
db = mongo_client.telegram_shop

security = HTTPBearer()

# Import notification manager after DB is initialized
from bot_modules.public_notifications import public_notifier, fake_order_scheduler

# Enhanced Models
class LoginModel(BaseModel):
    email: str
    password: str

class CategoryModel(BaseModel):
    name: str
    emoji: str = "📦"
    description: str
    order: int = 1
    is_active: bool = True

class ProductModel(BaseModel):
    name: str
    description: str
    price_usdt: float
    purchase_price_usdt: float
    category_id: Optional[str] = None
    stock_quantity: int = 999
    is_active: bool = True

class ReferralCodeModel(BaseModel):
    code: str
    description: str
    discount_type: str
    discount_value: float
    usage_limit: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: bool = True

class OrderStatusModel(BaseModel):
    status: str
    notes: Optional[str] = None

class VIPUpdateModel(BaseModel):
    is_vip: bool
    vip_discount_percentage: float = 0
    vip_expires: Optional[datetime] = None
    vip_notes: Optional[str] = None

class NotificationSettingsModel(BaseModel):
    enabled: bool = False
    channel_id: Optional[str] = None
    delay_min: int = 60
    delay_max: int = 300
    show_exact_amount: bool = False
    fake_orders_enabled: bool = False
    fake_orders_per_hour: int = 2

class MessageTemplateModel(BaseModel):
    text: str
    type: str = "normal"
    enabled: bool = True

class AssignSellerModel(BaseModel):
    seller_id: str
    
# Helper functions
def format_price(value):
    """Format price to 2 decimal places"""
    if value is None:
        return 0
    try:
        return round(float(value), 2)
    except:
        return 0

def generate_order_id():
    """Generate random order ID"""
    part1 = secrets.token_hex(2).upper()
    part2 = secrets.token_hex(2).upper()
    return f"APZ-{part1}-{part2}"

def generate_referral_code():
    """Generate unique referral code"""
    return secrets.token_hex(4).upper()

# Auth functions
def create_token(email: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=24)
    payload = {"email": email, "exp": expiration}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["email"]
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

# Routes
@app.get("/")
async def root():
    return {"status": "AnabolicPizza API", "version": "5.0", "features": ["categories", "referrals", "vip", "profit_tracking", "notifications"]}

@app.post("/api/auth/login")
async def login(login_data: LoginModel):
    if login_data.email == ADMIN_EMAIL and login_data.password == ADMIN_PASSWORD:
        token = create_token(login_data.email)
        return {
            "token": token,
            "expires_in": 86400,
            "user": {"email": login_data.email, "role": "admin"}
        }
    raise HTTPException(status_code=401, detail="Invalid credentials")

# CATEGORY ENDPOINTS
@app.get("/api/categories")
async def get_categories(skip: int = 0, limit: int = 100):
    categories = await db.categories.find({}).sort("order", 1).skip(skip).limit(limit).to_list(limit)
    
    for category in categories:
        category["_id"] = str(category["_id"])
        category["product_count"] = await db.products.count_documents({
            "category_id": ObjectId(category["_id"]),
            "is_active": True
        })
    
    total = await db.categories.count_documents({})
    return {"categories": categories, "total": total}

@app.post("/api/categories")
async def create_category(category: CategoryModel, email: str = Depends(verify_token)):
    existing = await db.categories.find_one({"name": category.name})
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")
    
    category_dict = category.model_dump()
    category_dict["created_at"] = datetime.now(timezone.utc)
    
    result = await db.categories.insert_one(category_dict)
    return {"id": str(result.inserted_id), "message": "Category created"}

@app.put("/api/categories/{category_id}")
async def update_category(category_id: str, category: CategoryModel, email: str = Depends(verify_token)):
    category_dict = category.model_dump()
    category_dict["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.categories.update_one(
        {"_id": ObjectId(category_id)},
        {"$set": category_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category updated"}

@app.delete("/api/categories/{category_id}")
async def delete_category(category_id: str, email: str = Depends(verify_token)):
    product_count = await db.products.count_documents({"category_id": ObjectId(category_id)})
    if product_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {product_count} products")
    
    result = await db.categories.delete_one({"_id": ObjectId(category_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted"}

# PRODUCT ENDPOINTS
@app.get("/api/products")
async def get_products(skip: int = 0, limit: int = 100, category_id: Optional[str] = None):
    query = {}
    if category_id:
        query["category_id"] = ObjectId(category_id)
    
    products = await db.products.find(query).skip(skip).limit(limit).to_list(limit)
    
    for product in products:
        product["_id"] = str(product["_id"])
        product["price_usdt"] = format_price(product.get("price_usdt"))
        product["purchase_price_usdt"] = format_price(product.get("purchase_price_usdt", 0))
        
        selling_price = product["price_usdt"]
        purchase_price = product["purchase_price_usdt"]
        if purchase_price > 0:
            product["profit_usdt"] = format_price(selling_price - purchase_price)
            product["profit_margin"] = format_price(((selling_price - purchase_price) / purchase_price) * 100)
        else:
            product["profit_usdt"] = format_price(selling_price)
            product["profit_margin"] = 100.0
        
        if product.get("category_id"):
            product["category_id"] = str(product["category_id"])
            category = await db.categories.find_one({"_id": ObjectId(product["category_id"])})
            product["category_name"] = category["name"] if category else "Uncategorized"
        else:
            product["category_name"] = "Uncategorized"
    
    total = await db.products.count_documents(query)
    return {"products": products, "total": total}

@app.post("/api/products")
async def create_product(product: ProductModel, email: str = Depends(verify_token)):
    product_dict = product.model_dump()
    product_dict["price_usdt"] = format_price(product_dict["price_usdt"])
    product_dict["purchase_price_usdt"] = format_price(product_dict.get("purchase_price_usdt", 0))
    product_dict["created_at"] = datetime.now(timezone.utc)
    product_dict["sold_count"] = 0
    
    if product_dict.get("category_id"):
        product_dict["category_id"] = ObjectId(product_dict["category_id"])
    
    result = await db.products.insert_one(product_dict)
    return {"id": str(result.inserted_id), "message": "Product created"}

@app.put("/api/products/{product_id}")
async def update_product(product_id: str, product: ProductModel, email: str = Depends(verify_token)):
    product_dict = product.model_dump()
    product_dict["price_usdt"] = format_price(product_dict["price_usdt"])
    product_dict["purchase_price_usdt"] = format_price(product_dict.get("purchase_price_usdt", 0))
    product_dict["updated_at"] = datetime.now(timezone.utc)
    
    if product_dict.get("category_id"):
        product_dict["category_id"] = ObjectId(product_dict["category_id"])
    
    await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": product_dict}
    )
    return {"message": "Product updated"}

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, email: str = Depends(verify_token)):
    await db.products.delete_one({"_id": ObjectId(product_id)})
    return {"message": "Product deleted"}

# REFERRAL ENDPOINTS
@app.get("/api/referrals")
async def get_referrals(skip: int = 0, limit: int = 100):
    referrals = await db.referral_codes.find({}).skip(skip).limit(limit).to_list(limit)
    
    for referral in referrals:
        referral["_id"] = str(referral["_id"])
        if referral.get("valid_until"):
            referral["is_expired"] = referral["valid_until"] < datetime.now(timezone.utc)
        else:
            referral["is_expired"] = False
    
    total = await db.referral_codes.count_documents({})
    return {"referrals": referrals, "total": total}

@app.post("/api/referrals")
async def create_referral(referral: ReferralCodeModel, email: str = Depends(verify_token)):
    code = referral.code.upper().replace(" ", "")
    if not code.isalnum():
        raise HTTPException(status_code=400, detail="Code must be alphanumeric only")
    
    existing = await db.referral_codes.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail="Referral code already exists")
    
    referral_dict = referral.model_dump()
    referral_dict["code"] = code
    referral_dict["created_at"] = datetime.now(timezone.utc)
    referral_dict["created_by"] = email
    referral_dict["used_count"] = 0
    
    if referral_dict["discount_type"] == "percentage":
        if referral_dict["discount_value"] < 0 or referral_dict["discount_value"] > 100:
            raise HTTPException(status_code=400, detail="Percentage must be between 0 and 100")
    else:
        if referral_dict["discount_value"] < 0:
            raise HTTPException(status_code=400, detail="Fixed discount must be positive")
    
    result = await db.referral_codes.insert_one(referral_dict)
    return {"id": str(result.inserted_id), "code": code, "message": "Referral code created"}

@app.put("/api/referrals/{referral_id}")
async def update_referral(referral_id: str, referral: ReferralCodeModel, email: str = Depends(verify_token)):
    referral_dict = referral.model_dump()
    referral_dict["code"] = referral_dict["code"].upper()
    referral_dict["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.referral_codes.update_one(
        {"_id": ObjectId(referral_id)},
        {"$set": referral_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Referral code not found")
    
    return {"message": "Referral code updated"}

@app.delete("/api/referrals/{referral_id}")
async def delete_referral(referral_id: str, email: str = Depends(verify_token)):
    result = await db.referral_codes.delete_one({"_id": ObjectId(referral_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Referral code not found")
    
    return {"message": "Referral code deleted"}

# ORDER ENDPOINTS
@app.get("/api/orders")
async def get_orders(skip: int = 0, limit: int = 100):
    orders = await db.orders.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for order in orders:
        order["_id"] = str(order["_id"])
        order["total_usdt"] = format_price(order.get("total_usdt"))
        
        total_profit = 0
        if order.get("items"):
            for item in order["items"]:
                item["price_usdt"] = format_price(item.get("price_usdt"))
                item["subtotal_usdt"] = format_price(item.get("subtotal_usdt"))
                
                product = await db.products.find_one({"name": item["product_name"]})
                if product:
                    purchase_price = product.get("purchase_price_usdt", 0)
                    selling_price = item["price_usdt"]
                    item_profit = (selling_price - purchase_price) * item["quantity"]
                    total_profit += item_profit
        
        order["profit_usdt"] = format_price(total_profit)
        
        if not order.get("order_number"):
            order["order_number"] = generate_order_id()
            await db.orders.update_one(
                {"_id": ObjectId(order["_id"])},
                {"$set": {"order_number": order["order_number"]}}
            )
        
        if order.get("referral_code"):
            order["has_discount"] = True
            order["discount_amount"] = format_price(order.get("discount_amount", 0))
        else:
            order["has_discount"] = False
    
    total = await db.orders.count_documents({})
    return {"orders": orders, "total": total}

@app.patch("/api/orders/{order_id}/status")
async def update_order_status(order_id: str, status_update: OrderStatusModel, email: str = Depends(verify_token)):
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        old_status = order.get("status")
        new_status = status_update.status
        
        result = await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        if old_status not in ["paid", "completed"] and new_status in ["paid", "completed"]:
            if order.get("items"):
                for item in order["items"]:
                    await db.products.update_one(
                        {"name": item["product_name"]},
                        {"$inc": {"sold_count": item.get("quantity", 1)}}
                    )
            
            await db.users.update_one(
                {"telegram_id": order["telegram_id"]},
                {
                    "$inc": {
                        "total_orders": 1,
                        "total_spent_usdt": float(order.get("total_usdt", 0))
                    }
                }
            )
        
        return {"success": True, "message": "Order status updated"}
    except Exception as e:
        logger.error(f"Error updating order status: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# USER ENDPOINTS
# USER ENDPOINTS - OPRAVENÁ VERZIA
@app.get("/api/users")
async def get_users(skip: int = 0, limit: int = 100, vip_only: bool = False):
    """Get all users with complete error handling"""
    try:
        query = {}
        if vip_only:
            query["is_vip"] = True
        
        users = await db.users.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        for user in users:
            # Convert ObjectId to string
            user["_id"] = str(user["_id"])
            
            # Ensure telegram_id exists
            if "telegram_id" not in user:
                logger.warning(f"User {user['_id']} has no telegram_id")
                user["telegram_id"] = 0
            
            # Calculate total spent with error handling
            try:
                total_spent_pipeline = [
                    {
                        "$match": {
                            "telegram_id": user["telegram_id"],
                            "status": {"$in": ["paid", "completed"]}
                        }
                    },
                    {
                        "$group": {
                            "_id": None,
                            "total": {"$sum": "$total_usdt"}
                        }
                    }
                ]
                
                total_spent_result = await db.orders.aggregate(total_spent_pipeline).to_list(1)
                user["total_spent_usdt"] = format_price(
                    total_spent_result[0]["total"] if total_spent_result and len(total_spent_result) > 0 else 0
                )
            except Exception as e:
                logger.error(f"Error calculating total spent for user {user.get('telegram_id')}: {e}")
                user["total_spent_usdt"] = 0
            
            # Count total orders with error handling
            try:
                user["total_orders"] = await db.orders.count_documents({
                    "telegram_id": user.get("telegram_id", 0),
                    "status": {"$in": ["paid", "completed"]}
                })
            except Exception as e:
                logger.error(f"Error counting orders for user {user.get('telegram_id')}: {e}")
                user["total_orders"] = 0
            
            # Set default values for all fields
            user["username"] = user.get("username", "")
            user["first_name"] = user.get("first_name", "")
            user["last_name"] = user.get("last_name", "")
            user["status"] = user.get("status", "active")
            user["referrals_used"] = user.get("referrals_used", [])
            user["is_vip"] = user.get("is_vip", False)
            user["vip_discount_percentage"] = user.get("vip_discount_percentage", 0)
            user["vip_notes"] = user.get("vip_notes", "")
            
            # Handle created_at - ensure it's a valid datetime
            if "created_at" not in user or user["created_at"] is None:
                user["created_at"] = datetime.now(timezone.utc)
            
            # Ensure created_at is serializable
            if hasattr(user["created_at"], 'isoformat'):
                user["created_at"] = user["created_at"].isoformat()
            
            # VIP status check with comprehensive error handling
            user["vip_status"] = "none"  # Default value
            
            try:
                if user.get("vip_expires"):
                    vip_expires = user["vip_expires"]
                    
                    # Convert string to datetime if needed
                    if isinstance(vip_expires, str):
                        try:
                            # Handle ISO format with Z or +00:00
                            vip_expires = datetime.fromisoformat(vip_expires.replace('Z', '+00:00'))
                        except:
                            # Try parsing without timezone
                            vip_expires = datetime.fromisoformat(vip_expires.split('+')[0])
                            vip_expires = vip_expires.replace(tzinfo=timezone.utc)
                    
                    # Ensure timezone-aware
                    if hasattr(vip_expires, 'tzinfo'):
                        if vip_expires.tzinfo is None:
                            vip_expires = vip_expires.replace(tzinfo=timezone.utc)
                    else:
                        # If it's not a datetime at all, remove it
                        del user["vip_expires"]
                        user["vip_status"] = "active" if user.get("is_vip") else "none"
                        continue
                    
                    # Compare with current time
                    current_time = datetime.now(timezone.utc)
                    if vip_expires < current_time:
                        user["vip_status"] = "expired"
                    else:
                        user["vip_status"] = "active"
                    
                    # Convert to ISO string for JSON
                    user["vip_expires"] = vip_expires.isoformat()
                    
                elif user.get("is_vip"):
                    user["vip_status"] = "active"
                else:
                    user["vip_status"] = "none"
                    
            except Exception as e:
                logger.error(f"Error processing VIP status for user {user.get('_id')}: {e}")
                # Safe fallback
                user["vip_status"] = "active" if user.get("is_vip") else "none"
                # Remove problematic vip_expires
                if "vip_expires" in user:
                    del user["vip_expires"]
        
        # Get total count
        total = await db.users.count_documents(query)
        
        return {
            "users": users,
            "total": total,
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Critical error in get_users: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return empty result to keep frontend working
        return {
            "users": [],
            "total": 0,
            "success": False,
            "error": str(e)
        }

# VIP MANAGEMENT
@app.patch("/api/users/{user_id}/vip")
async def update_user_vip_status(user_id: str, vip_data: VIPUpdateModel, email: str = Depends(verify_token)):
    try:
        if vip_data.vip_discount_percentage < 0 or vip_data.vip_discount_percentage > 100:
            raise HTTPException(status_code=400, detail="Discount must be between 0 and 100")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        update_data = {
            "is_vip": vip_data.is_vip,
            "vip_discount_percentage": vip_data.vip_discount_percentage,
            "updated_at": datetime.now(timezone.utc)
        }
        
        if vip_data.is_vip and not user.get("is_vip"):
            update_data["vip_since"] = datetime.now(timezone.utc)
        
        if vip_data.vip_expires:
            update_data["vip_expires"] = vip_data.vip_expires
        else:
            update_data["vip_expires"] = None
            
        if vip_data.vip_notes is not None:
            update_data["vip_notes"] = vip_data.vip_notes
        
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to update VIP status")
        
        await db.audit_logs.insert_one({
            "admin_id": email,
            "action": "UPDATE_VIP_STATUS",
            "entity_type": "user",
            "entity_id": ObjectId(user_id),
            "old_value": {
                "is_vip": user.get("is_vip", False),
                "vip_discount_percentage": user.get("vip_discount_percentage", 0)
            },
            "new_value": {
                "is_vip": vip_data.is_vip,
                "vip_discount_percentage": vip_data.vip_discount_percentage
            },
            "timestamp": datetime.now(timezone.utc)
        })
        
        return {"success": True, "message": "VIP status updated"}
    except Exception as e:
        logger.error(f"Error updating VIP status: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/users/vip")
async def get_vip_users(email: str = Depends(verify_token)):
    vip_users = await db.users.find({
        "is_vip": True,
        "$or": [
            {"vip_expires": None},
            {"vip_expires": {"$gt": datetime.now(timezone.utc)}}
        ]
    }).to_list(100)
    
    for user in vip_users:
        user["_id"] = str(user["_id"])
        user["vip_discount_percentage"] = user.get("vip_discount_percentage", 0)
    
    return {"vip_users": vip_users, "total": len(vip_users)}

# DASHBOARD STATS
@app.get("/api/dashboard/stats")
async def get_stats():
    total_orders = await db.orders.count_documents({})
    total_users = await db.users.count_documents({})
    total_products = await db.products.count_documents({"is_active": True})
    total_categories = await db.categories.count_documents({"is_active": True})
    
    pipeline = [
        {"$match": {"status": {"$in": ["paid", "completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_usdt"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = format_price(revenue_result[0]["total"] if revenue_result else 0)
    
    total_profit = 0
    paid_orders = await db.orders.find({"status": {"$in": ["paid", "completed"]}}).to_list(None)
    
    for order in paid_orders:
        if order.get("items"):
            for item in order["items"]:
                product = await db.products.find_one({"name": item["product_name"]})
                if product:
                    purchase_price = product.get("purchase_price_usdt", 0)
                    selling_price = item.get("price_usdt", 0)
                    item_profit = (selling_price - purchase_price) * item.get("quantity", 1)
                    total_profit += item_profit
    
    active_referrals = await db.referral_codes.count_documents({"is_active": True})
    
    vip_users = await db.users.count_documents({
        "is_vip": True,
        "$or": [
            {"vip_expires": None},
            {"vip_expires": {"$gt": datetime.now(timezone.utc)}}
        ]
    })
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_orders = await db.orders.count_documents({
        "created_at": {"$gte": today_start},
        "status": {"$in": ["paid", "completed"]}
    })
    
    today_revenue_result = await db.orders.aggregate([
        {"$match": {"created_at": {"$gte": today_start}, "status": {"$in": ["paid", "completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_usdt"}}}
    ]).to_list(1)
    today_revenue = format_price(today_revenue_result[0]["total"] if today_revenue_result else 0)
    
    pending_orders = await db.orders.count_documents({"status": "pending"})
    avg_order_value = format_price(total_revenue / total_orders if total_orders > 0 else 0)
    
    top_products = await db.products.find({"sold_count": {"$gt": 0}}).sort("sold_count", -1).limit(5).to_list(5)
    for product in top_products:
        if "_id" in product:
            product["_id"] = str(product["_id"])
        if "category_id" in product and product["category_id"]:
            product["category_id"] = str(product["category_id"])
        product["price_usdt"] = format_price(product.get("price_usdt", 0))
        product["purchase_price_usdt"] = format_price(product.get("purchase_price_usdt", 0))
        product["sold_count"] = product.get("sold_count", 0)
        product["name"] = product.get("name", "Unknown")
    
    return {
        "stats": {
            "total_orders": total_orders,
            "total_revenue_usdt": total_revenue,
            "total_profit_usdt": format_price(total_profit),
            "profit_margin": format_price((total_profit / total_revenue * 100) if total_revenue > 0 else 0),
            "total_users": total_users,
            "total_products": total_products,
            "total_categories": total_categories,
            "active_referrals": active_referrals,
            "vip_users": vip_users,
            "today_orders": today_orders,
            "today_revenue": today_revenue,
            "pending_orders": pending_orders,
            "avg_order_value": avg_order_value,
            "top_products": top_products
        }
    }

# ANALYTICS
@app.get("/api/dashboard/analytics")
async def get_analytics(days: int = 30):
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    pipeline = [
        {
            "$match": {
                "created_at": {"$gte": start_date, "$lte": end_date},
                "status": {"$in": ["paid", "completed"]}
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$created_at"
                    }
                },
                "revenue": {"$sum": "$total_usdt"},
                "orders": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    daily_sales = await db.orders.aggregate(pipeline).to_list(None)
    
    for day in daily_sales:
        day_profit = 0
        day_orders = await db.orders.find({
            "created_at": {
                "$gte": datetime.strptime(day["_id"], "%Y-%m-%d"),
                "$lt": datetime.strptime(day["_id"], "%Y-%m-%d") + timedelta(days=1)
            },
            "status": {"$in": ["paid", "completed"]}
        }).to_list(None)
        
        for order in day_orders:
            if order.get("items"):
                for item in order["items"]:
                    product = await db.products.find_one({"name": item["product_name"]})
                    if product:
                        purchase_price = product.get("purchase_price_usdt", 0)
                        selling_price = item.get("price_usdt", 0)
                        item_profit = (selling_price - purchase_price) * item.get("quantity", 1)
                        day_profit += item_profit
        
        day["profit"] = format_price(day_profit)
        day["revenue"] = format_price(day["revenue"])
    
    category_sales = []
    categories = await db.categories.find({"is_active": True}).to_list(None)
    
    for category in categories:
        category_products = await db.products.find({"category_id": category["_id"]}).to_list(None)
        category_revenue = 0
        category_quantity = 0
        
        for product in category_products:
            category_quantity += product.get("sold_count", 0)
            category_revenue += product.get("price_usdt", 0) * product.get("sold_count", 0)
        
        if category_revenue > 0:
            category_sales.append({
                "name": category["name"],
                "emoji": category.get("emoji", "📦"),
                "revenue": format_price(category_revenue),
                "quantity": category_quantity
            })
    
    category_sales.sort(key=lambda x: x["revenue"], reverse=True)
    
    hourly_pipeline = [
        {
            "$match": {
                "created_at": {"$gte": end_date - timedelta(days=7)},
                "status": {"$in": ["paid", "completed"]}
            }
        },
        {
            "$group": {
                "_id": {"$hour": "$created_at"},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    hourly_distribution = await db.orders.aggregate(hourly_pipeline).to_list(None)
    
    return {
        "daily_sales": daily_sales,
        "category_sales": category_sales[:5],
        "hourly_distribution": hourly_distribution
    }


# ================== SELLER REFERRAL SYSTEM ==================

class SellerModel(BaseModel):
    name: str
    telegram_username: str
    commission_percentage: float = 30.0
    is_active: bool = True
    payout_address: Optional[str] = None  # Crypto address for payouts
    notes: Optional[str] = None

class PayoutModel(BaseModel):
    amount: float
    payment_method: str = "USDT"
    transaction_id: Optional[str] = None
    notes: Optional[str] = None

# SELLER ENDPOINTS
@app.get("/api/sellers")
async def get_sellers(email: str = Depends(verify_token)):
    """Get all sellers with their stats"""
    # Get only non-deleted sellers
    sellers = await db.sellers.find({
        "deleted_at": {"$exists": False}  # Exclude soft deleted
    }).to_list(100)
    
    for seller in sellers:
        seller["_id"] = str(seller["_id"])
        
        # Skip inactive sellers in calculations
        if seller.get("is_active") == False:
            seller["referral_codes"] = []
            seller["total_sales"] = "0.00"
            seller["total_commission"] = "0.00"
            seller["total_earnings"] = "0.00"
            seller["pending_earnings"] = "0.00"
            seller["total_paid"] = "0.00"
            seller["total_orders"] = 0
            seller["commission_percentage"] = seller.get("commission_percentage", 30)
            seller["created_at"] = seller.get("created_at", datetime.now(timezone.utc))
            continue
        
        # Calculate earnings from referral codes
        referral_codes = await db.referral_codes.find({
            "seller_id": str(seller["_id"])
        }).to_list(100)
        
        seller["referral_codes"] = []
        total_commission = 0
        total_sales = 0
        pending_commission = 0
        total_orders = 0
        
        for code in referral_codes:
            code["_id"] = str(code["_id"])
            orders = await db.orders.find({
                "referral_code": code["code"],
                "status": {"$in": ["paid", "completed"]}
            }).to_list(1000)
            
            code_commission = 0
            code_sales = 0
            
            for order in orders:
                code_sales += order.get("total_usdt", 0)
                profit = 0
                if order.get("items"):
                    for item in order["items"]:
                        product = await db.products.find_one({"name": item["product_name"]})
                        if product:
                            purchase_price = product.get("purchase_price_usdt", 0)
                            selling_price = item.get("price_usdt", 0)
                            item_profit = (selling_price - purchase_price) * item.get("quantity", 1)
                            profit += item_profit
                
                actual_commission_rate = seller.get("commission_percentage", 30)
                commission = profit * (actual_commission_rate / 100)
                code_commission += commission
                total_orders += 1
            
            code["total_commission"] = format_price(code_commission)
            code["total_sales"] = format_price(code_sales)
            code["uses"] = len(orders)
            
            seller["referral_codes"].append({
                "code": code["code"],
                "commission": format_price(code_commission),
                "sales": format_price(code_sales),
                "uses": len(orders)
            })
            
            total_commission += code_commission
            total_sales += code_sales
        
        payouts = await db.seller_payouts.find({
            "seller_id": str(seller["_id"])
        }).to_list(100)
        
        total_paid = sum(p.get("amount", 0) for p in payouts)
        pending_commission = total_commission - total_paid
        
        seller["total_sales"] = format_price(total_sales)
        seller["total_commission"] = format_price(total_commission)
        seller["total_earnings"] = format_price(total_commission)
        seller["pending_earnings"] = format_price(pending_commission)
        seller["total_paid"] = format_price(total_paid)
        seller["total_orders"] = total_orders
        seller["commission_percentage"] = seller.get("commission_percentage", 30)
        seller["created_at"] = seller.get("created_at", datetime.now(timezone.utc))
    
    return {"sellers": sellers, "total": len(sellers)}

@app.post("/api/sellers")
async def create_seller(seller: SellerModel, email: str = Depends(verify_token)):
    """Create new seller"""
    seller_dict = seller.model_dump()
    seller_dict["created_at"] = datetime.now(timezone.utc)
    seller_dict["created_by"] = email
    seller_dict["total_earnings"] = 0
    seller_dict["pending_earnings"] = 0
    
    result = await db.sellers.insert_one(seller_dict)
    
    # Log action
    await db.audit_logs.insert_one({
        "admin_id": email,
        "action": "CREATE_SELLER",
        "entity_type": "seller",
        "entity_id": result.inserted_id,
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"id": str(result.inserted_id), "message": "Seller created successfully"}

@app.put("/api/sellers/{seller_id}")
async def update_seller(
    seller_id: str, 
    seller: SellerModel, 
    email: str = Depends(verify_token)
):
    """Update seller details"""
    seller_dict = seller.model_dump()
    seller_dict["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.sellers.update_one(
        {"_id": ObjectId(seller_id)},
        {"$set": seller_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    return {"message": "Seller updated successfully"}

@app.delete("/api/sellers/{seller_id}")
async def delete_seller(
    seller_id: str, 
    hard: bool = False,  # Query parameter for hard delete
    email: str = Depends(verify_token)
):
    """Delete seller - soft delete (deactivate) or hard delete (permanent)"""
    
    # Check if seller exists
    seller = await db.sellers.find_one({"_id": ObjectId(seller_id)})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    if hard:
        # HARD DELETE - permanently remove from database
        logger.info(f"Hard deleting seller {seller_id}")
        
        # 1. Delete payout records
        await db.seller_payouts.delete_many({"seller_id": seller_id})
        
        # 2. Remove seller_id from referral codes (but keep the codes)
        await db.referral_codes.update_many(
            {"seller_id": seller_id},
            {"$unset": {"seller_id": "", "seller_name": ""}}
        )
        
        # 3. Delete the seller
        result = await db.sellers.delete_one({"_id": ObjectId(seller_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Failed to delete seller")
        
        # Log the hard delete
        await db.audit_logs.insert_one({
            "admin_id": email,
            "action": "HARD_DELETE_SELLER",
            "entity_type": "seller",
            "entity_id": ObjectId(seller_id),
            "timestamp": datetime.now(timezone.utc),
            "notes": "Permanently deleted seller and associated data"
        })
        
        return {"message": "Seller permanently deleted", "type": "hard_delete", "success": True}
    
    else:
        # SOFT DELETE - just deactivate
        logger.info(f"Soft deleting seller {seller_id}")
        
        result = await db.sellers.update_one(
            {"_id": ObjectId(seller_id)},
            {"$set": {
                "is_active": False, 
                "deleted_at": datetime.now(timezone.utc),
                "deleted_by": email
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Failed to deactivate seller")
        
        # Log the soft delete
        await db.audit_logs.insert_one({
            "admin_id": email,
            "action": "SOFT_DELETE_SELLER",
            "entity_type": "seller",
            "entity_id": ObjectId(seller_id),
            "timestamp": datetime.now(timezone.utc),
            "notes": "Deactivated seller (soft delete)"
        })
        
        return {"message": "Seller deactivated", "type": "soft_delete", "success": True}
        
@app.get("/api/sellers/debug")
async def debug_sellers(email: str = Depends(verify_token)):
    """Debug endpoint to see all sellers in database"""
    all_sellers = await db.sellers.find({}).to_list(100)
    for s in all_sellers:
        s["_id"] = str(s["_id"])
    
    return {
        "total_in_db": await db.sellers.count_documents({}),
        "active_count": await db.sellers.count_documents({"is_active": True}),
        "inactive_count": await db.sellers.count_documents({"is_active": False}),
        "with_deleted_at": await db.sellers.count_documents({"deleted_at": {"$exists": True}}),
        "without_deleted_at": await db.sellers.count_documents({"deleted_at": {"$exists": False}}),
        "all_sellers": all_sellers
    }

# Reset sellers to active (useful for testing)
@app.post("/api/sellers/reset-active")
async def reset_sellers_active(email: str = Depends(verify_token)):
    """Reset all sellers to active status"""
    result = await db.sellers.update_many(
        {},
        {
            "$set": {"is_active": True},
            "$unset": {"deleted_at": "", "deleted_by": ""}
        }
    )
    
    return {
        "message": f"Reset {result.modified_count} sellers to active",
        "modified": result.modified_count,
        "success": True
    }

# ASSIGN REFERRAL CODE TO SELLER
@app.post("/api/referrals/{referral_id}/assign-seller")
async def assign_seller_to_referral(
    referral_id: str,
    assign_data: AssignSellerModel,
    email: str = Depends(verify_token)
):
    """Assign a referral code to a seller"""
    seller_id = assign_data.seller_id
    
    seller = await db.sellers.find_one({"_id": ObjectId(seller_id)})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    result = await db.referral_codes.update_one(
        {"_id": ObjectId(referral_id)},
        {
            "$set": {
                "seller_id": seller_id,
                "seller_name": seller["name"],
                "commission_percentage": seller.get("commission_percentage", 30),
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Referral code not found")
    
    return {"message": "Seller assigned to referral code"}

# SELLER EARNINGS & PAYOUTS
@app.get("/api/sellers/{seller_id}/earnings")
async def get_seller_earnings(seller_id: str, email: str = Depends(verify_token)):
    """Get detailed earnings for a seller"""
    seller = await db.sellers.find_one({"_id": ObjectId(seller_id)})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    # Get all referral codes for this seller
    referral_codes = await db.referral_codes.find({
        "seller_id": seller_id
    }).to_list(100)
    
    earnings_details = []
    total_earnings = 0
    
    for code in referral_codes:
        # Get all orders using this code
        orders = await db.orders.find({
            "referral_code": code["code"],
            "status": {"$in": ["paid", "completed"]}
        }).sort("created_at", -1).to_list(100)
        
        for order in orders:
            # Calculate REAL profit
            profit = 0
            if order.get("items"):
                for item in order["items"]:
                    product = await db.products.find_one({"name": item["product_name"]})
                    if product:
                        purchase_price = product.get("purchase_price_usdt", 0)
                        selling_price = item.get("price_usdt", 0)
                        item_profit = (selling_price - purchase_price) * item.get("quantity", 1)
                        profit += item_profit
            
            # Calculate commission using ACTUAL seller percentage
            actual_commission_rate = seller.get("commission_percentage", 30)
            commission = profit * (actual_commission_rate / 100)
            total_earnings += commission
            
            earnings_details.append({
                "order_id": str(order["_id"]),
                "order_number": order.get("order_number"),
                "date": order.get("created_at"),
                "order_total": format_price(order.get("total_usdt", 0)),
                "order_profit": format_price(profit),
                "commission_rate": actual_commission_rate,  # Use actual rate
                "commission_earned": format_price(commission),
                "referral_code": code["code"],
                "status": order.get("status")
            })
    
    # Get payout history
    payouts = await db.seller_payouts.find({
        "seller_id": seller_id
    }).sort("created_at", -1).to_list(100)
    
    for payout in payouts:
        payout["_id"] = str(payout["_id"])
    
    total_paid = sum(p.get("amount", 0) for p in payouts)
    pending = total_earnings - total_paid
    
    return {
        "seller": {
            "_id": str(seller["_id"]),
            "name": seller["name"],
            "commission_percentage": seller.get("commission_percentage", 30)
        },
        "earnings": earnings_details,
        "summary": {
            "total_earnings": format_price(total_earnings),
            "total_paid": format_price(total_paid),
            "pending_payout": format_price(pending),
            "total_orders": len(earnings_details)
        },
        "payout_history": payouts
    }

@app.post("/api/sellers/{seller_id}/payout")
async def create_payout(
    seller_id: str,
    payout: PayoutModel,
    email: str = Depends(verify_token)
):
    """Create a payout for seller"""
    seller = await db.sellers.find_one({"_id": ObjectId(seller_id)})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    # Calculate current pending amount
    earnings = await get_seller_earnings(seller_id, email)
    pending = float(earnings["summary"]["pending_payout"])
    
    if payout.amount > pending:
        raise HTTPException(
            status_code=400, 
            detail=f"Payout amount exceeds pending earnings (${pending:.2f})"
        )
    
    # Create payout record
    payout_dict = payout.model_dump()
    payout_dict["seller_id"] = seller_id
    payout_dict["seller_name"] = seller["name"]
    payout_dict["created_at"] = datetime.now(timezone.utc)
    payout_dict["created_by"] = email
    payout_dict["status"] = "completed"
    
    result = await db.seller_payouts.insert_one(payout_dict)
    
    # Log action
    await db.audit_logs.insert_one({
        "admin_id": email,
        "action": "SELLER_PAYOUT",
        "entity_type": "seller",
        "entity_id": ObjectId(seller_id),
        "details": {
            "amount": payout.amount,
            "method": payout.payment_method
        },
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {
        "id": str(result.inserted_id),
        "message": f"Payout of ${payout.amount:.2f} created successfully",
        "new_pending": format_price(pending - payout.amount)
    }

@app.get("/api/sellers/{seller_id}/referral-codes")
async def get_seller_referral_codes(seller_id: str, email: str = Depends(verify_token)):
    """Get all referral codes assigned to a seller"""
    codes = await db.referral_codes.find({
        "seller_id": seller_id
    }).to_list(100)
    
    for code in codes:
        code["_id"] = str(code["_id"])
        
        # Count uses
        orders = await db.orders.count_documents({
            "referral_code": code["code"],
            "status": {"$in": ["paid", "completed"]}
        })
        code["total_uses"] = orders
    
    return {"codes": codes, "total": len(codes)}

# SELLER STATISTICS
@app.get("/api/sellers/stats")
async def get_sellers_stats(email: str = Depends(verify_token)):
    """Get overall seller program statistics"""
    total_sellers = await db.sellers.count_documents({"is_active": True})
    
    # Calculate total commissions
    all_sellers = await db.sellers.find({}).to_list(100)
    total_earnings = 0
    total_pending = 0
    
    for seller in all_sellers:
        seller_id = str(seller["_id"])
        earnings = await get_seller_earnings(seller_id, email)
        total_earnings += float(earnings["summary"]["total_earnings"])
        total_pending += float(earnings["summary"]["pending_payout"])
    
    # Get this month's payouts
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0)
    monthly_payouts = await db.seller_payouts.aggregate([
        {"$match": {"created_at": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    return {
        "total_sellers": total_sellers,
        "total_earnings": format_price(total_earnings),
        "total_pending": format_price(total_pending),
        "monthly_payouts": format_price(monthly_payouts[0]["total"] if monthly_payouts else 0),
        "top_sellers": await get_top_sellers()
    }

async def get_top_sellers():
    """Helper to get top performing sellers"""
    sellers = await db.sellers.find({
        "is_active": {"$ne": False},
        "deleted_at": {"$exists": False}
    }).to_list(100)
    
    seller_earnings = []
    
    for seller in sellers:
        total_commission = 0
        codes = await db.referral_codes.find({"seller_id": str(seller["_id"])}).to_list(100)
        
        for code in codes:
            orders = await db.orders.find({
                "referral_code": code["code"],
                "status": {"$in": ["paid", "completed"]}
            }).to_list(100)
            
            for order in orders:
                actual_profit = 0
                if order.get("items"):
                    for item in order["items"]:
                        product = await db.products.find_one({"name": item["product_name"]})
                        if product:
                            purchase_price = product.get("purchase_price_usdt", 0)
                            selling_price = item.get("price_usdt", 0)
                            quantity = item.get("quantity", 1)
                            item_profit = (selling_price - purchase_price) * quantity
                            actual_profit += item_profit
                
                seller_commission_rate = seller.get("commission_percentage", 30)
                commission = actual_profit * (seller_commission_rate / 100)
                total_commission += commission
        
        if total_commission > 0:
            seller_earnings.append({
                "name": seller["name"],
                "earnings": format_price(total_commission)
            })
    
    # Sort by earnings and return top 5
    seller_earnings.sort(key=lambda x: float(x["earnings"]), reverse=True)
    return seller_earnings[:5]

# NOTIFICATION SETTINGS ENDPOINTS
@app.get("/api/notifications/settings")
async def get_notification_settings(email: str = Depends(verify_token)):
    settings = await db.notification_settings.find_one({"_id": "main"})
    if not settings:
        settings = {
            "_id": "main",
            "enabled": False,
            "channel_id": None,
            "delay_min": 60,
            "delay_max": 300,
            "show_exact_amount": False,
            "fake_orders_enabled": False,
            "fake_orders_per_hour": 2,
            "message_templates": []
        }
    else:
        settings["_id"] = "main"
    return settings

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, admin_id: str):
        await websocket.accept()
        self.active_connections[admin_id] = websocket
        logger.info(f"Admin {admin_id} connected to chat")
    
    async def disconnect(self, admin_id: str):
        if admin_id in self.active_connections:
            del self.active_connections[admin_id]
            logger.info(f"Admin {admin_id} disconnected from chat")
    
    async def send_message(self, message: dict, admin_id: str):
        if admin_id in self.active_connections:
            try:
                await self.active_connections[admin_id].send_json(message)
            except:
                await self.disconnect(admin_id)

manager = ConnectionManager()

# Chat Models
class ChatMessageModel(BaseModel):
    telegram_id: int
    message: str
    attachments: Optional[List[str]] = None

class ChatStatusModel(BaseModel):
    telegram_id: int
    status: str  # "read", "unread", "blocked"

# CHAT ENDPOINTS

@app.websocket("/ws/chat/{admin_email}")
async def websocket_endpoint(websocket: WebSocket, admin_email: str):
    await manager.connect(websocket, admin_email)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        await manager.disconnect(admin_email)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.disconnect(admin_email)

@app.get("/api/chat/conversations")
async def get_conversations(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    email: str = Depends(verify_token)
):
    """Get list of all conversations with users"""
    
    # Build aggregation pipeline for conversations
    pipeline = [
        # Group messages by telegram_id
        {
            "$group": {
                "_id": "$telegram_id",
                "last_message": {"$last": "$message"},
                "last_message_time": {"$max": "$timestamp"},
                "unread_count": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$direction", "incoming"]},
                                {"$eq": ["$read", False]}
                            ]},
                            1,
                            0
                        ]
                    }
                },
                "total_messages": {"$sum": 1}
            }
        },
        {"$sort": {"last_message_time": -1}},
    ]
    
    if unread_only:
        pipeline.append({"$match": {"unread_count": {"$gt": 0}}})
    
    pipeline.extend([
        {"$skip": skip},
        {"$limit": limit}
    ])
    
    conversations = await db.chat_messages.aggregate(pipeline).to_list(limit)
    
    # Enrich with user data
    for conv in conversations:
        user = await db.users.find_one({"telegram_id": conv["_id"]})
        if user:
            conv["username"] = user.get("username", f"User{conv['_id']}")
            conv["first_name"] = user.get("first_name", "")
            conv["last_name"] = user.get("last_name", "")
            conv["total_orders"] = user.get("total_orders", 0)
            conv["total_spent"] = user.get("total_spent_usdt", 0)
            conv["status"] = user.get("status", "active")
        else:
            conv["username"] = f"User{conv['_id']}"
            conv["first_name"] = ""
            conv["last_name"] = ""
            conv["total_orders"] = 0
            conv["total_spent"] = 0
            conv["status"] = "unknown"
        
        conv["telegram_id"] = conv.pop("_id")
    
    # Get total count
    total = await db.chat_messages.distinct("telegram_id")
    
    return {
        "conversations": conversations,
        "total": len(total),
        "unread_total": sum(c.get("unread_count", 0) for c in conversations)
    }

@app.get("/api/chat/messages/{telegram_id}")
async def get_messages(
    telegram_id: int,
    skip: int = 0,
    limit: int = 50,
    email: str = Depends(verify_token)
):
    """Get messages for specific user"""
    
    messages = await db.chat_messages.find(
        {"telegram_id": telegram_id}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    # Convert ObjectId to string and format messages
    for msg in messages:
        msg["_id"] = str(msg["_id"])
        msg["timestamp"] = msg.get("timestamp", datetime.now(timezone.utc))
    
    # Mark incoming messages as read
    await db.chat_messages.update_many(
        {
            "telegram_id": telegram_id,
            "direction": "incoming",
            "read": False
        },
        {"$set": {"read": True}}
    )
    
    # Get user info
    user = await db.users.find_one({"telegram_id": telegram_id})
    user_info = {
        "telegram_id": telegram_id,
        "username": user.get("username", f"User{telegram_id}") if user else f"User{telegram_id}",
        "first_name": user.get("first_name", "") if user else "",
        "last_name": user.get("last_name", "") if user else "",
        "created_at": user.get("created_at") if user else None,
        "total_orders": user.get("total_orders", 0) if user else 0,
        "total_spent": user.get("total_spent_usdt", 0) if user else 0,
        "is_vip": user.get("is_vip", False) if user else False,
        "status": user.get("status", "unknown") if user else "unknown"
    }
    
    # Broadcast read status to all admins
    await manager.broadcast({
        "type": "messages_read",
        "telegram_id": telegram_id
    })
    
    return {
        "messages": list(reversed(messages)),  # Return in chronological order
        "user": user_info,
        "total": await db.chat_messages.count_documents({"telegram_id": telegram_id})
    }

@app.post("/api/chat/send")
async def send_message(
    message_data: ChatMessageModel,
    email: str = Depends(verify_token)
):
    """Send message to user via Telegram bot"""
    
    try:
        # Import bot instance (needs to be accessible)
        from bot_modules.public_notifications import public_notifier
        bot = public_notifier.bot
        
        # Send message via Telegram
        sent_message = await bot.send_message(
            chat_id=message_data.telegram_id,
            text=message_data.message,
            parse_mode='Markdown'
        )
        
        # Save to database
        message_doc = {
            "telegram_id": message_data.telegram_id,
            "message": message_data.message,
            "direction": "outgoing",
            "admin_email": email,
            "timestamp": datetime.now(timezone.utc),
            "read": True,
            "telegram_message_id": sent_message.message_id,
            "attachments": message_data.attachments
        }
        
        result = await db.chat_messages.insert_one(message_doc)
        message_doc["_id"] = str(result.inserted_id)
        
        # Broadcast to all connected admins
        await manager.broadcast({
            "type": "new_message",
            "message": message_doc
        })
        
        return {
            "success": True,
            "message": "Message sent",
            "message_id": str(result.inserted_id)
        }
        
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to send message: {str(e)}")

@app.patch("/api/chat/mark-read/{telegram_id}")
async def mark_messages_read(
    telegram_id: int,
    email: str = Depends(verify_token)
):
    """Mark all messages from user as read"""
    
    result = await db.chat_messages.update_many(
        {
            "telegram_id": telegram_id,
            "direction": "incoming",
            "read": False
        },
        {"$set": {"read": True, "read_by": email, "read_at": datetime.now(timezone.utc)}}
    )
    
    # Broadcast to all admins
    await manager.broadcast({
        "type": "messages_read",
        "telegram_id": telegram_id,
        "read_by": email
    })
    
    return {
        "success": True,
        "messages_marked": result.modified_count
    }

@app.delete("/api/chat/conversation/{telegram_id}")
async def delete_conversation(
    telegram_id: int,
    email: str = Depends(verify_token)
):
    """Delete entire conversation with user"""
    
    if email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Only main admin can delete conversations")
    
    result = await db.chat_messages.delete_many({"telegram_id": telegram_id})
    
    # Log action
    await db.audit_logs.insert_one({
        "admin_id": email,
        "action": "DELETE_CONVERSATION",
        "telegram_id": telegram_id,
        "messages_deleted": result.deleted_count,
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {
        "success": True,
        "messages_deleted": result.deleted_count
    }

@app.get("/api/chat/search")
async def search_messages(
    query: str,
    telegram_id: Optional[int] = None,
    email: str = Depends(verify_token)
):
    """Search in messages"""
    
    search_filter = {
        "$text": {"$search": query}
    }
    
    if telegram_id:
        search_filter["telegram_id"] = telegram_id
    
    messages = await db.chat_messages.find(
        search_filter,
        {"score": {"$meta": "textScore"}}
    ).sort([("score", {"$meta": "textScore"})]).limit(50).to_list(50)
    
    for msg in messages:
        msg["_id"] = str(msg["_id"])
        # Get user info
        user = await db.users.find_one({"telegram_id": msg["telegram_id"]})
        msg["username"] = user.get("username", f"User{msg['telegram_id']}") if user else f"User{msg['telegram_id']}"
    
    return {
        "results": messages,
        "total": len(messages)
    }

@app.get("/api/chat/stats")
async def get_chat_stats(email: str = Depends(verify_token)):
    """Get chat statistics"""
    
    total_conversations = len(await db.chat_messages.distinct("telegram_id"))
    
    total_messages = await db.chat_messages.count_documents({})
    
    unread_messages = await db.chat_messages.count_documents({
        "direction": "incoming",
        "read": False
    })
    
    # Messages today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_messages = await db.chat_messages.count_documents({
        "timestamp": {"$gte": today_start}
    })
    
    # Average response time (if tracking)
    avg_response_time = "N/A"  # Implement if needed
    
    # Most active users
    pipeline = [
        {
            "$group": {
                "_id": "$telegram_id",
                "message_count": {"$sum": 1}
            }
        },
        {"$sort": {"message_count": -1}},
        {"$limit": 5}
    ]
    
    top_users = await db.chat_messages.aggregate(pipeline).to_list(5)
    
    for user in top_users:
        user_data = await db.users.find_one({"telegram_id": user["_id"]})
        user["username"] = user_data.get("username", f"User{user['_id']}") if user_data else f"User{user['_id']}"
        user["telegram_id"] = user.pop("_id")
    
    return {
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "unread_messages": unread_messages,
        "today_messages": today_messages,
        "avg_response_time": avg_response_time,
        "top_users": top_users
    }

# Quick replies templates
@app.get("/api/chat/quick-replies")
async def get_quick_replies(email: str = Depends(verify_token)):
    """Get quick reply templates"""
    
    replies = await db.quick_replies.find({}).to_list(100)
    
    for reply in replies:
        reply["_id"] = str(reply["_id"])
    
    # If no replies exist, create defaults
    if not replies:
        default_replies = [
            {"title": "Order Status", "message": "Your order is being processed and will be shipped within 24 hours."},
            {"title": "Payment Confirmed", "message": "We've received your payment! Your order is now confirmed."},
            {"title": "Tracking Info", "message": "Your tracking number will be provided once the order ships."},
            {"title": "Thank You", "message": "Thank you for your order! 🚀"},
            {"title": "Need Help?", "message": "Is there anything else I can help you with?"},
            {"title": "Welcome", "message": "Welcome to AnabolicPizza! How can I help you today?"},
        ]
        
        for reply in default_replies:
            await db.quick_replies.insert_one(reply)
        
        replies = await db.quick_replies.find({}).to_list(100)
        for reply in replies:
            reply["_id"] = str(reply["_id"])
    
    return {"replies": replies}

# Create index for message search
async def setup_chat_indexes():
    """Setup MongoDB indexes for chat (call this once)"""
    await db.chat_messages.create_index([("message", "text")])
    await db.chat_messages.create_index([("telegram_id", 1), ("timestamp", -1)])
    await db.chat_messages.create_index([("read", 1), ("direction", 1)])
    logger.info("Chat indexes created")

# Call this on startup
@app.on_event("startup")
async def startup_event_extended():
    await setup_chat_indexes()
    logger.info("Chat system initialized")

@app.put("/api/notifications/settings")
async def update_notification_settings(
    settings: NotificationSettingsModel,
    email: str = Depends(verify_token)
):
    settings_dict = settings.model_dump()
    settings_dict["updated_at"] = datetime.now(timezone.utc)
    settings_dict["updated_by"] = email
    
    await db.notification_settings.update_one(
        {"_id": "main"},
        {"$set": settings_dict},
        upsert=True
    )
    
    return {"message": "Settings updated successfully"}

@app.post("/api/notifications/templates")
async def add_message_template(
    template: MessageTemplateModel,
    email: str = Depends(verify_token)
):
    template_dict = template.model_dump()
    template_dict["created_at"] = datetime.now(timezone.utc)
    
    await db.notification_settings.update_one(
        {"_id": "main"},
        {"$push": {"message_templates": template_dict}},
        upsert=True
    )
    
    return {"message": "Template added successfully"}

@app.delete("/api/notifications/templates/{index}")
async def delete_message_template(
    index: int,
    email: str = Depends(verify_token)
):
    settings = await db.notification_settings.find_one({"_id": "main"})
    if settings and settings.get("message_templates"):
        templates = settings["message_templates"]
        if 0 <= index < len(templates):
            templates.pop(index)
            await db.notification_settings.update_one(
                {"_id": "main"},
                {"$set": {"message_templates": templates}}
            )
            return {"message": "Template deleted"}
    
    raise HTTPException(status_code=404, detail="Template not found")

@app.post("/api/notifications/test")
async def send_test_notification(email: str = Depends(verify_token)):
    test_order = {
        "delivery_country": "Slovakia",
        "total_usdt": 150,
        "_id": "test_order",
        "order_number": "TEST-001"
    }
    
    success = await public_notifier.send_notification(test_order)
    
    if success:
        return {"message": "Test notification sent successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to send notification")

@app.post("/api/notifications/fake-order")
async def send_fake_order_manual(email: str = Depends(verify_token)):
    success = await public_notifier.send_fake_order()
    
    if success:
        return {"message": "Fake order sent successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to send fake order")

@app.get("/api/notifications/logs")
async def get_notification_logs(
    limit: int = 50,
    email: str = Depends(verify_token)
):
    logs = await db.notification_logs.find({}).sort("sent_at", -1).limit(limit).to_list(limit)
    
    # Convert ObjectId to string
    for log in logs:
        if "_id" in log:
            log["_id"] = str(log["_id"])
        if "order_id" in log and log["order_id"]:
            try:
                log["order_id"] = str(log["order_id"])
            except:
                pass
    
    return {"logs": logs, "total": len(logs)}

# Admin utility endpoints
@app.delete("/api/admin/clear-orders")
async def clear_orders(email: str = Depends(verify_token)):
    if email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.orders.delete_many({})
    await db.users.update_many({}, {"$set": {"total_orders": 0, "total_spent_usdt": 0, "referrals_used": []}})
    await db.products.update_many({}, {"$set": {"sold_count": 0}})
    
    return {"message": f"Deleted {result.deleted_count} orders and reset stats"}

@app.delete("/api/admin/clear-users")
async def clear_users(email: str = Depends(verify_token)):
    if email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.users.delete_many({})
    return {"message": f"Deleted {result.deleted_count} users"}

# Startup event
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(fake_order_scheduler())
    logger.info("Started fake order scheduler")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
