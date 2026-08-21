const { GoogleGenAI } = require('@google/genai')

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

// Priority fallback list for fast response and 100% availability
const FALLBACK_MODELS = [
  'gemini-3.7-flash',
  'gemini-3-flash-preview',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
]

/**
 * Resilient helper to execute content generation with automatic model failover
 */
const generateContentWithFallback = async (prompt) => {
  let lastErr = null
  for (const model of FALLBACK_MODELS) {
    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
      })
      if (result && result.text) {
        return result.text
      }
    } catch (err) {
      console.warn(`[Gemini API] ${model} failed (${err.status || err.message}), attempting fallback...`)
      lastErr = err
    }
  }
  throw lastErr || new Error('All AI models failed to respond.')
}

/**
 * Helper to safely extract JSON from Gemini text response
 */
const parseJsonFromResponse = (text) => {
  if (!text) return { raw: '' }
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: text }
  } catch (e) {
    try {
      const arrayMatch = text.match(/\[[\s\S]*\]/)
      return arrayMatch ? JSON.parse(arrayMatch[0]) : { raw: text }
    } catch (err) {
      return { raw: text }
    }
  }
}

/**
 * Career Recommendation Analysis
 */
const getCareerRecommendations = async (userProfile) => {
  const prompt = `
Based on the following user profile, provide specific and actionable career recommendations:

User Profile:
- Name: ${userProfile.name}
- Skills: ${userProfile.skills?.join(', ') || 'Not specified'}
- Education: ${userProfile.education?.map((e) => `${e.degree} from ${e.institute}`).join(', ') || 'Not specified'}
- About: ${userProfile.about || 'Not specified'}
- Projects: ${userProfile.projects?.map((p) => p.title).join(', ') || 'None specified'}

Please provide:
1. Top 3-5 career paths that match these skills
2. For each path, explain why it's a good fit
3. Required skills gap to pursue this path
4. Salary range expectations (approximate in USD and INR)
5. Industry demand for these roles
6. Next steps to pursue these careers

Format the response strictly as valid JSON:
{
  "recommendations": [
    {
      "careerPath": "string",
      "matchPercentage": number,
      "explanation": "string",
      "skillsGap": ["string"],
      "salaryRange": "string",
      "industryDemand": "High" | "Very High" | "Moderate",
      "nextSteps": ["string"]
    }
  ]
}
`

  const text = await generateContentWithFallback(prompt)
  return parseJsonFromResponse(text)
}

/**
 * Skill Gap Analysis
 */
const analyzeSkillGap = async (currentSkills, targetRole) => {
  const prompt = `
Analyze the skill gap for the following:

Current Skills: ${currentSkills?.join(', ') || 'No skills provided'}
Target Role: ${targetRole}

Please provide a detailed skill gap analysis with:
1. Must-have skills for this role
2. Which of these you already have (✓)
3. Which you need to develop (✗)
4. Priority skills to learn (High/Medium/Low)
5. Recommended learning resources for each missing skill
6. Estimated time to acquire each skill
7. Overall readiness percentage (0-100)

Format the response strictly as valid JSON:
{
  "targetRole": "string",
  "readinessPercentage": number,
  "skillsAnalysis": [
    {
      "skill": "string",
      "status": "have" | "need",
      "priority": "High" | "Medium" | "Low",
      "estimatedTime": "string",
      "resources": ["string"]
    }
  ],
  "summary": "string"
}
`

  const text = await generateContentWithFallback(prompt)
  return parseJsonFromResponse(text)
}

/**
 * Personalized Learning Roadmap
 */
const generateLearningRoadmap = async (userProfile, targetRole) => {
  const prompt = `
Create a personalized month-by-month learning roadmap for:

Current Skills: ${userProfile.skills?.join(', ') || 'No skills'}
Experience: ${userProfile.about || 'Not specified'}
Target Role: ${targetRole}

Please provide:
1. Month-by-month breakdown (6 months)
2. Specific courses, certifications, or projects for each month
3. Key milestones and checkpoints
4. Recommended platforms (Coursera, Udemy, YouTube, freeCodeCamp, etc.)
5. Estimated hours per week
6. Real-world projects to build portfolio
7. Interview preparation timeline

Format the response strictly as valid JSON:
{
  "roadmapTitle": "string",
  "duration": "string",
  "hoursPerWeek": number,
  "phases": [
    {
      "month": number,
      "title": "string",
      "objectives": ["string"],
      "courses": ["string"],
      "projects": ["string"],
      "milestone": "string"
    }
  ],
  "portfolio": ["string"],
  "interviewPrep": ["string"]
}
`

  const text = await generateContentWithFallback(prompt)
  return parseJsonFromResponse(text)
}

/**
 * Resume Analysis & ATS Scoring
 */
const analyzeResume = async (resumeText, userSkills) => {
  const prompt = `
You are an expert ATS (Applicant Tracking System) scanner and Senior Technical Recruiter.
Analyze this resume text thoroughly against modern ATS algorithms and hiring standards:

Resume Text:
${resumeText}

User Stated Skills: ${userSkills?.join(', ') || 'Not provided'}

Provide a rigorous and detailed ATS evaluation:
1. overallScore (0-100)
2. formattingScore (0-100)
3. keywordScore (0-100)
4. experienceImpactScore (0-100)
5. atsPassLikelihood: "High" | "Medium" | "Low"
6. Strengths (3-5 items with point and explanation)
7. Areas for improvement (3-5 items with area and clear actionable suggestion)
8. Missing critical sections (e.g. Metrics, GitHub link, Summary, Certifications)
9. ATS Optimization checklist items
10. High-impact industry keywords found vs keywords to add
11. Prioritized action items
12. 3-4 example bullet point rewrites using the Google X-Y-Z formula

Format the response strictly as valid JSON:
{
  "overallScore": number,
  "formattingScore": number,
  "keywordScore": number,
  "experienceImpactScore": number,
  "atsPassLikelihood": "High" | "Medium" | "Low",
  "summary": "string",
  "strengths": [{"point": "string", "explanation": "string"}],
  "improvements": [{"area": "string", "suggestion": "string"}],
  "missingItems": ["string"],
  "atsOptimization": ["string"],
  "keywordsFound": ["string"],
  "keywordsToAdd": ["string"],
  "actionItems": [{"action": "string", "priority": "High" | "Medium" | "Low"}],
  "exampleBulletPoints": [{"original": "string", "improved": "string", "reason": "string"}]
}
`

  const text = await generateContentWithFallback(prompt)
  return parseJsonFromResponse(text)
}

/**
 * Parse Resume text into Student Profile data
 */
const parseResumeToProfile = async (resumeText) => {
  const prompt = `
Extract student/candidate profile details from this resume text:

Resume Text:
${resumeText}

Extract and structure into JSON matching these exact fields:
- name: string (Candidate full name if found)
- email: string (Candidate email if found)
- about: string (Professional summary or bio paragraph, 2-4 sentences)
- skills: array of strings (Technical and soft skills extracted, e.g. ["React", "JavaScript", "Node.js", "Python"])
- education: array of objects [{ degree: string, institute: string, year: string }]
- projects: array of objects [{ title: string, description: string }]
- linkedin: string (URL or handle if present)
- github: string (URL or handle if present)
- portfolio: string (URL if present)

Format the response strictly as valid JSON:
{
  "name": "string",
  "email": "string",
  "about": "string",
  "skills": ["string"],
  "education": [{"degree": "string", "institute": "string", "year": "string"}],
  "projects": [{"title": "string", "description": "string"}],
  "linkedin": "string",
  "github": "string",
  "portfolio": "string"
}
`

  const text = await generateContentWithFallback(prompt)
  return parseJsonFromResponse(text)
}

/**
 * Generate AI Cover Letter
 */
const generateCoverLetter = async ({ candidateProfile, jobTitle, companyName, jobDescription, tone }) => {
  const prompt = `
You are an expert executive career coach. Write a tailored, persuasive, and authentic Cover Letter for this candidate:

Candidate Profile:
- Name: ${candidateProfile?.name || 'Applicant'}
- Skills: ${candidateProfile?.skills?.join(', ') || 'Relevant software skills'}
- Experience/About: ${candidateProfile?.about || 'Dedicated professional'}
- Projects: ${candidateProfile?.projects?.map((p) => `${p.title}: ${p.description}`).join('; ') || 'Hands-on projects'}

Target Position:
- Role: ${jobTitle}
- Company: ${companyName || 'the Hiring Team'}
- Job Description / Requirements: ${jobDescription || 'Standard requirements for the role'}
- Desired Tone: ${tone || 'Professional & Confident'}

Write a 3-4 paragraph customized cover letter.
Format the response strictly as valid JSON:
{
  "subject": "string",
  "salutation": "string",
  "openingParagraph": "string",
  "bodyParagraphs": ["string"],
  "closingParagraph": "string",
  "signOff": "string",
  "fullCoverLetter": "string",
  "keyHighlights": ["string"]
}
`

  const text = await generateContentWithFallback(prompt)
  return parseJsonFromResponse(text)
}

/**
 * Start AI Mock Interview session
 */
const startMockInterview = async ({ targetRole, experienceLevel, interviewType }) => {
  const prompt = `
You are a Senior Technical Hiring Manager conducting a mock interview for the role of:
- Role: ${targetRole}
- Experience Level: ${experienceLevel || 'Entry Level / Student'}
- Interview Focus: ${interviewType || 'Mixed Technical & Behavioral'}

Generate a structured set of 5 realistic interview questions covering:
1. Question 1: Icebreaker / Background & Project walk-through
2. Question 2: Core Technical Concept or Problem-Solving
3. Question 3: System Design / Practical scenario or architecture
4. Question 4: Behavioral / Conflict or Teamwork (STAR method)
5. Question 5: Problem Solving / Future learning & Challenge

Format the response strictly as valid JSON:
{
  "targetRole": "${targetRole}",
  "experienceLevel": "${experienceLevel}",
  "interviewType": "${interviewType}",
  "welcomeMessage": "string",
  "questions": [
    {
      "id": 1,
      "category": "string",
      "question": "string",
      "hint": "string",
      "keyConcepts": ["string"]
    }
  ]
}
`

  const text = await generateContentWithFallback(prompt)
  return parseJsonFromResponse(text)
}

/**
 * Evaluate Mock Interview Answer
 */
const evaluateInterviewAnswer = async ({ targetRole, question, answer, category, experienceLevel }) => {
  const prompt = `
You are a Senior Technical Interviewer evaluating a candidate's answer during a mock interview for the position of ${targetRole} (${experienceLevel || 'Entry Level'}):

Question Asked (${category || 'General'}):
"${question}"

Candidate's Answer:
"${answer}"

Evaluate the candidate's answer constructively:
1. Score out of 10 (numerical: 1-10)
2. Strengths of the answer (what was explained well)
3. Areas to improve (missing depth, edge cases, STAR structure, clarity)
4. Model Answer (a stellar, concise 1-2 paragraph response they could have given)
5. Quick Follow-Up Tip or Question

Format the response strictly as valid JSON:
{
  "score": number,
  "feedbackSummary": "string",
  "strengths": ["string"],
  "improvements": ["string"],
  "modelAnswer": "string",
  "proTip": "string"
}
`

  const text = await generateContentWithFallback(prompt)
  return parseJsonFromResponse(text)
}

/**
 * Calculate Applicant Fit & Match Score for a Job
 */
const calculateApplicantMatch = async (job, applicantProfile) => {
  const prompt = `
You are an expert technical talent recruiter and hiring manager.
Evaluate the following candidate application against the target job requirements.

Job Details:
- Title: ${job.title}
- Job Type: ${job.jobType} (${job.workMode})
- Required Skills: ${job.skills?.join(', ') || 'Not specified'}
- Experience Level: ${job.experience || 'Not specified'}
- Job Description: ${job.description}
- Responsibilities: ${job.responsibilities?.join('; ') || 'Not specified'}
- Requirements: ${job.requirements?.join('; ') || 'Not specified'}

Candidate Profile:
- Name: ${applicantProfile.name}
- Headline/About: ${applicantProfile.about || 'Not specified'}
- Skills: ${applicantProfile.skills?.join(', ') || 'Not specified'}
- Education: ${applicantProfile.education?.map((e) => `${e.degree} from ${e.institute} (${e.year})`).join('; ') || 'None specified'}
- Projects: ${applicantProfile.projects?.map((p) => `${p.title}: ${p.description}`).join('; ') || 'None specified'}
- Resume Summary / Text: ${applicantProfile.resumeText || 'Not available'}

Calculate:
1. "matchScore": An integer from 0 to 100 representing how well the candidate matches the job criteria.
2. "recommendation": One of "Strong Fit" (score >= 80), "Moderate Fit" (score 55-79), or "Low Fit" (score < 55).
3. "matchSummary": A concise 2-3 sentence executive recruiter summary highlighting why they match or what they lack.
4. "matchedSkills": Array of specific technical and soft skills the candidate possesses that match the job.
5. "missingSkills": Array of key skills mentioned in the job description that are missing or weak in the candidate's profile.
6. "keyStrengths": Array of 2-3 standout qualifications or project highlights for this role.

Format the response strictly as valid JSON:
{
  "matchScore": number,
  "recommendation": "Strong Fit" | "Moderate Fit" | "Low Fit",
  "matchSummary": "string",
  "matchedSkills": ["string"],
  "missingSkills": ["string"],
  "keyStrengths": ["string"]
}
`

  const text = await generateContentWithFallback(prompt)
  return parseJsonFromResponse(text)
}

/**
 * 1-Click AI Job Description Generator for Recruiters
 */
const generateJobDescription = async ({
  prompt = '',
  roleTitle = '',
  experienceLevel = 'Mid-Level',
  workMode = 'Remote',
  keySkills = '',
  extraNotes = '',
}) => {
  const aiPrompt = `
You are an expert technical recruiter and talent acquisition specialist.
Generate a compelling, modern, and structured job posting based on the following recruiter input:

- Prompt/Role Idea: ${prompt || roleTitle}
- Target Role Title: ${roleTitle || prompt}
- Experience Level: ${experienceLevel}
- Work Mode: ${workMode}
- Key Required Skills: ${keySkills || 'Industry standard skills'}
- Additional Notes: ${extraNotes || 'None'}

Please provide:
1. "title": A clear, professional job title.
2. "description": A concise, engaging 2-paragraph role overview and company value proposition.
3. "responsibilities": Array of 5-7 clear, bulleted core responsibilities starting with action verbs.
4. "requirements": Array of 5-7 realistic, bulleted requirements.
5. "skills": Array of 4-8 specific technical keywords/skills.
6. "experience": Recommended experience string (e.g. "3-5 years").
7. "jobType": One of "Full Time", "Part Time", "Contract", "Internship".
8. "workMode": One of "Remote", "Hybrid", "Onsite".
9. "salary": A competitive and realistic estimated salary range string (e.g. "$90,000 - $120,000 / year" or "₹12,00,000 - ₹18,00,000 / year").
10. "benefits": A comma-separated string of modern perks.

Format the response strictly as valid JSON:
{
  "title": "string",
  "description": "string",
  "responsibilities": ["string"],
  "requirements": ["string"],
  "skills": ["string"],
  "experience": "string",
  "jobType": "string",
  "workMode": "string",
  "salary": "string",
  "benefits": "string"
}
`

  const text = await generateContentWithFallback(aiPrompt)
  return parseJsonFromResponse(text)
}

/**
 * Generates an interactive 5-question technical quiz to verify a candidate's skill
 */
const generateSkillQuiz = async (skill, level = 'Intermediate') => {
  const aiPrompt = `
You are a senior technical interviewer and subject matter expert in ${skill}.
Create an assessment quiz with exactly 5 multiple-choice questions to test a developer's real-world practical competence in ${skill} at ${level} level.

Guidelines:
- Create 5 questions ranging from fundamental concepts to practical scenarios/debugging.
- Each question must have 4 distinct, unambiguous options.
- "correctAnswerIndex": Integer (0, 1, 2, or 3) indicating the exact correct option.
- "explanation": A clear 1-2 sentence explanation of why the answer is correct.

Format the response strictly as valid JSON:
{
  "skill": "${skill}",
  "level": "${level}",
  "questions": [
    {
      "id": 1,
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswerIndex": number,
      "explanation": "string"
    }
  ]
}
`

  const text = await generateContentWithFallback(aiPrompt)
  return parseJsonFromResponse(text)
}

/**
 * Evaluates skill quiz submission and calculates verified badge eligibility
 */
const evaluateSkillQuiz = (skill, userAnswers = {}, quizQuestions = []) => {
  let correctCount = 0
  const review = []

  quizQuestions.forEach((q, idx) => {
    const selected = userAnswers[idx] !== undefined ? Number(userAnswers[idx]) : -1
    const isCorrect = selected === q.correctAnswerIndex
    if (isCorrect) correctCount += 1

    review.push({
      questionId: q.id || idx + 1,
      question: q.question,
      selectedOption: selected >= 0 ? q.options[selected] : 'Skipped',
      correctOption: q.options[q.correctAnswerIndex],
      isCorrect,
      explanation: q.explanation,
    })
  })

  const totalQuestions = quizQuestions.length || 5
  const score = Math.round((correctCount / totalQuestions) * 100)
  const passed = score >= 70

  let badgeLevel = 'Needs Practice'
  if (score >= 90) badgeLevel = 'Expert'
  else if (score >= 70) badgeLevel = 'Proficient'

  return {
    skill,
    score,
    passed,
    badgeLevel,
    correctCount,
    totalQuestions,
    feedback: passed
      ? `🎉 Congratulations! You demonstrated strong mastery in ${skill} and earned your verified skill badge.`
      : `You scored ${score}%. Review the explanations below and feel free to retake the assessment when ready.`,
    review,
  }
}

module.exports = {
  getCareerRecommendations,
  analyzeSkillGap,
  generateLearningRoadmap,
  analyzeResume,
  parseResumeToProfile,
  generateCoverLetter,
  startMockInterview,
  evaluateInterviewAnswer,
  calculateApplicantMatch,
  generateJobDescription,
  generateSkillQuiz,
  evaluateSkillQuiz,
}