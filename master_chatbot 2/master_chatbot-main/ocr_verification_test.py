#!/usr/bin/env python3

import requests
import json
from PIL import Image, ImageDraw, ImageFont

# Backend URL
BACKEND_URL = "https://chatbot-hub-57.preview.emergentagent.com"

def admin_login():
    """Login as admin and return token"""
    login_data = {"username": "admin", "password": "admin123"}
    response = requests.post(f"{BACKEND_URL}/api/admin/login", json=login_data)
    if response.status_code == 200:
        return response.json()["token"]
    return None

def create_specific_test_image():
    """Create an image with text that should match specific decision tree options"""
    print("Creating specific test image...")
    
    # Create image with text that matches existing options
    img = Image.new('RGB', (500, 300), 'white')
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
    except:
        font = None
    
    # Use text that should match "General Inquiry" and "Premium Consultation"
    text = "General Inquiry Premium Consultation Services"
    if font:
        draw.text((20, 50), text, fill='black', font=font)
    else:
        draw.text((20, 50), text, fill='black')
    
    img.save('/tmp/test_specific_ocr.png')
    print(f"✅ Created /tmp/test_specific_ocr.png with text: '{text}'")
    return text

def test_specific_ocr_matching():
    """Test OCR with specific text that should match decision tree options"""
    print("\n=== TEST SPECIFIC OCR MATCHING ===")
    
    expected_text = create_specific_test_image()
    
    with open('/tmp/test_specific_ocr.png', 'rb') as f:
        files = {'file': ('test_specific_ocr.png', f, 'image/png')}
        response = requests.post(f"{BACKEND_URL}/api/ocr/analyze", files=files)
    
    print(f"OCR specific matching status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        extracted_text = data.get('extracted_text', '')
        matches = data.get('matches', [])
        
        print(f"✅ OCR extraction successful")
        print(f"   Expected text: '{expected_text}'")
        print(f"   Extracted text: '{extracted_text}'")
        print(f"   Total matches: {len(matches)}")
        
        # Check if we found the expected matches
        found_general = False
        found_premium = False
        
        for match in matches:
            option_text = match.get('option_text', '').lower()
            if 'general inquiry' in option_text:
                found_general = True
                print(f"   ✅ Found 'General Inquiry' match with score: {match.get('score', 0)}")
            if 'premium consultation' in option_text:
                found_premium = True
                print(f"   ✅ Found 'Premium Consultation' match with score: {match.get('score', 0)}")
        
        if found_general or found_premium:
            print("✅ OCR decision tree matching working correctly")
            return True
        else:
            print("❌ Expected matches not found in OCR results")
            print("   Available matches:")
            for i, match in enumerate(matches[:3]):
                print(f"     {i+1}. {match.get('option_text', 'N/A')} (score: {match.get('score', 0)})")
            return False
    else:
        print(f"❌ OCR specific matching failed: {response.text}")
        return False

def verify_ocr_file_serving():
    """Verify that uploaded OCR files can be served back"""
    print("\n=== TEST OCR FILE SERVING ===")
    
    # First upload an image via OCR
    with open('/tmp/test_specific_ocr.png', 'rb') as f:
        files = {'file': ('test_specific_ocr.png', f, 'image/png')}
        response = requests.post(f"{BACKEND_URL}/api/ocr/analyze", files=files)
    
    if response.status_code == 200:
        data = response.json()
        file_url = data.get('file_url', '')
        
        if file_url:
            # Try to access the file
            full_url = f"{BACKEND_URL}{file_url}"
            file_response = requests.get(full_url)
            
            print(f"File serving status: {file_response.status_code}")
            
            if file_response.status_code == 200:
                print(f"✅ OCR file serving working correctly")
                print(f"   File URL: {file_url}")
                print(f"   Content-Type: {file_response.headers.get('content-type', 'N/A')}")
                print(f"   Content-Length: {len(file_response.content)} bytes")
                return True
            else:
                print(f"❌ File serving failed: {file_response.status_code}")
                return False
        else:
            print("❌ No file URL returned from OCR analyze")
            return False
    else:
        print(f"❌ OCR analyze failed: {response.text}")
        return False

def main():
    """Run comprehensive OCR verification tests"""
    print("🔍 COMPREHENSIVE OCR VERIFICATION TESTING")
    print(f"Backend URL: {BACKEND_URL}")
    
    tests = [
        ("Specific OCR Matching", test_specific_ocr_matching),
        ("OCR File Serving", verify_ocr_file_serving),
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
    print("📊 OCR VERIFICATION SUMMARY")
    print("="*50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status} - {test_name}")
    
    print(f"\nOverall: {passed}/{total} verification tests passed ({passed/total*100:.1f}%)")
    
    return passed == total

if __name__ == "__main__":
    main()