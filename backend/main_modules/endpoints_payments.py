# Add this to your backend/main_modules/endpoints_payments.py (create new file)

from fastapi import APIRouter, HTTPException, Request, Header
from typing import Optional
import logging
import json

logger = logging.getLogger(__name__)

router_payments = APIRouter()

@router_payments.post("/api/payments/webhook")
async def nowpayments_webhook(
    request: Request,
    x_nowpayments_sig: Optional[str] = Header(None)
):
    """
    Handle IPN webhook from NOWPayments
    
    NOWPayments will send POST requests here when payment status changes
    """
    try:
        # Get raw payload for signature verification
        payload_bytes = await request.body()
        payload = await request.json()
        
        logger.info(f"Received NOWPayments webhook: {payload.get('payment_id')}")
        
        # Import payment gateway
        import sys
        import os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from nowpayments_gateway import payment_gateway
        
        if not payment_gateway:
            logger.error("Payment gateway not initialized")
            raise HTTPException(status_code=500, detail="Payment gateway not configured")
        
        # Verify signature (if provided)
        if x_nowpayments_sig:
            is_valid = await payment_gateway.verify_ipn_signature(
                x_nowpayments_sig, 
                payload_bytes
            )
            
            if not is_valid:
                logger.warning("Invalid IPN signature")
                raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Process the webhook
        success = await payment_gateway.process_ipn_callback(payload, x_nowpayments_sig)
        
        if success:
            return {"status": "success", "message": "Webhook processed"}
        else:
            raise HTTPException(status_code=400, detail="Failed to process webhook")
            
    except json.JSONDecodeError:
        logger.error("Invalid JSON in webhook payload")
        raise HTTPException(status_code=400, detail="Invalid JSON")
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router_payments.get("/api/payments/status/{payment_id}")
async def check_payment_status(payment_id: str):
    """Check payment status manually"""
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from nowpayments_gateway import payment_gateway
    
    if not payment_gateway:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    status = await payment_gateway.check_payment_status(payment_id)
    
    if status:
        return status
    else:
        raise HTTPException(status_code=404, detail="Payment not found")

@router_payments.get("/api/payments/test-connection")
async def test_nowpayments_connection():
    """Test NOWPayments API connection"""
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from nowpayments_gateway import payment_gateway
    
    if not payment_gateway:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    currencies = await payment_gateway.get_available_currencies()
    
    if currencies:
        return {
            "status": "connected",
            "available_currencies": len(currencies),
            "supported": ["BTC", "ETH", "SOL", "USDT"]
        }
    else:
        raise HTTPException(status_code=503, detail="Cannot connect to NOWPayments")
