# CivicAudit

**A Trust-Based Hyperlocal Civic Grievance Platform**

CivicAudit is a Progressive Web Application (PWA) designed to bridge the trust gap between citizens and municipal authorities. Unlike traditional grievance portals, CivicAudit operates as a Verification Engine using AI to prioritize life-threatening hazards and a decentralized "Citizen Jury" system to validate government work completion.

## 🏗️ Project Structure

```
CivicAudit/
├── frontend/          # React + Vite PWA Application
├── backend/           # Node.js Express API Server
├── ai-service/         # Python Flask AI Microservice
└── docs/              # Project Documentation
```

## 🚀 Technology Stack

### Frontend
- **React.js** with **Vite** (Lightweight, Fast Build Tool)
- **Vite PWA Plugin** (PWA capabilities)
- **Leaflet.js** + **OpenStreetMap** (Maps)
- **Axios** (HTTP Client)

### Backend
- **Node.js** + **Express.js** (API Server)
- **MongoDB** + **Mongoose** (Database)
- **Multer** (File Uploads)
- **JWT** (Authentication)

### AI Service
- **Python** + **Flask** (AI Microservice)
- **NLTK** (Natural Language Processing)
- **TextBlob** (Sentiment Analysis)

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **MongoDB** (v5.0 or higher)
- **npm** or **yarn**

## 🛠️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/iamavinashmourya/CivicAudit.git
cd CivicAudit
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Edit .env with your configuration
npm run dev
```

**Environment Variables (.env):**
- `PORT=5000`
- `MONGODB_URI=mongodb://localhost:27017/civicaudit`
- `JWT_SECRET=your_secret_key`
- `AI_SERVICE_URL=http://localhost:5001`
- `CORS_ORIGIN=http://localhost:3000`

### 3. AI Service Setup
```bash
cd ai-service
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env  # Edit .env with your configuration
python app.py
```

**Environment Variables (.env):**
- `PORT=5001`
- `FLASK_ENV=development`
- `CORS_ORIGINS=http://localhost:3000,http://localhost:5000`

### 4. Frontend Setup
```bash
cd frontend
npm install
cp env.example .env  # Edit .env with your configuration
npm run dev
```

**Environment Variables (.env):**
- `VITE_API_URL=http://localhost:5000/api`
- `VITE_AI_SERVICE_URL=http://localhost:5001`

## 🔄 Core Workflow

### Phase 1: Intelligent Reporting
- **Geo-Grid Duplicate Detection**: Prevents duplicate reports within 20m radius
- **AI Triage**: Scans for danger keywords and performs sentiment analysis
- **Critical Priority Flagging**: Instantly flags life-threatening hazards

### Phase 2: Resolution & Action
- **Admin Dashboard**: Hybrid priority scoring algorithm
- **Proof of Work**: Upload after photos
- **Status**: Changes to `Verification_Pending`

### Phase 3: Citizen Jury Verification
- **Jury Selection**: 3 random users within 500m radius
- **Double-Blind Voting**: 2/3 consensus required
- **Ticket Closure**: Permanent closure or fraud flagging

## 📁 Directory Structure

### Backend
```
backend/
├── routes/          # API route handlers
├── models/          # MongoDB schemas
├── controllers/     # Business logic
├── middleware/      # Custom middleware
├── config/          # Configuration files
└── uploads/         # Uploaded files storage
```

### Frontend
```
frontend/
├── src/             # Source files
│   ├── components/  # React components
│   ├── hooks/       # Custom React hooks
│   ├── utils/       # Utility functions
│   └── styles/      # CSS/styling
├── public/          # Static assets
└── index.html       # HTML entry point
```

### AI Service
```
ai-service/
├── services/        # AI processing services
└── utils/           # Utility functions
```

## 🔐 Environment Variables

Create `.env` files in each service directory based on `.env.example` files. Never commit `.env` files to version control.

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Commit: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature-name`
5. Create a Pull Request

## 📝 License

ISC

## 👥 Team

Multiple teammates can work on this project. Each service can be developed independently.

---

**Note**: Make sure MongoDB is running before starting the backend server.
