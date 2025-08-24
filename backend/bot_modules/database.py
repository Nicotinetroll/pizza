"""
Enhanced database operations with categories, referral codes and VIP support
"""
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from bson import ObjectId
import secrets
from typing import Dict, List, Optional
from .config import MONGODB_URI

# Database connection
mongo_client = AsyncIOMotorClient(MONGODB_URI)
db = mongo_client.telegram_shop

async def generate_order_number() -> str:
    """Generate random order number"""
    part1 = secrets.token_hex(2).upper()
    part2 = secrets.token_hex(2).upper()
    return f"APZ-{part1}-{part2}"

async def create_or_update_user(user_data: dict) -> dict:
    """Create or update user in database"""
    result = await db.users.update_one(
        {"telegram_id": user_data["telegram_id"]},
        {
            "$set": {
                "username": user_data.get("username"),
                "first_name": user_data.get("first_name"),
                "last_name": user_data.get("last_name"),
                "last_active": datetime.utcnow()
            },
            "$setOnInsert": {
                "created_at": datetime.utcnow(),
                "telegram_id": user_data["telegram_id"],
                "total_orders": 0,
                "total_spent_usdt": 0,
                "status": "active",
                "referrals_used": [],
                "is_vip": False,
                "vip_discount_percentage": 0
            }
        },
        upsert=True
    )
    return result

async def get_user_vip_status(telegram_id: int) -> dict:
    """Get user VIP status and discount"""
    user = await db.users.find_one({"telegram_id": telegram_id})
    if not user:
        return {"is_vip": False, "discount": 0}
    
    # Check if VIP expired
    if user.get("vip_expires") and user["vip_expires"] < datetime.utcnow():
        # VIP expired, update status
        await db.users.update_one(
            {"telegram_id": telegram_id},
            {"$set": {"is_vip": False}}
        )
        return {"is_vip": False, "discount": 0}
    
    return {
        "is_vip": user.get("is_vip", False),
        "discount": user.get("vip_discount_percentage", 0)
    }

async def calculate_vip_price(original_price: float, vip_discount: float) -> float:
    """Calculate price with VIP discount"""
    if vip_discount <= 0:
        return original_price
    discount_amount = original_price * (vip_discount / 100)
    return max(0, original_price - discount_amount)

# Category Functions
async def get_active_categories() -> List[dict]:
    """Get all active categories sorted by order"""
    return await db.categories.find(
        {"is_active": True}
    ).sort("order", 1).to_list(100)

async def get_category_by_id(category_id: str) -> Optional[dict]:
    """Get category by ID"""
    try:
        return await db.categories.find_one({"_id": ObjectId(category_id)})
    except:
        return None

# Product Functions
async def get_products_by_category(category_id: str, limit: int = 20, vip_discount: float = 0) -> List[dict]:
    """Get active products in a category with VIP pricing"""
    try:
        products = await db.products.find({
            "category_id": ObjectId(category_id),
            "is_active": True
        }).limit(limit).to_list(limit)
        
        # Apply VIP discount to prices
        for product in products:
            original_price = float(product.get("price_usdt", 0))
            if vip_discount > 0:
                product["original_price"] = original_price
                product["price_usdt"] = await calculate_vip_price(original_price, vip_discount)
                product["has_vip_discount"] = True
            else:
                product["has_vip_discount"] = False
                
        return products
    except:
        return []

async def get_active_products(limit: int = 20, vip_discount: float = 0) -> List[dict]:
    """Get active products from database with VIP pricing"""
    products = await db.products.find({"is_active": True}).limit(limit).to_list(limit)
    
    # Apply VIP discount to prices
    for product in products:
        original_price = float(product.get("price_usdt", 0))
        if vip_discount > 0:
            product["original_price"] = original_price
            product["price_usdt"] = await calculate_vip_price(original_price, vip_discount)
            product["has_vip_discount"] = True
        else:
            product["has_vip_discount"] = False
            
    return products

async def get_product_by_id(product_id: str, vip_discount: float = 0) -> Optional[dict]:
    """Get product by ID with category info and VIP pricing"""
    try:
        product = await db.products.find_one({"_id": ObjectId(product_id)})
        if product:
            # Get category info
            if product.get("category_id"):
                category = await db.categories.find_one({"_id": product["category_id"]})
                if category:
                    product["category_name"] = category["name"]
            
            # Apply VIP discount
            original_price = float(product.get("price_usdt", 0))
            if vip_discount > 0:
                product["original_price"] = original_price
                product["price_usdt"] = await calculate_vip_price(original_price, vip_discount)
                product["has_vip_discount"] = True
            else:
                product["has_vip_discount"] = False
                
        return product
    except:
        return None

# Referral Functions
async def validate_referral_code(code: str) -> Optional[dict]:
    """Validate and get referral code details"""
    referral = await db.referral_codes.find_one({
        "code": code.upper(),
        "is_active": True
    })
    
    if not referral:
        return None
    
    # Check if expired
    if referral.get("valid_until") and referral["valid_until"] < datetime.utcnow():
        return None
    
    # Check if not yet valid
    if referral.get("valid_from") and referral["valid_from"] > datetime.utcnow():
        return None
    
    # Check usage limit
    if referral.get("usage_limit") and referral.get("used_count", 0) >= referral["usage_limit"]:
        return None
    
    return referral

async def apply_referral_code(code: str) -> bool:
    """Increment usage count for referral code"""
    result = await db.referral_codes.update_one(
        {"code": code.upper()},
        {"$inc": {"used_count": 1}}
    )
    return result.modified_count > 0

async def calculate_discount(total: float, referral: dict) -> tuple[float, float]:
    """Calculate discount amount and new total"""
    if referral["discount_type"] == "percentage":
        discount = total * (referral["discount_value"] / 100)
    else:  # fixed
        discount = min(referral["discount_value"], total)
    
    new_total = max(0, total - discount)
    return discount, new_total

# Order Functions
async def get_user_orders(telegram_id: int, limit: int = 10) -> List[dict]:
    """Get user orders"""
    return await db.orders.find(
        {"telegram_id": telegram_id}
    ).sort("created_at", -1).limit(limit).to_list(limit)

async def create_order(order_data: dict) -> str:
    """Create new order with referral and VIP support"""
    order_data["created_at"] = datetime.utcnow()
    order_data["order_number"] = await generate_order_number()
    
    # Store original total if discount applied
    if order_data.get("referral_code") or order_data.get("vip_discount_applied"):
        original_total = order_data.get("total_usdt", 0)
        if order_data.get("discount_amount", 0) > 0:
            order_data["original_total"] = original_total + order_data["discount_amount"]
    
    result = await db.orders.insert_one(order_data)
    
    # Update user's referral usage
    if order_data.get("referral_code"):
        await db.users.update_one(
            {"telegram_id": order_data["telegram_id"]},
            {"$push": {"referrals_used": order_data["referral_code"]}}
        )
    
    return str(result.inserted_id)

async def update_order_payment(order_id: str, payment_data: dict) -> bool:
    """Update order payment status"""
    try:
        result = await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {
                "$set": {
                    "status": "paid",
                    "paid_at": datetime.utcnow(),
                    "payment.status": "confirmed",
                    "payment.transaction_id": payment_data.get("transaction_id", "DEMO_" + secrets.token_hex(16))
                }
            }
        )
        
        # Update product sold counts and user stats
        if result.modified_count > 0:
            order = await db.orders.find_one({"_id": ObjectId(order_id)})
            if order:
                # Update products
                if order.get("items"):
                    for item in order["items"]:
                        await db.products.update_one(
                            {"name": item["product_name"]},
                            {"$inc": {"sold_count": item.get("quantity", 1)}}
                        )
                
                # Update user stats
                await db.users.update_one(
                    {"telegram_id": order["telegram_id"]},
                    {
                        "$inc": {
                            "total_orders": 1,
                            "total_spent_usdt": order.get("total_usdt", 0)
                        }
                    }
                )
        
        return result.modified_count > 0
    except Exception as e:
        print(f"Error updating payment: {e}")
        return False

async def get_order_by_id(order_id: str) -> Optional[dict]:
    """Get order by ID"""
    try:
        return await db.orders.find_one({"_id": ObjectId(order_id)})
    except:
        return None

# Stats Functions
async def get_user_stats(telegram_id: int) -> dict:
    """Get user statistics"""
    user = await db.users.find_one({"telegram_id": telegram_id})
    if not user:
        return {"total_orders": 0, "total_spent": 0}
    
    return {
        "total_orders": user.get("total_orders", 0),
        "total_spent": user.get("total_spent_usdt", 0),
        "member_since": user.get("created_at", datetime.utcnow()),
        "is_vip": user.get("is_vip", False),
        "vip_discount": user.get("vip_discount_percentage", 0)
    }

async def update_order_payment_info(order_id: str, payment_info: dict):
    """Update order with payment information"""
    try:
        from bson import ObjectId
        await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"payment": payment_info}}
        )
        return True
    except Exception as e:
        logger.error(f"Error updating payment info: {e}")
        return False
