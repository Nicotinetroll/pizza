"""
NOWPayments Integration for AnabolicPizza Bot
Complete payment gateway with message editing support
"""

import aiohttp
import hmac
import hashlib
import json
import logging
from typing import Dict, Optional, List
from datetime import datetime
from decimal import Decimal
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os

logger = logging.getLogger(__name__)


class NOWPaymentsGateway:
    """NOWPayments API integration handler"""
    
    def __init__(self, api_key: str, ipn_secret: str, sandbox: bool = False):
        self.api_key = api_key
        self.ipn_secret = ipn_secret
        self.sandbox = sandbox
        
        if sandbox:
            self.base_url = "https://api-sandbox.nowpayments.io/v1"
        else:
            self.base_url = "https://api.nowpayments.io/v1"
        
        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        self.supported_currencies = {
            "BTC": "btc",
            "ETH": "eth", 
            "SOL": "sol",
            "USDT": "usdttrc20"
        }
        
        from bot_modules.config import MONGODB_URI, BOT_USERNAME
        self.mongo_client = AsyncIOMotorClient(MONGODB_URI)
        self.db = self.mongo_client.telegram_shop
        self.bot_username = BOT_USERNAME.replace('@', '')
    
    async def get_available_currencies(self) -> List[Dict]:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/currencies",
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("currencies", [])
                    else:
                        logger.error(f"Failed to get currencies: {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error fetching currencies: {e}")
            return []
    
    async def get_minimum_payment_amount(self, currency_from: str, currency_to: str = "usd") -> float:
        try:
            async with aiohttp.ClientSession() as session:
                params = {
                    "currency_from": currency_from,
                    "currency_to": currency_to
                }
                
                async with session.get(
                    f"{self.base_url}/min-amount",
                    headers=self.headers,
                    params=params
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return float(data.get("min_amount", 0))
                    else:
                        logger.error(f"Failed to get min amount: {response.status}")
                        return 10
        except Exception as e:
            logger.error(f"Error fetching minimum amount: {e}")
            return 10
    
    async def get_estimated_price(self, amount_usd: float, currency: str) -> Dict:
        try:
            currency_code = self.supported_currencies.get(currency.upper(), currency.lower())
            
            async with aiohttp.ClientSession() as session:
                params = {
                    "amount": amount_usd,
                    "currency_from": "usd",
                    "currency_to": currency_code
                }
                
                async with session.get(
                    f"{self.base_url}/estimate",
                    headers=self.headers,
                    params=params
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "estimated_amount": float(data.get("estimated_amount", 0)),
                            "currency": currency_code.upper()
                        }
                    else:
                        logger.error(f"Failed to get estimate: {response.status}")
                        rates = {"BTC": 65000, "ETH": 3500, "SOL": 150, "USDT": 1}
                        estimated = amount_usd / rates.get(currency.upper(), 1)
                        return {
                            "estimated_amount": estimated,
                            "currency": currency.upper()
                        }
        except Exception as e:
            logger.error(f"Error getting estimate: {e}")
            rates = {"BTC": 65000, "ETH": 3500, "SOL": 150, "USDT": 1}
            estimated = amount_usd / rates.get(currency.upper(), 1)
            return {
                "estimated_amount": estimated,
                "currency": currency.upper()
            }
    
    async def create_payment(self, order_data: Dict) -> Dict:
        try:
            currency_code = self.supported_currencies.get(
                order_data["currency"].upper(), 
                order_data["currency"].lower()
            )
            
            description = f"Order {order_data['order_number']}"
            
            payment_data = {
                "price_amount": order_data["amount_usd"],
                "price_currency": "usd",
                "pay_currency": currency_code,
                "order_id": order_data["order_number"],
                "order_description": description,
                "ipn_callback_url": "https://stnwgn.com/api/payments/webhook",
                "is_fixed_rate": True,
                "is_fee_paid_by_user": False
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/payment",
                    headers=self.headers,
                    json=payment_data
                ) as response:
                    if response.status in [200, 201]:
                        data = await response.json()
                        
                        payment_record = {
                            "order_id": order_data["order_id"],
                            "order_number": order_data["order_number"],
                            "telegram_id": order_data["telegram_id"],
                            "payment_id": data["payment_id"],
                            "pay_address": data["pay_address"],
                            "pay_amount": float(data["pay_amount"]),
                            "pay_currency": data["pay_currency"].upper(),
                            "price_amount": float(data["price_amount"]),
                            "price_currency": data["price_currency"].upper(),
                            "payment_status": data["payment_status"],
                            "created_at": datetime.utcnow(),
                            "expiry_estimate": data.get("expiry_estimate_date"),
                            "last_check": datetime.utcnow()
                        }
                        
                        await self.db.payment_records.insert_one(payment_record)
                        
                        return {
                            "success": True,
                            "payment_id": data["payment_id"],
                            "payment_status": data["payment_status"],
                            "pay_address": data["pay_address"],
                            "pay_amount": float(data["pay_amount"]),
                            "pay_currency": data["pay_currency"].upper(),
                            "expiry_time": data.get("expiry_estimate_date"),
                            "payment_url": data.get("invoice_url")
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"Payment creation failed: {response.status} - {error_text}")
                        return {
                            "success": False,
                            "error": f"Payment creation failed: {error_text}"
                        }
                        
        except Exception as e:
            logger.error(f"Error creating payment: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def check_payment_status(self, payment_id: str) -> Dict:
        """Check payment status - USED BY BOT FOR POLLING"""
        try:
            # First check database for cached status
            cached = await self.db.payment_records.find_one({"payment_id": payment_id})
            if cached:
                # If last check was less than 3 seconds ago, return cached
                if cached.get("last_check"):
                    time_diff = (datetime.utcnow() - cached["last_check"]).total_seconds()
                    if time_diff < 3:
                        logger.info(f"Returning cached status for {payment_id}: {cached.get('payment_status')}")
                        return {
                            "payment_id": payment_id,
                            "payment_status": cached.get("payment_status", "waiting"),
                            "actually_paid": float(cached.get("actually_paid", 0)),
                            "pay_amount": float(cached.get("pay_amount", 0)),
                            "outcome_amount": float(cached.get("outcome_amount", 0)),
                            "outcome_currency": cached.get("outcome_currency", "USD"),
                            "from_cache": True
                        }
            
            # Make API call
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/payment/{payment_id}",
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Update database with new status
                        await self.db.payment_records.update_one(
                            {"payment_id": payment_id},
                            {
                                "$set": {
                                    "payment_status": data["payment_status"],
                                    "actually_paid": float(data.get("actually_paid", 0)),
                                    "updated_at": datetime.utcnow(),
                                    "last_check": datetime.utcnow()
                                }
                            }
                        )
                        
                        logger.info(f"API check for {payment_id}: {data['payment_status']}")
                        
                        return {
                            "payment_id": payment_id,
                            "payment_status": data["payment_status"],
                            "actually_paid": float(data.get("actually_paid", 0)),
                            "pay_amount": float(data.get("pay_amount", 0)),
                            "outcome_amount": float(data.get("outcome_amount", 0)),
                            "outcome_currency": data.get("outcome_currency", "USD"),
                            "from_cache": False
                        }
                    else:
                        logger.error(f"Failed to check payment status: {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Error checking payment status: {e}")
            return None
    
    async def verify_ipn_signature(self, signature: str, payload: bytes) -> bool:
        if not self.ipn_secret:
            logger.warning("IPN secret not configured - skipping signature verification")
            return True
        
        try:
            expected_signature = hmac.new(
                self.ipn_secret.encode(),
                payload,
                hashlib.sha512
            ).hexdigest()
            
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"Error verifying IPN signature: {e}")
            return False
    
    async def process_ipn_callback(self, payload: Dict, signature: str = None) -> bool:
        """Process IPN webhook callback from NOWPayments"""
        try:
            payment_id = payload.get("payment_id")
            payment_status = payload.get("payment_status")
            order_number = payload.get("order_id")
            
            logger.info(f"IPN WEBHOOK: Payment {payment_id} status changed to {payment_status}")
            
            # Update payment record with webhook data
            await self.db.payment_records.update_one(
                {"payment_id": payment_id},
                {
                    "$set": {
                        "payment_status": payment_status,
                        "actually_paid": float(payload.get("actually_paid", 0)),
                        "outcome_amount": float(payload.get("outcome_amount", 0)),
                        "outcome_currency": payload.get("outcome_currency"),
                        "updated_at": datetime.utcnow(),
                        "last_check": datetime.utcnow(),
                        "ipn_data": payload,
                        "webhook_received": True
                    }
                }
            )
            
            # Update order with latest payment status
            await self.db.orders.update_one(
                {"order_number": order_number},
                {
                    "$set": {
                        "payment.latest_status": payment_status,
                        "payment.last_update": datetime.utcnow()
                    }
                }
            )
            
            if payment_status == "finished":
                await self.confirm_order_payment(order_number, payment_id, payload)
                
            elif payment_status == "partially_paid":
                await self.handle_partial_payment(order_number, payment_id, payload)
                
            elif payment_status == "expired":
                await self.handle_expired_payment(order_number, payment_id)
                
            elif payment_status == "failed":
                await self.handle_failed_payment(order_number, payment_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing IPN callback: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def confirm_order_payment(self, order_number: str, payment_id: str, payment_data: Dict):
        try:
            order = await self.db.orders.find_one({"order_number": order_number})
            if not order:
                logger.error(f"Order not found: {order_number}")
                return
            
            await self.db.orders.update_one(
                {"order_number": order_number},
                {
                    "$set": {
                        "status": "paid",
                        "paid_at": datetime.utcnow(),
                        "payment.status": "confirmed",
                        "payment.transaction_id": payment_id,
                        "payment.actually_paid": float(payment_data.get("actually_paid", 0)),
                        "payment.outcome_amount": float(payment_data.get("outcome_amount", 0)),
                        "payment.outcome_currency": payment_data.get("outcome_currency"),
                        "payment.latest_status": "finished"
                    }
                }
            )
            
            # Update product sold counts
            if order.get("items"):
                for item in order["items"]:
                    await self.db.products.update_one(
                        {"name": item["product_name"]},
                        {"$inc": {"sold_count": item.get("quantity", 1)}}
                    )
            
            # Update user stats
            await self.db.users.update_one(
                {"telegram_id": order["telegram_id"]},
                {
                    "$inc": {
                        "total_orders": 1,
                        "total_spent_usdt": float(order.get("total_usdt", 0))
                    }
                }
            )
            
            # Try to update Telegram message
            message_id = order.get("payment", {}).get("message_id")
            if message_id:
                try:
                    from bot_modules.public_notifications import public_notifier
                    from telegram import InlineKeyboardMarkup, InlineKeyboardButton
                    
                    bot = public_notifier.bot
                    
                    success_text = f"""
✅ *PAYMENT CONFIRMED!*

Order: `{order_number}`

Your payment has been successfully received! 🎉

*What happens next:*
• Order is being processed
• Shipping within 24 hours
• You'll receive tracking info

Thank you for your order! 💪

_Time to get massive! Your gains are on the way!_ 🍕💉
"""
                    
                    keyboard = InlineKeyboardMarkup([
                        [InlineKeyboardButton("📦 My Orders", callback_data="orders")],
                        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
                        [InlineKeyboardButton("🍕 Order More", callback_data="shop")]
                    ])
                    
                    await bot.edit_message_text(
                        chat_id=order["telegram_id"],
                        message_id=message_id,
                        text=success_text,
                        reply_markup=keyboard,
                        parse_mode='Markdown'
                    )
                    
                    logger.info(f"✅ Edited message {message_id} for confirmed payment: {order_number}")
                    
                except Exception as e:
                    logger.error(f"Could not edit message: {e}")
            
            # Send public notification
            try:
                from bot_modules.public_notifications import public_notifier
                order["status"] = "paid"
                asyncio.create_task(public_notifier.send_notification(order))
            except Exception as e:
                logger.error(f"Public notification error: {e}")
            
            logger.info(f"✅ Order {order_number} payment confirmed via IPN")
            
        except Exception as e:
            logger.error(f"Error confirming order payment: {e}")
            import traceback
            traceback.print_exc()
    
    async def handle_partial_payment(self, order_number: str, payment_id: str, payment_data: Dict):
        try:
            actually_paid = float(payment_data.get("actually_paid", 0))
            expected = float(payment_data.get("pay_amount", 0))
            
            await self.db.orders.update_one(
                {"order_number": order_number},
                {
                    "$set": {
                        "payment.status": "partial",
                        "payment.actually_paid": actually_paid,
                        "payment.note": f"Partial payment: {actually_paid}/{expected}",
                        "payment.latest_status": "partially_paid"
                    }
                }
            )
            
            logger.info(f"Order {order_number} partial payment: {actually_paid}/{expected}")
                
        except Exception as e:
            logger.error(f"Error handling partial payment: {e}")
    
    async def handle_expired_payment(self, order_number: str, payment_id: str):
        try:
            await self.db.orders.update_one(
                {"order_number": order_number},
                {
                    "$set": {
                        "payment.status": "expired",
                        "status": "cancelled",
                        "payment.latest_status": "expired"
                    }
                }
            )
            
            logger.info(f"Order {order_number} payment expired")
        except Exception as e:
            logger.error(f"Error handling expired payment: {e}")
    
    async def handle_failed_payment(self, order_number: str, payment_id: str):
        try:
            await self.db.orders.update_one(
                {"order_number": order_number},
                {
                    "$set": {
                        "payment.status": "failed",
                        "status": "cancelled",
                        "payment.latest_status": "failed"
                    }
                }
            )
            
            logger.info(f"Order {order_number} payment failed")
        except Exception as e:
            logger.error(f"Error handling failed payment: {e}")


payment_gateway = None

def initialize_payment_gateway(api_key: str, ipn_secret: str, sandbox: bool = False):
    global payment_gateway
    payment_gateway = NOWPaymentsGateway(api_key, ipn_secret, sandbox)
    logger.info(f"NOWPayments gateway initialized (sandbox={sandbox})")
    return payment_gateway