#!/usr/bin/env python3
"""
Additional test for automatic agent handoff via decision tree option
"""

import json
import requests

# Configuration
BASE_URL = "https://chatbot-hub-57.preview.emergentagent.com/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

def test_automatic_handoff_with_created_question():
    """Test automatic handoff by creating a question with is_agent_handoff option"""
    
    session = requests.Session()
    
    # Step 1: Admin login
    response = session.post(f"{BASE_URL}/admin/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code != 200:
        print(f"❌ Admin login failed: {response.text}")
        return False
    
    admin_token = response.json()["token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Step 2: Create a question with is_agent_handoff option
    question_data = {
        "text": "Do you need immediate assistance?",
        "options": [
            {
                "text": "Yes, connect me to an agent",
                "is_agent_handoff": True,
                "is_answer": False
            },
            {
                "text": "No, I'll browse on my own",
                "is_answer": True,
                "answer_text": "Feel free to explore our services. Contact us if you need help!"
            }
        ],
        "is_root": True,
        "category": "handoff_test"
    }
    
    response = session.post(f"{BASE_URL}/questions", json=question_data, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Question creation failed: {response.text}")
        return False
    
    question = response.json()
    print(f"✅ Created test question with ID: {question['id']}")
    
    # Find the handoff option
    handoff_option = None
    for opt in question["options"]:
        if opt.get("is_agent_handoff"):
            handoff_option = opt
            break
    
    if not handoff_option:
        print("❌ No handoff option found in created question")
        return False
    
    # Step 3: Create a chat session
    session_data = {
        "user_name": "Test User Auto Handoff",
        "user_mobile": "9999999999",
        "platform_name": "Website"
    }
    
    response = session.post(f"{BASE_URL}/chat/session", json=session_data)
    
    if response.status_code != 200:
        print(f"❌ Session creation failed: {response.text}")
        return False
    
    session_id = response.json()["id"]
    print(f"✅ Created test session: {session_id}")
    
    # Step 4: Start chat to get the question
    response = session.get(f"{BASE_URL}/chat/start/{session_id}")
    
    if response.status_code != 200:
        print(f"❌ Start chat failed: {response.text}")
        return False
    
    start_data = response.json()
    
    # The question might not be our test question if it's not the only root question
    # So let's directly test with our question
    
    # Step 5: Select the handoff option
    response = session.post(f"{BASE_URL}/chat/select", json={
        "session_id": session_id,
        "question_id": question["id"],
        "option_id": handoff_option["id"]
    })
    
    if response.status_code != 200:
        print(f"❌ Option select failed: {response.text}")
        return False
    
    result = response.json()
    
    # Check if automatic handoff was triggered
    if result.get("type") == "agent_handoff":
        print(f"✅ Automatic handoff triggered successfully: {result['message']}")
        
        # Verify the session has needs_agent flag set
        response = session.get(f"{BASE_URL}/chat/session/{session_id}")
        if response.status_code == 200:
            session_info = response.json()
            if session_info.get("needs_agent"):
                print("✅ Session correctly marked as needing agent")
            else:
                print("⚠️  Session not marked as needing agent")
        
        success = True
    else:
        print(f"❌ Expected agent_handoff type, got: {result.get('type')}")
        print(f"Response: {json.dumps(result, indent=2)}")
        success = False
    
    # Cleanup: Delete the test question
    response = session.delete(f"{BASE_URL}/questions/{question['id']}", headers=headers)
    if response.status_code == 200:
        print("✅ Test question cleaned up")
    else:
        print(f"⚠️  Failed to cleanup test question: {response.text}")
    
    return success

if __name__ == "__main__":
    print("🧪 Testing Automatic Agent Handoff with Created Question")
    print("=" * 60)
    
    if test_automatic_handoff_with_created_question():
        print("\n✅ Automatic handoff test PASSED")
    else:
        print("\n❌ Automatic handoff test FAILED")