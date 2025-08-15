from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
import secrets
import jwt
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv('/opt/telegram-shop-bot/.env')

app = FastAPI(title="AnabolicPizza API - Enhanced")

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
    category_id: Optional[str] = None
    stock_quantity: int = 999
    is_active: bool = True

class ReferralCodeModel(BaseModel):
    code: str
    description: str
    discount_type: str  # "percentage" or "fixed"
    discount_value: float
    usage_limit: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: bool = True

class OrderStatusModel(BaseModel):
    status: str
    notes: Optional[str] = None

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
    return {"status": "AnabolicPizza API", "version": "2.0", "features": ["categories", "referrals"]}

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
        # Count products in category
        category["product_count"] = await db.products.count_documents({
            "category_id": ObjectId(category["_id"]),
            "is_active": True
        })
    
    total = await db.categories.count_documents({})
    return {"categories": categories, "total": total}

@app.post("/api/categories")
async def create_category(category: CategoryModel, email: str = Depends(verify_token)):
    # Check if name already exists
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
    # Check if category has products
    product_count = await db.products.count_documents({"category_id": ObjectId(category_id)})
    if product_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {product_count} products")
    
    result = await db.categories.delete_one({"_id": ObjectId(category_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted"}

# ENHANCED PRODUCT ENDPOINTS
@app.get("/api/products")
async def get_products(skip: int = 0, limit: int = 100, category_id: Optional[str] = None):
    query = {}
    if category_id:
        query["category_id"] = ObjectId(category_id)
    
    products = await db.products.find(query).skip(skip).limit(limit).to_list(limit)
    
    for product in products:
        product["_id"] = str(product["_id"])
        product["price_usdt"] = format_price(product.get("price_usdt"))
        
        # Get category name
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
    product_dict["created_at"] = datetime.utcnow()
    product_dict["sold_count"] = 0
    
    # Convert category_id to ObjectId
    if product_dict.get("category_id"):
        product_dict["category_id"] = ObjectId(product_dict["category_id"])
    
    result = await db.products.insert_one(product_dict)
    return {"id": str(result.inserted_id), "message": "Product created"}

@app.put("/api/products/{product_id}")
async def update_product(product_id: str, product: ProductModel, email: str = Depends(verify_token)):
    product_dict = product.dict()
    product_dict["price_usdt"] = format_price(product_dict["price_usdt"])
    product_dict["updated_at"] = datetime.utcnow()
    
    # Convert category_id to ObjectId
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

# REFERRAL CODE ENDPOINTS
@app.get("/api/referrals")
async def get_referrals(skip: int = 0, limit: int = 100):
    referrals = await db.referral_codes.find({}).skip(skip).limit(limit).to_list(limit)
    
    for referral in referrals:
        referral["_id"] = str(referral["_id"])
        # Check if expired
        if referral.get("valid_until"):
            referral["is_expired"] = referral["valid_until"] < datetime.utcnow()
        else:
            referral["is_expired"] = False
    
    total = await db.referral_codes.count_documents({})
    return {"referrals": referrals, "total": total}

@app.post("/api/referrals")
async def create_referral(referral: ReferralCodeModel, email: str = Depends(verify_token)):
    # Validate code format (alphanumeric, uppercase)
    code = referral.code.upper().replace(" ", "")
    if not code.isalnum():
        raise HTTPException(status_code=400, detail="Code must be alphanumeric only")
    
    # Check if code exists
    existing = await db.referral_codes.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail="Referral code already exists")
    
    referral_dict = referral.dict()
    referral_dict["code"] = code
    referral_dict["created_at"] = datetime.utcnow()
    referral_dict["created_by"] = email
    referral_dict["used_count"] = 0
    
    # Validate discount value
    if referral_dict["discount_type"] == "percentage":
        if referral_dict["discount_value"] < 0 or referral_dict["discount_value"] > 100:
            raise HTTPException(status_code=400, detail="Percentage must be between 0 and 100")
    else:  # fixed
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

# ENHANCED ORDER ENDPOINTS
@app.get("/api/orders")
async def get_orders(skip: int = 0, limit: int = 100):
    orders = await db.orders.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for order in orders:
        order["_id"] = str(order["_id"])
        order["total_usdt"] = format_price(order.get("total_usdt"))
        
        # Generate order number if missing
        if not order.get("order_number"):
            order["order_number"] = generate_order_id()
            await db.orders.update_one(
                {"_id": ObjectId(order["_id"])},
                {"$set": {"order_number": order["order_number"]}}
            )
        
        # Format item prices
        if order.get("items"):
            for item in order["items"]:
                item["price_usdt"] = format_price(item.get("price_usdt"))
                item["subtotal_usdt"] = format_price(item.get("subtotal_usdt"))
        
        # Add referral info
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
        
        # Update stats if status changed to paid/completed
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
async def get_users(skip: int = 0, limit: int = 100):
    users = await db.users.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for user in users:
        user["_id"] = str(user["_id"])
        
        # Calculate stats from orders
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
        
        # Get referrals used
        user["referrals_used"] = user.get("referrals_used", [])
    
    total = await db.users.count_documents({})
    return {"users": users, "total": total}

# DASHBOARD STATS
@app.get("/api/dashboard/stats")
async def get_stats():
    total_orders = await db.orders.count_documents({})
    total_users = await db.users.count_documents({})
    total_products = await db.products.count_documents({"is_active": True})
    total_categories = await db.categories.count_documents({"is_active": True})
    
    # Calculate revenue
    pipeline = [
        {"$match": {"status": {"$in": ["paid", "completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_usdt"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = format_price(revenue_result[0]["total"] if revenue_result else 0)
    
    # Get active referral codes
    active_referrals = await db.referral_codes.count_documents({"is_active": True})
    
    return {
        "stats": {
            "total_orders": total_orders,
            "total_revenue_usdt": total_revenue,
            "total_users": total_users,
            "total_products": total_products,
            "total_categories": total_categories,
            "active_referrals": active_referrals
        }
    }

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)