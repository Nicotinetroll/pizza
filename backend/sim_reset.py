# reset_test_data.py
"""
AnabolicPizza Shop - Reset Test Data Script
Vymaže všetky testové dáta, zachová produkty a kategórie
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

async def show_current_stats():
    """Ukáž aktuálne štatistiky"""
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client.telegram_shop
    
    print("\n📊 AKTUÁLNY STAV DATABÁZY:")
    print("-" * 40)
    
    stats = {
        "Objednávky": await db.orders.count_documents({}),
        "Používatelia": await db.users.count_documents({}),
        "Predajcovia": await db.sellers.count_documents({}),
        "Kupóny": await db.referral_codes.count_documents({}),
        "Výplaty": await db.seller_payouts.count_documents({}),
        "Produkty": await db.products.count_documents({}),
        "Kategórie": await db.categories.count_documents({})
    }
    
    for name, count in stats.items():
        status = "✅" if count > 0 else "⚪"
        print(f"{status} {name:15s}: {count:,}")
    
    # Tržby
    pipeline = [
        {"$match": {"status": {"$in": ["paid", "completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_usdt"}}}
    ]
    revenue = await db.orders.aggregate(pipeline).to_list(1)
    if revenue:
        print(f"\n💰 Celkové tržby: ${revenue[0]['total']:,.2f}")
    
    client.close()
    return stats

async def reset_data(keep_products=True):
    """Resetuj testové dáta"""
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client.telegram_shop
    
    print("\n🧹 MAZANIE DÁT...")
    print("-" * 40)
    
    # Vymaž dáta
    deleted = {}
    
    # Objednávky
    result = await db.orders.delete_many({})
    deleted["Objednávky"] = result.deleted_count
    print(f"❌ Vymazaných {result.deleted_count} objednávok")
    
    # Používatelia
    result = await db.users.delete_many({})
    deleted["Používatelia"] = result.deleted_count
    print(f"❌ Vymazaných {result.deleted_count} používateľov")
    
    # Predajcovia
    result = await db.sellers.delete_many({})
    deleted["Predajcovia"] = result.deleted_count
    print(f"❌ Vymazaných {result.deleted_count} predajcov")
    
    # Kupóny
    result = await db.referral_codes.delete_many({})
    deleted["Kupóny"] = result.deleted_count
    print(f"❌ Vymazaných {result.deleted_count} kupónov")
    
    # Výplaty
    result = await db.seller_payouts.delete_many({})
    deleted["Výplaty"] = result.deleted_count
    print(f"❌ Vymazaných {result.deleted_count} výplat")
    
    # Chat správy (voliteľné)
    result = await db.chat_messages.delete_many({})
    if result.deleted_count > 0:
        print(f"❌ Vymazaných {result.deleted_count} chat správ")
    
    # Support tickets (voliteľné)
    result = await db.support_tickets.delete_many({})
    if result.deleted_count > 0:
        print(f"❌ Vymazaných {result.deleted_count} support ticketov")
    
    if keep_products:
        # Reset sold_count pre produkty
        result = await db.products.update_many({}, {"$set": {"sold_count": 0}})
        print(f"↻ Resetovaných {result.modified_count} produktov (sold_count = 0)")
        print("✅ Produkty a kategórie zachované")
    else:
        # Vymaž aj produkty a kategórie
        prod_result = await db.products.delete_many({})
        cat_result = await db.categories.delete_many({})
        print(f"❌ Vymazaných {prod_result.deleted_count} produktov")
        print(f"❌ Vymazaných {cat_result.deleted_count} kategórií")
    
    client.close()
    return deleted

async def main():
    """Hlavný program"""
    print("="*60)
    print("🔄 ANABOLICPIZZA - RESET TESTOVÝCH DÁT")
    print("="*60)
    
    # Ukáž aktuálny stav
    stats = await show_current_stats()
    
    # Ak nie sú žiadne dáta
    if all(count == 0 for name, count in stats.items() if name not in ["Produkty", "Kategórie"]):
        print("\n✨ Databáza je už prázdna!")
        return
    
    # Ponúkni možnosti
    print("\n🎯 MOŽNOSTI:")
    print("-" * 40)
    print("1. Vymazať všetky testové dáta (zachovať produkty)")
    print("2. Vymazať VŠETKO vrátane produktov")
    print("3. Zrušiť")
    
    choice = input("\nVyber možnosť (1-3): ").strip()
    
    if choice == "1":
        print("\n⚠️  TOTO VYMAŽE:")
        print("  • Všetky objednávky")
        print("  • Všetkých používateľov")
        print("  • Všetkých predajcov a kupóny")
        print("  • Všetky výplaty")
        print("\n✅ TOTO ZACHOVÁ:")
        print("  • Produkty")
        print("  • Kategórie")
        
        confirm = input("\nNaozaj vymazať? (yes/no): ").strip().lower()
        
        if confirm == "yes":
            await reset_data(keep_products=True)
            print("\n✅ Reset dokončený!")
        else:
            print("\n❌ Zrušené")
            
    elif choice == "2":
        print("\n⚠️  POZOR! TOTO VYMAŽE ÚPLNE VŠETKO!")
        print("  Vrátane produktov a kategórií!")
        
        confirm = input("\nNaozaj vymazať VŠETKO? Napíš 'DELETE ALL': ").strip()
        
        if confirm == "DELETE ALL":
            await reset_data(keep_products=False)
            print("\n✅ Kompletný reset dokončený!")
            print("⚠️  Nezabudni znova pridať produkty a kategórie!")
        else:
            print("\n❌ Zrušené")
            
    else:
        print("\n❌ Zrušené")
    
    # Ukáž finálny stav
    print("\n" + "="*60)
    await show_current_stats()

if __name__ == "__main__":
    asyncio.run(main())
