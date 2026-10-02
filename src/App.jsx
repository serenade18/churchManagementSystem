import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
import { AuthProvider, useAuth } from './lib/auth'
import Branches from './pages/Branches'
import Donations from './pages/Donations'
import Give from './pages/Give'
import Login from './pages/Login'
import MemberDetail from './pages/MemberDetail'
import Members from './pages/Members'
import Projects from './pages/Projects'
import ServiceDetail from './pages/ServiceDetail'
import SettingsPage from './pages/Settings'
import Sms from './pages/Sms'
import Users from './pages/Users'

// Charts are heavy; keep them out of the public donation page bundle.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Attendance = lazy(() => import('./pages/Attendance'))

function RequireAuth({ children, superuser }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner className="h-8 w-8" /></div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (superuser && !user.is_superuser) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public donation page (the existing giving page lives at the site root) */}
          <Route path="/" element={<Give />} />
          <Route path="/give" element={<Give />} />
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/dashboard" element={<Suspense fallback={<Spinner className="mx-auto mt-20 h-8 w-8" />}><Dashboard /></Suspense>} />
            <Route path="/members" element={<Members />} />
            <Route path="/members/:id" element={<MemberDetail />} />
            <Route path="/donations" element={<Donations />} />
            <Route path="/branches" element={<Branches />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/sms" element={<Sms />} />
            <Route path="/attendance" element={<Suspense fallback={<Spinner className="mx-auto mt-20 h-8 w-8" />}><Attendance /></Suspense>} />
            <Route path="/attendance/:id" element={<ServiceDetail />} />
            <Route path="/users" element={<RequireAuth superuser><Users /></RequireAuth>} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
