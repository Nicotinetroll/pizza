# backend/main_modules/endpoints_payouts.py

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import asyncio
from pydantic import BaseModel, Field
from decimal import Decimal
from .config import db

router = APIRouter(prefix="/api/payouts", tags=["payouts"])

# Pydantic Models
class PayoutPartner(BaseModel):
    name: str
    type: str  # "partner" or "service"
    commission_percentage: Optional[float] = None
    fixed_amount: Optional[float] = None
    description: Optional[str] = None
    payment_method: Optional[str] = None
    payment_address: Optional[str] = None
    is_active: bool = True
    priority: int = 1

class Expense(BaseModel):
    name: str
    type: str  # "shipping", "fee", "tax", "other"
    amount: float
    order_id: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: str = "pending"

class PayoutTransaction(BaseModel):
    partner_id: str
    amount: float
    description: Optional[str] = None
    transaction_id: Optional[str] = None
    notes: Optional[str] = None

# Get all payout partners
@router.get("/partners")
async def get_payout_partners():
    try:
        partners = await db.payout_partners.find(
            {"is_active": True}
        ).sort("priority", 1).to_list(None)
        
        # Calculate pending payouts for each partner
        for partner in partners:
            partner["_id"] = str(partner["_id"])
            
            # Get pending payouts
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
            
            # Get total paid
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

# Create payout partner
@router.post("/partners")
async def create_payout_partner(partner: PayoutPartner):
    try:
        partner_dict = partner.dict()
        partner_dict["created_at"] = datetime.utcnow()
        partner_dict["updated_at"] = datetime.utcnow()
        
        # Validate based on type
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

# Update payout partner
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

# Delete payout partner
@router.delete("/partners/{partner_id}")
async def delete_payout_partner(partner_id: str):
    try:
        # Soft delete - just mark as inactive
        result = await db.payout_partners.update_one(
            {"_id": ObjectId(partner_id)},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Partner not found")
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get expenses
@router.get("/expenses")
async def get_expenses(status: Optional[str] = None):
    try:
        query = {}
        if status:
            query["status"] = status
        
        expenses = await db.expenses.find(query).sort("created_at", -1).to_list(100)
        
        for expense in expenses:
            expense["_id"] = str(expense["_id"])
            if expense.get("order_id"):
                expense["order_id"] = str(expense["order_id"])
        
        # Calculate totals
        total_pending = sum(e["amount"] for e in expenses if e["status"] == "pending")
        total_paid = sum(e["amount"] for e in expenses if e["status"] == "paid")
        
        return {
            "expenses": expenses,
            "total_pending": total_pending,
            "total_paid": total_paid
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Create expense
@router.post("/expenses")
async def create_expense(expense: Expense):
    try:
        expense_dict = expense.dict()
        expense_dict["created_at"] = datetime.utcnow()
        
        if expense.order_id:
            expense_dict["order_id"] = ObjectId(expense.order_id)
        
        result = await db.expenses.insert_one(expense_dict)
        
        return {"success": True, "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mark expense as paid
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

# Get payout calculations for all orders
@router.get("/calculations")
async def get_payout_calculations():
    try:
        # Get all active partners sorted by priority
        partners = await db.payout_partners.find(
            {"is_active": True}
        ).sort("priority", 1).to_list(None)
        
        # Get recent orders with profit
        orders = await db.orders.find(
            {"status": {"$in": ["paid", "completed", "processing"]}}
        ).sort("created_at", -1).limit(100).to_list(None)
        
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
            
            # Calculate base profit
            base_profit = 0
            for item in order.get("items", []):
                selling_price = float(item.get("price_usdt", 0))
                purchase_price = float(item.get("purchase_price_usdt", 0))
                quantity = item.get("quantity", 1)
                base_profit += (selling_price - purchase_price) * quantity
            
            order_calc["base_profit"] = base_profit
            current_profit = base_profit
            
            # Apply seller commission if exists
            if order.get("referral_code"):
                referral = await db.referrals.find_one({"code": order["referral_code"]})
                if referral and referral.get("seller_id"):
                    seller = await db.sellers.find_one({"_id": referral["seller_id"]})
                    if seller:
                        commission_rate = float(seller.get("commission_percentage", 0))
                        commission = current_profit * (commission_rate / 100)
                        order_calc["deductions"].append({
                            "type": "seller_commission",
                            "name": seller.get("name"),
                            "rate": commission_rate,
                            "amount": commission
                        })
                        current_profit -= commission
            
            # Apply partner commissions in priority order
            for partner in partners:
                if partner["type"] == "partner" and partner.get("commission_percentage"):
                    commission_rate = float(partner["commission_percentage"])
                    commission = current_profit * (commission_rate / 100)
                    
                    order_calc["deductions"].append({
                        "type": "partner_commission",
                        "name": partner["name"],
                        "rate": commission_rate,
                        "amount": commission,
                        "base_amount": current_profit
                    })
                    
                    # Track total for each partner
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
            "total_orders": len(calculations)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Process payout for partner
@router.post("/process")
async def process_payout(transaction: PayoutTransaction):
    try:
        # Get partner details
        partner = await db.payout_partners.find_one({"_id": ObjectId(transaction.partner_id)})
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found")
        
        # Create payout transaction
        payout_dict = {
            "partner_id": ObjectId(transaction.partner_id),
            "partner_name": partner["name"],
            "type": "commission",
            "description": transaction.description or f"Payout to {partner['name']}",
            "amount": transaction.amount,
            "status": "paid",
            "paid_at": datetime.utcnow(),
            "transaction_id": transaction.transaction_id,
            "notes": transaction.notes,
            "created_at": datetime.utcnow()
        }
        
        result = await db.payout_transactions.insert_one(payout_dict)
        
        return {"success": True, "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get payout history
@router.get("/history")
async def get_payout_history(partner_id: Optional[str] = None):
    try:
        query = {}
        if partner_id:
            query["partner_id"] = ObjectId(partner_id)
        
        history = await db.payout_transactions.find(query).sort("created_at", -1).limit(100).to_list(None)
        
        for transaction in history:
            transaction["_id"] = str(transaction["_id"])
            transaction["partner_id"] = str(transaction["partner_id"])
            if transaction.get("order_id"):
                transaction["order_id"] = str(transaction["order_id"])
        
        return {"transactions": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get dashboard stats
@router.get("/stats")
async def get_payout_stats():
    try:
        # Get current month dates
        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)
        
        # Total pending payouts
        pending_payouts = await db.payout_transactions.aggregate([
            {"$match": {"status": "pending"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        # This month's payouts
        monthly_payouts = await db.payout_transactions.aggregate([
            {
                "$match": {
                    "status": "paid",
                    "paid_at": {"$gte": month_start}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        # Total expenses pending
        pending_expenses = await db.expenses.aggregate([
            {"$match": {"status": "pending"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        # Active partners count
        active_partners = await db.payout_partners.count_documents({"is_active": True})
        
        return {
            "total_pending": pending_payouts[0]["total"] if pending_payouts else 0,
            "monthly_paid": monthly_payouts[0]["total"] if monthly_payouts else 0,
            "pending_expenses": pending_expenses[0]["total"] if pending_expenses else 0,
            "active_partners": active_partners
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
