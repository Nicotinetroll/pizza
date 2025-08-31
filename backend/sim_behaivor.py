# configurable_test_generator.py
"""
AnabolicPizza Shop - Konfigurovateľný Test Data Generator
Nastav si všetky parametre podľa potreby
"""

import asyncio
import random
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

# ==============================================================================
# 🎮 KONFIGURÁCIA 
# ==============================================================================

CONFIG = {
    # Časové nastavenia
    "SIMULATION_MODE": "last_x_days",  # Možnosti: "last_x_days", "current_month", "last_month", "custom_range"
    "SIMULATION_DAYS": 60,             # Pre "last_x_days" mode
    
    # Pre "custom_range" mode:
    "CUSTOM_START_DATE": "2025-07-01",
    "CUSTOM_END_DATE": "2025-08-31",
    
    # Objednávky
    "ORDERS_PER_DAY_MIN": 5,         # Minimum objednávok za deň
    "ORDERS_PER_DAY_MAX": 25,        # Maximum objednávok za deň
    "WEEKEND_MULTIPLIER": 1.3,       # O koľko viac objednávok cez víkend
    
    # Používatelia
    "TOTAL_USERS": 133,              # Koľko používateľov vytvoriť
    "VIP_USER_PERCENTAGE": 0.15,     # % VIP používateľov (0.15 = 15%)
    "VIP_DISCOUNT_MIN": 10,          # Min VIP zľava %
    "VIP_DISCOUNT_MAX": 25,          # Max VIP zľava %
    
    # Predajcovia a kupóny
    "NUMBER_OF_SELLERS": 2,          # Koľko predajcov
    "CODES_PER_SELLER": 1,           # Koľko kupónov na predajcu
    "SELLER_COMMISSION_MIN": 20,     # Min provízia %
    "SELLER_COMMISSION_MAX": 35,     # Max provízia %
    "REFERRAL_USAGE_RATE": 0.35,     # % objednávok s kupónom (0.35 = 35%)
    "DISCOUNT_VALUES": [5, 10, 15, 20],  # Možné hodnoty zliav
    
    # Objednávky detaily
    "ITEMS_PER_ORDER_MIN": 1,        # Min produktov v objednávke
    "ITEMS_PER_ORDER_MAX": 5,        # Max produktov v objednávke
    "QUANTITY_PER_ITEM_MAX": 3,      # Max kusov jedného produktu
    
    # Platby a stavy
    "ORDER_STATUS_WEIGHTS": {
        "completed": 0.70,    # 70% dokončených
        "paid": 0.15,         # 15% zaplatených
        "processing": 0.08,   # 8% spracovávaných
        "pending": 0.05,      # 5% čakajúcich
        "cancelled": 0.02     # 2% zrušených
    },
    
    "PAYMENT_METHODS": {
        "BTC": 0.35,          # 35% Bitcoin
        "ETH": 0.25,          # 25% Ethereum
        "USDT": 0.30,         # 30% USDT
        "SOL": 0.10           # 10% Solana
    },
    
    # Seller payouts
    "GENERATE_PAYOUTS": True,        # Či generovať výplaty pre sellers
    "PAYOUT_PERCENTAGE": 0.7,        # Koľko % z earnings vyplatiť (0.7 = 70%)
}

# Dátové pooly pre generovanie
DATA_POOLS = {
    "FIRST_NAMES": [
        "Martin", "Peter", "Jozef", "Jan", "Tomas", "Michal", "Lukas", "Marek",
        "Pavel", "Jakub", "Adam", "Daniel", "Filip", "Robert", "Stefan",
        "Anna", "Maria", "Eva", "Katarina", "Lucia", "Petra", "Jana", "Monika",
        "Vladimir", "Igor", "Boris", "Roman", "Patrik", "Erik", "David"
    ],
    
    "LAST_NAMES": [
        "Novak", "Horvath", "Kovac", "Varga", "Nagy", "Toth", "Szabo", "Kiss",
        "Molnar", "Nemeth", "Farkas", "Balogh", "Papp", "Lakatos", "Juhasz"
    ],
    
    "CITIES": [
        "Bratislava", "Kosice", "Presov", "Zilina", "Nitra", "Banska Bystrica",
        "Trnava", "Martin", "Trencin", "Poprad", "Prievidza", "Zvolen",
        "Praha", "Brno", "Budapest", "Vienna", "Krakow", "Warsaw"
    ],
    
    "USERNAMES": [
        "fitness_king", "gym_warrior", "protein_lover", "muscle_builder", "beast_mode",
        "iron_addict", "pump_master", "gains_bro", "lift_heavy", "no_pain_no_gain"
    ],
    
    "SELLER_NAMES": [
        "FitLife Influencer", "GymShark Ambassador", "Bodybuilding Coach",
        "Fitness YouTuber", "Instagram Athlete", "TikTok Trainer",
        "Supplement Expert", "Personal Trainer", "Nutrition Guru", "Wellness Coach"
    ]
}

# ==============================================================================
# 🚀 GENERÁTOR - NEMUSÍŠ MENIŤ
# ==============================================================================

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
mongo_client = AsyncIOMotorClient(MONGODB_URI)
db = mongo_client.telegram_shop

async def clear_existing_data():
    """Vymaž existujúce testové dáta"""
    print("🧹 Mazanie existujúcich dát...")
    
    await db.orders.delete_many({})
    await db.users.delete_many({})
    await db.sellers.delete_many({})
    await db.referral_codes.delete_many({})
    await db.seller_payouts.delete_many({})
    await db.products.update_many({}, {"$set": {"sold_count": 0}})
    
    print("✅ Databáza vyčistená")

async def get_existing_products():
    """Načítaj existujúce produkty"""
    print("📦 Načítavam produkty z databázy...")
    
    products = await db.products.find({"is_active": True}).to_list(None)
    
    if not products:
        print("❌ Žiadne produkty v databáze! Pridaj najprv produkty.")
        return None
    
    print(f"✅ Nájdených {len(products)} aktívnych produktov")
    return products

async def create_sellers():
    """Vytvor predajcov s kupónmi"""
    print(f"👥 Vytváranie {CONFIG['NUMBER_OF_SELLERS']} predajcov...")
    
    sellers = []
    referral_codes = []
    
    for i in range(CONFIG['NUMBER_OF_SELLERS']):
        name = random.choice(DATA_POOLS['SELLER_NAMES']) + f" #{i+1}"
        username = f"seller_{secrets.token_hex(3)}"
        commission = random.randint(CONFIG['SELLER_COMMISSION_MIN'], CONFIG['SELLER_COMMISSION_MAX'])
        
        seller = {
            "_id": ObjectId(),
            "name": name,
            "telegram_username": username,
            "commission_percentage": commission,
            "is_active": True,
            "created_at": datetime.now(timezone.utc) - timedelta(days=90),
            "test_data": True
        }
        sellers.append(seller)
        await db.sellers.insert_one(seller)
        
        # Vytvor kupóny pre tohto predajcu
        for j in range(CONFIG['CODES_PER_SELLER']):
            code = f"{username.upper()[:4]}{secrets.token_hex(2).upper()}"
            
            referral = {
                "_id": ObjectId(),
                "code": code,
                "description": f"{name} - kupón #{j+1}",
                "discount_type": "percentage",
                "discount_value": random.choice(CONFIG['DISCOUNT_VALUES']),
                "seller_id": str(seller["_id"]),
                "seller_name": name,
                "commission_percentage": commission,
                "is_active": True,
                "used_count": 0,
                "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(30, 90)),
                "test_data": True
            }
            referral_codes.append(referral)
            await db.referral_codes.insert_one(referral)
    
    # Pridaj aj všeobecné kupóny (bez predajcu)
    general_codes = ["WELCOME10", "SAVE15", "BULK20", "FIRST", "VIP"]
    for code in general_codes:
        referral = {
            "_id": ObjectId(),
            "code": code,
            "description": f"Všeobecná zľava - {code}",
            "discount_type": "percentage",
            "discount_value": int(''.join(filter(str.isdigit, code))) if any(c.isdigit() for c in code) else 10,
            "is_active": True,
            "used_count": 0,
            "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(15, 60)),
            "test_data": True
        }
        referral_codes.append(referral)
        await db.referral_codes.insert_one(referral)
    
    print(f"✅ Vytvorených {len(sellers)} predajcov a {len(referral_codes)} kupónov")
    return sellers, referral_codes

async def create_users():
    """Vytvor používateľov"""
    print(f"👤 Vytváranie {CONFIG['TOTAL_USERS']} používateľov...")
    
    users = []
    start_date = datetime.now(timezone.utc) - timedelta(days=90)
    
    for i in range(CONFIG['TOTAL_USERS']):
        telegram_id = 100000000 + i
        
        first_name = random.choice(DATA_POOLS['FIRST_NAMES'])
        last_name = random.choice(DATA_POOLS['LAST_NAMES'])
        username = f"{random.choice(DATA_POOLS['USERNAMES'])}_{random.randint(1, 999)}"
        
        created_at = start_date + timedelta(days=random.randint(0, 90))
        
        # Určenie VIP statusu
        is_vip = random.random() < CONFIG['VIP_USER_PERCENTAGE']
        vip_discount = random.randint(CONFIG['VIP_DISCOUNT_MIN'], CONFIG['VIP_DISCOUNT_MAX']) if is_vip else 0
        
        user = {
            "_id": ObjectId(),
            "telegram_id": telegram_id,
            "username": username,
            "first_name": first_name,
            "last_name": last_name,
            "created_at": created_at,
            "last_active": datetime.now(timezone.utc),
            "total_orders": 0,
            "total_spent_usdt": 0,
            "status": "active",
            "referrals_used": [],
            "is_vip": is_vip,
            "vip_discount_percentage": vip_discount,
            "test_data": True
        }
        
        if is_vip:
            user["vip_since"] = created_at + timedelta(days=random.randint(7, 30))
        
        users.append(user)
        await db.users.insert_one(user)
    
    vip_count = sum(1 for u in users if u['is_vip'])
    print(f"✅ Vytvorených {len(users)} používateľov ({vip_count} VIP)")
    return users

async def generate_orders(users, products, referral_codes):
    """Generuj objednávky podľa zvoleného módu"""
    print(f"📦 Generovanie objednávok...")
    
    if not products:
        print("❌ Žiadne produkty!")
        return
    
    # Určenie časového rozsahu podľa módu
    if CONFIG["SIMULATION_MODE"] == "current_month":
        end_date = datetime.now(timezone.utc)
        start_date = end_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        simulation_days = (end_date - start_date).days + 1
        
    elif CONFIG["SIMULATION_MODE"] == "last_month":
        end_date = datetime.now(timezone.utc).replace(day=1) - timedelta(days=1)
        start_date = end_date.replace(day=1)
        simulation_days = (end_date - start_date).days + 1
        
    elif CONFIG["SIMULATION_MODE"] == "custom_range":
        start_date = datetime.fromisoformat(CONFIG["CUSTOM_START_DATE"]).replace(tzinfo=timezone.utc)
        end_date = datetime.fromisoformat(CONFIG["CUSTOM_END_DATE"]).replace(tzinfo=timezone.utc)
        simulation_days = (end_date - start_date).days + 1
        
    else:  # "last_x_days"
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=CONFIG['SIMULATION_DAYS'])
        simulation_days = CONFIG['SIMULATION_DAYS']
    
    print(f"📅 Obdobie: {start_date.strftime('%Y-%m-%d')} až {end_date.strftime('%Y-%m-%d')} ({simulation_days} dní)")
    
    total_orders = 0
    total_revenue = 0
    
    for day in range(simulation_days):
        current_date = start_date + timedelta(days=day)
        
        # Víkendový bonus
        is_weekend = current_date.weekday() >= 5
        base_orders = random.randint(CONFIG['ORDERS_PER_DAY_MIN'], CONFIG['ORDERS_PER_DAY_MAX'])
        if is_weekend:
            base_orders = int(base_orders * CONFIG['WEEKEND_MULTIPLIER'])
        
        daily_revenue = 0
        
        for _ in range(base_orders):
            user = random.choice(users)
            
            # Preskočiť ak používateľ ešte neexistoval
            if user["created_at"] > current_date:
                continue
            
            # Časová značka objednávky
            order_time = current_date + timedelta(
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )
            
            # Počet položiek
            num_items = random.randint(CONFIG['ITEMS_PER_ORDER_MIN'], CONFIG['ITEMS_PER_ORDER_MAX'])
            selected_products = random.sample(products, min(num_items, len(products)))
            
            # Vytvor položky objednávky
            items = []
            subtotal = 0
            
            for product in selected_products:
                quantity = random.randint(1, CONFIG['QUANTITY_PER_ITEM_MAX'])
                price = product["price_usdt"]
                
                # VIP zľava
                if user["is_vip"] and user["vip_discount_percentage"] > 0:
                    price = price * (1 - user["vip_discount_percentage"] / 100)
                
                item = {
                    "product_id": str(product["_id"]),
                    "product_name": product["name"],
                    "quantity": quantity,
                    "price_usdt": price,
                    "subtotal_usdt": price * quantity
                }
                items.append(item)
                subtotal += item["subtotal_usdt"]
            
            # Použitie kupónu
            referral_code = None
            discount_amount = 0
            
            if random.random() < CONFIG['REFERRAL_USAGE_RATE'] and referral_codes:
                referral = random.choice(referral_codes)
                referral_code = referral["code"]
                
                if referral["discount_type"] == "percentage":
                    discount_amount = subtotal * (referral["discount_value"] / 100)
                else:
                    discount_amount = min(referral["discount_value"], subtotal)
            
            total = max(0, subtotal - discount_amount)
            
            # Platobná metóda a status
            payment_method = random.choices(
                list(CONFIG['PAYMENT_METHODS'].keys()),
                list(CONFIG['PAYMENT_METHODS'].values())
            )[0]
            
            status = random.choices(
                list(CONFIG['ORDER_STATUS_WEIGHTS'].keys()),
                list(CONFIG['ORDER_STATUS_WEIGHTS'].values())
            )[0]
            
            # Vytvor objednávku
            order = {
                "_id": ObjectId(),
                "order_number": f"APZ-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}",
                "user_id": str(user["_id"]),
                "telegram_id": user["telegram_id"],
                "items": items,
                "total_usdt": total,
                "delivery_city": random.choice(DATA_POOLS['CITIES']),
                "payment": {
                    "method": payment_method,
                    "address": f"{payment_method.lower()}_address_{secrets.token_hex(16)}",
                    "amount_usdt": total,
                    "status": "confirmed" if status in ["completed", "paid", "processing"] else "pending",
                    "transaction_id": secrets.token_hex(32) if status != "pending" else None
                },
                "status": status,
                "created_at": order_time,
                "test_data": True
            }
            
            if referral_code:
                order["referral_code"] = referral_code
                order["discount_amount"] = discount_amount
            
            if user["is_vip"]:
                order["vip_discount_applied"] = True
                order["vip_discount_percentage"] = user["vip_discount_percentage"]
            
            if status in ["completed", "paid", "processing"]:
                order["paid_at"] = order_time + timedelta(minutes=random.randint(5, 60))
            
            await db.orders.insert_one(order)
            
            total_orders += 1
            daily_revenue += total if status in ["completed", "paid", "processing"] else 0
        
        print(f"  Deň {day + 1:2d} ({current_date.strftime('%Y-%m-%d')}): {base_orders:2d} objednávok, ${daily_revenue:.2f}")
        total_revenue += daily_revenue
    
    # Aktualizuj štatistiky
    await update_statistics()
    
    print(f"\n✅ Vygenerovaných {total_orders} objednávok")
    print(f"💰 Celkové tržby: ${total_revenue:,.2f}")
    if total_orders > 0:
        print(f"💵 Priemerná objednávka: ${total_revenue/total_orders:.2f}")

async def update_statistics():
    """Aktualizuj štatistiky používateľov a produktov"""
    print("📊 Aktualizácia štatistík...")
    
    # Aktualizuj používateľov
    users = await db.users.find({"test_data": True}).to_list(None)
    for user in users:
        orders = await db.orders.find({
            "telegram_id": user["telegram_id"],
            "status": {"$in": ["paid", "completed", "processing"]}
        }).to_list(None)
        
        total_spent = sum(order.get("total_usdt", 0) for order in orders)
        
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "total_orders": len(orders),
                "total_spent_usdt": total_spent
            }}
        )
    
    # Aktualizuj produkty
    products = await db.products.find({}).to_list(None)
    for product in products:
        sold_count = 0
        
        orders = await db.orders.find({
            "items.product_name": product["name"],
            "status": {"$in": ["paid", "completed", "processing"]}
        }).to_list(None)
        
        for order in orders:
            for item in order.get("items", []):
                if item.get("product_name") == product["name"]:
                    sold_count += item.get("quantity", 1)
        
        await db.products.update_one(
            {"_id": product["_id"]},
            {"$set": {"sold_count": sold_count}}
        )

async def generate_payouts(sellers):
    """Generuj výplaty pre predajcov"""
    if not CONFIG['GENERATE_PAYOUTS']:
        return
    
    print("💸 Generovanie výplat pre predajcov...")
    
    for seller in sellers:
        # Spočítaj earnings
        referral_codes = await db.referral_codes.find({"seller_id": str(seller["_id"])}).to_list(None)
        total_commission = 0
        
        for code in referral_codes:
            orders = await db.orders.find({
                "referral_code": code["code"],
                "status": {"$in": ["paid", "completed"]}
            }).to_list(None)
            
            for order in orders:
                # Zjednodušený výpočet provízie
                order_revenue = order.get("total_usdt", 0)
                estimated_profit = order_revenue * 0.4  # Predpokladaj 40% maržu
                commission = estimated_profit * (seller["commission_percentage"] / 100)
                total_commission += commission
        
        if total_commission > 0:
            # Vytvor výplatu
            payout_amount = total_commission * CONFIG['PAYOUT_PERCENTAGE']
            
            payout = {
                "_id": ObjectId(),
                "seller_id": str(seller["_id"]),
                "seller_name": seller["name"],
                "amount": round(payout_amount, 2),
                "payment_method": "USDT",
                "transaction_id": f"TXN-{secrets.token_hex(8).upper()}",
                "status": "completed",
                "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(5, 25)),
                "test_data": True
            }
            
            await db.seller_payouts.insert_one(payout)
            print(f"  💰 {seller['name']}: ${payout_amount:.2f} vyplatených")

async def print_summary():
    """Vytlač súhrn"""
    print("\n" + "="*60)
    print("📊 SÚHRN VYGENEROVANÝCH DÁT")
    print("="*60)
    
    counts = {
        "Používatelia": await db.users.count_documents({}),
        "Objednávky": await db.orders.count_documents({}),
        "Predajcovia": await db.sellers.count_documents({}),
        "Kupóny": await db.referral_codes.count_documents({}),
        "Výplaty": await db.seller_payouts.count_documents({}),
    }
    
    for name, count in counts.items():
        print(f"{name:15s}: {count:,}")
    
    # Štatistiky objednávok
    pipeline = [
        {"$match": {"status": {"$in": ["paid", "completed"]}}},
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": "$total_usdt"},
            "avg_order": {"$avg": "$total_usdt"},
            "count": {"$sum": 1}
        }}
    ]
    
    stats = await db.orders.aggregate(pipeline).to_list(1)
    if stats:
        stat = stats[0]
        print(f"\n💰 Tržby: ${stat['total_revenue']:,.2f}")
        print(f"📊 Priemerná objednávka: ${stat['avg_order']:.2f}")
        print(f"✅ Dokončených objednávok: {stat['count']:,}")
    
    print("\n✅ Generovanie testových dát dokončené!")

async def main():
    """Hlavná funkcia"""
    print("🚀 AnabolicPizza - Konfigurovateľný Test Data Generator")
    print("="*60)
    print("📋 Aktuálna konfigurácia:")
    print(f"  • Mód: {CONFIG['SIMULATION_MODE']}")
    if CONFIG['SIMULATION_MODE'] == 'last_x_days':
        print(f"  • {CONFIG['SIMULATION_DAYS']} dní simulácie")
    print(f"  • {CONFIG['ORDERS_PER_DAY_MIN']}-{CONFIG['ORDERS_PER_DAY_MAX']} objednávok/deň")
    print(f"  • {CONFIG['TOTAL_USERS']} používateľov ({int(CONFIG['VIP_USER_PERCENTAGE']*100)}% VIP)")
    print(f"  • {CONFIG['NUMBER_OF_SELLERS']} predajcov")
    print(f"  • {int(CONFIG['REFERRAL_USAGE_RATE']*100)}% objednávok s kupónom")
    print("="*60)
    
    try:
        # Vyčisti existujúce dáta
        await clear_existing_data()
        
        # Načítaj produkty
        products = await get_existing_products()
        if not products:
            print("❌ Nemôžem pokračovať bez produktov!")
            return
        
        # Generuj dáta
        sellers, referral_codes = await create_sellers()
        users = await create_users()
        await generate_orders(users, products, referral_codes)
        
        if CONFIG['GENERATE_PAYOUTS']:
            await generate_payouts(sellers)
        
        # Súhrn
        await print_summary()
        
    except Exception as e:
        print(f"❌ Chyba: {e}")
        import traceback
        traceback.print_exc()
    finally:
        mongo_client.close()

if __name__ == "__main__":
    asyncio.run(main())
