import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
import { AuthProvider, useAuth } from './lib/auth'
import Branches from './pages/branches/Branches'
import Donations from './pages/donations/Donations'
import DonationTypes from './pages/donations/DonationTypes'
import ForgotPassword from './pages/auth/ForgotPassword'
import Give from './pages/give/Give'
import PaypalReturn from './pages/give/PaypalReturn'
import Login from './pages/auth/Login'
import MemberDetail from './pages/members/MemberDetail'
import Members from './pages/members/Members'
import Paybill from './pages/donations/Paybill'
import Projects from './pages/projects/Projects'
import ReceiptPrint from './pages/print/ReceiptPrint'
import ServiceDetail from './pages/attendance/ServiceDetail'
import SettingsPage from './pages/settings/Settings'
import Signup from './pages/auth/Signup'
import Sms from './pages/sms/Sms'
import SuperDashboard from './pages/admin/SuperDashboard'
import StatementPrint from './pages/print/StatementPrint'
import Users from './pages/admin/Users'

// Charts are heavy; keep them out of the public donation page bundle.
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'))
const Attendance = lazy(() => import('./pages/attendance/Attendance'))

function RequireAuth({ children, superuser }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner className="h-8 w-8" /></div>
  if (!user) return <Navigate to="/" replace state={{ from: location }} />
  if (superuser && !user.is_superuser) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* The site opens on the admin login; the public giving page lives at /give */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/signup/superadmin" element={<Signup superadmin />} />
          <Route path="/give" element={<Give />} />
          <Route path="/give/paypal" element={<PaypalReturn />} />
          {/* Printable pages: no sidebar */}
          <Route path="/print/receipt/:id" element={<RequireAuth><ReceiptPrint /></RequireAuth>} />
          <Route path="/print/statement/:id" element={<RequireAuth><StatementPrint /></RequireAuth>} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/super" element={<RequireAuth superuser><SuperDashboard /></RequireAuth>} />
            <Route path="/dashboard" element={<Suspense fallback={<Spinner className="mx-auto mt-20 h-8 w-8" />}><Dashboard /></Suspense>} />
            <Route path="/members" element={<Members />} />
            <Route path="/members/:id" element={<MemberDetail />} />
            <Route path="/donations" element={<Donations />} />
            <Route path="/branches" element={<Branches />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/sms" element={<Sms />} />
            <Route path="/paybill" element={<Paybill />} />
            <Route path="/donation-types" element={<DonationTypes />} />
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
