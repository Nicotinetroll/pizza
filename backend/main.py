from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
from decimal import Decimal
import hashlib
import secrets
import jwt
import os
from dotenv import load_dotenv
import logging

# Load environment variables with explicit path
load_dotenv('/opt/telegram-shop-bot/.env')

app = FastAPI(title="AnabolicPizza API")

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

# Models
class LoginModel(BaseModel):
    email: str
    password: str

class ProductModel(BaseModel):
    name: str
    description: str
    price_usdt: float
    stock_quantity: int = 999
    is_active: bool = True

class OrderStatusModel(BaseModel):
    status: str
    notes: Optional[str] = None

# Helper function to format decimals
def format_price(value):
    """Format price to 2 decimal places"""
    if value is None:
        return 0
    try:
        return round(float(value), 2)
    except:
        return 0

# Helper to generate random order ID
def generate_order_id():
    """Generate random order ID like APZ-XXXX-XXXX"""
    part1 = secrets.token_hex(2).upper()
    part2 = secrets.token_hex(2).upper()
    return f"APZ-{part1}-{part2}"

# Auth
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
    return {"status": "AnabolicPizza API", "version": "1.0"}

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

@app.get("/api/products")
async def get_products(skip: int = 0, limit: int = 100):
    products = await db.products.find({}).skip(skip).limit(limit).to_list(limit)
    
    # Convert ObjectId to string and format prices
    for product in products:
        product["_id"] = str(product["_id"])
        product["price_usdt"] = format_price(product.get("price_usdt"))
    
    total = await db.products.count_documents({})
    return {"products": products, "total": total}

@app.post("/api/products")
async def create_product(product: ProductModel, email: str = Depends(verify_token)):
    product_dict = product.dict()
    product_dict["price_usdt"] = format_price(product_dict["price_usdt"])
    product_dict["created_at"] = datetime.utcnow()
    product_dict["sold_count"] = 0
    
    result = await db.products.insert_one(product_dict)
    return {"id": str(result.inserted_id), "message": "Product created"}

@app.put("/api/products/{product_id}")
async def update_product(product_id: str, product: ProductModel, email: str = Depends(verify_token)):
    product_dict = product.dict()
    product_dict["price_usdt"] = format_price(product_dict["price_usdt"])
    product_dict["updated_at"] = datetime.utcnow()
    
    await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": product_dict}
    )
    return {"message": "Product updated"}

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, email: str = Depends(verify_token)):
    await db.products.delete_one({"_id": ObjectId(product_id)})
    return {"message": "Product deleted"}

@app.get("/api/orders")
async def get_orders(skip: int = 0, limit: int = 100):
    orders = await db.orders.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for order in orders:
        order["_id"] = str(order["_id"])
        # Format prices
        order["total_usdt"] = format_price(order.get("total_usdt"))
        
        # Generate random order number if it doesn't exist or looks sequential
        if not order.get("order_number") or "APZ-2025" in order.get("order_number", ""):
            order["order_number"] = generate_order_id()
            # Update in database
            await db.orders.update_one(
                {"_id": ObjectId(order["_id"])},
                {"$set": {"order_number": order["order_number"]}}
            )
        
        # Format item prices
        if order.get("items"):
            for item in order["items"]:
                item["price_usdt"] = format_price(item.get("price_usdt"))
                item["subtotal_usdt"] = format_price(item.get("subtotal_usdt"))
        
    total = await db.orders.count_documents({})
    return {"orders": orders, "total": total}

@app.patch("/api/orders/{order_id}/status")
async def update_order_status(order_id: str, status_update: OrderStatusModel, email: str = Depends(verify_token)):
    try:
        # Get order before update
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        old_status = order.get("status")
        new_status = status_update.status
        
        # Update order status
        result = await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # If changing TO paid/completed status, increment sold counts
        if old_status not in ["paid", "completed"] and new_status in ["paid", "completed"]:
            if order.get("items"):
                for item in order["items"]:
                    await db.products.update_one(
                        {"name": item["product_name"]},
                        {"$inc": {"sold_count": item.get("quantity", 1)}}
                    )
            
            # Update user's total spent
            await db.users.update_one(
                {"telegram_id": order["telegram_id"]},
                {
                    "$inc": {
                        "total_orders": 1,
                        "total_spent_usdt": float(order.get("total_usdt", 0))
                    }
                }
            )
        
        # If changing FROM paid/completed to other status, decrement sold counts
        elif old_status in ["paid", "completed"] and new_status not in ["paid", "completed"]:
            if order.get("items"):
                for item in order["items"]:
                    await db.products.update_one(
                        {"name": item["product_name"]},
                        {"$inc": {"sold_count": -item.get("quantity", 1)}}
                    )
            
            # Update user's total spent
            await db.users.update_one(
                {"telegram_id": order["telegram_id"]},
                {
                    "$inc": {
                        "total_orders": -1,
                        "total_spent_usdt": -float(order.get("total_usdt", 0))
                    }
                }
            )
        
        return {"success": True, "message": "Order status updated"}
    except Exception as e:
        logger.error(f"Error updating order status: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    
    
    

@app.get("/api/users")
async def get_users(skip: int = 0, limit: int = 100):
    users = await db.users.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for user in users:
        user["_id"] = str(user["_id"])
        
        # Calculate total spent from completed orders
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
        
        # Count orders
        user["total_orders"] = await db.orders.count_documents({
            "telegram_id": user["telegram_id"],
            "status": {"$in": ["paid", "completed"]}
        })
        
    total = await db.users.count_documents({})
    return {"users": users, "total": total}

@app.get("/api/dashboard/stats")
async def get_stats():
    total_orders = await db.orders.count_documents({})
    total_users = await db.users.count_documents({})
    total_products = await db.products.count_documents({"is_active": True})
    
    # Calculate revenue with proper decimal handling
    pipeline = [
        {"$match": {"status": {"$in": ["paid", "completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_usdt"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = format_price(revenue_result[0]["total"] if revenue_result else 0)
    
    return {
        "stats": {
            "total_orders": total_orders,
            "total_revenue_usdt": total_revenue,
            "total_users": total_users,
            "total_products": total_products
        }
    }

# Admin utility endpoints
@app.delete("/api/admin/clear-orders")
async def clear_orders(email: str = Depends(verify_token)):
    """Clear all orders and reset user stats"""
    if email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Clear orders
    result = await db.orders.delete_many({})
    
    # Reset user stats
    await db.users.update_many(
        {},
        {"$set": {"total_orders": 0, "total_spent_usdt": 0}}
    )
    
    # Reset Sold count
    await db.products.update_many(
        {},
        {"$set": {"sold_count": 0}}
    )
    
    return {"message": f"Deleted {result.deleted_count} orders and reset user stats"}

@app.delete("/api/admin/clear-users")
async def clear_users(email: str = Depends(verify_token)):
    """Clear all users"""
    if email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.users.delete_many({})
    return {"message": f"Deleted {result.deleted_count} users"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
