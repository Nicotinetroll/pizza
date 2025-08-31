# backend/bot_modules/admin_ticket_handlers.py

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from telegram.constants import ParseMode
import logging

from .support_tickets import *
from .database import db

logger = logging.getLogger(__name__)

async def admin_take_ticket(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    admin = update.effective_user
    ticket_number = query.data.replace("admin_take_", "")
    
    ticket = await get_ticket_by_number(ticket_number)
    if not ticket:
        await query.answer("Ticket not found!", show_alert=True)
        return
    
    success = await assign_ticket(
        ticket_id=ticket["_id"],
        admin_id=admin.id,
        admin_username=admin.username or str(admin.id)
    )
    
    if success:
        await query.edit_message_text(
            f"✅ *Ticket {ticket_number} assigned to @{admin.username}*\n\n"
            f"Original message:\n{query.message.text}",
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("👁 View Ticket", callback_data=f"admin_view_{ticket_number}")]
            ])
        )
    else:
        await query.answer("Failed to assign ticket!", show_alert=True)

async def admin_view_ticket(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    ticket_number = query.data.replace("admin_view_", "")
    ticket = await get_ticket_by_number(ticket_number)
    
    if not ticket:
        await query.answer("Ticket not found!", show_alert=True)
        return
    
    text = f"🎫 *Admin View - Ticket {ticket['ticket_number']}*\n"
    text += f"User: @{ticket['username']} (ID: {ticket['telegram_id']})\n"
    text += f"Category: {ticket['category']}\n"
    text += f"Priority: {ticket['priority']}\n"
    text += f"Status: {ticket['status']}\n"
    text += f"Subject: {ticket['subject']}\n\n"
    text += "*Messages:*\n"
    text += "─" * 20 + "\n"
    
    for msg in ticket.get("messages", [])[-5:]:
        sender = f"@{ticket['username']}" if msg["sender_type"] == "customer" else "Admin"
        time = msg["timestamp"].strftime("%H:%M")
        text += f"*{sender}* ({time}):\n{msg['message'][:200]}\n\n"
    
    keyboard = [
        [InlineKeyboardButton("💬 Reply in Bot", url=f"https://t.me/{context.bot.username}?start=ticket_{ticket_number}")],
        [InlineKeyboardButton("✅ Mark Resolved", callback_data=f"admin_resolve_{ticket_number}")],
        [InlineKeyboardButton("❌ Close Ticket", callback_data=f"admin_close_{ticket_number}")]
    ]
    
    await query.message.reply_text(
        text,
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def admin_reply_ticket(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    ticket_number = query.data.replace("admin_reply_", "")
    
    quick_replies = [
        "We're looking into your issue and will update you soon.",
        "Your order has been processed and will be shipped within 24 hours.",
        "Please provide your order number so we can assist you better.",
        "The issue has been resolved. Please check and confirm.",
        "We need more information to help you. Can you provide more details?"
    ]
    
    keyboard = []
    for i, reply in enumerate(quick_replies):
        keyboard.append([InlineKeyboardButton(
            f"📝 {reply[:30]}...",
            callback_data=f"send_quick_{ticket_number}_{i}"
        )])
    
    keyboard.append([InlineKeyboardButton("❌ Cancel", callback_data="cancel_quick_reply")])
    
    await query.message.reply_text(
        f"*Quick Reply to Ticket {ticket_number}*\n\nSelect a message:",
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def send_quick_reply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    parts = query.data.replace("send_quick_", "").split("_")
    ticket_number = parts[0]
    reply_index = int(parts[1])
    
    quick_replies = [
        "We're looking into your issue and will update you soon.",
        "Your order has been processed and will be shipped within 24 hours.",
        "Please provide your order number so we can assist you better.",
        "The issue has been resolved. Please check and confirm.",
        "We need more information to help you. Can you provide more details?"
    ]
    
    message = quick_replies[reply_index]
    
    ticket = await get_ticket_by_number(ticket_number)
    if not ticket:
        await query.answer("Ticket not found!", show_alert=True)
        return
    
    success = await add_ticket_message(
        ticket_id=ticket["_id"],
        sender_id=update.effective_user.id,
        sender_type="admin",
        message=message
    )
    
    if success:
        try:
            await context.bot.send_message(
                chat_id=ticket["telegram_id"],
                text=f"💬 *Support Reply - Ticket {ticket_number}*\n\n{message}\n\n_Reply with /support to continue conversation_",
                parse_mode=ParseMode.MARKDOWN
            )
            
            await query.edit_message_text(
                f"✅ Reply sent to ticket {ticket_number}",
                parse_mode=ParseMode.MARKDOWN
            )
        except Exception as e:
            logger.error(f"Failed to send reply: {e}")
            await query.answer("Failed to send reply!", show_alert=True)
    else:
        await query.answer("Failed to add reply!", show_alert=True)

async def admin_resolve_ticket(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    ticket_number = query.data.replace("admin_resolve_", "")
    ticket = await get_ticket_by_number(ticket_number)
    
    if not ticket:
        await query.answer("Ticket not found!", show_alert=True)
        return
    
    success = await update_ticket_status(
        ticket_id=ticket["_id"],
        status=TicketStatus.RESOLVED,
        resolution="Resolved by admin",
        admin_id=update.effective_user.id
    )
    
    if success:
        await query.answer("✅ Ticket marked as resolved!", show_alert=True)
        
        try:
            await context.bot.send_message(
                chat_id=ticket["telegram_id"],
                text=f"✅ *Your ticket {ticket_number} has been resolved!*\n\nThank you for contacting support. If you need further assistance, create a new ticket with /support",
                parse_mode=ParseMode.MARKDOWN
            )
        except:
            pass
    else:
        await query.answer("Failed to resolve ticket!", show_alert=True)

async def admin_close_ticket(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    ticket_number = query.data.replace("admin_close_", "")
    ticket = await get_ticket_by_number(ticket_number)
    
    if not ticket:
        await query.answer("Ticket not found!", show_alert=True)
        return
    
    success = await close_ticket(
        ticket_id=ticket["_id"],
        resolution="Closed by admin"
    )
    
    if success:
        await query.answer("✅ Ticket closed!", show_alert=True)
    else:
        await query.answer("Failed to close ticket!", show_alert=True)
