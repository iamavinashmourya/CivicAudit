from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from textblob import TextBlob

# --------------------------------
# Load environment variables
# --------------------------------
load_dotenv()

app = Flask(__name__)

# --------------------------------
# CORS configuration
# --------------------------------
cors_origins = os.getenv(
    'CORS_ORIGINS',
    'http://localhost:3000,http://localhost:5000'
).split(',')
CORS(app, origins=cors_origins)


# TODO: Implement AI analysis using NLTK and TextBlob 
# - Extract danger keywords 
# - Calculate sentiment polarity 
# - Return priority score

# --------------------------------
# Weighted danger keywords
# --------------------------------
CIVIC_KEYWORDS = {
    "electricity": {
        "electric": 0.9,
        "wire": 0.8,
        "exposed": 0.9,
        "short circuit": 1.0,
        "electric pole": 0.9
    },
    "water_sanitation": {
        "open drain": 0.7,
        "sewage": 0.6,
        "leakage": 0.6,
        "dirty water": 0.7
    },
    "road_infra": {
        "pothole": 0.7,
        "collapsed": 0.9,
        "accident": 0.9,
        "road damage": 0.6
    },
    "disaster": {
        "flood": 0.8,
        "fire": 1.0,
        "gas leak": 1.0
    }
}

# --------------------------------
# AI helper functions
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

    # Overall severity = max category severity
    overall_severity = max(category_scores.values(), default=0.0)

    return overall_severity, category_scores, matched_keywords

def analyze_sentiment(text):
    """
    Analyzes sentiment polarity using TextBlob.
    Returns polarity value between -1 and +1.
    """
    blob = TextBlob(text)
    return blob.sentiment.polarity

def decide_priority(semantic_score, sentiment_polarity):
    # SAFETY OVERRIDE
    if semantic_score >= 0.85:
        return "CRITICAL"

    urgency_score = abs(sentiment_polarity)
    final_score = (0.7 * semantic_score) + (0.3 * urgency_score)

    if final_score >= 0.75:
        return "CRITICAL"
    elif final_score >= 0.5:
        return "HIGH"
    elif final_score >= 0.3:
        return "MEDIUM"
    else:
        return "LOW"

# --------------------------------
# Health check endpoint
# --------------------------------
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'success',
        'message': 'CivicAudit AI Service is running'
    })

# --------------------------------
# Main AI analysis endpoint
# --------------------------------
@app.route('/api/analyze', methods=['POST'])
def analyze_text():
    """
    Analyze civic complaint text using AI-based
    semantic risk and sentiment analysis.
    """
    try:
        data = request.get_json()
        text = data.get('text', '').strip()

        if not text:
            return jsonify({
                'status': 'error',
                'message': 'Text is required for analysis'
            }), 400

        # 1. Weighted semantic danger analysis
        semantic_score, category_scores, matched_keywords = compute_category_severity(text)

        # 2. Sentiment analysis
        sentiment_polarity = analyze_sentiment(text)

        # 3. Urgency score (emotional intensity)
        urgency_score = abs(sentiment_polarity)

        # 4. Priority classification
        priority_level = decide_priority(semantic_score, sentiment_polarity)

        # 5. Danger flag
        danger_flag = True if priority_level == "CRITICAL" else False

        return jsonify({
            'status': 'success',
            'semantic_score': round(semantic_score, 2),
            'sentiment_polarity': round(sentiment_polarity, 2),
            'urgency_score': round(urgency_score, 2),
            'priority_level': priority_level,
            'danger_flag': danger_flag,
            "category_scores": category_scores,
            "matched_keywords": matched_keywords
        })

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# --------------------------------
# Run the AI service
# --------------------------------
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
