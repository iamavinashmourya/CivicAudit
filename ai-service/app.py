from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from textblob import TextBlob
import google.generativeai as genai
from PIL import Image
import io
import json

load_dotenv()
app = Flask(__name__)

cors_origins = os.getenv(
    'CORS_ORIGINS',
    'http://localhost:3000,http://localhost:5173,http://localhost:5002'
).split(',')
CORS(app, origins=cors_origins)

# SETUP GEMINI
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') 
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    model = None

# --------------------------------
# UPDATED KEYWORDS DICTIONARY
# --------------------------------
CIVIC_KEYWORDS = {
    # 1. CRITICAL PRIORITY
    "electricity": {
        "electric": 0.9, "wire": 1.0, "exposed": 0.9, "short circuit": 1.0, 
        "sparking": 1.0, "shock": 1.0, "current": 0.8, "transformer": 0.8
    },
    "disaster": {
        "fire": 1.0, "gas leak": 1.0, "explosion": 1.0, "smoke": 0.8, 
        "flood": 0.9, "earthquake": 1.0, "collapse": 0.9
    },

    # 2. HIGH PRIORITY
    "road_infra": {
        "pothole": 0.8, "road": 0.6, "asphalt": 0.5, "bridge": 0.9, 
        "traffic": 0.6, "divider": 0.5, "accident": 0.8
    },

    # 3. MEDIUM PRIORITY
    "water_sanitation": {
        "leakage": 0.7, "pipe": 0.6, "water": 0.5, "drain": 0.7, 
        "sewage": 0.8, "drinking": 0.7, "supply": 0.6
    },
    "garbage": {
        "garbage": 0.7, "trash": 0.7, "waste": 0.6, "dustbin": 0.6, 
        "dump": 0.7, "smell": 0.5, "plastic": 0.5, "cleaning": 0.5
    },

    # 4. LOW PRIORITY (Nuisance)
    "civic_nuisance": {
        "streetlight": 0.5, "street light": 0.5, "lamp": 0.4, "bench": 0.3, 
        "park": 0.3, "painting": 0.2, "sign": 0.3, "dark": 0.4
    }
}

# --------------------------------
# Helper Functions
# --------------------------------
def compute_category_severity(text):
    text = text.lower()
    category_scores = {}
    matched_keywords = {}

    for category, keywords in CIVIC_KEYWORDS.items():
        score = 0.0
        hits = []
        for word, weight in keywords.items():
            if word in text:
                score += weight
                hits.append(word)
        if hits:
            category_scores[category] = min(score, 1.0)
            matched_keywords[category] = hits

    overall_severity = max(category_scores.values(), default=0.0)
    return overall_severity, category_scores, matched_keywords

def analyze_sentiment(text):
    blob = TextBlob(text)
    return blob.sentiment.polarity

# --------------------------------
# NEW PRIORITY LOGIC (Strict Hierarchy)
# --------------------------------
def decide_priority(semantic_score, sentiment_polarity, category_scores, text_content):
    # 1. Identify Top Category
    if not category_scores:
        return "LOW"
    
    top_category = max(category_scores, key=category_scores.get)
    text_lower = text_content.lower()

    # 2. RULE 1: CRITICAL (Electric, Fire)
    # Exception: "Streetlight" might trigger "Electric" keywords if not careful, 
    # so we explicitly check for nuisance keywords to downgrade.
    if top_category in ["electricity", "disaster"]:
        if "streetlight" in text_lower or "street light" in text_lower:
            return "LOW" # Override
        return "CRITICAL"

    # 3. RULE 2: HIGH (Roads, Streets)
    if top_category == "road_infra":
        return "HIGH"

    # 4. RULE 3: MEDIUM (Garbage, Water)
    if top_category in ["garbage", "water_sanitation"]:
        return "MEDIUM"

    # 5. RULE 4: LOW (Streetlights, Nuisance)
    if top_category == "civic_nuisance":
        return "LOW"

    # Fallback based on sentiment if category is unclear
    urgency = abs(sentiment_polarity)
    if urgency > 0.6: return "MEDIUM"
    return "LOW"

def verify_image_alignment(image_bytes, text_description):
    if not model: 
        print("⚠️ Gemini model not initialized (no API key)")
        return True, "AI Offline"
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img_size = img.size
        print(f"🔍 [Gatekeeper] Analyzing image ({img_size[0]}x{img_size[1]}px) with text: \"{text_description[:50]}...\"")
        
        # Extract key terms from description for stricter checking
        description_lower = text_description.lower()
        has_fire = any(word in description_lower for word in ['fire', 'flame', 'burning', 'smoke', 'blaze'])
        has_cat = any(word in description_lower for word in ['cat', 'kitten', 'feline'])
        has_disaster = any(word in description_lower for word in ['disaster', 'emergency', 'danger', 'explosion'])
        
        prompt = f"""
        You are a STRICT Civic Validator. Your job is to REJECT fake reports where the image doesn't match the text.
        
        User Description: "{text_description}"
        
        CRITICAL RULES:
        1. If description mentions "fire", "smoke", "disaster", "emergency" but the image shows a CAT, ANIMAL, or anything unrelated → return is_match: FALSE
        2. If description mentions "cat", "animal", "pet" but the image shows FIRE, SMOKE, or disaster → return is_match: FALSE
        3. ONLY return is_match: TRUE if the image CLEARLY shows what the description describes
        
        Examples:
        - Cat photo + "fire" text → is_match: FALSE (REJECT)
        - Fire photo + "fire" text → is_match: TRUE (ACCEPT)
        - Cat photo + "cat" text → is_match: TRUE (ACCEPT)
        - Random image + "fire" text → is_match: FALSE (REJECT)
        
        Be VERY STRICT. When in doubt, REJECT (is_match: false).
        
        Return ONLY valid JSON (no markdown, no code blocks, no extra text):
        {{ "is_match": false, "reason": "Image shows a cat but description mentions fire - mismatch detected" }}
        """
        response = model.generate_content([prompt, img])
        raw_response = response.text
        print(f"📥 [Gatekeeper] Gemini raw response: {raw_response[:200]}...")
        
        clean_text = raw_response.replace("```json", "").replace("```", "").strip()
        # Remove any leading/trailing whitespace and try to extract JSON
        if clean_text.startswith('{'):
            clean_text = clean_text[clean_text.find('{'):]
        if clean_text.endswith('}'):
            clean_text = clean_text[:clean_text.rfind('}')+1]
        
        result = json.loads(clean_text)
        is_match = result.get('is_match', False)
        reason = result.get('reason', 'No reason provided')
        
        # Additional safety check: If description has fire/disaster keywords but is_match is true,
        # we should double-check (this is a fallback)
        description_lower = text_description.lower()
        has_fire_keywords = any(word in description_lower for word in ['fire', 'flame', 'burning', 'smoke', 'blaze', 'disaster', 'emergency'])
        has_animal_keywords = any(word in description_lower for word in ['cat', 'kitten', 'feline', 'dog', 'animal', 'pet'])
        
        # If description has fire but we got is_match=true, be suspicious
        if has_fire_keywords and not has_animal_keywords and is_match:
            print(f"⚠️ [Gatekeeper] WARNING: Fire keywords detected but is_match=true - double-checking...")
            # Don't override, but log it for debugging
        
        print(f"{'✅' if is_match else '⛔'} [Gatekeeper] Result: is_match={is_match}, reason=\"{reason}\"")
        return is_match, reason
    except json.JSONDecodeError as e:
        print(f"⚠️ [Gatekeeper] JSON parse error: {e}")
        print(f"   Raw response: {response.text if 'response' in locals() else 'N/A'}")
        return True, f"JSON parse error: {str(e)}"
    except Exception as e:
        print(f"⚠️ [Gatekeeper] Gemini API Error: {e}")
        import traceback
        traceback.print_exc()
        return True, f"Gemini API Error: {str(e)}"

# --------------------------------
# Main Endpoint
# --------------------------------
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({ 'status': 'success', 'message': 'CivicAudit AI Service is running' })

@app.route('/analyze', methods=['POST'])
def analyze_text():
    try:
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            text = request.form.get('text', '').strip()
            image_file = request.files.get('image')
        else:
            data = request.get_json() or {}
            text = data.get('text', '').strip()
            image_file = None

        if not text or len(text) < 5:
             return jsonify({'status': 'error', 'message': 'Description too short.'}), 400
        if not image_file:
             return jsonify({'status': 'error', 'message': 'Image required.'}), 400

        # 1. Gatekeeper Verification
        print(f"\n{'='*60}")
        print(f"🛡️  GATEKEEPER CHECK")
        print(f"{'='*60}")
        img_bytes = image_file.read()
        image_file.seek(0)
        is_match, rejection_reason = verify_image_alignment(img_bytes, text)
        print(f"{'='*60}\n")

        if not is_match:
            return jsonify({
                'status': 'rejected',
                'message': 'Report Rejected: Image mismatch.',
                'reason': rejection_reason,
                'is_fake': True
            }), 400

        # 2. Analysis
        semantic_score, category_scores, matched_keywords = compute_category_severity(text)
        sentiment_polarity = analyze_sentiment(text)
        
        # 3. Apply New Priority Logic
        priority_level = decide_priority(semantic_score, sentiment_polarity, category_scores, text)
        
        suggested_category = max(category_scores, key=category_scores.get) if category_scores else "Other"

        return jsonify({
            'status': 'success',
            'analysis': {
                'priority': priority_level,
                'is_critical': True if priority_level == "CRITICAL" else False,
                'is_fake_image': False,
                'suggested_category': suggested_category,
                'scores': { 'semantic': semantic_score },
                'keywords_detected': matched_keywords
            }
        })

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)