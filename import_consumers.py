
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

def create_question(text, options, category="consumer"):
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

# Structured Data
data = {
    "Account & KYC": [
        {"q": "How do I register on Hitch Zone?", "a": "👉 Open the app → Click on Sign Up → Enter your mobile number → Verify with OTP → Complete registration."},
        {"q": "How to delete my account?", "a": "👉 Please contact customer support with your registered details. Our team will assist you with account deletion."},
        {"q": "What documents are required?", "a": "👉 Valid ID proof such as Aadhaar Card, PAN Card, or Driving License."},
        {"q": "KYC verification pending", "a": "👉 Verification may take some time. Please wait or contact support if delayed."},
        {"q": "How to upload documents?", "a": "👉 Go to KYC section → Upload documents → Submit for verification."},
        {"q": "Document rejected, what to do?", "a": "👉 Please re-upload clear and valid documents as per guidelines."},
        {"q": "Is it safe to use the app?", "a": "👉 Yes, Hitch Zone is a secure and encrypted platform, ensuring safe transactions."}
    ],
    "Payments & Fees": [
        {"q": "How do I recharge my account?", "a": "👉 Go to Recharge/Bill Payment section → Select service → Enter details → Complete payment."},
        {"q": "Available payment methods?", "a": "👉 You can pay using UPI, Debit/Credit Card, and Net Banking."},
        {"q": "What are the charges?", "a": "👉 Charges for fee transfer are:\nVisa/MasterCard: 0.35% + 18% GST + ₹3 platform fee \nRuPay: 2.4% + 18% GST + ₹3 platform fee"},
        {"q": "Are there any hidden charges?", "a": "👉 No, there are no hidden charges. All charges are clearly shown before you make the payment."},
        {"q": "Why are charges applied?", "a": "👉 Charges are applied for payment processing and service usage."},
        {"q": "Is GST included?", "a": "👉 Yes, 18% GST is applied on the transaction charges."},
        {"q": "How to pay bills or recharge?", "a": "👉 Go to the Bill Payment or Recharge section, select your service, enter details, and complete payment."}
    ],
    "Fee Transfer (CC to Bank)": [
        {"q": "What is fee transfer?", "a": "👉 Fee transfer allows you to transfer money from your credit card to your savings bank account using the Hitch Zone app."},
        {"q": "How can I transfer money?", "a": "👉 Go to the Fee Transfer section in the app → Enter details → Select your credit card → Confirm payment."},
        {"q": "How long does it take?", "a": "👉 Most transactions are processed instantly or within a few minutes. In some cases, it may take a little longer."},
        {"q": "Which cards are supported?", "a": "👉 Supported cards: Visa, MasterCard, and RuPay"},
        {"q": "Which cards are NOT supported?", "a": "👉 The following cards are not supported for fee transfer:\nSBI Credit Cards \nAmerican Express (AMEX) \nDiners Club"},
        {"q": "Why is my card not working?", "a": "👉 Your card may not be supported or enabled for fee transfer. Please try using a Visa, MasterCard, or RuPay card."}
    ],
    "Hitch Prepaid Card": [
        {"q": "Explain Features/Benefits", "a": "👉 Hitch Zone Prepaid Card is a simple and secure digital payment solution.\nKey Benefits:✔ No bank account required✔ No credit check needed✔ Easy money loading✔ Use for online & offline payments✔ Full control on spending"},
        {"q": "Where can I use the card?", "a": "👉 You can use it for: Online shopping, Store payments, Bill payments, Fuel & daily expenses."},
        {"q": "What is the price of the prepaid card?", "a": "👉 The card fee is ₹249."},
        {"q": "Is there any extra charge?", "a": "👉 Only ₹249 card fee and ₹99 activation fee (refundable) is applicable."},
        {"q": "Can I use it without a bank account?", "a": "👉 Yes, no bank account is required to use this prepaid card."},
        {"q": "Is ₹99 refundable?", "a": "👉 Yes, the ₹99 activation fee is fully refundable after activation."},
        {"q": "How to apply for the Hitch Prepaid Card?", "a": "👉 To apply for the Hitch Prepaid Card, please follow the steps below:\nStep 1: Pay ₹249 via https://payments.cashfree.com/forms/hitch_prepaid_cards\nStep 2: After payment, please share: Payment confirmation (screenshot) & Current delivery address.\nStep 3: Card will be dispatched from our inventory.\nStep 4: Contact us for the activation process."}
    ],
    "Transactions & Refunds": [
        {"q": "Payment deducted but transfer not completed", "a": "👉 Don’t worry. If the transaction failed, your amount will be automatically refunded within 5–7 working days."},
        {"q": "Transaction is showing pending", "a": "👉 Pending transactions usually get updated automatically. Please wait for some time."},
        {"q": "Money not received in bank account", "a": "👉 If the transaction is successful, please allow some time. If delayed, contact support with your transaction ID."},
        {"q": "When will I get my refund?", "a": "👉 Refunds are processed within 5–7 working days."},
        {"q": "How to check refund status?", "a": "👉 Please share your transaction ID, and we will check the status for you."},
        {"q": "Payment failed but money deducted", "a": "👉 If failed, the amount will be refunded automatically within 5–7 working days."}
    ]
}

# 1. CLEANUP: Delete all non-root consumer questions
# We keep the one marked as root for the platform separation logic
root_text = "Welcome to Consumer Support! Please select a category:"
consumer_root = db.questions.find_one({
    "text": root_text,
    "category": "consumer"
})

if consumer_root:
    root_id = consumer_root["id"]
    print(f"Found existing Consumer Root: {root_id}")
    # Delete all other consumer questions
    result = db.questions.delete_many({
        "category": "consumer",
        "id": {"$ne": root_id}
    })
    print(f"Deleted {result.deleted_count} orphaned consumer questions.")
else:
    print("No existing Consumer Root found. Will create a new one.")
    root_id = None

# 2. BUILD CATEGORIES
category_options = []
for cat_name, queries in data.items():
    query_options = []
    for item in queries:
        query_options.append(create_option(text=item['q'], answer=item['a'], is_answer=True))
    
    # Create the question that lists queries for this category
    cat_q_id = create_question(text=f"Select your specific query related to {cat_name}:", options=query_options)
    
    # Add this category as an option
    category_options.append(create_option(text=cat_name, next_id=cat_q_id))

# 3. UPDATE OR CREATE ROOT
if root_id:
    db.questions.update_one(
        {"id": root_id},
        {"$set": {"options": category_options}}
    )
    print("Successfully updated Consumer Root options.")
else:
    new_root_id = create_question(text=root_text, options=category_options)
    # Ensure it's marked as root for App platform
    db.questions.update_one(
        {"id": new_root_id},
        {"$set": {"is_root": True, "platforms": ["App"]}}
    )
    print(f"Created new Consumer Root: {new_root_id}")

print("Consumer data restoration complete.")
