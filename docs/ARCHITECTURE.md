# CivicAudit Architecture Documentation

## System Overview

CivicAudit follows a **Microservices Architecture** with three main services:

1. **Frontend Service** (React + Vite PWA)
2. **Backend API Service** (Node.js/Express)
3. **AI Microservice** (Python/Flask)

## Architecture Diagram

```
┌─────────────────┐
│   User Browser  │
│   (PWA Client)  │
└────────┬────────┘
         │
         │ HTTP/HTTPS
         │
┌────────▼─────────────────────────────────┐
│         Frontend (React + Vite)          │
│  - Fast Development & Build              │
│  - PWA Capabilities                      │
│  - Leaflet Maps                          │
└────────┬─────────────────────────────────┘
         │
         │ REST API Calls
         │
┌────────▼─────────────────────────────────┐
│      Backend API (Express.js)             │
│  - Request Handling                       │
│  - Authentication                         │
│  - File Uploads                           │
│  - Geospatial Queries                     │
└────────┬──────────────┬───────────────────┘
         │              │
         │              │ AI Analysis Requests
         │              │
         │              │
┌────────▼────────┐    ┌▼──────────────────┐
│   MongoDB       │    │  AI Service       │
│   Database      │    │  (Python/Flask)   │
│                 │    │  - NLTK           │
│  - Reports      │    │  - TextBlob       │
│  - Users        │    │  - Sentiment      │
│  - Votes        │    │  - Keywords       │
└─────────────────┘    └───────────────────┘
```

## Data Flow

### 1. Report Submission Flow
```
User → Frontend → Backend API → AI Service (Analysis)
                              ↓
                         MongoDB (Save Report)
                              ↓
                         Backend → Frontend (Confirmation)
```

### 2. Admin Resolution Flow
```
Admin → Backend API → MongoDB (Update Status)
                              ↓
                         Backend (Jury Selection)
                              ↓
                         MongoDB (Find Nearby Users)
                              ↓
                         Push Notifications → Jurors
```

### 3. Verification Flow
```
Jurors → Frontend → Backend API → MongoDB (Update Votes)
                                         ↓
                                    Check Consensus (2/3)
                                         ↓
                                    Close or Reopen Ticket
```

## Database Schema (MongoDB)

### Reports Collection
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  beforeImage: String,
  afterImage: String,
  status: String, // "active", "resolved", "verification_pending", "closed", "reopened"
  priorityLevel: Number,
  semanticScore: Number,
  sentimentPolarity: Number,
  upvotes: Number,
  upvoteVelocity: Number,
  reportedBy: ObjectId, // User reference
  resolvedBy: ObjectId, // Admin reference
  juryVotes: [{
    userId: ObjectId,
    vote: String, // "yes" or "no"
    timestamp: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String, // Hashed
  role: String, // "citizen", "admin"
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  pushToken: String, // For notifications
  createdAt: Date
}
```

## API Endpoints

### Reports
- `POST /api/reports` - Create new report
- `GET /api/reports` - Get reports (with filters)
- `GET /api/reports/:id` - Get single report
- `PUT /api/reports/:id/upvote` - Upvote report
- `PUT /api/reports/:id/resolve` - Mark as resolved (Admin)
- `POST /api/reports/:id/verify` - Jury vote

### Admin
- `GET /api/admin/reports` - Get all reports with priority sorting
- `PUT /api/admin/reports/:id/resolve` - Resolve with proof

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

## Geospatial Queries

### Duplicate Detection (20m radius)
```javascript
db.reports.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [lng, lat] },
      $maxDistance: 20
    }
  },
  status: { $in: ["active", "verification_pending"] }
})
```

### Jury Selection (500m radius)
```javascript
db.users.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [lng, lat] },
      $maxDistance: 500
    }
  },
  role: "citizen",
  _id: { $ne: currentUserId }
}).limit(3)
```

## Priority Algorithm

```javascript
priorityLevel = (semanticScore * 0.5) + 
                ((sentimentPolarity + 1) * 5) + 
                (upvoteVelocity * 0.3)
```

Where:
- `semanticScore`: 0-10 (from AI keyword matching)
- `sentimentPolarity`: -1 to +1 (from TextBlob)
- `upvoteVelocity`: Number of upvotes in last hour

## Security Considerations

1. **Authentication**: JWT tokens for API access
2. **Authorization**: Role-based access control (Citizen vs Admin)
3. **File Uploads**: Validation and size limits
4. **Geospatial Data**: Sanitize coordinates
5. **Double-Blind Voting**: Jurors don't know admin identity

## Scalability

- **Horizontal Scaling**: Each service can scale independently
- **Database**: MongoDB sharding for large datasets
- **Caching**: Redis (future implementation)
- **CDN**: For static assets and images
