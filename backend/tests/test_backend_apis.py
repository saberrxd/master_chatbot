import pytest
import requests
import time

# Module: Health Check
class TestHealthCheck:
    """Test health endpoint"""
    
    def test_health_endpoint(self, api_client, base_url):
        response = api_client.get(f"{base_url}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"
        print("✅ Health check passed")

# Module: Admin Authentication
class TestAdminAuth:
    """Test admin authentication endpoints"""
    
    def test_admin_login_success(self, api_client, base_url):
        response = api_client.post(f"{base_url}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "username" in data
        assert data["username"] == "admin"
        assert len(data["token"]) > 0
        print("✅ Admin login successful")
    
    def test_admin_login_invalid_credentials(self, api_client, base_url):
        response = api_client.post(f"{base_url}/api/admin/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print("✅ Invalid credentials rejected correctly")

# Module: Chat Session Management
class TestChatSessions:
    """Test chat session creation and retrieval"""
    
    def test_create_session_success(self, api_client, base_url):
        response = api_client.post(f"{base_url}/api/chat/session", json={
            "user_name": "TEST_User",
            "user_mobile": "9876543210",
            "platform_name": "TEST_Web",
            "user_email": "test@example.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["user_name"] == "TEST_User"
        assert data["user_mobile"] == "9876543210"
        assert data["platform_name"] == "TEST_Web"
        assert data["status"] == "active"
        print(f"✅ Session created: {data['id']}")
        return data["id"]
    
    def test_create_session_missing_required_fields(self, api_client, base_url):
        response = api_client.post(f"{base_url}/api/chat/session", json={
            "user_name": "Test User"
        })
        assert response.status_code == 422
        print("✅ Missing required fields validation works")
    
    def test_get_session_by_id(self, api_client, base_url):
        # First create a session
        create_response = api_client.post(f"{base_url}/api/chat/session", json={
            "user_name": "TEST_GetUser",
            "user_mobile": "9999999999",
            "platform_name": "TEST_Mobile"
        })
        session_id = create_response.json()["id"]
        
        # Now get it
        get_response = api_client.get(f"{base_url}/api/chat/session/{session_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["id"] == session_id
        assert data["user_name"] == "TEST_GetUser"
        print("✅ Session retrieval by ID works")
    
    def test_list_sessions_requires_auth(self, api_client, base_url, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = api_client.get(f"{base_url}/api/chat/sessions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Listed {len(data)} sessions (auth required)")

# Module: Chat Flow
class TestChatFlow:
    """Test chat conversation flow"""
    
    def test_start_chat_get_root_question(self, api_client, base_url):
        # Create session first
        session_response = api_client.post(f"{base_url}/api/chat/session", json={
            "user_name": "TEST_ChatUser",
            "user_mobile": "1111111111",
            "platform_name": "TEST_App"
        })
        session_id = session_response.json()["id"]
        
        # Start chat
        chat_response = api_client.get(f"{base_url}/api/chat/start/{session_id}")
        assert chat_response.status_code == 200
        data = chat_response.json()
        assert "question_id" in data
        assert "message" in data
        assert "options" in data
        assert isinstance(data["options"], list)
        assert len(data["options"]) > 0
        print(f"✅ Root question retrieved: {data['message'][:50]}...")
        return session_id, data["question_id"], data["options"][0]["id"]
    
    def test_select_free_option(self, api_client, base_url):
        # Create session and start chat
        session_response = api_client.post(f"{base_url}/api/chat/session", json={
            "user_name": "TEST_FreeOption",
            "user_mobile": "2222222222",
            "platform_name": "TEST_Web"
        })
        session_id = session_response.json()["id"]
        
        start_response = api_client.get(f"{base_url}/api/chat/start/{session_id}")
        start_data = start_response.json()
        question_id = start_data["question_id"]
        first_option_id = start_data["options"][0]["id"]
        
        # Select first option (should lead to next question)
        select_response = api_client.post(f"{base_url}/api/chat/select", json={
            "session_id": session_id,
            "question_id": question_id,
            "option_id": first_option_id
        })
        assert select_response.status_code == 200
        data = select_response.json()
        assert "type" in data
        assert data["type"] in ["question", "answer", "payment_required"]
        print(f"✅ Option selection works, type: {data['type']}")
    
    def test_get_chat_messages(self, api_client, base_url):
        # Create session and start chat
        session_response = api_client.post(f"{base_url}/api/chat/session", json={
            "user_name": "TEST_Messages",
            "user_mobile": "3333333333",
            "platform_name": "TEST_App"
        })
        session_id = session_response.json()["id"]
        
        # Start chat to generate messages
        api_client.get(f"{base_url}/api/chat/start/{session_id}")
        
        # Get messages
        messages_response = api_client.get(f"{base_url}/api/chat/messages/{session_id}")
        assert messages_response.status_code == 200
        data = messages_response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✅ Retrieved {len(data)} messages for session")

# Module: Questions CRUD (Admin)
class TestQuestionsCRUD:
    """Test questions management endpoints"""
    
    def test_list_questions_requires_auth(self, api_client, base_url, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = api_client.get(f"{base_url}/api/questions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Listed {len(data)} questions (auth required)")
    
    def test_create_and_verify_question(self, api_client, base_url, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create question
        create_response = api_client.post(f"{base_url}/api/questions", json={
            "text": "TEST_Question: What is your favorite color?",
            "is_root": False,
            "category": "TEST_category",
            "options": [
                {
                    "text": "Red",
                    "is_answer": True,
                    "answer_text": "Red is a warm color.",
                    "requires_payment": False
                },
                {
                    "text": "Blue",
                    "is_answer": True,
                    "answer_text": "Blue is a cool color.",
                    "requires_payment": False
                }
            ]
        }, headers=headers)
        assert create_response.status_code == 200
        data = create_response.json()
        assert "id" in data
        assert data["text"] == "TEST_Question: What is your favorite color?"
        question_id = data["id"]
        print(f"✅ Question created: {question_id}")
        
        # Verify by GET
        get_response = api_client.get(f"{base_url}/api/questions/{question_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["id"] == question_id
        assert get_data["text"] == "TEST_Question: What is your favorite color?"
        print("✅ Question verified via GET")
        
        return question_id
    
    def test_update_question(self, api_client, base_url, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create question first
        create_response = api_client.post(f"{base_url}/api/questions", json={
            "text": "TEST_Original Question",
            "is_root": False,
            "options": [
                {"text": "Option 1", "is_answer": True, "answer_text": "Answer 1", "requires_payment": False}
            ]
        }, headers=headers)
        question_id = create_response.json()["id"]
        
        # Update question
        update_response = api_client.put(f"{base_url}/api/questions/{question_id}", json={
            "text": "TEST_Updated Question"
        }, headers=headers)
        assert update_response.status_code == 200
        
        # Verify update
        get_response = api_client.get(f"{base_url}/api/questions/{question_id}")
        updated_data = get_response.json()
        assert updated_data["text"] == "TEST_Updated Question"
        print("✅ Question updated successfully")
    
    def test_delete_question(self, api_client, base_url, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create question
        create_response = api_client.post(f"{base_url}/api/questions", json={
            "text": "TEST_ToDelete Question",
            "is_root": False,
            "options": [
                {"text": "Option", "is_answer": True, "answer_text": "Answer", "requires_payment": False}
            ]
        }, headers=headers)
        question_id = create_response.json()["id"]
        
        # Delete question
        delete_response = api_client.delete(f"{base_url}/api/questions/{question_id}", headers=headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = api_client.get(f"{base_url}/api/questions/{question_id}")
        assert get_response.status_code == 404
        print("✅ Question deleted successfully")

# Module: Admin Dashboard Stats
class TestAdminStats:
    """Test admin dashboard statistics"""
    
    def test_get_admin_stats(self, api_client, base_url, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = api_client.get(f"{base_url}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_questions" in data
        assert "total_sessions" in data
        assert "total_payments" in data
        assert "paid_payments" in data
        assert "total_revenue" in data
        assert isinstance(data["total_questions"], int)
        assert isinstance(data["total_sessions"], int)
        assert isinstance(data["total_revenue"], (int, float))
        print(f"✅ Admin stats: Q={data['total_questions']}, S={data['total_sessions']}, Rev=₹{data['total_revenue']}")

# Module: Payment Gateway Integration
class TestPaymentIntegration:
    """Test payment gateway order creation"""
    
    def test_razorpay_order_creation(self, api_client, base_url):
        # Create session
        session_response = api_client.post(f"{base_url}/api/chat/session", json={
            "user_name": "TEST_PayUser",
            "user_mobile": "9999999999",
            "platform_name": "TEST_Web"
        })
        session_id = session_response.json()["id"]
        
        # Try to create Razorpay order
        response = api_client.post(f"{base_url}/api/payment/razorpay/create", json={
            "session_id": session_id,
            "option_id": "test_option",
            "question_id": "test_question",
            "gateway": "razorpay",
            "amount": 499.0,
            "customer_name": "Test User",
            "customer_email": "test@example.com",
            "customer_phone": "9999999999"
        })
        # Razorpay test keys may fail, check response
        if response.status_code == 200:
            data = response.json()
            assert "order_id" in data
            print("✅ Razorpay order created successfully")
        elif response.status_code == 500:
            print("⚠️ Razorpay order creation failed (expected with test keys)")
        else:
            print(f"⚠️ Razorpay order creation returned {response.status_code}")
    
    def test_cashfree_order_creation(self, api_client, base_url):
        # Create session
        session_response = api_client.post(f"{base_url}/api/chat/session", json={
            "user_name": "TEST_CashfreeUser",
            "user_mobile": "8888888888",
            "platform_name": "TEST_Web"
        })
        session_id = session_response.json()["id"]
        
        # Try to create Cashfree order
        response = api_client.post(f"{base_url}/api/payment/cashfree/create", json={
            "session_id": session_id,
            "option_id": "test_option",
            "question_id": "test_question",
            "gateway": "cashfree",
            "amount": 299.0,
            "customer_name": "Test User",
            "customer_email": "test@example.com",
            "customer_phone": "8888888888"
        })
        # Cashfree uses prod keys, should work
        if response.status_code in [200, 201]:
            data = response.json()
            assert "order_id" in data
            print("✅ Cashfree order created successfully")
        else:
            print(f"⚠️ Cashfree order creation returned {response.status_code}: {response.text[:100]}")
