"""
Shopping cart management
"""
from typing import Dict, Optional

class CartManager:
    """Manage user shopping carts"""
    
    def __init__(self):
        self.user_carts: Dict[int, Dict] = {}
        self.user_quantities: Dict[int, Dict] = {}
    
    def get_cart(self, user_id: int) -> Dict:
        """Get user cart"""
        return self.user_carts.get(user_id, {})
    
    def add_to_cart(self, user_id: int, product_id: str, product_data: dict, quantity: int) -> None:
        """Add product to cart"""
        if user_id not in self.user_carts:
            self.user_carts[user_id] = {}
        
        if product_id in self.user_carts[user_id]:
            self.user_carts[user_id][product_id]['quantity'] += quantity
        else:
            self.user_carts[user_id][product_id] = {
                'name': product_data['name'],
                'price': float(product_data['price_usdt']),
                'quantity': quantity
            }
    
    def clear_cart(self, user_id: int) -> None:
        """Clear user cart"""
        if user_id in self.user_carts:
            self.user_carts[user_id] = {}
    
    def get_cart_total(self, user_id: int) -> float:
        """Calculate cart total"""
        cart = self.get_cart(user_id)
        return sum(item['price'] * item['quantity'] for item in cart.values())
    
    def get_quantity(self, user_id: int, product_id: str) -> int:
        """Get selected quantity for product"""
        if user_id not in self.user_quantities:
            self.user_quantities[user_id] = {}
        if product_id not in self.user_quantities[user_id]:
            self.user_quantities[user_id][product_id] = 1
        return self.user_quantities[user_id][product_id]
    
    def set_quantity(self, user_id: int, product_id: str, quantity: int) -> None:
        """Set quantity for product"""
        if user_id not in self.user_quantities:
            self.user_quantities[user_id] = {}
        self.user_quantities[user_id][product_id] = max(1, min(50, quantity))
    
    def adjust_quantity(self, user_id: int, product_id: str, adjustment: int) -> int:
        """Adjust quantity by amount"""
        current = self.get_quantity(user_id, product_id)
        new_qty = max(1, min(50, current + adjustment))
        self.set_quantity(user_id, product_id, new_qty)
        return new_qty

# Global cart manager instance
cart_manager = CartManager()
