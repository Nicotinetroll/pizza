import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, ConversationHandler, CommandHandler, MessageHandler, CallbackQueryHandler, filters
from telegram.constants import ParseMode
import logging

from .support_tickets import *
from .database import db

logger = logging.getLogger(__name__)

SELECTING_CATEGORY, ENTERING_SUBJECT, ENTERING_DESCRIPTION, REPLYING_TO_TICKET = range(4)

user_ticket_context = {}
user_ticket_state = {}

async def show_support_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user = update.effective_user
    
    user_ticket_state[user.id] = SELECTING_CATEGORY
    
    keyboard = [
        [
            InlineKeyboardButton("🚚 Order Issue", callback_data="ticket_cat_order"),
            InlineKeyboardButton("💳 Payment", callback_data="ticket_cat_payment")
        ],
        [
            InlineKeyboardButton("📦 Product", callback_data="ticket_cat_product"),
            InlineKeyboardButton("🌍 Delivery", callback_data="ticket_cat_delivery")
        ],
        [
            InlineKeyboardButton("🔧 Technical", callback_data="ticket_cat_technical"),
            InlineKeyboardButton("❓ Other", callback_data="ticket_cat_other")
        ],
        [InlineKeyboardButton("📋 My Tickets", callback_data="my_tickets")],
        [InlineKeyboardButton("🏠 Back to Menu", callback_data="home")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    text = (
        "🎫 *SUPPORT CENTER*\n\n"
        "Need help? Create a support ticket!\n\n"
        "Select category for your issue:"
    )
    
    await query.edit_message_text(text, parse_mode=ParseMode.MARKDOWN, reply_markup=reply_markup)

async def handle_category_selection_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    user_id = update.effective_user.id
    
    if query.data == "my_tickets":
        await show_user_tickets(update, context)
        user_ticket_state.pop(user_id, None)
        return
    
    if query.data == "home":
        from .handlers import start_command
        await start_command(update, context)
        user_ticket_state.pop(user_id, None)
        return
    
    category = query.data.replace("ticket_cat_", "")
    user_ticket_context[user_id] = {"category": category}
    user_ticket_state[user_id] = ENTERING_SUBJECT
    
    await query.edit_message_text(
        f"📝 *Creating Ticket - {category.upper()}*\n\n"
        "Please enter a brief subject for your ticket:",
        parse_mode=ParseMode.MARKDOWN
    )

async def support_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_ticket_state[user.id] = SELECTING_CATEGORY
    
    keyboard = [
        [
            InlineKeyboardButton("🚚 Order Issue", callback_data="ticket_cat_order"),
            InlineKeyboardButton("💳 Payment", callback_data="ticket_cat_payment")
        ],
        [
            InlineKeyboardButton("📦 Product", callback_data="ticket_cat_product"),
            InlineKeyboardButton("🌍 Delivery", callback_data="ticket_cat_delivery")
        ],
        [
            InlineKeyboardButton("🔧 Technical", callback_data="ticket_cat_technical"),
            InlineKeyboardButton("❓ Other", callback_data="ticket_cat_other")
        ],
        [InlineKeyboardButton("📋 My Tickets", callback_data="my_tickets")],
        [InlineKeyboardButton("🏠 Back to Menu", callback_data="home")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    text = (
        "🎫 *SUPPORT CENTER*\n\n"
        "Need help? Create a support ticket!\n\n"
        "Select category for your issue:"
    )
    
    if update.message:
        await update.message.reply_text(text, parse_mode=ParseMode.MARKDOWN, reply_markup=reply_markup)
    else:
        await update.callback_query.edit_message_text(text, parse_mode=ParseMode.MARKDOWN, reply_markup=reply_markup)
    
    return SELECTING_CATEGORY

async def handle_category_selection(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    user_id = update.effective_user.id
    
    if query.data == "my_tickets":
        await show_user_tickets(update, context)
        return ConversationHandler.END
    
    if query.data == "home":
        from .handlers import start_command
        await start_command(update, context)
        return ConversationHandler.END
    
    category = query.data.replace("ticket_cat_", "")
    user_ticket_context[user_id] = {"category": category}
    
    await query.edit_message_text(
        f"📝 *Creating Ticket - {category.upper()}*\n\n"
        "Please enter a brief subject for your ticket:",
        parse_mode=ParseMode.MARKDOWN
    )
    
    return ENTERING_SUBJECT

async def handle_subject_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    subject = update.message.text
    
    if len(subject) < 5:
        await update.message.reply_text("❌ Subject too short. Please enter at least 5 characters.")
        return ENTERING_SUBJECT
    
    user_ticket_context[user_id]["subject"] = subject
    user_ticket_state[user_id] = ENTERING_DESCRIPTION
    
    await update.message.reply_text(
        "📝 *Describe your issue in detail:*\n\n"
        "Include any relevant order numbers or details.",
        parse_mode=ParseMode.MARKDOWN
    )
    
    return ENTERING_DESCRIPTION

async def handle_description_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    description = update.message.text
    
    logger.info(f"Starting ticket creation for user {user.id}")
    
    if len(description) < 10:
        await update.message.reply_text("❌ Description too short. Please provide more details.")
        return ENTERING_DESCRIPTION
    
    ticket_data = user_ticket_context.get(user.id, {})
    
    order_number = None
    for word in description.split():
        if word.startswith("APZ-") or word.startswith("ORD-"):
            order_number = word
            break
    
    priority = TicketPriority.HIGH if "urgent" in description.lower() else TicketPriority.MEDIUM
    
    try:
        ticket = await create_support_ticket(
            telegram_id=user.id,
            username=user.username or f"user{user.id}",
            category=ticket_data.get("category", "other"),
            subject=ticket_data.get("subject", "No subject"),
            description=description,
            order_number=order_number,
            priority=priority,
            first_name=user.first_name,
            last_name=user.last_name
        )
        
        logger.info(f"Ticket created: {ticket['ticket_number']}")
        
        if ticket:
            keyboard = [
                [InlineKeyboardButton("📋 View My Tickets", callback_data="my_tickets")],
                [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
            ]
            
            await update.message.reply_text(
                f"✅ *Ticket Created Successfully!*\n\n"
                f"Ticket ID: `{ticket['ticket_number']}`\n"
                f"Status: 🟡 Open\n\n"
                f"We'll respond within 2-4 hours.\n"
                f"You'll be notified when admin replies.",
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
        else:
            logger.error("Ticket creation returned None!")
            await update.message.reply_text("❌ Failed to create ticket. Please try again.")
            
    except Exception as e:
        logger.error(f"Error creating ticket: {e}")
        import traceback
        traceback.print_exc()
        await update.message.reply_text("❌ An error occurred while creating the ticket. Please try again.")
    
    user_ticket_context.pop(user.id, None)
    user_ticket_state.pop(user.id, None)
    return ConversationHandler.END

async def handle_text_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    state = user_ticket_state.get(user_id)
    
    logger.info(f"=== SUPPORT TEXT HANDLER: User {user_id}, State: {state}, States dict: {user_ticket_state}")
    
    if state == ENTERING_SUBJECT:
        logger.info(f"User {user_id} entering ticket subject")
        user = update.effective_user
        subject = update.message.text
        
        if len(subject) < 5:
            await update.message.reply_text("❌ Subject too short. Please enter at least 5 characters.")
            return
        
        user_ticket_context[user_id]["subject"] = subject
        user_ticket_state[user_id] = ENTERING_DESCRIPTION
        logger.info(f"Subject saved for user {user_id}: {subject}")
        
        await update.message.reply_text(
            "📝 *Describe your issue in detail:*\n\n"
            "Include any relevant order numbers or details.",
            parse_mode=ParseMode.MARKDOWN
        )
        
    elif state == ENTERING_DESCRIPTION:
        logger.info(f"User {user_id} entering ticket description")
        user = update.effective_user
        description = update.message.text
        
        if len(description) < 10:
            await update.message.reply_text("❌ Description too short. Please provide more details.")
            return
        
        ticket_data = user_ticket_context.get(user_id, {})
        logger.info(f"Ticket data for user {user_id}: {ticket_data}")
        
        order_number = None
        for word in description.split():
            if word.startswith("APZ-") or word.startswith("ORD-"):
                order_number = word
                break
        
        priority = TicketPriority.HIGH if "urgent" in description.lower() else TicketPriority.MEDIUM
        
        try:
            logger.info(f"Creating ticket for user {user_id} with category: {ticket_data.get('category')}, subject: {ticket_data.get('subject')}")
            
            ticket = await create_support_ticket(
                telegram_id=user.id,
                username=user.username or f"user{user.id}",
                category=ticket_data.get("category", "other"),
                subject=ticket_data.get("subject", "No subject"),
                description=description,
                order_number=order_number,
                priority=priority,
                first_name=user.first_name,
                last_name=user.last_name
            )
            
            logger.info(f"Ticket created successfully: {ticket['ticket_number']}")
            
            if ticket:
                keyboard = [
                    [InlineKeyboardButton("📋 View My Tickets", callback_data="my_tickets")],
                    [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
                ]
                
                await update.message.reply_text(
                    f"✅ *Ticket Created Successfully!*\n\n"
                    f"Ticket ID: `{ticket['ticket_number']}`\n"
                    f"Status: 🟡 Open\n\n"
                    f"We'll respond within 2-4 hours.\n"
                    f"You'll be notified when admin replies.",
                    parse_mode=ParseMode.MARKDOWN,
                    reply_markup=InlineKeyboardMarkup(keyboard)
                )
            else:
                logger.error("Ticket creation returned None!")
                await update.message.reply_text("❌ Failed to create ticket. Please try again.")
                
        except Exception as e:
            logger.error(f"Error creating ticket: {e}")
            import traceback
            traceback.print_exc()
            await update.message.reply_text("❌ An error occurred while creating the ticket. Please try again.")
        
        user_ticket_context.pop(user_id, None)
        user_ticket_state.pop(user_id, None)
        logger.info(f"Cleared ticket state for user {user_id}")
        
    elif state == REPLYING_TO_TICKET:
        logger.info(f"User {user_id} replying to ticket")
        user = update.effective_user
        message = update.message.text
        ticket_number = context.user_data.get("replying_to_ticket")
        
        if not ticket_number:
            await update.message.reply_text("❌ Error: No ticket selected.")
            user_ticket_state.pop(user_id, None)
            return
        
        ticket = await get_ticket_by_number(ticket_number)
        if not ticket:
            await update.message.reply_text("❌ Ticket not found.")
            user_ticket_state.pop(user_id, None)
            return
        
        success = await add_ticket_message(
            ticket["_id"],
            user.id,
            "customer",
            message
        )
        
        if success:
            keyboard = [[InlineKeyboardButton("📋 View Ticket", callback_data=f"view_ticket_{ticket_number}")]]
            
            await update.message.reply_text(
                f"✅ Reply added to ticket {ticket_number}",
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
        else:
            await update.message.reply_text("❌ Failed to add reply.")
        
        context.user_data.pop("replying_to_ticket", None)
        user_ticket_state.pop(user_id, None)
    else:
        logger.warning(f"Unknown state {state} for user {user_id}")

async def show_user_tickets(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    tickets = await get_user_tickets(user_id, limit=10)
    
    if not tickets:
        text = "📋 *Your Support Tickets*\n\nYou have no tickets yet."
        keyboard = [[InlineKeyboardButton("🎫 Create Ticket", callback_data="support_menu")]]
    else:
        text = "📋 *Your Support Tickets*\n\n"
        keyboard = []
        
        status_emojis = {
            "open": "🟡",
            "in_progress": "🔵",
            "waiting_customer": "⏳",
            "waiting_admin": "⏳",
            "resolved": "✅",
            "closed": "⚫"
        }
        
        for ticket in tickets[:5]:
            emoji = status_emojis.get(ticket["status"], "❓")
            unread = ticket.get("unread_count", 0)
            unread_text = f" ({unread} new)" if unread > 0 else ""
            
            text += f"{emoji} `{ticket['ticket_number']}` - {ticket['subject'][:30]}\n"
            text += f"   {ticket['status'].replace('_', ' ').title()}{unread_text}\n\n"
            
            keyboard.append([
                InlineKeyboardButton(
                    f"{emoji} {ticket['ticket_number']}{unread_text}",
                    callback_data=f"view_ticket_{ticket['ticket_number']}"
                )
            ])
        
        keyboard.append([InlineKeyboardButton("🎫 Create New Ticket", callback_data="support_menu")])
    
    keyboard.append([InlineKeyboardButton("🏠 Main Menu", callback_data="home")])
    
    if update.callback_query:
        await update.callback_query.edit_message_text(
            text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    else:
        await update.message.reply_text(
            text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

async def view_ticket(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    ticket_number = query.data.replace("view_ticket_", "")
    ticket = await get_ticket_by_number(ticket_number)
    
    if not ticket:
        await query.edit_message_text("❌ Ticket not found.")
        return
    
    await mark_messages_as_read(ticket["_id"], "customer")
    
    status_emoji = {
        "open": "🟡",
        "in_progress": "🔵",
        "waiting_customer": "⏳",
        "waiting_admin": "⏳",
        "resolved": "✅",
        "closed": "⚫"
    }.get(ticket["status"], "❓")
    
    text = (
        f"📋 *Ticket {ticket['ticket_number']}*\n\n"
        f"📂 Category: {ticket['category'].upper()}\n"
        f"📝 Subject: {ticket['subject']}\n"
        f"{status_emoji} Status: {ticket['status'].replace('_', ' ').title()}\n"
        f"🕐 Created: {ticket['created_at'].strftime('%Y-%m-%d %H:%M')}\n\n"
        f"💬 *Conversation:*\n\n"
    )
    
    for msg in ticket.get("messages", []):
        sender = "You" if msg["sender_type"] == "customer" else "Support"
        time = msg["timestamp"].strftime("%H:%M")
        text += f"*{sender}* ({time}):\n{msg['message']}\n\n"
    
    keyboard = []
    
    if ticket["status"] not in ["closed", "resolved"]:
        keyboard.append([InlineKeyboardButton("💬 Reply", callback_data=f"reply_ticket_{ticket['ticket_number']}")])
        keyboard.append([InlineKeyboardButton("✅ Mark Resolved", callback_data=f"resolve_ticket_{ticket['ticket_number']}")])
    
    keyboard.append([InlineKeyboardButton("🔙 Back to Tickets", callback_data="my_tickets")])
    
    await query.edit_message_text(
        text,
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def handle_ticket_reply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    user_id = update.effective_user.id
    
    if query.data.startswith("reply_ticket_"):
        ticket_number = query.data.replace("reply_ticket_", "")
        context.user_data["replying_to_ticket"] = ticket_number
        user_ticket_state[user_id] = REPLYING_TO_TICKET
        
        await query.edit_message_text(
            f"💬 *Reply to Ticket {ticket_number}*\n\n"
            "Type your message below:",
            parse_mode=ParseMode.MARKDOWN
        )
        
        return REPLYING_TO_TICKET
    
    elif query.data.startswith("resolve_ticket_"):
        ticket_number = query.data.replace("resolve_ticket_", "")
        ticket = await get_ticket_by_number(ticket_number)
        
        if ticket:
            await update_ticket_status(ticket["_id"], TicketStatus.RESOLVED, "Resolved by customer")
            
            await query.edit_message_text(
                f"✅ Ticket {ticket_number} marked as resolved!\n\n"
                "Thank you for using our support.",
                parse_mode=ParseMode.MARKDOWN
            )

async def process_ticket_reply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    message = update.message.text
    ticket_number = context.user_data.get("replying_to_ticket")
    
    if not ticket_number:
        await update.message.reply_text("❌ Error: No ticket selected.")
        return ConversationHandler.END
    
    ticket = await get_ticket_by_number(ticket_number)
    if not ticket:
        await update.message.reply_text("❌ Ticket not found.")
        return ConversationHandler.END
    
    success = await add_ticket_message(
        ticket["_id"],
        user.id,
        "customer",
        message
    )
    
    if success:
        keyboard = [[InlineKeyboardButton("📋 View Ticket", callback_data=f"view_ticket_{ticket_number}")]]
        
        await update.message.reply_text(
            f"✅ Reply added to ticket {ticket_number}",
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    else:
        await update.message.reply_text("❌ Failed to add reply.")
    
    context.user_data.pop("replying_to_ticket", None)
    user_ticket_state.pop(user.id, None)
    return ConversationHandler.END

async def mytickets_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await show_user_tickets(update, context)

async def closeticket_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text(
            "❌ Usage: /closeticket TKT-2024-0001",
            parse_mode=ParseMode.MARKDOWN
        )
        return
    
    ticket_number = context.args[0]
    ticket = await get_ticket_by_number(ticket_number)
    
    if not ticket:
        await update.message.reply_text("❌ Ticket not found.")
        return
    
    if ticket["telegram_id"] != update.effective_user.id:
        await update.message.reply_text("❌ You can only close your own tickets.")
        return
    
    if ticket["status"] in ["closed", "resolved"]:
        await update.message.reply_text("ℹ️ This ticket is already closed.")
        return
    
    success = await close_ticket(ticket["_id"], resolution="Closed by user")
    
    if success:
        await update.message.reply_text(
            f"✅ Ticket `{ticket_number}` has been closed.\n\n"
            "Thank you for using our support!",
            parse_mode=ParseMode.MARKDOWN
        )
    else:
        await update.message.reply_text("❌ Failed to close ticket.")

def get_support_conversation_handler():
    return ConversationHandler(
        entry_points=[
            CommandHandler('support', support_command, filters=filters.ChatType.PRIVATE),
            CallbackQueryHandler(show_support_menu, pattern="^support_menu$")
        ],
        states={
            SELECTING_CATEGORY: [CallbackQueryHandler(handle_category_selection, pattern="^ticket_cat_|my_tickets$|home$")],
            ENTERING_SUBJECT: [MessageHandler(filters.TEXT & ~filters.COMMAND, handle_subject_input)],
            ENTERING_DESCRIPTION: [MessageHandler(filters.TEXT & ~filters.COMMAND, handle_description_input)],
            REPLYING_TO_TICKET: [MessageHandler(filters.TEXT & ~filters.COMMAND, process_ticket_reply)]
        },
        fallbacks=[CommandHandler('cancel', lambda u, c: ConversationHandler.END)]
    )