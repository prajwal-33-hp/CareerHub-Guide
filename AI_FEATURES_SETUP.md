# CareerHub AI Features Setup Guide

## ✅ Completed Fixes & Features

### 1. **Profile Image Upload Issue - FIXED**
The profile image upload was failing due to Content-Type header conflicts. Fixed in three files:
- **client/src/services/api.js** - Now correctly handles FormData without forcing `application/json`
- **client/src/pages/student/Profile.jsx** - Properly stringifies JSON fields in FormData
- **server/controllers/userController.js** - Added JSON parsing for FormData fields

**What was wrong:** The axios interceptor was forcing `Content-Type: application/json` for all requests, but FormData requires the browser to set the content type with a boundary. Now the upload will save correctly!

### 2. **AI Features Added**
Four powerful AI-powered features have been added using Google Gemini:

#### 🎯 Career Recommendations
- **Path:** `/student/dashboard/career-recommendations`
- **Features:** Analyzes your skills and suggests 3-5 career paths
- **Output:** Career paths, salary ranges, industry demand, skills gap, and next steps

#### 📊 Skill Gap Analysis  
- **Path:** `/student/dashboard/skill-gap`
- **Features:** Identifies missing skills for your target role
- **Output:** Readiness percentage, skill breakdown with priority levels, learning resources

#### 🗺️ Personalized Learning Roadmap
- **Path:** `/student/dashboard/learning-roadmap`
- **Features:** Creates a month-by-month learning plan
- **Output:** Timeline, courses, projects, milestones, portfolio projects, interview prep

#### 📄 AI Resume Analyzer
- **Path:** `/student/dashboard/resume-analyzer`
- **Features:** Analyzes your resume and provides improvement suggestions
- **Output:** Score, strengths, weaknesses, ATS optimization, keywords, action items

---

## 🚀 Getting Started - Setup Instructions

### Step 1: Get Google Gemini API Key

1. Go to https://aistudio.google.com/app/apikeys
2. Click "Create API Key"
3. Choose "Create API key in new project"
4. Copy your API key (it will look like: `AIzaSyD...`)

### Step 2: Update Environment Variables

**For Server (.env file):**

```bash
# Open server/.env and add/update:
GEMINI_API_KEY=your_google_gemini_api_key_here
```

Example:
```
GEMINI_API_KEY=AIzaSyD-1234567890abcdefghijklmnopqrstuvwxyz
```

**For Client (.env file):**
No changes needed for the client - it uses the backend API

### Step 3: Install Dependencies

**Install server packages:**
```bash
cd server
npm install
```

This will install the `@google/generative-ai` package (already added to package.json)

### Step 4: Restart the Server

```bash
# In the server directory
npm run dev
```

You should see:
```
CareerHub API running on port 5000
```

### Step 5: Test the Features

1. Go to Student Dashboard
2. In the sidebar under "AI CAREER TOOLS", you'll see:
   - Career Recommendations
   - Skill Gap Analysis
   - Learning Roadmap
   - Resume Analyzer

3. Make sure you have skills added to your profile first!

---

## 📝 API Endpoints

All endpoints require authentication (Bearer token in header):

### Career Recommendations
```
POST /api/ai/career-recommendations
Content-Type: application/json
Authorization: Bearer <token>

Response: { recommendations: [...] }
```

### Skill Gap Analysis
```
POST /api/ai/skill-gap-analysis
Content-Type: application/json
Authorization: Bearer <token>

Body: { targetRole: "Senior Developer" }
Response: { analysis: {...} }
```

### Learning Roadmap
```
POST /api/ai/learning-roadmap
Content-Type: application/json
Authorization: Bearer <token>

Body: { targetRole: "Full Stack Developer" }
Response: { roadmap: {...} }
```

### Resume Analysis
```
POST /api/ai/resume-analysis
Content-Type: application/json
Authorization: Bearer <token>

Body: { resumeText: "Your resume content here..." }
Response: { analysis: {...} }
```

---

## 🔧 File Structure

### New Files Created:

**Backend:**
- `server/services/aiService.js` - All AI logic using Gemini API
- `server/controllers/aiController.js` - API route handlers
- `server/routes/aiRoutes.js` - API route definitions

**Frontend:**
- `client/src/pages/student/CareerRecommendations.jsx`
- `client/src/pages/student/SkillGapAnalysis.jsx`
- `client/src/pages/student/LearningRoadmap.jsx`
- `client/src/pages/student/ResumeAnalyzer.jsx`

### Modified Files:

**Backend:**
- `server/server.js` - Added AI routes
- `server/package.json` - Added Gemini API package
- `server/.env.example` - Added GEMINI_API_KEY
- `server/controllers/userController.js` - Fixed FormData parsing

**Frontend:**
- `client/src/services/api.js` - Fixed Content-Type handling
- `client/src/context/AuthContext.jsx` - Simplified profile update
- `client/src/pages/student/Profile.jsx` - Fixed FormData stringification
- `client/src/pages/student/Dashboard.jsx` - Added AI feature navigation
- `client/src/routes/AppRoutes.jsx` - Added AI feature routes

---

## 🐛 Troubleshooting

### "GEMINI_API_KEY not found" error
- Ensure you've set the API key in `server/.env`
- Restart the server after adding the key
- Check that there are no extra spaces in the API key

### Profile upload still not working
- Clear browser cache
- Restart both client and server
- Check server logs for error messages
- Ensure `/server/uploads` folder exists

### AI features return raw text instead of JSON
- This is normal - the service falls back to raw text if JSON parsing fails
- The components will still display the results

### Rate limiting issues
- Google Gemini has free tier limits (~60 requests/minute)
- For production, consider upgrading your plan

---

## 💡 Usage Tips

1. **Add Skills First:** Make sure your profile has skills before using Career Recommendations
2. **Be Specific:** Use clear job titles (e.g., "Senior React Developer" not just "Developer")
3. **Review Resume:** Paste your entire resume in Resume Analyzer for best results
4. **Follow Roadmap:** The learning roadmap is personalized - follow the month-by-month plan
5. **Update Profile:** Keep your profile updated with latest skills and projects for better recommendations

---

## 🔐 Security Notes

- API keys are stored on the backend only - never exposed to frontend
- All AI endpoints require authentication
- Rate limiting is enabled on all API routes
- Resume data is only used for analysis, not stored

---

## 📈 What's Next?

You can enhance these features with:
- **Persistence:** Save analysis results to database
- **History:** Track recommendations over time
- **Sharing:** Export reports as PDF
- **Notifications:** Alert users when new opportunities match their skills
- **Integration:** Connect with LinkedIn/GitHub for auto-profile population
- **Advanced ML:** Use ML models for better predictions

---

## ❓ Questions or Issues?

1. Check the troubleshooting section above
2. Review the component files for implementation details
3. Check Google Gemini API documentation: https://ai.google.dev
4. Ensure all dependencies are installed: `npm install`

Enjoy your new AI-powered career features! 🎉
