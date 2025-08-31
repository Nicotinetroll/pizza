from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import asyncio
from pydantic import BaseModel, Field
from decimal import Decimal
from .config import db

router = APIRouter(prefix="/api/payouts", tags=["payouts"])

class PayoutPartner(BaseModel):
    name: str
    type: str
    commission_percentage: Optional[float] = None
    fixed_amount: Optional[float] = None
    description: Optional[str] = None
    payment_method: Optional[str] = None
    payment_address: Optional[str] = None
    is_active: bool = True
    priority: int = 1

class Expense(BaseModel):
    name: str
    type: str
    amount: float
    percentage: Optional[float] = None
    amount_type: Optional[str] = "fixed"
    order_id: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: str = "pending"
    apply_per_order: bool = False

class PayoutTransaction(BaseModel):
    partner_id: str
    amount: float
    description: Optional[str] = None
    transaction_id: Optional[str] = None
    payment_method: Optional[str] = "USDT"
    notes: Optional[str] = None

@router.get("/partners")
async def get_payout_partners():
    try:
        partners = await db.payout_partners.find(
            {"is_active": True}
        ).sort("priority", 1).to_list(None)
        
        for partner in partners:
            partner["_id"] = str(partner["_id"])
            
            pending = await db.payout_transactions.aggregate([
                {
                    "$match": {
                        "partner_id": ObjectId(partner["_id"]),
                        "status": "pending"
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "total": {"$sum": "$amount"},
                        "count": {"$sum": 1}
                    }
                }
            ]).to_list(1)
            
            partner["pending_amount"] = pending[0]["total"] if pending else 0
            partner["pending_count"] = pending[0]["count"] if pending else 0
            
            paid = await db.payout_transactions.aggregate([
                {
                    "$match": {
                        "partner_id": ObjectId(partner["_id"]),
                        "status": "paid"
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "total": {"$sum": "$amount"}
                    }
                }
            ]).to_list(1)
            
            partner["total_paid"] = paid[0]["total"] if paid else 0
        
        return {"partners": partners}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/partners")
async def create_payout_partner(partner: PayoutPartner):
    try:
        partner_dict = partner.dict()
        partner_dict["created_at"] = datetime.utcnow()
        partner_dict["updated_at"] = datetime.utcnow()
        
        if partner.type == "partner":
            if not partner.commission_percentage:
                raise HTTPException(status_code=400, detail="Commission percentage required for partners")
            if partner.commission_percentage < 0 or partner.commission_percentage > 100:
                raise HTTPException(status_code=400, detail="Commission must be between 0-100%")
        elif partner.type == "service":
            if not partner.fixed_amount:
                raise HTTPException(status_code=400, detail="Fixed amount required for services")
        
        result = await db.payout_partners.insert_one(partner_dict)
        
        return {"success": True, "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/partners/{partner_id}")
async def update_payout_partner(partner_id: str, partner: PayoutPartner):
    try:
        partner_dict = partner.dict()
        partner_dict["updated_at"] = datetime.utcnow()
        
        result = await db.payout_partners.update_one(
            {"_id": ObjectId(partner_id)},
            {"$set": partner_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Partner not found")
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/partners/{partner_id}")
async def delete_payout_partner(partner_id: str, hard: bool = False):
    try:
        if hard:
            await db.payout_transactions.delete_many({"partner_id": ObjectId(partner_id)})
            
            result = await db.payout_partners.delete_one({"_id": ObjectId(partner_id)})
            
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Partner not found")
        else:
            result = await db.payout_partners.update_one(
                {"_id": ObjectId(partner_id)},
                {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
            )
            
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Partner not found")
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/expenses")
async def get_expenses(status: Optional[str] = None):
    try:
        query = {}
        if status:
            query["status"] = status
        
        expenses = await db.expenses.find(query).sort("created_at", -1).to_list(None)
        
        for expense in expenses:
            expense["_id"] = str(expense["_id"])
            if expense.get("order_id"):
                expense["order_id"] = str(expense["order_id"])
        
        total_pending = sum(e["amount"] for e in expenses if e["status"] == "pending" and not e.get("apply_per_order"))
        total_paid = sum(e["amount"] for e in expenses if e["status"] == "paid")
        
        return {
            "expenses": expenses,
            "total_pending": total_pending,
            "total_paid": total_paid
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/expenses")
async def create_expense(expense: Expense):
    try:
        expense_dict = expense.dict()
        expense_dict["created_at"] = datetime.utcnow()
        
        if expense.order_id:
            expense_dict["order_id"] = ObjectId(expense.order_id)
        
        if expense.apply_per_order and expense.amount_type == "percentage":
            if not expense.percentage or expense.percentage <= 0 or expense.percentage > 100:
                raise HTTPException(status_code=400, detail="Percentage must be between 0 and 100")
        
        result = await db.expenses.insert_one(expense_dict)
        
        return {"success": True, "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/expenses/{expense_id}")
async def update_expense(expense_id: str, expense: dict):
    try:
        if not ObjectId.is_valid(expense_id):
            raise HTTPException(status_code=400, detail="Invalid expense ID")
        
        if '_id' in expense:
            del expense['_id']
        
        if expense.get('order_id'):
            expense['order_id'] = ObjectId(expense['order_id'])
        
        if expense.get('apply_per_order') and expense.get('amount_type') == 'percentage':
            if not expense.get('percentage') or expense['percentage'] <= 0 or expense['percentage'] > 100:
                raise HTTPException(status_code=400, detail="Percentage must be between 0 and 100")
        
        result = await db.expenses.update_one(
            {"_id": ObjectId(expense_id)},
            {"$set": {
                **expense,
                "updated_at": datetime.utcnow()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        return {"success": True, "message": "Expense updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    try:
        if not ObjectId.is_valid(expense_id):
            raise HTTPException(status_code=400, detail="Invalid expense ID")
        
        result = await db.expenses.delete_one(
            {"_id": ObjectId(expense_id)}
        )
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        return {"success": True, "message": "Expense deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/expenses/{expense_id}/pay")
async def pay_expense(expense_id: str):
    try:
        result = await db.expenses.update_one(
            {"_id": ObjectId(expense_id)},
            {
                "$set": {
                    "status": "paid",
                    "paid_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/calculations")
async def get_payout_calculations(skip: int = 0, limit: int = 100):
    try:
        partners = await db.payout_partners.find(
            {"is_active": True}
        ).sort("priority", 1).to_list(None)
        
        total_orders = await db.orders.count_documents(
            {"status": {"$in": ["paid", "completed", "processing"]}}
        )
        
        orders = await db.orders.find(
            {"status": {"$in": ["paid", "completed", "processing"]}}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        all_products = await db.products.find({}).to_list(None)
        products_by_name = {p["name"]: p for p in all_products}
        
        recurring_expenses = await db.expenses.find({
            "apply_per_order": True,
            "status": {"$ne": "cancelled"}
        }).to_list(None)
        
        calculations = []
        total_partner_payouts = {}
        
        for order in orders:
            order_calc = {
                "order_number": order.get("order_number"),
                "order_date": order.get("created_at"),
                "total_usdt": float(order.get("total_usdt", 0)),
                "base_profit": 0,
                "deductions": [],
                "final_profit": 0
            }
            
            original_total = float(order.get("total_usdt", 0))
            discount_amount = float(order.get("discount_amount", 0))
            original_price_before_discount = original_total + discount_amount
            
            base_profit = 0
            total_purchase_cost = 0
            
            if order.get("items") and len(order["items"]) > 0:
                for item in order["items"]:
                    quantity = item.get("quantity", 1)
                    
                    purchase_price = float(item.get("purchase_price_usdt", 0))
                    
                    if purchase_price == 0:
                        product_name = item.get("product_name", "")
                        product = products_by_name.get(product_name)
                        if product:
                            purchase_price = float(product.get("purchase_price_usdt", 0))
                    
                    total_purchase_cost += purchase_price * quantity
            
            base_profit = original_price_before_discount - total_purchase_cost
            order_calc["base_profit"] = base_profit
            
            current_profit = base_profit
            
            for expense in recurring_expenses:
                expense_amount = 0
                expense_name = expense.get('name')
                
                if expense.get('amount_type') == 'percentage' and expense.get('percentage'):
                    percentage = float(expense.get('percentage', 0))
                    if percentage > 0 and current_profit > 0:
                        expense_amount = current_profit * (percentage / 100)
                        expense_name = f"{expense.get('name')} ({percentage}%)"
                else:
                    expense_amount = float(expense.get('amount', 0))
                
                if expense_amount > 0:
                    order_calc["deductions"].append({
                        "type": "expense",
                        "name": f"{expense_name} ({expense.get('type', 'expense')})",
                        "rate": expense.get('percentage', 0) if expense.get('amount_type') == 'percentage' else 0,
                        "amount": expense_amount
                    })
                    current_profit -= expense_amount
            
            if discount_amount > 0:
                order_calc["deductions"].append({
                    "type": "discount",
                    "name": "Customer Discount",
                    "rate": 0,
                    "amount": discount_amount
                })
                current_profit -= discount_amount
            
            if order.get("referral_code"):
                referral = await db.referral_codes.find_one({"code": order["referral_code"]})
                if referral and referral.get("seller_id"):
                    seller = await db.sellers.find_one({"_id": ObjectId(referral["seller_id"])})
                    if seller and current_profit > 0:
                        commission_rate = float(seller.get("commission_percentage", 30))
                        commission = current_profit * (commission_rate / 100)
                        order_calc["deductions"].append({
                            "type": "seller_commission",
                            "name": seller.get("name"),
                            "rate": commission_rate,
                            "amount": commission
                        })
                        current_profit -= commission
            
            for partner in partners:
                if partner["type"] == "partner" and partner.get("commission_percentage") and current_profit > 0:
                    commission_rate = float(partner["commission_percentage"])
                    commission = current_profit * (commission_rate / 100)
                    
                    order_calc["deductions"].append({
                        "type": "partner_commission",
                        "name": partner["name"],
                        "rate": commission_rate,
                        "amount": commission,
                        "base_amount": current_profit
                    })
                    
                    partner_id = str(partner["_id"])
                    if partner_id not in total_partner_payouts:
                        total_partner_payouts[partner_id] = {
                            "name": partner["name"],
                            "total": 0,
                            "count": 0
                        }
                    total_partner_payouts[partner_id]["total"] += commission
                    total_partner_payouts[partner_id]["count"] += 1
                    
                    current_profit -= commission
            
            order_calc["final_profit"] = current_profit
            calculations.append(order_calc)
        
        return {
            "calculations": calculations,
            "partner_totals": total_partner_payouts,
            "total_orders": total_orders,
            "has_more": skip + limit < total_orders,
            "current_page": skip // limit + 1,
            "total_pages": (total_orders + limit - 1) // limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process")
async def process_payout(transaction: PayoutTransaction):
    try:
        partner = await db.payout_partners.find_one({"_id": ObjectId(transaction.partner_id)})
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found")
        
        payout_dict = {
            "partner_id": ObjectId(transaction.partner_id),
            "partner_name": partner["name"],
            "type": "commission",
            "description": transaction.description or f"Payout to {partner['name']}",
            "amount": transaction.amount,
            "status": "paid",
            "paid_at": datetime.utcnow(),
            "transaction_id": transaction.transaction_id,
            "payment_method": transaction.payment_method if hasattr(transaction, 'payment_method') else "USDT",
            "notes": transaction.notes,
            "created_at": datetime.utcnow()
        }
        
        result = await db.payout_transactions.insert_one(payout_dict)
        
        await db.audit_logs.insert_one({
            "action": "PAYOUT_PROCESSED",
            "entity_type": "partner",
            "entity_id": ObjectId(transaction.partner_id),
            "details": {
                "amount": transaction.amount,
                "transaction_id": transaction.transaction_id
            },
            "timestamp": datetime.utcnow()
        })
        
        return {"success": True, "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_payout_history(partner_id: Optional[str] = None):
    try:
        query = {}
        if partner_id:
            query["partner_id"] = ObjectId(partner_id)
        
        history = await db.payout_transactions.find(query).sort("created_at", -1).to_list(None)
        
        for transaction in history:
            transaction["_id"] = str(transaction["_id"])
            transaction["partner_id"] = str(transaction["partner_id"])
            if transaction.get("order_id"):
                transaction["order_id"] = str(transaction["order_id"])
            if "payment_method" not in transaction:
                transaction["payment_method"] = "USDT"
        
        return {"transactions": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_payout_stats():
    try:
        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)
        
        active_partners = await db.payout_partners.find(
            {"is_active": True}
        ).to_list(None)
        active_partner_ids = [p["_id"] for p in active_partners]
        
        pending_payouts = await db.payout_transactions.aggregate([
            {
                "$match": {
                    "status": "pending",
                    "partner_id": {"$in": active_partner_ids}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        monthly_payouts = await db.payout_transactions.aggregate([
            {
                "$match": {
                    "status": "paid",
                    "paid_at": {"$gte": month_start},
                    "partner_id": {"$in": active_partner_ids}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        pending_expenses = await db.expenses.aggregate([
            {"$match": {"status": "pending", "apply_per_order": {"$ne": True}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        active_partners_count = len(active_partners)
        
        return {
            "total_pending": pending_payouts[0]["total"] if pending_payouts else 0,
            "monthly_paid": monthly_payouts[0]["total"] if monthly_payouts else 0,
            "pending_expenses": pending_expenses[0]["total"] if pending_expenses else 0,
            "active_partners": active_partners_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/calculations/all")
async def get_all_payout_calculations():
    try:
        partners = await db.payout_partners.find(
            {"is_active": True}
        ).sort("priority", 1).to_list(None)
        
        batch_size = 100
        skip = 0
        all_calculations = []
        total_partner_payouts = {}
        
        all_products = await db.products.find({}).to_list(None)
        products_by_name = {p["name"]: p for p in all_products}
        
        recurring_expenses = await db.expenses.find({
            "apply_per_order": True,
            "status": {"$ne": "cancelled"}
        }).to_list(None)
        
        while True:
            orders = await db.orders.find(
                {"status": {"$in": ["paid", "completed", "processing"]}}
            ).sort("created_at", -1).skip(skip).limit(batch_size).to_list(batch_size)
            
            if not orders:
                break
            
            for order in orders:
                order_calc = {
                    "order_number": order.get("order_number"),
                    "order_date": order.get("created_at"),
                    "total_usdt": float(order.get("total_usdt", 0)),
                    "base_profit": 0,
                    "deductions": [],
                    "final_profit": 0
                }
                
                original_total = float(order.get("total_usdt", 0))
                discount_amount = float(order.get("discount_amount", 0))
                original_price_before_discount = original_total + discount_amount
                
                base_profit = 0
                total_purchase_cost = 0
                
                if order.get("items") and len(order["items"]) > 0:
                    for item in order["items"]:
                        quantity = item.get("quantity", 1)
                        
                        purchase_price = float(item.get("purchase_price_usdt", 0))
                        
                        if purchase_price == 0:
                            product_name = item.get("product_name", "")
                            product = products_by_name.get(product_name)
                            if product:
                                purchase_price = float(product.get("purchase_price_usdt", 0))
                        
                        total_purchase_cost += purchase_price * quantity
                
                base_profit = original_price_before_discount - total_purchase_cost
                order_calc["base_profit"] = base_profit
                
                current_profit = base_profit
                
                for expense in recurring_expenses:
                    expense_amount = 0
                    expense_name = expense.get('name')
                    
                    if expense.get('amount_type') == 'percentage' and expense.get('percentage'):
                        percentage = float(expense.get('percentage', 0))
                        if percentage > 0 and current_profit > 0:
                            expense_amount = current_profit * (percentage / 100)
                            expense_name = f"{expense.get('name')} ({percentage}%)"
                    else:
                        expense_amount = float(expense.get('amount', 0))
                    
                    if expense_amount > 0:
                        order_calc["deductions"].append({
                            "type": "expense",
                            "name": f"{expense_name} ({expense.get('type', 'expense')})",
                            "rate": expense.get('percentage', 0) if expense.get('amount_type') == 'percentage' else 0,
                            "amount": expense_amount
                        })
                        current_profit -= expense_amount
                
                if discount_amount > 0:
                    order_calc["deductions"].append({
                        "type": "discount",
                        "name": "Customer Discount",
                        "rate": 0,
                        "amount": discount_amount
                    })
                    current_profit -= discount_amount
                
                if order.get("referral_code"):
                    referral = await db.referral_codes.find_one({"code": order["referral_code"]})
                    if referral and referral.get("seller_id"):
                        seller = await db.sellers.find_one({"_id": ObjectId(referral["seller_id"])})
                        if seller and current_profit > 0:
                            commission_rate = float(seller.get("commission_percentage", 30))
                            commission = current_profit * (commission_rate / 100)
                            order_calc["deductions"].append({
                                "type": "seller_commission",
                                "name": seller.get("name"),
                                "rate": commission_rate,
                                "amount": commission
                            })
                            current_profit -= commission
                
                for partner in partners:
                    if partner["type"] == "partner" and partner.get("commission_percentage") and current_profit > 0:
                        commission_rate = float(partner["commission_percentage"])
                        commission = current_profit * (commission_rate / 100)
                        
                        order_calc["deductions"].append({
                            "type": "partner_commission",
                            "name": partner["name"],
                            "rate": commission_rate,
                            "amount": commission,
                            "base_amount": current_profit
                        })
                        
                        partner_id = str(partner["_id"])
                        if partner_id not in total_partner_payouts:
                            total_partner_payouts[partner_id] = {
                                "name": partner["name"],
                                "total": 0,
                                "count": 0
                            }
                        total_partner_payouts[partner_id]["total"] += commission
                        total_partner_payouts[partner_id]["count"] += 1
                        
                        current_profit -= commission
                
                order_calc["final_profit"] = current_profit
                all_calculations.append(order_calc)
            
            skip += batch_size
            
            await asyncio.sleep(0.01)
        
        return {
            "calculations": all_calculations,
            "partner_totals": total_partner_payouts,
            "total_orders": len(all_calculations)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
