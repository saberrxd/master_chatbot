#!/usr/bin/env python3

import requests
import json
import os
from PIL import Image, ImageDraw, ImageFont
import io

# Backend URL from environment
BACKEND_URL = "https://chatbot-hub-57.preview.emergentagent.com"

def create_test_images():
    """Create test images for OCR testing"""
    print("Creating test images...")
    
    # Create image with text
    img_with_text = Image.new('RGB', (400, 200), 'white')
    draw = ImageDraw.Draw(img_with_text)
    
    # Try to use a default font, fallback to basic if not available
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
    except:
        try:
            font = ImageFont.load_default()
        except:
            font = None
    
    # Draw text that should match decision tree options
    text = "Billing Issues Refund Payment Help"
    if font:
        draw.text((20, 50), text, fill='black', font=font)
    else:
        draw.text((20, 50), text, fill='black')
    
    img_with_text.save('/tmp/test_ocr.png')
    print("✅ Created /tmp/test_ocr.png with text: 'Billing Issues Refund Payment Help'")
    
    # Create blank image (solid color)
    img_blank = Image.new('RGB', (400, 200), 'lightblue')
    img_blank.save('/tmp/test_blank.png')
    print("✅ Created /tmp/test_blank.png (solid color, no text)")
    
    # Create a text file for error testing
    with open('/tmp/test_file.txt', 'w') as f:
        f.write("This is a text file, not an image")
    print("✅ Created /tmp/test_file.txt for error testing")

def admin_login():
    """Login as admin and return token"""
    print("\n=== ADMIN LOGIN ===")
    
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    response = requests.post(f"{BACKEND_URL}/api/admin/login", json=login_data)
    print(f"Admin login status: {response.status_code}")
    
    if response.status_code == 200:
        token = response.json()["token"]
        print("✅ Admin login successful")
        return token
    else:
        print(f"❌ Admin login failed: {response.text}")
        return None

def create_chat_session():
    """Create a chat session for testing OCR analyze-session"""
    print("\n=== CREATING CHAT SESSION ===")
    
    session_data = {
        "user_name": "OCR Test User",
        "user_mobile": "+1234567890",
        "platform_name": "Website",
        "user_email": "ocrtest@example.com",
        "language": "en"
    }
    
    response = requests.post(f"{BACKEND_URL}/api/chat/session", json=session_data)
    print(f"Session creation status: {response.status_code}")
    
    if response.status_code == 200:
        session_id = response.json()["id"]
        print(f"✅ Chat session created: {session_id}")
        return session_id
    else:
        print(f"❌ Session creation failed: {response.text}")
        return None

def test_ocr_analyze():
    """Test POST /api/ocr/analyze with image containing text"""
    print("\n=== TEST OCR ANALYZE ===")
    
    with open('/tmp/test_ocr.png', 'rb') as f:
        files = {'file': ('test_ocr.png', f, 'image/png')}
        response = requests.post(f"{BACKEND_URL}/api/ocr/analyze", files=files)
    
    print(f"OCR analyze status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ OCR analyze successful")
        print(f"   Extracted text: '{data.get('extracted_text', '')}'")
        print(f"   Total matches: {data.get('total_matches', 0)}")
        print(f"   Message: {data.get('message', '')}")
        print(f"   File URL: {data.get('file_url', '')}")
        
        # Check if we have matches
        matches = data.get('matches', [])
        if matches:
            print(f"   First match: {matches[0].get('option_text', 'N/A')}")
        
        return True
    else:
        print(f"❌ OCR analyze failed: {response.text}")
        return False

def test_ocr_analyze_session(session_id):
    """Test POST /api/ocr/analyze-session with session_id"""
    print("\n=== TEST OCR ANALYZE SESSION ===")
    
    if not session_id:
        print("❌ No session ID available for testing")
        return False
    
    with open('/tmp/test_ocr.png', 'rb') as f:
        files = {'file': ('test_ocr.png', f, 'image/png')}
        params = {'session_id': session_id}
        response = requests.post(f"{BACKEND_URL}/api/ocr/analyze-session", files=files, params=params)
    
    print(f"OCR analyze-session status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ OCR analyze-session successful")
        print(f"   Extracted text: '{data.get('extracted_text', '')}'")
        print(f"   Matches: {len(data.get('matches', []))}")
        print(f"   Auto selected: {data.get('auto_selected', {}).get('option_text', 'None')}")
        print(f"   Message: {data.get('message', '')}")
        print(f"   File URL: {data.get('file_url', '')}")
        return True
    else:
        print(f"❌ OCR analyze-session failed: {response.text}")
        return False

def test_ocr_error_non_image():
    """Test POST /api/ocr/analyze with non-image file (should return 400)"""
    print("\n=== TEST OCR ERROR - NON-IMAGE FILE ===")
    
    with open('/tmp/test_file.txt', 'rb') as f:
        files = {'file': ('test_file.txt', f, 'text/plain')}
        response = requests.post(f"{BACKEND_URL}/api/ocr/analyze", files=files)
    
    print(f"OCR non-image test status: {response.status_code}")
    
    if response.status_code == 400:
        print("✅ Correctly rejected non-image file with 400 error")
        print(f"   Error message: {response.json().get('detail', '')}")
        return True
    else:
        print(f"❌ Expected 400 error but got {response.status_code}: {response.text}")
        return False

def test_ocr_blank_image():
    """Test POST /api/ocr/analyze with blank image (should return empty text)"""
    print("\n=== TEST OCR BLANK IMAGE ===")
    
    with open('/tmp/test_blank.png', 'rb') as f:
        files = {'file': ('test_blank.png', f, 'image/png')}
        response = requests.post(f"{BACKEND_URL}/api/ocr/analyze", files=files)
    
    print(f"OCR blank image status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        extracted_text = data.get('extracted_text', '')
        matches = data.get('matches', [])
        
        if not extracted_text.strip() and len(matches) == 0:
            print("✅ Blank image correctly returned empty text and no matches")
            print(f"   Message: {data.get('message', '')}")
            return True
        else:
            print(f"❌ Expected empty text and no matches, got text: '{extracted_text}', matches: {len(matches)}")
            return False
    else:
        print(f"❌ OCR blank image failed: {response.text}")
        return False

def test_decision_tree_matching():
    """Test if OCR matches against existing decision tree questions"""
    print("\n=== TEST DECISION TREE MATCHING ===")
    
    # First, let's get the existing questions to see what we're matching against
    token = admin_login()
    if not token:
        print("❌ Cannot test decision tree matching without admin access")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BACKEND_URL}/api/questions", headers=headers)
    
    if response.status_code == 200:
        questions = response.json()
        print(f"✅ Retrieved {len(questions)} questions from decision tree")
        
        # Look for questions with billing-related options
        billing_questions = []
        for q in questions:
            for opt in q.get('options', []):
                if 'billing' in opt.get('text', '').lower() or 'payment' in opt.get('text', '').lower():
                    billing_questions.append({
                        'question': q.get('text', ''),
                        'option': opt.get('text', '')
                    })
        
        if billing_questions:
            print(f"   Found {len(billing_questions)} billing-related options:")
            for bq in billing_questions[:3]:  # Show first 3
                print(f"     - Q: {bq['question'][:50]}... Option: {bq['option']}")
        else:
            print("   No billing-related options found in decision tree")
        
        return True
    else:
        print(f"❌ Failed to retrieve questions: {response.text}")
        return False

def main():
    """Run all OCR tests"""
    print("🔍 STARTING OCR FUNCTIONALITY TESTING")
    print(f"Backend URL: {BACKEND_URL}")
    
    # Create test images
    create_test_images()
    
    # Create a chat session for session-based testing
    session_id = create_chat_session()
    
    # Run all tests
    tests = [
        ("OCR Analyze", test_ocr_analyze),
        ("OCR Analyze Session", lambda: test_ocr_analyze_session(session_id)),
        ("OCR Error - Non-image", test_ocr_error_non_image),
        ("OCR Blank Image", test_ocr_blank_image),
        ("Decision Tree Matching", test_decision_tree_matching),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*50)
    print("📊 OCR TESTING SUMMARY")
    print("="*50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status} - {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 ALL OCR TESTS PASSED!")
    else:
        print("⚠️  Some OCR tests failed - see details above")
    
    return passed == total

if __name__ == "__main__":
    main()