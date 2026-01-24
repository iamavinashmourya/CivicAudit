from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import io

# Set environment variable BEFORE importing transformers
os.environ['TRANSFORMERS_NO_TF'] = '1'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import cv2
import numpy as np
from PIL import Image
from textblob import TextBlob

import torch
from ultralytics import YOLO
from transformers import CLIPProcessor, CLIPModel

# -------------------------------------------------
# App Setup
# -------------------------------------------------
load_dotenv()
app = Flask(__name__)

cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:5002"
).split(",")
CORS(app, origins=cors_origins)

device = "cuda" if torch.cuda.is_available() else "cpu"

# -------------------------------------------------
# Load Models
# -------------------------------------------------
print(f"Loading models on device: {device}")
yolo_model = YOLO("yolov8n.pt")
print("✓ YOLO model loaded")

clip_processor = CLIPProcessor.from_pretrained(
    "openai/clip-vit-base-patch32"
)
print("✓ CLIP processor loaded")

clip_model = CLIPModel.from_pretrained(
    "openai/clip-vit-base-patch32"
).to(device)
print("✓ CLIP model loaded")

# -------------------------------------------------
# YOLO Junk Objects (hard reject if ANY present)
# -------------------------------------------------
JUNK_OBJECTS = {
    "cat", "dog", "cow", "horse", "sheep",
    "bird", "chair", "bed", "sofa",
    "tv", "laptop", "phone", "food", "pizza",
    "cake", "bottle", "cup", "fork", "knife",
    "spoon", "bowl"
}

# -------------------------------------------------
# Civic Keywords (TEXT VALIDATION)
# -------------------------------------------------
CIVIC_KEYWORDS = [
    "road", "street", "footpath", "pothole", "crack", "accident",
    "garbage", "trash", "waste", "dump", "litter",
    "water", "leak", "sewage", "flood", "drainage",
    "electric", "wire", "streetlight", "transformer", "pole",
    "fire", "smoke", "explosion", "factory",
    "bridge", "sidewalk", "pavement", "manhole", "gutter"
]

# -------------------------------------------------
# CLIP Civic Relevance Prompts
# -------------------------------------------------
CIVIC_CLIP_PROMPT = (
    "road damage, pothole, cracked road, garbage dump, water leakage, "
    "electric hazard, broken streetlight, fire, smoke, flood, "
    "public infrastructure problem, civic issue, municipal problem"
)

NON_CIVIC_PROMPT = (
    "person, animal, pet, food, furniture, indoor scene, "
    "nature scenery, beautiful landscape, selfie, portrait"
)

# FIXED THRESHOLDS (more realistic)
DESCRIPTION_MATCH_THRESHOLD = 0.20  # Image-description alignment
CIVIC_IMAGE_THRESHOLD = 0.22        # Image must be civic-related
CIVIC_VS_NONCIVIC_MARGIN = 0.05     # Civic score must exceed non-civic

# -------------------------------------------------
# YOLO Detection
# -------------------------------------------------
def detected_objects_from_image(cv_image):
    """Detect objects in image using YOLO"""
    try:
        results = yolo_model(cv_image, verbose=False)
        detected = {
            yolo_model.names[int(cls)]
            for cls in results[0].boxes.cls
        }
        return detected
    except Exception as e:
        print(f"YOLO detection error: {e}")
        return set()

# -------------------------------------------------
# FIXED CLIP Similarity Calculation
# -------------------------------------------------
def calculate_clip_similarity(image, text):
    """
    CORRECTED: Calculate cosine similarity between image and text
    Returns value in range [-1, 1], typically [0, 1] for similar content
    """
    try:
        inputs = clip_processor(
            text=[text],
            images=image,
            return_tensors="pt",
            padding=True
        ).to(device)
        
        with torch.no_grad():
            # Get normalized features
            image_features = clip_model.get_image_features(
                pixel_values=inputs['pixel_values']
            )
            text_features = clip_model.get_text_features(
                input_ids=inputs['input_ids'],
                attention_mask=inputs['attention_mask']
            )
            
            # Normalize features
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            
            # Cosine similarity
            similarity = (image_features @ text_features.T).squeeze().item()
        
        return similarity
    except Exception as e:
        print(f"CLIP similarity error: {e}")
        return 0.0

# -------------------------------------------------
# FINAL IMAGE + TEXT VALIDATION PIPELINE
# -------------------------------------------------
def validate_image_and_text(image_bytes, text):
    """
    ENFORCED ORDER (FIXED):
    1. Image ↔ description match (CORRECTED CLIP)
    2. Image is civic-related (CORRECTED CLIP with contrast)
    3. Description contains civic keywords
    """
    
    # Decode image
    np_img = np.frombuffer(image_bytes, np.uint8)
    cv_image = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
    
    if cv_image is None:
        return False, "Invalid image file", {}
    
    text = text.strip()
    if not text:
        return False, "Description cannot be empty", {}
    
    text_lower = text.lower()
    
    # -------------------------------------------------
    # STEP 0: YOLO – reject if ANY junk objects detected
    # -------------------------------------------------
    detected = detected_objects_from_image(cv_image)
    junk_found = detected & JUNK_OBJECTS
    
    if junk_found:
        return False, (
            f"Image contains non-civic objects: {', '.join(junk_found)}. "
            "Please upload an image related to a civic issue."
        ), {"detected_objects": list(detected)}
    
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    
    # -------------------------------------------------
    # STEP 1: Image ↔ Description match (FIXED CLIP)
    # -------------------------------------------------
    desc_similarity = calculate_clip_similarity(image, text)
    
    if desc_similarity < DESCRIPTION_MATCH_THRESHOLD:
        return False, (
            f"Image and description do not match "
            f"(similarity: {round(desc_similarity, 3)})"
        ), {
            "description_match_score": round(desc_similarity, 3),
            "threshold": DESCRIPTION_MATCH_THRESHOLD
        }
    
    # -------------------------------------------------
    # STEP 2: Image must be CIVIC (FIXED CLIP with contrast)
    # -------------------------------------------------
    civic_similarity = calculate_clip_similarity(image, CIVIC_CLIP_PROMPT)
    noncivic_similarity = calculate_clip_similarity(image, NON_CIVIC_PROMPT)
    
    # Image must score higher on civic than non-civic
    if civic_similarity < CIVIC_IMAGE_THRESHOLD:
        return False, (
            f"Image does not appear to be civic-related "
            f"(civic score: {round(civic_similarity, 3)})"
        ), {
            "civic_score": round(civic_similarity, 3),
            "non_civic_score": round(noncivic_similarity, 3),
            "threshold": CIVIC_IMAGE_THRESHOLD
        }
    
    if civic_similarity < noncivic_similarity + CIVIC_VS_NONCIVIC_MARGIN:
        return False, (
            f"Image appears more non-civic than civic "
            f"(civic: {round(civic_similarity, 3)}, "
            f"non-civic: {round(noncivic_similarity, 3)})"
        ), {
            "civic_score": round(civic_similarity, 3),
            "non_civic_score": round(noncivic_similarity, 3)
        }
    
    # -------------------------------------------------
    # STEP 3: Description must contain civic keywords
    # -------------------------------------------------
    found_keywords = [k for k in CIVIC_KEYWORDS if k in text_lower]
    
    if not found_keywords:
        return False, (
            "Description does not contain civic-related keywords. "
            f"Please mention specific issues like: {', '.join(CIVIC_KEYWORDS[:8])}, etc."
        ), {"civic_keywords_found": []}
    
    return True, "Validated civic issue", {
        "description_match_score": round(desc_similarity, 3),
        "civic_score": round(civic_similarity, 3),
        "non_civic_score": round(noncivic_similarity, 3),
        "keywords_found": found_keywords,
        "detected_objects": list(detected) if detected else []
    }

# -------------------------------------------------
# Priority Logic (text-based)
# -------------------------------------------------
def decide_priority(text):
    """Determine priority based on keywords in text"""
    text = text.lower()
    if any(w in text for w in ["fire", "smoke", "explosion", "electric", "spark", "gas"]):
        return "CRITICAL"
    if any(w in text for w in ["accident", "pothole", "flood", "crack", "leak"]):
        return "HIGH"
    if any(w in text for w in ["garbage", "waste", "sewage", "litter"]):
        return "MEDIUM"
    return "LOW"

# -------------------------------------------------
# Verification Score Calculation
# -------------------------------------------------
def calculate_verification_score(desc_similarity, civic_similarity, keywords_found):
    """
    Calculate verification score (0-100) based on:
    - Image-description similarity (40 points)
    - Civic relevance (30 points)
    - Keyword match quality (30 points)
    """
    # Image-description match (0-40 points)
    # Scale similarity from [0.2, 0.6] to [0, 40]
    desc_score = min(40, max(0, (desc_similarity - 0.2) / 0.4 * 40))
    
    # Civic relevance (0-30 points)
    # Scale similarity from [0.22, 0.5] to [0, 30]
    civic_score = min(30, max(0, (civic_similarity - 0.22) / 0.28 * 30))
    
    # Keyword quality (0-30 points)
    # More keywords = higher score
    keyword_score = min(30, len(keywords_found) * 6)
    
    total_score = desc_score + civic_score + keyword_score
    return round(min(100, max(0, total_score)))

# -------------------------------------------------
# Dangerous Content Detection
# -------------------------------------------------
def detect_dangerous_content(text, civic_similarity, keywords_found):
    """
    Detect dangerous/critical content that requires immediate attention
    Returns: (is_dangerous: bool, danger_type: str|None)
    """
    text_lower = text.lower()
    
    # Fire/Explosion hazards
    fire_keywords = ["fire", "smoke", "explosion", "burning", "flame", "blaze"]
    if any(k in text_lower for k in fire_keywords):
        # Verify with civic similarity (should be high for real fire)
        if civic_similarity >= 0.25:
            return True, "fire"
    
    # Electrical hazards
    electrical_keywords = ["electric", "spark", "wire", "cable", "transformer", "electrocute", "voltage"]
    danger_electrical = ["sparking", "exposed wire", "hanging wire", "broken wire", "live wire"]
    if any(k in text_lower for k in electrical_keywords):
        # Check for danger indicators
        if any(d in text_lower for d in danger_electrical) or civic_similarity >= 0.28:
            return True, "electrical"
    
    # Severe flooding
    flood_keywords = ["flood", "flooding", "submerged", "water overflow", "severe water"]
    if any(k in text_lower for k in flood_keywords):
        if civic_similarity >= 0.25:
            return True, "flood"
    
    # Structural hazards
    structural_keywords = ["collapse", "collapsing", "falling", "unstable building", "crack building"]
    if any(k in text_lower for k in structural_keywords):
        if civic_similarity >= 0.26:
            return True, "structural"
    
    return False, None


# -------------------------------------------------
# Health Check
# -------------------------------------------------
@app.route("/", methods=["GET"])
def health():
    return jsonify({
        "status": "success",
        "message": "CivicAudit AI (FIXED 3-STEP VALIDATION) running",
        "device": device,
        "models_loaded": {
            "yolo": "yolov8n.pt",
            "clip": "openai/clip-vit-base-patch32"
        }
    })

# -------------------------------------------------
# Analyze Endpoint
# -------------------------------------------------
@app.route("/api/analyze", methods=["POST"])
@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        if not request.content_type or not request.content_type.startswith("multipart"):
            return jsonify({
                "status": "error",
                "message": "multipart/form-data required"
            }), 415
        
        text = request.form.get("text", "").strip()
        image_file = request.files.get("image")
        
        if not image_file:
            return jsonify({
                "status": "rejected",
                "message": "Please upload an image related to a civic problem",
                "is_fake": True
            }), 400
        
        image_bytes = image_file.read()
        
        # ---- FIXED VALIDATION ----
        is_valid, reason, debug_info = validate_image_and_text(image_bytes, text)
        
        if not is_valid:
            return jsonify({
                "status": "rejected",
                "message": reason,
                "is_fake": True,
                "debug": debug_info
            }), 400
        
        # ---- TRIAGE ----
        priority = decide_priority(text)
        urgency = abs(TextBlob(text).sentiment.polarity)
        
        # ---- VERIFICATION SCORE ----
        # Extract values from debug_info
        desc_similarity = debug_info.get('description_match_score', 0)
        civic_similarity = debug_info.get('civic_score', 0)
        keywords_found = debug_info.get('keywords_found', [])
        
        verification_score = calculate_verification_score(
            desc_similarity, 
            civic_similarity, 
            keywords_found
        )
        
        # ---- DANGEROUS CONTENT DETECTION ----
        is_dangerous, danger_type = detect_dangerous_content(
            text, 
            civic_similarity, 
            keywords_found
        )
        
        print(f"📊 Verification Score: {verification_score}/100")
        print(f"⚠️ Dangerous Content: {is_dangerous} (Type: {danger_type})")
        
        return jsonify({
            "status": "success",
            "analysis": {
                "priority": priority,
                "is_critical": priority == "CRITICAL",
                "urgency": round(urgency, 2),
                "verification_score": verification_score,
                "is_dangerous": is_dangerous,
                "danger_type": danger_type,
                "verification_reason": reason,
                "validation_details": debug_info
            }
        })
    
    except Exception as e:
        import traceback
        print(f"Error in /analyze: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500

# -------------------------------------------------
# Run
# -------------------------------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    print(f"\n{'='*60}")
    print(f"🚀 CivicAudit AI Service Starting")
    print(f"{'='*60}")
    print(f"Device: {device}")
    print(f"Port: {port}")
    print(f"{'='*60}\n")
    app.run(host="0.0.0.0", port=port, debug=True)