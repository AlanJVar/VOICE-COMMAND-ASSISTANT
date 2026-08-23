from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import re

app = FastAPI(title="Voice Shopping Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CATEGORIES = {
    "produce": ["apple", "apples", "banana", "bananas", "orange", "oranges"],
    "dairy": ["milk", "cheese", "butter", "yogurt"],
    "bakery": ["bread", "croissant", "bagel"],
    "beverages": ["water", "juice", "soda"]
}

# Live Deals / Sales Catalog
STORE_DEALS = {
    "apples": {"original": "$4.99", "sale": "$2.99", "store": "FreshMart"},
    "bread": {"original": "$3.50", "sale": "$1.99", "store": "Baker's Choice"},
    "almond milk": {"original": "$4.20", "sale": "$3.10", "store": "Organic Hub"}
}

# Healthy & Smart Substitutes
SMART_SWAPS = {
    "milk": {"suggested": "almond milk", "type": "alternative", "reason": "healthier dairy alternative"},
    "butter": {"suggested": "margarine", "type": "alternative", "reason": "lower cholesterol option"},
}

class CommandRequest(BaseModel):
    command: str
    user_id: Optional[str] = "guest"

@app.get("/")
def read_root():
    return {"status": "API active"}

@app.post("/parse-command")
def parse_command(req: CommandRequest):
    text = req.command.lower().strip()
    
    # 1. Regex for removal and misheard audio patterns
    remove_patterns = [
        r'\b(remove|delete|clear|take off|cross off|bought|purchased|got)\b',
        r'\b(move|ove|emove|lead|plead|del|elite)\b',
        r'\b(boat|bot|ought|brought|pot)\b'
    ]
    
    action = "add"
    for pattern in remove_patterns:
        if re.search(pattern, text):
            action = "remove"
            break

    # Extract Quantity
    qty_match = re.search(r'\b(\d+)\b', text)
    quantity = int(qty_match.group(1)) if qty_match else 1

    # Clean action noise words
    noise_words = r'\b(add|buy|need|want|remove|delete|bought|got|purchased|item|from my list|to my list|of|bottles|bags|move|ove|emove|lead|plead|del|elite|boat|bot|ought|brought|pot)\b'
    clean_text = re.sub(noise_words, '', text)
    item_name = re.sub(r'\s+', ' ', clean_text).strip()
    
    if not item_name:
        item_name = "unknown item"

    # Categorize
    category = "general"
    for cat, items in CATEGORIES.items():
        if any(i in item_name for i in items):
            category = cat
            break

    # 2. Check for Sales or Smart Substitutes (Add mode only)
    has_suggestion = False
    suggested_item = None
    suggestion_reason = ""

    if action == "add":
        if item_name in STORE_DEALS:
            deal = STORE_DEALS[item_name]
            has_suggestion = True
            suggested_item = item_name
            suggestion_reason = f"On sale at {deal['store']} for {deal['sale']} (Reg. {deal['original']})"
        elif item_name in SMART_SWAPS:
            swap = SMART_SWAPS[item_name]
            has_suggestion = True
            suggested_item = swap["suggested"]
            suggestion_reason = swap["reason"]

    return {
        "action": action,
        "item": item_name,
        "quantity": quantity,
        "category": category,
        "has_suggestion": has_suggestion,
        "suggested_item": suggested_item,
        "suggestion_reason": suggestion_reason
    }

@app.get("/suggestions")
def get_suggestions():
    return {
        "smart": "You usually buy bread around this time.",
        "seasonal": "In season right now: Strawberries, Watermelon"
    }
