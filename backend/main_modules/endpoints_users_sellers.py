# USERS, VIP, REFERRALS AND SELLERS ENDPOINTS - FIXED VERSION

from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging
import traceback

from .config import db
from .models import *
from .helpers import format_price, generate_referral_code, verify_token, get_top_sellers

router_users_sellers = APIRouter()
logger = logging.getLogger(__name__)

# ==================== USER ENDPOINTS ====================

@router_users_sellers.get("/api/users")
async def get_users(skip: int = 0, limit: int = 100, vip_only: bool = False):
    """Get all users with complete error handling"""
    try:
        query = {}
        if vip_only:
            query["is_vip"] = True
        
        users = await db.users.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        for user in users:
            user["_id"] = str(user["_id"])
            
            if "telegram_id" not in user:
                logger.warning(f"User {user['_id']} has no telegram_id")
                user["telegram_id"] = 0
            
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
            
            try:
                user["total_orders"] = await db.orders.count_documents({
                    "telegram_id": user.get("telegram_id", 0),
                    "status": {"$in": ["paid", "completed"]}
                })
            except Exception as e:
                logger.error(f"Error counting orders for user {user.get('telegram_id')}: {e}")
                user["total_orders"] = 0
            
            user["username"] = user.get("username", "")
            user["first_name"] = user.get("first_name", "")
            user["last_name"] = user.get("last_name", "")
            user["status"] = user.get("status", "active")
            user["referrals_used"] = user.get("referrals_used", [])
            user["is_vip"] = user.get("is_vip", False)
            user["vip_discount_percentage"] = user.get("vip_discount_percentage", 0)
            user["vip_notes"] = user.get("vip_notes", "")
            
            if "created_at" not in user or user["created_at"] is None:
                user["created_at"] = datetime.now(timezone.utc)
            
            if hasattr(user["created_at"], 'isoformat'):
                user["created_at"] = user["created_at"].isoformat()
            
            user["vip_status"] = "none"
            
            try:
                if user.get("vip_expires"):
                    vip_expires = user["vip_expires"]
                    
                    if isinstance(vip_expires, str):
                        try:
                            vip_expires = datetime.fromisoformat(vip_expires.replace('Z', '+00:00'))
                        except:
                            vip_expires = datetime.fromisoformat(vip_expires.split('+')[0])
                            vip_expires = vip_expires.replace(tzinfo=timezone.utc)
                    
                    if hasattr(vip_expires, 'tzinfo'):
                        if vip_expires.tzinfo is None:
                            vip_expires = vip_expires.replace(tzinfo=timezone.utc)
                    else:
                        del user["vip_expires"]
                        user["vip_status"] = "active" if user.get("is_vip") else "none"
                        continue
                    
                    current_time = datetime.now(timezone.utc)
                    if vip_expires < current_time:
                        user["vip_status"] = "expired"
                    else:
                        user["vip_status"] = "active"
                    
                    user["vip_expires"] = vip_expires.isoformat()
                    
                elif user.get("is_vip"):
                    user["vip_status"] = "active"
                else:
                    user["vip_status"] = "none"
                    
            except Exception as e:
                logger.error(f"Error processing VIP status for user {user.get('_id')}: {e}")
                user["vip_status"] = "active" if user.get("is_vip") else "none"
                if "vip_expires" in user:
                    del user["vip_expires"]
        
        total = await db.users.count_documents(query)
        
        return {
            "users": users,
            "total": total,
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Critical error in get_users: {str(e)}")
        logger.error(traceback.format_exc())
        
        return {
            "users": [],
            "total": 0,
            "success": False,
            "error": str(e)
        }

@router_users_sellers.patch("/api/users/{user_id}/vip")
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

@router_users_sellers.get("/api/users/vip")
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

# ==================== REFERRAL ENDPOINTS ====================

@router_users_sellers.get("/api/referrals")
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

@router_users_sellers.post("/api/referrals")
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

@router_users_sellers.put("/api/referrals/{referral_id}")
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

@router_users_sellers.delete("/api/referrals/{referral_id}")
async def delete_referral(referral_id: str, email: str = Depends(verify_token)):
    result = await db.referral_codes.delete_one({"_id": ObjectId(referral_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Referral code not found")
    
    return {"message": "Referral code deleted"}

@router_users_sellers.post("/api/referrals/{referral_id}/assign-seller")
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

# ==================== SELLER ENDPOINTS - FIXED COMMISSION CALCULATION ====================

def calculate_order_profit(order, products_cache=None):
    """Helper function to calculate actual profit from an order"""
    total_profit = 0
    
    if order.get("items"):
        for item in order["items"]:
            # Try to find product by ID first, then by name
            product = None
            if products_cache and item.get("product_name") in products_cache:
                product = products_cache[item.get("product_name")]
            
            if product:
                purchase_price = product.get("purchase_price_usdt", 0)
                selling_price = item.get("price_usdt", 0)
                quantity = item.get("quantity", 1)
                
                # Calculate profit per item
                item_profit = (selling_price - purchase_price) * quantity
                total_profit += item_profit
    
    # Subtract discount from profit (discount reduces our profit!)
    discount_amount = order.get("discount_amount", 0)
    actual_profit = max(0, total_profit - discount_amount)
    
    return actual_profit

@router_users_sellers.get("/api/sellers")
async def get_sellers(email: str = Depends(verify_token)):
    """Get all sellers with their CORRECTED stats"""
    sellers = await db.sellers.find({
        "deleted_at": {"$exists": False}
    }).to_list(100)
    
    # Cache all products for performance
    all_products = await db.products.find({}).to_list(None)
    products_cache = {p["name"]: p for p in all_products}
    
    for seller in sellers:
        seller["_id"] = str(seller["_id"])
        
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
        
        referral_codes = await db.referral_codes.find({
            "seller_id": str(seller["_id"])
        }).to_list(100)
        
        seller["referral_codes"] = []
        total_commission = 0
        total_sales = 0
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
                # Total sales (revenue)
                code_sales += order.get("total_usdt", 0)
                
                # Calculate ACTUAL PROFIT using the helper function
                actual_profit = calculate_order_profit(order, products_cache)
                
                # Calculate commission from PROFIT, not revenue!
                commission_rate = seller.get("commission_percentage", 30)
                commission = actual_profit * (commission_rate / 100)
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
        
        # Get payouts
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

@router_users_sellers.post("/api/sellers")
async def create_seller(seller: SellerModel, email: str = Depends(verify_token)):
    """Create new seller"""
    seller_dict = seller.model_dump()
    seller_dict["created_at"] = datetime.now(timezone.utc)
    seller_dict["created_by"] = email
    seller_dict["total_earnings"] = 0
    seller_dict["pending_earnings"] = 0
    
    result = await db.sellers.insert_one(seller_dict)
    
    await db.audit_logs.insert_one({
        "admin_id": email,
        "action": "CREATE_SELLER",
        "entity_type": "seller",
        "entity_id": result.inserted_id,
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"id": str(result.inserted_id), "message": "Seller created successfully"}

@router_users_sellers.put("/api/sellers/{seller_id}")
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

@router_users_sellers.delete("/api/sellers/{seller_id}")
async def delete_seller(
    seller_id: str, 
    hard: bool = False,
    email: str = Depends(verify_token)
):
    """Delete seller - soft delete (deactivate) or hard delete (permanent)"""
    
    seller = await db.sellers.find_one({"_id": ObjectId(seller_id)})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    if hard:
        logger.info(f"Hard deleting seller {seller_id}")
        
        await db.seller_payouts.delete_many({"seller_id": seller_id})
        
        await db.referral_codes.update_many(
            {"seller_id": seller_id},
            {"$unset": {"seller_id": "", "seller_name": ""}}
        )
        
        result = await db.sellers.delete_one({"_id": ObjectId(seller_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Failed to delete seller")
        
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
        
        await db.audit_logs.insert_one({
            "admin_id": email,
            "action": "SOFT_DELETE_SELLER",
            "entity_type": "seller",
            "entity_id": ObjectId(seller_id),
            "timestamp": datetime.now(timezone.utc),
            "notes": "Deactivated seller (soft delete)"
        })
        
        return {"message": "Seller deactivated", "type": "soft_delete", "success": True}

@router_users_sellers.get("/api/sellers/{seller_id}/earnings")
async def get_seller_earnings(seller_id: str, email: str = Depends(verify_token)):
    """Get detailed earnings for a seller - FIXED CALCULATION"""
    seller = await db.sellers.find_one({"_id": ObjectId(seller_id)})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    # Cache products
    all_products = await db.products.find({}).to_list(None)
    products_cache = {p["name"]: p for p in all_products}
    
    referral_codes = await db.referral_codes.find({
        "seller_id": seller_id
    }).to_list(100)
    
    earnings_details = []
    total_earnings = 0
    
    for code in referral_codes:
        orders = await db.orders.find({
            "referral_code": code["code"],
            "status": {"$in": ["paid", "completed"]}
        }).sort("created_at", -1).to_list(100)
        
        for order in orders:
            # Use helper to calculate actual profit
            actual_profit = calculate_order_profit(order, products_cache)
            
            # Calculate commission from PROFIT
            commission_rate = seller.get("commission_percentage", 30)
            commission = actual_profit * (commission_rate / 100)
            total_earnings += commission
            
            earnings_details.append({
                "order_id": str(order["_id"]),
                "order_number": order.get("order_number"),
                "date": order.get("created_at"),
                "order_total": format_price(order.get("total_usdt", 0)),
                "order_profit": format_price(actual_profit),
                "commission_rate": commission_rate,
                "commission_earned": format_price(commission),
                "referral_code": code["code"],
                "status": order.get("status")
            })
    
    # Get payouts
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

@router_users_sellers.post("/api/sellers/{seller_id}/payout")
async def create_payout(
    seller_id: str,
    payout: PayoutModel,
    email: str = Depends(verify_token)
):
    """Create a payout for seller"""
    seller = await db.sellers.find_one({"_id": ObjectId(seller_id)})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    earnings = await get_seller_earnings(seller_id, email)
    pending = float(earnings["summary"]["pending_payout"])
    
    if payout.amount > pending:
        raise HTTPException(
            status_code=400, 
            detail=f"Payout amount exceeds pending earnings (${pending:.2f})"
        )
    
    payout_dict = payout.model_dump()
    payout_dict["seller_id"] = seller_id
    payout_dict["seller_name"] = seller["name"]
    payout_dict["created_at"] = datetime.now(timezone.utc)
    payout_dict["created_by"] = email
    payout_dict["status"] = "completed"
    
    result = await db.seller_payouts.insert_one(payout_dict)
    
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

@router_users_sellers.get("/api/sellers/stats")
async def get_sellers_stats(email: str = Depends(verify_token)):
    """Get overall seller program statistics - FIXED"""
    total_sellers = await db.sellers.count_documents({"is_active": True})
    
    all_sellers = await db.sellers.find({}).to_list(100)
    total_earnings = 0
    total_pending = 0
    
    # Cache products
    all_products = await db.products.find({}).to_list(None)
    products_cache = {p["name"]: p for p in all_products}
    
    for seller in all_sellers:
        seller_id = str(seller["_id"])
        
        # Get referral codes for this seller
        codes = await db.referral_codes.find({"seller_id": seller_id}).to_list(100)
        
        seller_total_earnings = 0
        for code in codes:
            # Get orders using this code
            orders = await db.orders.find({
                "referral_code": code["code"],
                "status": {"$in": ["paid", "completed"]}
            }).to_list(None)
            
            for order in orders:
                # Calculate actual profit
                actual_profit = calculate_order_profit(order, products_cache)
                
                # Calculate commission from profit
                commission_rate = seller.get("commission_percentage", 30)
                commission = actual_profit * (commission_rate / 100)
                seller_total_earnings += commission
        
        total_earnings += seller_total_earnings
        
        # Get payouts
        payouts = await db.seller_payouts.find({"seller_id": seller_id}).to_list(None)
        total_paid = sum(p.get("amount", 0) for p in payouts)
        
        pending = seller_total_earnings - total_paid
        total_pending += pending
    
    # Monthly payouts
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

@router_users_sellers.get("/api/sellers/{seller_id}/referral-codes")
async def get_seller_referral_codes(seller_id: str, email: str = Depends(verify_token)):
    """Get all referral codes assigned to a seller"""
    codes = await db.referral_codes.find({
        "seller_id": seller_id
    }).to_list(100)
    
    for code in codes:
        code["_id"] = str(code["_id"])
        
        orders = await db.orders.count_documents({
            "referral_code": code["code"],
            "status": {"$in": ["paid", "completed"]}
        })
        code["total_uses"] = orders
    
    return {"codes": codes, "total": len(codes)}

@router_users_sellers.get("/api/sellers/debug")
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

@router_users_sellers.post("/api/sellers/reset-active")
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