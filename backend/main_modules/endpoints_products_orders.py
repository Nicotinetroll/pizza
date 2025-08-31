# backend/main_modules/endpoints_products_orders.py

from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional, Any, Dict, List
import logging

from .config import db
from .models import ProductModel, OrderStatusModel
from .helpers import format_price, generate_order_id, verify_token

router_products_orders = APIRouter()
logger = logging.getLogger(__name__)

def sanitize_document(doc: Any) -> Any:
    """
    Recursively convert all ObjectId instances to strings in a document.
    Handles nested dictionaries and lists.
    """
    if isinstance(doc, dict):
        return {
            key: sanitize_document(value)
            for key, value in doc.items()
        }
    elif isinstance(doc, list):
        return [sanitize_document(item) for item in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    elif hasattr(doc, '__dict__') and hasattr(doc, '_id'):
        # Handle Mongo documents
        return sanitize_document(dict(doc))
    else:
        return doc

# ==================== PRODUCT ENDPOINTS ====================

@router_products_orders.get("/api/products")
async def get_products(skip: int = 0, limit: int = 100, category_id: Optional[str] = None):
    query = {}
    if category_id:
        query["category_id"] = ObjectId(category_id)
    
    products = await db.products.find(query).skip(skip).limit(limit).to_list(limit)
    
    # Sanitize all products
    products = [sanitize_document(product) for product in products]
    
    for product in products:
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
            category = await db.categories.find_one({"_id": ObjectId(product["category_id"])})
            product["category_name"] = category["name"] if category else "Uncategorized"
            product["category_emoji"] = category.get("emoji", "📦") if category else "📦"
        else:
            product["category_name"] = "Uncategorized"
            product["category_emoji"] = "📦"
    
    total = await db.products.count_documents(query)
    return {"products": products, "total": total}

# ==================== ORDER ENDPOINTS ====================

@router_products_orders.get("/api/orders")
async def get_orders(skip: int = 0, limit: int = 100):
    try:
        orders = await db.orders.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        # Sanitize all orders first to convert ObjectIds
        orders = [sanitize_document(order) for order in orders]
        
        for order in orders:
            order["total_usdt"] = format_price(order.get("total_usdt", 0))
            
            # PROFIT CALCULATION WITH ERROR HANDLING
            total_profit = 0
            base_profit = 0
            
            if order.get("items"):
                for item in order["items"]:
                    try:
                        item["price_usdt"] = format_price(item.get("price_usdt", 0))
                        item["subtotal_usdt"] = format_price(item.get("subtotal_usdt", 0))
                        
                        # Find product to get purchase price
                        product = await db.products.find_one({"name": item.get("product_name")})
                        if product:
                            purchase_price = product.get("purchase_price_usdt", 0)
                            # If no purchase price, estimate at 30% of selling price
                            if purchase_price == 0:
                                purchase_price = item["price_usdt"] * 0.3
                            
                            selling_price = item["price_usdt"]
                            quantity = item.get("quantity", 1)
                            
                            # Calculate profit for this item
                            item_profit = (selling_price - purchase_price) * quantity
                            base_profit += item_profit
                            
                            # Store purchase price in item for frontend
                            item["purchase_price_usdt"] = format_price(purchase_price)
                            item["profit_per_unit"] = format_price(selling_price - purchase_price)
                        else:
                            # Product not found, use estimated cost
                            item["purchase_price_usdt"] = format_price(item["price_usdt"] * 0.3)
                            item["profit_per_unit"] = format_price(item["price_usdt"] * 0.7)
                            base_profit += item["price_usdt"] * 0.7 * item.get("quantity", 1)
                    except Exception as e:
                        logger.warning(f"Error processing item in order {order.get('_id')}: {e}")
                        # Set safe defaults
                        item["purchase_price_usdt"] = 0
                        item["profit_per_unit"] = 0
            
            # Start with base profit
            total_profit = base_profit
            
            # Subtract discount from profit
            discount_amount = order.get("discount_amount", 0)
            total_profit = total_profit - discount_amount
            
            # Handle seller commission if applicable
            seller_commission_amount = 0
            if order.get("referral_code"):
                try:
                    referral = await db.referral_codes.find_one({"code": order["referral_code"]})
                    if referral and referral.get("seller_id"):
                        # Try to find seller
                        seller_id = referral["seller_id"]
                        if isinstance(seller_id, str):
                            try:
                                seller = await db.sellers.find_one({"_id": ObjectId(seller_id)})
                            except:
                                seller = None
                        else:
                            seller = None
                        
                        if seller:
                            commission_rate = seller.get("commission_percentage", 30)
                            if total_profit > 0:
                                seller_commission_amount = total_profit * (commission_rate / 100)
                                total_profit = total_profit - seller_commission_amount
                            
                            order["seller_commission"] = format_price(seller_commission_amount)
                            order["seller_name"] = seller.get("name", "Unknown")
                            order["commission_rate"] = commission_rate
                except Exception as e:
                    logger.warning(f"Error processing referral for order {order.get('_id')}: {e}")
            
            # Set the calculated profit
            order["profit_usdt"] = format_price(total_profit)
            order["base_profit_usdt"] = format_price(base_profit)
            
            # Calculate profit margin
            if order["total_usdt"] > 0:
                order["profit_margin"] = format_price((total_profit / order["total_usdt"]) * 100)
            else:
                order["profit_margin"] = 0
            
            # Add warning if profit is negative
            if total_profit < 0:
                order["profit_warning"] = True
                order["loss_amount"] = format_price(abs(total_profit))
            
            # Ensure order number exists
            if not order.get("order_number"):
                order["order_number"] = generate_order_id()
                # Update in database
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
        
    except Exception as e:
        logger.error(f"Error in get_orders: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error retrieving orders: {str(e)}")

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