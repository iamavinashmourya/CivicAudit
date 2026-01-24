# Profile Management and Map Display Enhancements

## Overview
This PR implements comprehensive profile management features, enhances map display logic, and improves report visibility and sorting on the Nearby Reports page.

## Key Features

### 1. Profile Page Enhancements
- **Full API Integration**: Profile page now fetches and displays all user data from the API
- **Edit Profile Functionality**: Users can edit their name, gender, and date of birth
- **Auto-calculated Age**: Age is automatically calculated from date of birth (no manual age input)
- **Profile Picture Display**: Profile photos are properly displayed in sidebar and profile page
- **Data Display**: All profile fields are now displayed according to API data:
  - Profile photo (with fallback to name initial)
  - Name, phone number, gender, age, date of birth
  - Aadhaar number (masked for security - shows only last 4 digits)
  - Ward/Area name
  - Account role
  - Member since date
  - Verification status

### 2. Map Display Logic
- **User's Verified Reports on Map**: User's own reports now appear on the map if they are verified
- **Nearby Reports Exclusion**: User's own reports are excluded from the Nearby Reports page (only other users' reports shown)
- **Backend Query Logic**:
  - Returns user's own reports if status is `'Verified'`
  - Returns other users' reports with status `'Pending'`, `'Verified'`, or `'Resolved'`
  - Excludes `'Rejected'` and `'Deleted'` reports

### 3. Nearby Reports Sorting
- **Priority-Based Sorting**: Reports are sorted by priority (CRITICAL and HIGH first, then MEDIUM and LOW)
- **Date Sorting Within Priority**: Within each priority level, reports are sorted by creation date (newest first)
- **Sorting Order**:
  1. CRITICAL reports (newest first)
  2. HIGH reports (newest first)
  3. MEDIUM reports (newest first)
  4. LOW reports (newest first)

## Technical Changes

### Backend Changes

#### `backend/routes/profile.js`
- **New Endpoint**: `GET /api/profile` - Returns full user profile data
- **Updated Endpoint**: `PUT /api/profile/identity` - Now requires `dateOfBirth` and auto-calculates age
  - Removed age as a direct input field
  - Age is automatically calculated from date of birth

#### `backend/routes/reports.js`
- **Updated Query**: `GET /api/reports/nearby` - Modified to include user's own verified reports
  - Uses `$or` query to handle two cases:
    1. User's own reports: only if `status === 'Verified'`
    2. Other users' reports: if status is `'Pending'`, `'Verified'`, or `'Resolved'`

### Frontend Changes

#### `frontend/src/pages/Profile.jsx`
- **API Integration**: Fetches full profile from `GET /api/profile` endpoint
- **Edit Functionality**: Connected to `PUT /api/profile/identity` API
- **Removed Age Input**: Age field is now read-only and auto-calculated
- **Removed Phone Number Edit**: Phone number is read-only (cannot be changed)
- **Profile Photo Display**: Properly handles profile photo URLs from API
- **Data Display**: Shows all profile fields including ward name, role, and verification status

#### `frontend/src/components/Sidebar.jsx`
- **Profile Photo Display**: Updated to use `profilePhoto` field from API
- **Image URL Construction**: Properly handles relative and absolute image URLs
- **Error Handling**: Falls back to name initial if profile photo fails to load
- **Verification Badge**: Uses `isVerified` field instead of `onboardingCompleted`
- **Role Display**: Shows actual role from API (capitalized)

#### `frontend/src/pages/NearbyReports.jsx`
- **User's Reports Filter**: Filters out user's own reports from the list
- **Enhanced Sorting**: 
  - Groups CRITICAL and HIGH priority reports first
  - Sorts by date (newest first) within each priority level
- **User ID Detection**: Added `getCurrentUserId()` helper function

#### `frontend/src/pages/Dashboard.jsx`
- **Map Display**: Shows all reports from API including user's verified reports
- **No Filtering**: Map displays all reports returned by the API (filtering happens in backend)

#### `frontend/src/utils/api.js`
- **New Function**: `profileAPI.getProfile()` - Fetches full user profile
- **Existing Function**: `profileAPI.updateIdentity()` - Updates user identity (name, gender, dateOfBirth)

## API Changes

### New Endpoints
- `GET /api/profile` - Get full user profile
  - Returns: Complete user object with all fields

### Updated Endpoints
- `PUT /api/profile/identity` - Update user identity
  - **Breaking Change**: Now requires `dateOfBirth` (age is auto-calculated)
  - **Removed**: Direct `age` input parameter

- `GET /api/reports/nearby` - Get nearby reports
  - **Behavior Change**: Now includes user's own reports if verified
  - Returns user's verified reports + other users' reports (Pending/Verified/Resolved)

## User Experience Improvements

1. **Profile Management**:
   - Users can now edit their profile information
   - Age is automatically calculated, reducing errors
   - Profile picture is properly displayed throughout the app

2. **Map Visibility**:
   - Users can see their verified reports on the map
   - Provides better visibility of user's contribution to the community

3. **Report Discovery**:
   - Nearby Reports page shows only other users' reports (reduces clutter)
   - Priority-based sorting ensures critical issues are seen first
   - Date sorting ensures recent reports are prioritized within same priority

## Security Enhancements

- **Aadhaar Number Masking**: Only last 4 digits are displayed in profile
- **Phone Number Protection**: Phone number cannot be edited (read-only)

## Testing Recommendations

1. **Profile Page**:
   - Test profile data fetching and display
   - Test edit functionality (name, gender, date of birth)
   - Verify age calculation from date of birth
   - Test profile photo display and fallback

2. **Map Display**:
   - Verify user's verified reports appear on map
   - Verify user's pending reports do NOT appear on map
   - Verify other users' reports appear correctly

3. **Nearby Reports**:
   - Verify user's own reports are excluded
   - Verify sorting by priority and date
   - Verify CRITICAL and HIGH reports appear first

## Migration Notes

- **Profile API**: Existing code using `profileAPI.getStatus()` will continue to work
- **Age Field**: If any code directly sets age, it will now be auto-calculated from dateOfBirth
- **Report Visibility**: User's verified reports will now appear on map (previously excluded)

## Files Changed

### Backend
- `backend/routes/profile.js` - Added GET endpoint, updated PUT endpoint
- `backend/routes/reports.js` - Updated nearby reports query logic

### Frontend
- `frontend/src/pages/Profile.jsx` - Complete profile page overhaul
- `frontend/src/components/Sidebar.jsx` - Profile photo display updates
- `frontend/src/pages/NearbyReports.jsx` - Filtering and sorting enhancements
- `frontend/src/pages/Dashboard.jsx` - Map display logic (no changes needed, uses API response)
- `frontend/src/utils/api.js` - Added getProfile function

## Related Issues
- Profile page not showing all user data
- Age should be auto-calculated from date of birth
- User's verified reports should be visible on map
- Nearby reports should exclude user's own reports
- Reports should be sorted by priority and date
