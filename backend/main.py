from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from bson import ObjectId
import secrets
import jwt
import os
import asyncio
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv('/opt/telegram-shop-bot/.env')

app = FastAPI(title="AnabolicPizza API - Enhanced with Notifications")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    expiration = datetime.utcnow() + timedelta(hours=24)
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
    
    category_dict = category.dict()
    category_dict["created_at"] = datetime.utcnow()
    
    result = await db.categories.insert_one(category_dict)
    return {"id": str(result.inserted_id), "message": "Category created"}

@app.put("/api/categories/{category_id}")
async def update_category(category_id: str, category: CategoryModel, email: str = Depends(verify_token)):
    category_dict = category.dict()
    category_dict["updated_at"] = datetime.utcnow()
    
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
    product_dict = product.dict()
    product_dict["price_usdt"] = format_price(product_dict["price_usdt"])
    product_dict["purchase_price_usdt"] = format_price(product_dict.get("purchase_price_usdt", 0))
    product_dict["created_at"] = datetime.utcnow()
    product_dict["sold_count"] = 0
    
    if product_dict.get("category_id"):
        product_dict["category_id"] = ObjectId(product_dict["category_id"])
    
    result = await db.products.insert_one(product_dict)
    return {"id": str(result.inserted_id), "message": "Product created"}

@app.put("/api/products/{product_id}")
async def update_product(product_id: str, product: ProductModel, email: str = Depends(verify_token)):
    product_dict = product.dict()
    product_dict["price_usdt"] = format_price(product_dict["price_usdt"])
    product_dict["purchase_price_usdt"] = format_price(product_dict.get("purchase_price_usdt", 0))
    product_dict["updated_at"] = datetime.utcnow()
    
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
            referral["is_expired"] = referral["valid_until"] < datetime.utcnow()
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
    
    referral_dict = referral.dict()
    referral_dict["code"] = code
    referral_dict["created_at"] = datetime.utcnow()
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
    referral_dict = referral.dict()
    referral_dict["code"] = referral_dict["code"].upper()
    referral_dict["updated_at"] = datetime.utcnow()
    
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
                    "updated_at": datetime.utcnow()
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
@app.get("/api/users")
async def get_users(skip: int = 0, limit: int = 100, vip_only: bool = False):
    query = {}
    if vip_only:
        query["is_vip"] = True
    
    users = await db.users.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for user in users:
        user["_id"] = str(user["_id"])
        
        total_spent = await db.orders.aggregate([
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
        ]).to_list(1)
        
        user["total_spent_usdt"] = format_price(total_spent[0]["total"] if total_spent else 0)
        
        user["total_orders"] = await db.orders.count_documents({
            "telegram_id": user["telegram_id"],
            "status": {"$in": ["paid", "completed"]}
        })
        
        user["referrals_used"] = user.get("referrals_used", [])
        user["is_vip"] = user.get("is_vip", False)
        user["vip_discount_percentage"] = user.get("vip_discount_percentage", 0)
        
        if user.get("vip_expires") and user["vip_expires"] < datetime.utcnow():
            user["vip_status"] = "expired"
        elif user.get("is_vip"):
            user["vip_status"] = "active"
        else:
            user["vip_status"] = "none"
    
    total = await db.users.count_documents(query)
    return {"users": users, "total": total}

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
            "updated_at": datetime.utcnow()
        }
        
        if vip_data.is_vip and not user.get("is_vip"):
            update_data["vip_since"] = datetime.utcnow()
        
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
            "timestamp": datetime.utcnow()
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
            {"vip_expires": {"$gt": datetime.utcnow()}}
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
            {"vip_expires": {"$gt": datetime.utcnow()}}
        ]
    })
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
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
    end_date = datetime.utcnow()
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

# NOTIFICATION SETTINGS ENDPOINTS
@app.get("/api/notifications/settings")
async def get_notification_settings(email: str = Depends(verify_token)):
    settings = await db.notification_settings.find_one({"_id": "main"})
    if not settings:
        settings = {
            "enabled": False,
            "channel_id": None,
            "delay_min": 60,
            "delay_max": 300,
            "show_exact_amount": False,
            "fake_orders_enabled": False,
            "fake_orders_per_hour": 2,
            "message_templates": []
        }
    settings["_id"] = "main"
    return settings

@app.put("/api/notifications/settings")
async def update_notification_settings(
    settings: NotificationSettingsModel,
    email: str = Depends(verify_token)
):
    settings_dict = settings.dict()
    settings_dict["updated_at"] = datetime.utcnow()
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
    template_dict = template.dict()
    template_dict["created_at"] = datetime.utcnow()
    
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
    
    for log in logs:
        log["_id"] = str(log["_id"])
    
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
