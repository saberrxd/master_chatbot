
import json
import uuid
from datetime import datetime, timezone
from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017')
db = client['chatbot_db']

def create_option(text, next_id=None, answer=None, is_answer=False):
    return {
        "id": str(uuid.uuid4()),
        "text": text,
        "next_question_id": next_id,
        "is_answer": is_answer,
        "answer_text": answer,
        "requires_payment": False,
        "payment_amount": None,
        "payment_gateway": None,
        "is_agent_handoff": False
    }

def create_question(text, options, category="troubleshooting"):
    q_id = str(uuid.uuid4())
    doc = {
        "id": q_id,
        "text": text,
        "options": options,
        "is_root": False,
        "category": category,
        "platforms": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.questions.insert_one(doc)
    return q_id

# Load the parsed dataset
try:
    with open('view_data.json', 'r', encoding='utf-8') as f:
        raw_data = json.load(f)
except FileNotFoundError:
    print("Error: view_data.json not found. Make sure you are in the correct directory.")
    exit(1)

dataset = raw_data[1:]
print(f"Processing {len(dataset)} error-solution pairs...")

# CATEGORY MAPPING LOGIC
categories = {
    "Vehicle & FASTag Issues": [],
    "KYC & Registration": [],
    "Wallet & Payments": [],
    "OTP & Technical Errors": []
}

def get_category(text):
    text = text.lower()
    if any(k in text for k in ["tag", "vehicle", "npci", "vrn", "blacklist", "hotlist", "limit failed"]):
        return "Vehicle & FASTag Issues"
    if any(k in text for k in ["kyc", "entity", "onboarding", "registered"]):
        return "KYC & Registration"
    if any(k in text for k in ["wallet", "credit", "active", "closed", "bank id"]):
        return "Wallet & Payments"
    if any(k in text for k in ["otp", "session", "unexpected", "formatexception", "system", "invalid request"]):
        return "OTP & Technical Errors"
    return "OTP & Technical Errors" # Default catch-all

# Group errors
for row in dataset:
    if len(row) < 2: continue
    error_text = str(row[0]).strip()
    solution_text = str(row[1]).strip()
    if not error_text or not solution_text: continue
    
    cat = get_category(error_text)
    categories[cat].append({"q": error_text, "a": solution_text})

# CLEANUP: Delete old troubleshooting questions
db.questions.delete_many({"category": "troubleshooting"})
print("Cleaned up old troubleshooting data.")

# BUILD HIERARCHY
category_options = []
for cat_name, items in categories.items():
    if not items: continue
    
    # Create the answer options for this category
    item_options = []
    for item in items:
        item_options.append(create_option(text=item['q'], answer=item['a'], is_answer=True))
    
    # Create the question for this category
    cat_q_id = create_question(
        text=f"Select the specific error related to {cat_name}:",
        options=item_options
    )
    
    # Add to the main troubleshooting menu
    category_options.append(create_option(text=cat_name, next_id=cat_q_id))

# Create the top-level Troubleshooting question
troubleshooting_main_q_id = create_question(
    text="Please select the category of the issue you are facing:",
    options=category_options
)

# LINK TO MAIN ROOT
root_id = "be9cf0c7-be92-4111-9b29-4052c05d43a4"
root_q = db.questions.find_one({"id": root_id})

if root_q:
    # Update or Add the "Troubleshooting / Errors" button
    found = False
    for opt in root_q["options"]:
        if opt["text"] == "Troubleshooting / Errors":
            opt["next_question_id"] = troubleshooting_main_q_id
            found = True
            break
    
    if not found:
        root_q["options"].append(create_option("Troubleshooting / Errors", next_id=troubleshooting_main_q_id))
    
    db.questions.update_one({"id": root_id}, {"$set": {"options": root_q["options"]}})
    print(f"Successfully linked 'Troubleshooting / Errors' to the new Category Selection ({troubleshooting_main_q_id}).")
else:
    print("Error: Main Root Question not found. Please verify the ID.")

print("Troubleshooting categorization complete.")
