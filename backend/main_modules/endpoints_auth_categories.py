# AUTH AND CATEGORIES ENDPOINTS

from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

from .config import db, ADMIN_EMAIL, ADMIN_PASSWORD
from .models import LoginModel, CategoryModel
from .helpers import create_token, verify_token

router_auth_categories = APIRouter()

# ==================== AUTH ENDPOINTS ====================

@router_auth_categories.post("/api/auth/login")
async def login(login_data: LoginModel):
    if login_data.email == ADMIN_EMAIL and login_data.password == ADMIN_PASSWORD:
        token = create_token(login_data.email)
        return {
            "token": token,
            "expires_in": 86400,
            "user": {"email": login_data.email, "role": "admin"}
        }
    raise HTTPException(status_code=401, detail="Invalid credentials")

# ==================== CATEGORY ENDPOINTS ====================

@router_auth_categories.get("/api/categories")
async def get_categories(skip: int = 0, limit: int = 100):
    categories = await db.categories.find({}).sort("order", 1).skip(skip).limit(limit).to_list(limit)
    
    for category in categories:
        category["_id"] = str(category["_id"])
        category["product_count"] = await db.products.count_documents({
            "category_id": ObjectId(category["_id"]),
            "is_active": True
        })
    
    total = await db.categories.count_documents({})
    return {"categories": categories, "total": total}

@router_auth_categories.post("/api/categories")
async def create_category(category: CategoryModel, email: str = Depends(verify_token)):
    existing = await db.categories.find_one({"name": category.name})
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")
    
    category_dict = category.model_dump()
    category_dict["created_at"] = datetime.now(timezone.utc)
    
    result = await db.categories.insert_one(category_dict)
    return {"id": str(result.inserted_id), "message": "Category created"}

@router_auth_categories.put("/api/categories/{category_id}")
async def update_category(category_id: str, category: CategoryModel, email: str = Depends(verify_token)):
    category_dict = category.model_dump()
    category_dict["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.categories.update_one(
        {"_id": ObjectId(category_id)},
        {"$set": category_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category updated"}

@router_auth_categories.delete("/api/categories/{category_id}")
async def delete_category(category_id: str, email: str = Depends(verify_token)):
    product_count = await db.products.count_documents({"category_id": ObjectId(category_id)})
    if product_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {product_count} products")
    
    result = await db.categories.delete_one({"_id": ObjectId(category_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted"}
