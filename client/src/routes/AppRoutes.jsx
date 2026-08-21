import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout.jsx'
import ProtectedRoute from '../components/common/ProtectedRoute.jsx'

// Eagerly loaded: Home is the most likely first paint, kept in the main bundle
import Home from '../pages/Home.jsx'

// Everything else is code-split via React.lazy so the initial bundle stays small
const Jobs = lazy(() => import('../pages/Jobs.jsx'))
const JobDetails = lazy(() => import('../pages/JobDetails.jsx'))
const Skills = lazy(() => import('../pages/Skills.jsx'))
const Companies = lazy(() => import('../pages/Companies.jsx'))
const CompanyDetails = lazy(() => import('../pages/CompanyDetails.jsx'))
const About = lazy(() => import('../pages/About.jsx'))
const Contact = lazy(() => import('../pages/Contact.jsx'))
const Login = lazy(() => import('../pages/Login.jsx'))
const Register = lazy(() => import('../pages/Register.jsx'))
const AuthCallback = lazy(() => import('../pages/auth/AuthCallback.jsx'))
const NotFound = lazy(() => import('../pages/NotFound.jsx'))
const VideoInterviewRoom = lazy(() => import('../pages/interview/VideoInterviewRoom.jsx'))

const StudentDashboard = lazy(() => import('../pages/student/Dashboard.jsx'))
const StudentOverview = lazy(() => import('../pages/student/Overview.jsx'))
const StudentProfile = lazy(() => import('../pages/student/Profile.jsx'))
const StudentApplications = lazy(() => import('../pages/student/Applications.jsx'))
const StudentMessages = lazy(() => import('../pages/student/Messages.jsx'))
const StudentSavedJobs = lazy(() => import('../pages/student/SavedJobs.jsx'))
const StudentNotifications = lazy(() => import('../pages/student/Notifications.jsx'))
const AICareerSuite = lazy(() => import('../pages/student/AICareerSuite.jsx'))
const CareerRecommendations = lazy(() => import('../pages/student/CareerRecommendations.jsx'))
const SkillGapAnalysis = lazy(() => import('../pages/student/SkillGapAnalysis.jsx'))
const LearningRoadmap = lazy(() => import('../pages/student/LearningRoadmap.jsx'))
const ResumeAnalyzer = lazy(() => import('../pages/student/ResumeAnalyzer.jsx'))
const CoverLetterGenerator = lazy(() => import('../pages/student/CoverLetterGenerator.jsx'))
const MockInterview = lazy(() => import('../pages/student/MockInterview.jsx'))

const RecruiterDashboard = lazy(() => import('../pages/recruiter/Dashboard.jsx'))
const RecruiterOverview = lazy(() => import('../pages/recruiter/Overview.jsx'))
const CompanyProfile = lazy(() => import('../pages/recruiter/CompanyProfile.jsx'))
const JobForm = lazy(() => import('../pages/recruiter/JobForm.jsx'))
const MyJobs = lazy(() => import('../pages/recruiter/MyJobs.jsx'))
const Applicants = lazy(() => import('../pages/recruiter/Applicants.jsx'))
const ApplicantDetails = lazy(() => import('../pages/recruiter/ApplicantDetails.jsx'))
const RecruiterMessages = lazy(() => import('../pages/recruiter/Messages.jsx'))

const AdminDashboard = lazy(() => import('../pages/admin/Dashboard.jsx'))
const AdminOverview = lazy(() => import('../pages/admin/Overview.jsx'))
const AdminUsers = lazy(() => import('../pages/admin/Users.jsx'))
const AdminCompanies = lazy(() => import('../pages/admin/AdminCompanies.jsx'))
const AdminJobs = lazy(() => import('../pages/admin/AdminJobs.jsx'))
const AdminReports = lazy(() => import('../pages/admin/Reports.jsx'))

const Articles = lazy(() => import('../pages/content/Articles.jsx'))
const ArticleDetails = lazy(() => import('../pages/content/ArticleDetails.jsx'))
const InterviewQuestions = lazy(() => import('../pages/content/InterviewQuestions.jsx'))
const InterviewTopicDetails = lazy(() => import('../pages/content/InterviewTopicDetails.jsx'))

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-signal" />
    </div>
  )
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<MainLayout />}>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<Jobs jobType={null} pageTitle="Jobs" />} />
          <Route path="/internships" element={<Jobs jobType="Internship" pageTitle="Internships" />} />
          <Route path="/jobs/:slug" element={<JobDetails />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:slug" element={<CompanyDetails />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:slug" element={<ArticleDetails />} />
          <Route path="/interview-questions" element={<InterviewQuestions />} />
          <Route path="/interview-questions/:slug" element={<InterviewTopicDetails />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Student */}
          <Route
            path="/student/dashboard"
            element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>}
          >
            <Route index element={<StudentOverview />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="applications" element={<StudentApplications />} />
            <Route path="messages" element={<StudentMessages />} />
            <Route path="saved" element={<StudentSavedJobs />} />
            <Route path="notifications" element={<StudentNotifications />} />
            <Route path="ai-suite" element={<AICareerSuite />} />
            <Route path="career-recommendations" element={<CareerRecommendations />} />
            <Route path="skill-gap" element={<SkillGapAnalysis />} />
            <Route path="learning-roadmap" element={<LearningRoadmap />} />
            <Route path="resume-analyzer" element={<ResumeAnalyzer />} />
            <Route path="cover-letter" element={<CoverLetterGenerator />} />
            <Route path="mock-interview" element={<MockInterview />} />
          </Route>

          {/* Recruiter */}
          <Route
            path="/recruiter/dashboard"
            element={<ProtectedRoute role="recruiter"><RecruiterDashboard /></ProtectedRoute>}
          >
            <Route index element={<RecruiterOverview />} />
            <Route path="company" element={<CompanyProfile />} />
            <Route path="jobs" element={<MyJobs />} />
            <Route path="jobs/new" element={<JobForm />} />
            <Route path="jobs/:id/edit" element={<JobForm />} />
            <Route path="applicants" element={<Applicants />} />
            <Route path="applicants/:id" element={<ApplicantDetails />} />
            <Route path="messages" element={<RecruiterMessages />} />
          </Route>

          {/* Admin */}
          <Route
            path="/admin/dashboard"
            element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>}
          >
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="companies" element={<AdminCompanies />} />
            <Route path="jobs" element={<AdminJobs />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>

          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Dedicated Full-Screen Live Video Interview Studio */}
        <Route
          path="/interview/:roomId"
          element={
            <ProtectedRoute>
              <VideoInterviewRoom />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  )
}

