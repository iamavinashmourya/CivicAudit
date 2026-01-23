# Backend API Summary - Ready for Frontend Integration

## Overview

All backend APIs for Phase 2 (Reporting Engine) are complete and tested. This document provides a quick reference for the frontend developer.

---

## Base URL

```
http://localhost:5002/api
```

---

## Authentication

All report endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

**How to get a token:**
1. `POST /api/auth/send-otp` with `{ phoneNumber: "+919876543210" }`
2. Check backend console for OTP code
3. `POST /api/auth/verify-otp` with `{ phoneNumber: "+919876543210", otp: "123456" }`
4. Response includes `token` field - use this for all report API calls

---

## Report APIs

### 1. Create Report

**Endpoint:** `POST /api/reports`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (form-data):**
- `title` (string, required): Report title
- `category` (string, required): Report category (e.g., "Road", "Water", "Garbage", "Electricity")
- `lat` (number, required): Latitude
- `lng` (number, required): Longitude
- `image` (file, required): Image file (JPG/PNG, max 5MB)

**Success Response (201):**
```json
{
  "success": true,
  "report": {
    "_id": "...",
    "userId": "...",
    "title": "Pothole on Main Road",
    "category": "Road",
    "imageUrl": "/uploads/reports/report-1234567890-987654321.jpg",
    "location": {
      "type": "Point",
      "coordinates": [73.1812, 22.3072]
    },
    "status": "Pending",
    "createdAt": "2026-01-21T..."
  }
}
```

**Error Responses:**
- `400`: Missing required fields, invalid coordinates, or missing image
- `401`: No token or invalid token
- `500`: Server error

---

### 2. Get Nearby Reports

**Endpoint:** `GET /api/reports/nearby?lat=<latitude>&lng=<longitude>`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `lat` (number, required): Latitude
- `lng` (number, required): Longitude

**Success Response (200):**
```json
{
  "success": true,
  "reports": [
    {
      "_id": "...",
      "userId": {
        "_id": "...",
        "name": "John Doe"
      },
      "title": "Pothole on Main Road",
      "category": "Road",
      "imageUrl": "/uploads/reports/report-1234567890-987654321.jpg",
      "location": {
        "type": "Point",
        "coordinates": [73.1812, 22.3072]
      },
      "status": "Pending",
      "createdAt": "2026-01-21T..."
    }
  ]
}
```

**Notes:**
- Returns reports within **2km radius** of the given coordinates
- Results are sorted by distance (closest first)
- Empty array `[]` if no reports found nearby

**Error Responses:**
- `400`: Missing or invalid lat/lng parameters
- `401`: No token or invalid token
- `500`: Server error

---

## Image URLs

Report images are accessible via:

```
http://localhost:5002/uploads/reports/<filename>
```

Example:
```
http://localhost:5002/uploads/reports/report-1234567890-987654321.jpg
```

---

## Data Models

### Report Object

```typescript
{
  _id: string;
  userId: string | UserObject;
  title: string;
  category: string;
  imageUrl: string;  // Relative path: /uploads/reports/...
  location: {
    type: "Point";
    coordinates: [number, number];  // [longitude, latitude]
  };
  status: "Pending" | "Verified" | "Resolved";
  createdAt: string;  // ISO date string
}
```

### Location Format

- **Storage:** `[longitude, latitude]` (GeoJSON standard)
- **Input:** `lat` and `lng` as separate form fields
- **Output:** `location.coordinates[0]` = lng, `location.coordinates[1]` = lat

---

## Frontend Integration Checklist

- [ ] Get JWT token from `/api/auth/verify-otp` after OTP verification
- [ ] Store token in localStorage or state management
- [ ] Include `Authorization: Bearer <token>` header in all report API calls
- [ ] Use `FormData` for creating reports (multipart/form-data)
- [ ] Handle image upload with file input (accept="image/jpeg,image/png")
- [ ] Display images using full URL: `http://localhost:5002/uploads/reports/...`
- [ ] Parse location coordinates correctly: `[lng, lat]` format
- [ ] Handle error responses (400, 401, 500) with user-friendly messages

---

## Testing

See `TESTING.md` for detailed testing instructions.

Quick test scripts available:
- `test-curl.sh` (Linux/Mac)
- `test-curl.ps1` (Windows PowerShell)

---

## Common Frontend Patterns

### React Example: Create Report

```javascript
const createReport = async (title, category, lat, lng, imageFile) => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('category', category);
  formData.append('lat', lat.toString());
  formData.append('lng', lng.toString());
  formData.append('image', imageFile);

  const response = await fetch('http://localhost:5002/api/reports', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: formData,
  });

  const data = await response.json();
  return data;
};
```

### React Example: Get Nearby Reports

```javascript
const getNearbyReports = async (lat, lng) => {
  const response = await fetch(
    `http://localhost:5002/api/reports/nearby?lat=${lat}&lng=${lng}`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    }
  );

  const data = await response.json();
  return data.reports;
};
```

---

## Support

For questions or issues, refer to:
- `TESTING.md` - Detailed API testing guide
- Backend console logs for debugging
- MongoDB database for data verification
