"""
NOWPayments Integration for AnabolicPizza Bot
Complete payment gateway implementation
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

logger = logging.getLogger(__name__)


class NOWPaymentsGateway:
    """NOWPayments API integration handler"""
    
    def __init__(self, api_key: str, ipn_secret: str, sandbox: bool = False):
        self.api_key = api_key
        self.ipn_secret = ipn_secret
        self.sandbox = sandbox
        
        # API endpoints
        if sandbox:
            self.base_url = "https://api-sandbox.nowpayments.io/v1"
        else:
            self.base_url = "https://api.nowpayments.io/v1"
        
        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        # Supported currencies
        self.supported_currencies = {
            "BTC": "btc",
            "ETH": "eth", 
            "SOL": "sol",
            "USDT": "usdttrc20"  # TRC20 for lower fees
        }
        
        # Database connection
        from bot_modules.config import MONGODB_URI
        self.mongo_client = AsyncIOMotorClient(MONGODB_URI)
        self.db = self.mongo_client.telegram_shop
    
    async def get_available_currencies(self) -> List[Dict]:
        """Get list of available currencies from NOWPayments"""
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
        """Get minimum payment amount for a currency pair"""
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
                        return 10  # Default minimum
        except Exception as e:
            logger.error(f"Error fetching minimum amount: {e}")
            return 10
    
    async def get_estimated_price(self, amount_usd: float, currency: str) -> Dict:
        """Get estimated price in crypto for USD amount"""
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
                        # Fallback to manual calculation
                        rates = {"BTC": 65000, "ETH": 3500, "SOL": 150, "USDT": 1}
                        estimated = amount_usd / rates.get(currency.upper(), 1)
                        return {
                            "estimated_amount": estimated,
                            "currency": currency.upper()
                        }
        except Exception as e:
            logger.error(f"Error getting estimate: {e}")
            # Fallback calculation
            rates = {"BTC": 65000, "ETH": 3500, "SOL": 150, "USDT": 1}
            estimated = amount_usd / rates.get(currency.upper(), 1)
            return {
                "estimated_amount": estimated,
                "currency": currency.upper()
            }
    
    async def create_payment(self, order_data: Dict) -> Dict:
        """
        Create a payment request in NOWPayments
        
        Args:
            order_data: {
                "order_id": str,
                "order_number": str,
                "amount_usd": float,
                "currency": str (BTC/ETH/SOL/USDT),
                "telegram_id": int,
                "description": str (optional)
            }
        
        Returns:
            {
                "payment_id": str,
                "payment_status": str,
                "pay_address": str,
                "pay_amount": float,
                "pay_currency": str,
                "expiry_time": datetime,
                "payment_url": str (optional)
            }
        """
        try:
            # Convert currency code
            currency_code = self.supported_currencies.get(
                order_data["currency"].upper(), 
                order_data["currency"].lower()
            )
            
            # Prepare payment data
            payment_data = {
                "price_amount": order_data["amount_usd"],
                "price_currency": "usd",
                "pay_currency": currency_code,
                "order_id": order_data["order_number"],
                "order_description": order_data.get("description", f"Order {order_data['order_number']}"),
                "ipn_callback_url": "https://yourdomain.com/api/payments/webhook",
                "is_fixed_rate": True,  # Fixed rate to avoid price fluctuations
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
                        
                        # Save payment info to database
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
                            "expiry_estimate": data.get("expiry_estimate_date")
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
                            "payment_url": data.get("invoice_url")  # For invoice-based payments
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
        """Check the status of a payment"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/payment/{payment_id}",
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Update local record
                        await self.db.payment_records.update_one(
                            {"payment_id": payment_id},
                            {
                                "$set": {
                                    "payment_status": data["payment_status"],
                                    "actually_paid": float(data.get("actually_paid", 0)),
                                    "updated_at": datetime.utcnow()
                                }
                            }
                        )
                        
                        return {
                            "payment_id": payment_id,
                            "payment_status": data["payment_status"],
                            "actually_paid": float(data.get("actually_paid", 0)),
                            "pay_amount": float(data.get("pay_amount", 0)),
                            "outcome_amount": float(data.get("outcome_amount", 0)),
                            "outcome_currency": data.get("outcome_currency", "USD")
                        }
                    else:
                        logger.error(f"Failed to check payment status: {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Error checking payment status: {e}")
            return None
    
    async def verify_ipn_signature(self, signature: str, payload: bytes) -> bool:
        """Verify IPN webhook signature from NOWPayments"""
        if not self.ipn_secret:
            logger.warning("IPN secret not configured - skipping signature verification")
            return True
        
        try:
            # NOWPayments uses HMAC-SHA512 for IPN signatures
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
        """
        Process IPN callback from NOWPayments
        
        Webhook payload includes:
        - payment_id
        - payment_status
        - pay_address
        - price_amount
        - price_currency
        - pay_amount
        - actually_paid
        - pay_currency
        - order_id
        - order_description
        - outcome_amount
        - outcome_currency
        """
        try:
            payment_id = payload.get("payment_id")
            payment_status = payload.get("payment_status")
            order_id = payload.get("order_id")  # This is order_number
            
            logger.info(f"Processing IPN for payment {payment_id}: status={payment_status}")
            
            # Update payment record
            await self.db.payment_records.update_one(
                {"payment_id": payment_id},
                {
                    "$set": {
                        "payment_status": payment_status,
                        "actually_paid": float(payload.get("actually_paid", 0)),
                        "outcome_amount": float(payload.get("outcome_amount", 0)),
                        "outcome_currency": payload.get("outcome_currency"),
                        "updated_at": datetime.utcnow(),
                        "ipn_data": payload
                    }
                }
            )
            
            # Handle different payment statuses
            if payment_status == "finished":
                # Payment confirmed - update order
                await self._confirm_order_payment(order_id, payment_id, payload)
                
            elif payment_status == "partially_paid":
                # Partial payment received
                await self._handle_partial_payment(order_id, payment_id, payload)
                
            elif payment_status == "expired":
                # Payment expired
                await self._handle_expired_payment(order_id, payment_id)
                
            elif payment_status == "failed":
                # Payment failed
                await self._handle_failed_payment(order_id, payment_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing IPN callback: {e}")
            return False
    
    async def _confirm_order_payment(self, order_number: str, payment_id: str, payment_data: Dict):
        """Confirm order payment in database"""
        try:
            # Find order by order_number
            order = await self.db.orders.find_one({"order_number": order_number})
            if not order:
                logger.error(f"Order not found: {order_number}")
                return
            
            # Update order status
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
                        "payment.outcome_currency": payment_data.get("outcome_currency")
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
            
            # Send notification to user
            await self._notify_user_payment_confirmed(order["telegram_id"], order_number)
            
            # Send public notification
            from bot_modules.public_notifications import public_notifier
            asyncio.create_task(public_notifier.send_notification(order))
            
            logger.info(f"Order {order_number} payment confirmed")
            
        except Exception as e:
            logger.error(f"Error confirming order payment: {e}")
    
    async def _handle_partial_payment(self, order_number: str, payment_id: str, payment_data: Dict):
        """Handle partial payment"""
        try:
            actually_paid = float(payment_data.get("actually_paid", 0))
            expected = float(payment_data.get("pay_amount", 0))
            
            await self.db.orders.update_one(
                {"order_number": order_number},
                {
                    "$set": {
                        "payment.status": "partial",
                        "payment.actually_paid": actually_paid,
                        "payment.note": f"Partial payment: {actually_paid}/{expected}"
                    }
                }
            )
            
            # Notify user about partial payment
            order = await self.db.orders.find_one({"order_number": order_number})
            if order:
                await self._notify_user_partial_payment(
                    order["telegram_id"], 
                    order_number, 
                    actually_paid, 
                    expected
                )
                
        except Exception as e:
            logger.error(f"Error handling partial payment: {e}")
    
    async def _handle_expired_payment(self, order_number: str, payment_id: str):
        """Handle expired payment"""
        try:
            await self.db.orders.update_one(
                {"order_number": order_number},
                {
                    "$set": {
                        "payment.status": "expired",
                        "status": "cancelled"
                    }
                }
            )
            logger.info(f"Order {order_number} payment expired")
        except Exception as e:
            logger.error(f"Error handling expired payment: {e}")
    
    async def _handle_failed_payment(self, order_number: str, payment_id: str):
        """Handle failed payment"""
        try:
            await self.db.orders.update_one(
                {"order_number": order_number},
                {
                    "$set": {
                        "payment.status": "failed",
                        "status": "cancelled"
                    }
                }
            )
            logger.info(f"Order {order_number} payment failed")
        except Exception as e:
            logger.error(f"Error handling failed payment: {e}")
    
    async def _notify_user_payment_confirmed(self, telegram_id: int, order_number: str):
        """Send payment confirmation to user via Telegram"""
        try:
            from bot_modules.public_notifications import public_notifier
            bot = public_notifier.bot
            
            message = f"""
✅ *PAYMENT CONFIRMED!*

Order: `{order_number}`

Your payment has been confirmed! 🎉

Your package will be shipped within 24 hours.
You'll receive tracking information soon.

Thank you for your order! 💪
"""
            await bot.send_message(
                chat_id=telegram_id,
                text=message,
                parse_mode='Markdown'
            )
            
        except Exception as e:
            logger.error(f"Error notifying user: {e}")
    
    async def _notify_user_partial_payment(self, telegram_id: int, order_number: str, paid: float, expected: float):
        """Notify user about partial payment"""
        try:
            from bot_modules.public_notifications import public_notifier
            bot = public_notifier.bot
            
            remaining = expected - paid
            
            message = f"""
⚠️ *PARTIAL PAYMENT RECEIVED*

Order: `{order_number}`

Received: {paid:.8f}
Expected: {expected:.8f}
Remaining: {remaining:.8f}

Please send the remaining amount to complete your order.
The payment address remains the same.
"""
            await bot.send_message(
                chat_id=telegram_id,
                text=message,
                parse_mode='Markdown'
            )
            
        except Exception as e:
            logger.error(f"Error notifying user about partial payment: {e}")


# Global payment gateway instance
payment_gateway = None

def initialize_payment_gateway(api_key: str, ipn_secret: str, sandbox: bool = False):
    """Initialize the payment gateway with credentials"""
    global payment_gateway
    payment_gateway = NOWPaymentsGateway(api_key, ipn_secret, sandbox)
    logger.info(f"NOWPayments gateway initialized (sandbox={sandbox})")
    return payment_gateway
