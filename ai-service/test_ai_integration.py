import requests
import os
import json

# Configuration
AI_SERVICE_URL = "http://localhost:5001/analyze"
ARTIFACT_DIR = r"C:\Users\avina\.gemini\antigravity\brain\2de91265-2ca5-44ee-a073-71a822abfdd1"

# Test Cases
TEST_CASES = [
    {
        "name": "Fire Hazard (Should be CRITICAL + DANGEROUS)",
        "image": "test_fire_hazard_1769233661150.png",
        "text": "A large building fire with heavy black smoke in a city street.",
        "expected_priority": "CRITICAL",
        "expected_dangerous": True,
        "expected_danger_type": "fire"
    },
    {
        "name": "Electrical Hazard (Should be CRITICAL + DANGEROUS)",
        "image": "test_electrical_hazard_1769233684194.png",
        "text": "Sparking electrical wires hanging from a damaged transformer on a pole.",
        "expected_priority": "CRITICAL",
        "expected_dangerous": True,
        "expected_danger_type": "electrical"
    },
    {
        "name": "Normal Pothole (Should be HIGH/MEDIUM + NOT DANGEROUS)",
        "image": "test_pothole_1769233701434.png",
        "text": "A large deep pothole in the middle of the road.",
        "expected_priority": "HIGH",  # Pothole maps to HIGH in decide_priority
        "expected_dangerous": False,
        "expected_danger_type": None
    }
]

def run_tests():
    print(f"🚀 Starting AI Service Verification Tests against {AI_SERVICE_URL}\n")
    
    passed_count = 0
    
    for test in TEST_CASES:
        print(f"{'='*60}")
        print(f"🧪 Testing: {test['name']}")
        
        image_path = os.path.join(ARTIFACT_DIR, test['image'])
        if not os.path.exists(image_path):
            print(f"❌ Image not found: {image_path}")
            continue
            
        try:
            with open(image_path, 'rb') as img:
                files = {'image': img}
                data = {'text': test['text']}
                
                response = requests.post(AI_SERVICE_URL, files=files, data=data)
                
                if response.status_code == 200:
                    result = response.json()
                    analysis = result['analysis']
                    
                    priority = analysis['priority']
                    is_dangerous = analysis['is_dangerous']
                    danger_type = analysis['danger_type']
                    score = analysis['verification_score']
                    
                    print(f"   📊 Response:")
                    print(f"      - Priority: {priority}")
                    print(f"      - Is Dangerous: {is_dangerous}")
                    print(f"      - Danger Type: {danger_type}")
                    print(f"      - Verification Score: {score}")
                    
                    # Assertions
                    priority_match = priority == test['expected_priority']
                    danger_match = is_dangerous == test['expected_dangerous']
                    type_match = danger_type == test['expected_danger_type']
                    
                    # Logic Check for Backend Auto-Verification
                    # Backend Logic: if CRITICAL and DANGEROUS and SCORE >= 60 -> VERIFIED
                    if priority == 'CRITICAL' and is_dangerous and score >= 60:
                        backend_status = "VERIFIED (Auto-Verified)"
                    else:
                        backend_status = "PENDING (Manual Review)"
                        
                    print(f"   ⚙️  Backend Would Set Status: {backend_status}")

                    if priority_match and danger_match and type_match:
                        print(f"   ✅ TEST PASSED")
                        passed_count += 1
                    else:
                        print(f"   ❌ TEST FAILED")
                        if not priority_match: print(f"      - Expected Priority: {test['expected_priority']}, Got: {priority}")
                        if not danger_match: print(f"      - Expected Dangerous: {test['expected_dangerous']}, Got: {is_dangerous}")
                        if not type_match: print(f"      - Expected Danger Type: {test['expected_danger_type']}, Got: {danger_type}")
                
                elif response.status_code == 400:
                     print(f"   ❌ Request Rejected (400): {response.json().get('message')}")
                else:
                    print(f"   ❌ Error {response.status_code}: {response.text}")

        except Exception as e:
            print(f"   ❌ Exception: {str(e)}")
            
    print(f"\n{'='*60}")
    print(f"🏁 Verification Complete: {passed_count}/{len(TEST_CASES)} Tests Passed")
    print(f"{'='*60}")

if __name__ == "__main__":
    run_tests()
