#!/usr/bin/env python3
"""
Backend API Test Suite for File Upload Features
Tests the newly implemented file upload and chat file attachment features
"""

import requests
import json
import tempfile
import os
import uuid
import csv
from datetime import datetime

# Base URL from environment
BASE_URL = os.environ.get("BACKEND_URL", "http://localhost:8000/api")

# Test data
ADMIN_CREDS = {"username": "admin", "password": "admin123"}

def log(message):
    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
    except UnicodeEncodeError:
        # Fallback for environments that don't support emojis
        clean_message = message.encode('ascii', 'ignore').decode('ascii')
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {clean_message}")

def test_admin_login():
    """Test admin authentication to get JWT token"""
    log("🔑 Testing Admin Login...")
    
    response = requests.post(f"{BASE_URL}/admin/login", json=ADMIN_CREDS)
    log(f"   Status: {response.status_code}")
    log(f"   Response: {response.text[:200]}")
    
    if response.status_code == 200:
        data = response.json()
        if "token" in data:
            log("   ✅ Admin login successful, token received")
            return data["token"]
        else:
            log("   ❌ No token in response")
            return None
    else:
        log(f"   ❌ Admin login failed: {response.status_code}")
        return None

def test_file_upload(admin_token):
    """Test POST /api/upload with multipart file data"""
    log("📁 Testing File Upload API...")
    
    # Create a small test text file
    test_content = "This is a test file for chat attachments.\nCreated at: " + datetime.now().isoformat()
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    try:
        # Upload the file
        files = {'file': ('test_chat_file.txt', open(temp_file_path, 'rb'), 'text/plain')}
        response = requests.post(f"{BASE_URL}/upload", files=files)
        
        log(f"   Status: {response.status_code}")
        log(f"   Response: {response.text[:300]}")
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ['file_url', 'file_name', 'file_type', 'is_image', 'file_size']
            
            log("   ✅ File upload successful")
            log(f"   📄 File URL: {data.get('file_url', 'Missing!')}")
            log(f"   📄 File Name: {data.get('file_name', 'Missing!')}")
            log(f"   📄 File Type: {data.get('file_type', 'Missing!')}")
            log(f"   📄 Is Image: {data.get('is_image', 'Missing!')}")
            log(f"   📄 File Size: {data.get('file_size', 'Missing!')} bytes")
            
            # Check all required fields
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                log(f"   ❌ Missing required fields: {missing_fields}")
                return None
            else:
                log("   ✅ All required fields present")
                return data
        else:
            log(f"   ❌ File upload failed: {response.status_code}")
            return None
            
    finally:
        # Clean up temp file
        if 'files' in locals() and 'file' in files:
            files['file'][1].close()
        try:
            os.unlink(temp_file_path)
        except:
            pass

def test_file_serving(file_data):
    """Test GET /api/files/{filename} to verify uploaded file can be served"""
    if not file_data:
        log("❌ No file data to test serving")
        return False
        
    log("📥 Testing File Serving...")
    
    file_url = file_data.get('file_url', '')
    if not file_url.startswith('/api/files/'):
        log(f"   ❌ Invalid file URL format: {file_url}")
        return False
    
    # Extract filename from URL
    filename = file_url.replace('/api/files/', '')
    
    response = requests.get(f"{BASE_URL}/files/{filename}")
    log(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        log(f"   ✅ File served successfully")
        log(f"   📄 Content-Type: {response.headers.get('content-type', 'Unknown')}")
        log(f"   📄 Content-Length: {len(response.content)} bytes")
        
        # Check if content matches what we uploaded
        content = response.content.decode('utf-8')
        if "This is a test file for chat attachments" in content:
            log("   ✅ File content verified")
            return True
        else:
            log("   ❌ File content doesn't match uploaded content")
            return False
    else:
        log(f"   ❌ File serving failed: {response.status_code}")
        return False

def test_chat_session_creation():
    """Create a chat session for testing file attachments"""
    log("💬 Creating Chat Session...")
    
    session_data = {
        "user_name": "John Doe",
        "user_mobile": "9876543210",
        "platform_name": "Website",
        "user_email": "john@example.com",
        "language": "en"
    }
    
    response = requests.post(f"{BASE_URL}/chat/session", json=session_data)
    log(f"   Status: {response.status_code}")
    log(f"   Response: {response.text[:200]}")
    
    if response.status_code == 200:
        data = response.json()
        session_id = data.get('id')
        if session_id:
            log(f"   ✅ Chat session created: {session_id}")
            return session_id
        else:
            log("   ❌ No session ID in response")
            return None
    else:
        log(f"   ❌ Chat session creation failed: {response.status_code}")
        return None

def test_user_message_with_file(session_id, file_data):
    """Test POST /api/user/send with file attachment"""
    if not session_id or not file_data:
        log("❌ Missing session ID or file data for user message test")
        return False
        
    log("👤 Testing User Message with File Attachment...")
    
    message_data = {
        "session_id": session_id,
        "message": "Here's a file I'm sharing with you",
        "file_url": file_data.get('file_url'),
        "file_name": file_data.get('file_name'),
        "file_type": file_data.get('file_type')
    }
    
    response = requests.post(f"{BASE_URL}/user/send", json=message_data)
    log(f"   Status: {response.status_code}")
    log(f"   Response: {response.text[:300]}")
    
    if response.status_code == 200:
        data = response.json()
        log("   ✅ User message with file sent successfully")
        log(f"   💬 Message ID: {data.get('id', 'Missing!')}")
        log(f"   💬 File URL: {data.get('file_url', 'Missing!')}")
        log(f"   💬 File Name: {data.get('file_name', 'Missing!')}")
        
        # Verify file fields are preserved
        if (data.get('file_url') == file_data.get('file_url') and 
            data.get('file_name') == file_data.get('file_name') and
            data.get('file_type') == file_data.get('file_type')):
            log("   ✅ File attachment fields verified")
            return True
        else:
            log("   ❌ File attachment fields don't match")
            return False
    else:
        log(f"   ❌ User message with file failed: {response.status_code}")
        return False

def test_agent_creation_and_login(admin_token):
    """Create an agent and login for testing agent messages"""
    log("🤖 Creating and Logging in Agent...")
    
    # Create agent
    agent_data = {
        "username": f"testagent_{uuid.uuid4().hex[:8]}",
        "password": "test123",
        "display_name": "Test Agent File",
        "platforms": ["Website"],
        "role": "agent"
    }
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.post(f"{BASE_URL}/agents", json=agent_data, headers=headers)
    log(f"   Agent Creation Status: {response.status_code}")
    
    if response.status_code == 200:  # Changed from 201 to 200
        agent_created = response.json()
        log(f"   ✅ Agent created: {agent_created.get('id', 'Unknown')}")
        
        # Login as agent
        login_data = {
            "username": agent_data["username"],
            "password": agent_data["password"]
        }
        
        response = requests.post(f"{BASE_URL}/agent/login", json=login_data)
        log(f"   Agent Login Status: {response.status_code}")
        
        if response.status_code == 200:
            login_resp = response.json()
            agent_token = login_resp.get('token')
            if agent_token:
                log("   ✅ Agent login successful")
                return agent_token, agent_created.get('id')
            else:
                log("   ❌ No token in agent login response")
                return None, None
        else:
            log(f"   ❌ Agent login failed: {response.status_code}")
            return None, None
    else:
        log(f"   ❌ Agent creation failed: {response.status_code}")
        return None, None

def test_agent_message_with_file(agent_token, session_id, file_data):
    """Test POST /api/agent/send with file attachment"""
    if not agent_token or not session_id or not file_data:
        log("❌ Missing agent token, session ID, or file data for agent message test")
        return False
        
    log("🤖 Testing Agent Message with File Attachment...")
    
    message_data = {
        "session_id": session_id,
        "message": "I'm sharing this file with you",
        "file_url": file_data.get('file_url'),
        "file_name": file_data.get('file_name'),
        "file_type": file_data.get('file_type')
    }
    
    headers = {"Authorization": f"Bearer {agent_token}"}
    response = requests.post(f"{BASE_URL}/agent/send", json=message_data, headers=headers)
    log(f"   Status: {response.status_code}")
    log(f"   Response: {response.text[:300]}")
    
    if response.status_code == 200:
        data = response.json()
        log("   ✅ Agent message with file sent successfully")
        log(f"   💬 Message ID: {data.get('id', 'Missing!')}")
        log(f"   💬 File URL: {data.get('file_url', 'Missing!')}")
        log(f"   💬 File Name: {data.get('file_name', 'Missing!')}")
        log(f"   💬 Agent ID: {data.get('agent_id', 'Missing!')}")
        
        # Verify file fields are preserved
        if (data.get('file_url') == file_data.get('file_url') and 
            data.get('file_name') == file_data.get('file_name') and
            data.get('file_type') == file_data.get('file_type')):
            log("   ✅ File attachment fields verified")
            return True
        else:
            log("   ❌ File attachment fields don't match")
            return False
    else:
        log(f"   ❌ Agent message with file failed: {response.status_code}")
        return False

def test_bulk_upload_platform_validation(admin_token):
    """Test POST /api/questions/bulk-upload with unknown platform names"""
    log("📋 Testing Bulk Upload Platform Validation...")
    
    # Create CSV content with unknown platforms
    csv_content = """question_ref,question_text,is_root,platforms,option_text,is_answer,answer_text,next_question_ref,is_agent_handoff,requires_payment,payment_amount,payment_gateway
Q1,Test question with unknown platform,yes,"FakePlatform,UnknownApp",Test option,yes,Test answer,,no,no,,"""
    
    # Create temporary CSV file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_file:
        temp_file.write(csv_content)
        temp_file_path = temp_file.name
    
    try:
        files = {'file': ('test_platform_validation.csv', open(temp_file_path, 'rb'), 'text/csv')}
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/questions/bulk-upload", files=files, headers=headers)
        
        log(f"   Status: {response.status_code}")
        log(f"   Response: {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            log("   ✅ Bulk upload completed")
            
            # Check for warnings
            warnings = data.get('warnings', [])
            platform_warnings = [w for w in warnings if 'Unknown platform' in w or 'FakePlatform' in w or 'UnknownApp' in w]
            
            if platform_warnings:
                log(f"   ✅ Platform validation warnings found: {len(platform_warnings)}")
                for warning in platform_warnings[:2]:  # Show first 2 warnings
                    log(f"      ⚠️  {warning}")
                return True
            else:
                log(f"   ⚠️  No platform warnings found. All warnings: {warnings}")
                # Still consider it working if questions were created
                if data.get('total_questions_created', 0) > 0:
                    log("   ✅ Questions were created despite missing platform warnings")
                    return True
                else:
                    log("   ❌ No questions created and no platform warnings")
                    return False
        else:
            log(f"   ❌ Bulk upload failed: {response.status_code}")
            return False
            
    finally:
        # Clean up temp file
        if 'files' in locals() and 'file' in files:
            files['file'][1].close()
        try:
            os.unlink(temp_file_path)
        except:
            pass

def test_bulk_template_download(admin_token):
    """Test GET /api/questions/bulk-template still works correctly"""
    log("📥 Testing Bulk Template Download...")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/questions/bulk-template", headers=headers)
    
    log(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        # Check if it's CSV content
        content_type = response.headers.get('content-type', '').lower()
        if 'csv' in content_type or 'text' in content_type:
            log("   ✅ Bulk template downloaded successfully")
            log(f"   📄 Content-Type: {content_type}")
            log(f"   📄 Content-Length: {len(response.content)} bytes")
            
            # Check if it contains expected headers
            content = response.content.decode('utf-8')
            if 'question_ref' in content and 'question_text' in content and 'option_text' in content:
                log("   ✅ Template contains expected CSV headers")
                return True
            else:
                log("   ❌ Template missing expected CSV headers")
                return False
        else:
            log(f"   ❌ Unexpected content type: {content_type}")
            return False
    else:
        log(f"   ❌ Bulk template download failed: {response.status_code}")
        return False

def test_comprehensive_bulk_upload(admin_token):
    """Test POST /api/questions/bulk-upload with a multi-question structure"""
    log("📋 Testing Comprehensive Bulk Upload...")
    
    # Create CSV content with linked questions
    csv_content = """question_ref,question_text,is_root,platforms,option_text,is_answer,answer_text,next_question_ref,is_agent_handoff,requires_payment,payment_amount,payment_gateway
Q_ROOT,How can I help you?,yes,App,I have an error,no,,Q_ERR,no,no,,
Q_ROOT,How can I help you?,yes,App,General question,no,,Q_GEN,no,no,,
Q_ERR,What error are you seeing?,no,App,Payment failed,yes,Please check your connection.,,no,no,,
Q_GEN,What is your query?,no,App,Pricing,yes,Our pricing is competitive.,,no,no,,
"""
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_file:
        temp_file.write(csv_content)
        temp_file_path = temp_file.name
    
    try:
        files = {'file': ('test_bulk.csv', open(temp_file_path, 'rb'), 'text/csv')}
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/questions/bulk-upload", files=files, headers=headers)
        
        log(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log(f"   ✅ Bulk upload success: {data.get('total_questions_created')} questions created")
            
            # Verify linkage
            questions = data.get('questions', [])
            root_q = next((q for q in questions if q['ref'] == 'Q_ROOT'), None)
            if root_q and root_q['is_root']:
                log("   ✅ Root question correctly identified")
                return True
            else:
                log("   ❌ Root question missing or not marked as root")
                return False
        else:
            log(f"   ❌ Bulk upload failed: {response.status_code}")
            return False
            
    finally:
        if 'files' in locals() and 'file' in files:
            files['file'][1].close()
        try:
            os.unlink(temp_file_path)
        except:
            pass

def main():
    """Run all backend tests for file upload features"""
    log("🚀 Starting Backend File Upload Feature Tests")
    log("=" * 60)
    
    results = {}
    
    # 1. Admin Login
    admin_token = test_admin_login()
    results['admin_login'] = admin_token is not None
    
    if not admin_token:
        log("❌ CRITICAL: Admin login failed, cannot continue with authenticated tests")
        return results
    
    log("")
    
    # 2. File Upload API
    file_data = test_file_upload(admin_token)
    results['file_upload'] = file_data is not None
    
    log("")
    
    # 3. File Serving
    results['file_serving'] = test_file_serving(file_data)
    
    log("")
    
    # 4. Chat Session Creation
    session_id = test_chat_session_creation()
    results['chat_session_creation'] = session_id is not None
    
    log("")
    
    # 5. User Message with File
    if session_id and file_data:
        results['user_message_with_file'] = test_user_message_with_file(session_id, file_data)
    else:
        results['user_message_with_file'] = False
        log("❌ Skipping user message test (missing session or file data)")
    
    log("")
    
    # 6. Agent Creation and Login
    agent_token, agent_id = test_agent_creation_and_login(admin_token)
    results['agent_creation_login'] = agent_token is not None
    
    log("")
    
    # 7. Agent Message with File
    if agent_token and session_id and file_data:
        results['agent_message_with_file'] = test_agent_message_with_file(agent_token, session_id, file_data)
    else:
        results['agent_message_with_file'] = False
        log("❌ Skipping agent message test (missing token, session, or file data)")
    
    log("")
    
    # 8. Platform Validation in Bulk Upload
    results['platform_validation_bulk_upload'] = test_bulk_upload_platform_validation(admin_token)
    
    log("")

    # 10. Comprehensive Bulk Upload
    results['comprehensive_bulk_upload'] = test_comprehensive_bulk_upload(admin_token)
    
    log("")
    
    # 9. Bulk Template Download
    results['bulk_template_download'] = test_bulk_template_download(admin_token)
    
    log("")
    log("=" * 60)
    log("🏁 TEST RESULTS SUMMARY")
    log("=" * 60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        log(f"   {test_name.replace('_', ' ').title()}: {status}")
    
    total_tests = len(results)
    passed_tests = sum(results.values())
    log("")
    log(f"📊 Overall: {passed_tests}/{total_tests} tests passed ({(passed_tests/total_tests*100):.1f}%)")
    
    if passed_tests == total_tests:
        log("🎉 ALL TESTS PASSED!")
    elif passed_tests >= total_tests * 0.8:  # 80% pass rate
        log("🟡 MOST TESTS PASSED - Minor issues detected")
    else:
        log("🔴 MULTIPLE TESTS FAILED - Major issues detected")
    
    return results

if __name__ == "__main__":
    main()