import secrets
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import JWT_SECRET, JWT_ALGORITHM

security = HTTPBearer()

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

async def get_top_sellers():
    """Helper to get top performing sellers"""
    from .config import db
    from bson import ObjectId
    
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
    
    seller_earnings.sort(key=lambda x: float(x["earnings"]), reverse=True)
    return seller_earnings[:5]

async def setup_chat_indexes():
    """Setup MongoDB indexes for chat"""
    from .config import db
    import logging
    
    logger = logging.getLogger(__name__)
    
    await db.chat_messages.create_index([("message", "text")])
    await db.chat_messages.create_index([("telegram_id", 1), ("timestamp", -1)])
    await db.chat_messages.create_index([("read", 1), ("direction", 1)])
    logger.info("Chat indexes created")
