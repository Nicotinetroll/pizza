# PRODUCTS AND ORDERS ENDPOINTS

from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional
import logging

from .config import db
from .models import ProductModel, OrderStatusModel
from .helpers import format_price, generate_order_id, verify_token

router_products_orders = APIRouter()
logger = logging.getLogger(__name__)

# ==================== PRODUCT ENDPOINTS ====================

@router_products_orders.get("/api/products")
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
            product["category_emoji"] = category.get("emoji", "📦") if category else "📦"
        else:
            product["category_name"] = "Uncategorized"
            product["category_emoji"] = "📦"
    
    total = await db.products.count_documents(query)
    return {"products": products, "total": total}

@router_products_orders.post("/api/products")
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

@router_products_orders.put("/api/products/{product_id}")
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

@router_products_orders.delete("/api/products/{product_id}")
async def delete_product(product_id: str, email: str = Depends(verify_token)):
    await db.products.delete_one({"_id": ObjectId(product_id)})
    return {"message": "Product deleted"}

# ==================== ORDER ENDPOINTS ====================

@router_products_orders.get("/api/orders")
async def get_orders(skip: int = 0, limit: int = 100):
    orders = await db.orders.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for order in orders:
        order["_id"] = str(order["_id"])
        order["total_usdt"] = format_price(order.get("total_usdt"))
        
        # FIXED PROFIT CALCULATION
        total_profit = 0
        base_profit = 0  # Profit before discounts
        
        if order.get("items"):
            for item in order["items"]:
                item["price_usdt"] = format_price(item.get("price_usdt"))
                item["subtotal_usdt"] = format_price(item.get("subtotal_usdt"))
                
                # Find product to get purchase price
                product = await db.products.find_one({"name": item["product_name"]})
                if product:
                    purchase_price = product.get("purchase_price_usdt", 0)
                    selling_price = item["price_usdt"]
                    quantity = item.get("quantity", 1)
                    
                    # Calculate profit for this item
                    item_profit = (selling_price - purchase_price) * quantity
                    base_profit += item_profit
                    
                    # Store purchase price in item for frontend
                    item["purchase_price_usdt"] = format_price(purchase_price)
                    item["profit_per_unit"] = format_price(selling_price - purchase_price)
        
        # Start with base profit
        total_profit = base_profit
        
        # SUBTRACT discount from profit (discount reduces our profit!)
        discount_amount = order.get("discount_amount", 0)
        total_profit = total_profit - discount_amount
        
        # If there's a seller commission, subtract it too
        seller_commission_amount = 0
        if order.get("referral_code"):
            referral = await db.referral_codes.find_one({"code": order["referral_code"]})
            if referral and referral.get("seller_id"):
                seller = await db.sellers.find_one({"_id": ObjectId(referral["seller_id"])})
                if seller:
                    commission_rate = seller.get("commission_percentage", 30)
                    # Commission is calculated from profit AFTER discount
                    # But only if there's positive profit
                    if total_profit > 0:
                        seller_commission_amount = total_profit * (commission_rate / 100)
                        total_profit = total_profit - seller_commission_amount
                    else:
                        # No commission on losses
                        seller_commission_amount = 0
                    
                    order["seller_commission"] = format_price(seller_commission_amount)
                    order["seller_name"] = seller.get("name", "Unknown")
                    order["commission_rate"] = commission_rate
        
        # Set the calculated profit
        order["profit_usdt"] = format_price(total_profit)
        order["base_profit_usdt"] = format_price(base_profit)  # Profit before discounts
        
        # Calculate profit margin
        if order["total_usdt"] > 0:
            order["profit_margin"] = format_price((total_profit / order["total_usdt"]) * 100)
        else:
            order["profit_margin"] = 0
        
        # Add warning if profit is negative
        if total_profit < 0:
            order["profit_warning"] = True
            order["loss_amount"] = format_price(abs(total_profit))
        
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

@router_products_orders.patch("/api/orders/{order_id}/status")
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
        
        # Update product sold counts and user stats when order is paid/completed
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
        
        # Log the status change
        await db.audit_logs.insert_one({
            "admin_id": email,
            "action": "UPDATE_ORDER_STATUS",
            "entity_type": "order",
            "entity_id": ObjectId(order_id),
            "old_value": {"status": old_status},
            "new_value": {"status": new_status},
            "notes": status_update.notes,
            "timestamp": datetime.now(timezone.utc)
        })
        
        return {"success": True, "message": "Order status updated"}
    except Exception as e:
        logger.error(f"Error updating order status: {e}")
        raise HTTPException(status_code=400, detail=str(e))