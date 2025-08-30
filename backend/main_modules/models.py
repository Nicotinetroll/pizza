from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class LoginModel(BaseModel):
    email: str
    password: str

class CategoryModel(BaseModel):
    name: str
    emoji: str = "📦"
    description: str
    order: int = 1
    is_active: bool = True

class ProductModel(BaseModel):
    name: str
    description: str
    price_usdt: float
    purchase_price_usdt: float
    category_id: Optional[str] = None
    stock_quantity: int = 999
    is_active: bool = True

class ReferralCodeModel(BaseModel):
    code: str
    description: str
    discount_type: str
    discount_value: float
    usage_limit: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: bool = True

class OrderStatusModel(BaseModel):
    status: str
    notes: Optional[str] = None

class VIPUpdateModel(BaseModel):
    is_vip: bool
    vip_discount_percentage: float = 0
    vip_expires: Optional[datetime] = None
    vip_notes: Optional[str] = None

class NotificationSettingsModel(BaseModel):
    enabled: bool = False
    channel_id: Optional[str] = None
    delay_min: int = 60
    delay_max: int = 300
    show_exact_amount: bool = False
    fake_orders_enabled: bool = False
    fake_orders_per_hour: int = 2

class MessageTemplateModel(BaseModel):
    text: str
    type: str = "normal"
    enabled: bool = True

class AssignSellerModel(BaseModel):
    seller_id: str
    
class BotMessageModel(BaseModel):
    key: str
    message: str
    category: str
    enabled: bool = True
    variables: Optional[List[str]] = None

class BotCommandModel(BaseModel):
    command: str
    description: str
    response: str
    aliases: Optional[List[str]] = None
    enabled: bool = True
    private_only: bool = True
    group_redirect: bool = True

class BotSettingsModel(BaseModel):
    bot_name: str = "AnabolicPizza Bot"
    welcome_delay: int = 0
    typing_delay: int = 1
    max_cart_items: int = 50
    session_timeout: int = 3600
    maintenance_mode: bool = False
    maintenance_message: str = "Bot is under maintenance. Please try again later."

class SellerModel(BaseModel):
    name: str
    telegram_username: str
    commission_percentage: float = 30.0
    is_active: bool = True
    payout_address: Optional[str] = None
    notes: Optional[str] = None

class PayoutModel(BaseModel):
    amount: float
    payment_method: str = "USDT"
    transaction_id: Optional[str] = None
    notes: Optional[str] = None

class ChatMessageModel(BaseModel):
    telegram_id: int
    message: str
    attachments: Optional[List[str]] = None

class ChatStatusModel(BaseModel):
    telegram_id: int
    status: str

class NotificationMediaModel(BaseModel):
    filename: str
    url: str
    type: str
    enabled: bool = True
    created_at: Optional[datetime] = None
