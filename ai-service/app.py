from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# CORS configuration
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5000').split(',')
CORS(app, origins=cors_origins)

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'success',
        'message': 'CivicAudit AI Service is running'
    })

@app.route('/api/analyze', methods=['POST'])
def analyze_text():
    """
    Analyze text for danger keywords and sentiment
    Returns: priority score, semantic score, sentiment polarity
    """
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        # TODO: Implement AI analysis using NLTK and TextBlob
        # - Extract danger keywords
        # - Calculate sentiment polarity
        # - Return priority score
        
        return jsonify({
            'status': 'success',
            'semantic_score': 0,
            'sentiment_polarity': 0,
            'priority_level': 0,
            'danger_keywords': []
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
