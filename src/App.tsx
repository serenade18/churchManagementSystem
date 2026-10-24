import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
import { can, isOwner } from './lib/access'
import { AuthProvider, homeFor, useAuth } from './lib/auth'
import type { Feature } from './types'
import Branches from './pages/branches/Branches'
import Donations from './pages/donations/Donations'
import DonationTypes from './pages/donations/DonationTypes'
import ForgotPassword from './pages/auth/ForgotPassword'
import ChurchHome from './pages/public/ChurchHome'
import Give from './pages/give/Give'
import Portal from './pages/public/Portal'
import Register from './pages/public/Register'
import Registrations from './pages/members/Registrations'
import PaypalReturn from './pages/give/PaypalReturn'
import Login from './pages/auth/Login'
import OpenOffice from './pages/auth/OpenOffice'
import MemberDetail from './pages/members/MemberDetail'
import Members from './pages/members/Members'
import Paybill from './pages/donations/Paybill'
import Projects from './pages/projects/Projects'
import ReceiptPrint from './pages/print/ReceiptPrint'
import ServiceDetail from './pages/attendance/ServiceDetail'
import SettingsPage from './pages/settings/Settings'
import Signup from './pages/auth/Signup'
import Sms from './pages/sms/Sms'
import StatementPrint from './pages/print/StatementPrint'
import Users from './pages/admin/Users'
import NoAccess from './pages/admin/NoAccess'
import NoChurch from './pages/platform/NoChurch'
import PlatformChurches from './pages/platform/PlatformChurches'
import PlatformHome from './pages/platform/PlatformHome'
import PlatformIntegrations from './pages/platform/PlatformIntegrations'
import PlatformOverviewPage from './pages/platform/PlatformOverview'
import PlatformPayments from './pages/platform/PlatformPayments'
import PlatformRegistrations from './pages/platform/PlatformRegistrations'
import PlatformSms from './pages/platform/PlatformSms'
import RegisterChurch from './pages/platform/RegisterChurch'
import { branding } from './lib/theme'

// Charts are heavy; keep them out of the public donation page bundle.
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'))
const Attendance = lazy(() => import('./pages/attendance/Attendance'))

/** Signed in, and (``owner``) the church owner or a platform admin, or (``feature``) a role that opens it. */
function RequireAuth({ children, owner = false, feature }: { children: ReactNode; owner?: boolean; feature?: Feature }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner className="h-8 w-8" /></div>
  if (!user) return <Navigate to="/admin" replace state={{ from: location }} />
  if ((owner && !isOwner(user)) || (feature && !can(user, feature))) return <Navigate to={homeFor(user)} replace />
  return children
}

const lazyPage = (page: ReactNode) => <Suspense fallback={<Spinner className="mx-auto mt-20 h-8 w-8" />}>{page}</Suspense>

/** mkanisa.com itself: the platform's home page, the member portal and platform admin. */
function PlatformApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PlatformHome />} />
          <Route path="/start" element={<RegisterChurch />} />
          <Route path="/me" element={<Portal />} />
          <Route path="/me/receipt/:id" element={<ReceiptPrint portal />} />
          <Route path="/me/statement" element={<StatementPrint portal />} />
          <Route path="/admin" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* Platform admin signup: not linked anywhere, reached by its address only */}
          <Route path="/signup/platform" element={<Signup superadmin />} />
          <Route path="/signup/superadmin" element={<Signup superadmin />} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/platform" element={<RequireAuth owner><PlatformOverviewPage /></RequireAuth>} />
            <Route path="/platform/churches" element={<RequireAuth owner><PlatformChurches /></RequireAuth>} />
            <Route path="/platform/registrations" element={<RequireAuth owner><PlatformRegistrations /></RequireAuth>} />
            <Route path="/platform/payments" element={<RequireAuth owner><PlatformPayments /></RequireAuth>} />
            <Route path="/platform/sms" element={<RequireAuth owner><PlatformSms /></RequireAuth>} />
            <Route path="/platform/integrations" element={<RequireAuth owner><PlatformIntegrations /></RequireAuth>} />
            <Route path="/users" element={<RequireAuth owner><Users /></RequireAuth>} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default function App() {
  // The address decides: a church's site, the platform itself, or nobody here.
  if (branding.notFound) return <NoChurch />
  if (branding.platform) return <PlatformApp />
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* The church's public site; church staff sign in at /admin */}
          <Route path="/" element={<ChurchHome />} />
          <Route path="/register" element={<Register />} />
          <Route path="/me" element={<Portal />} />
          <Route path="/me/receipt/:id" element={<ReceiptPrint portal />} />
          <Route path="/me/statement" element={<StatementPrint portal />} />
          <Route path="/admin" element={<Login />} />
          <Route path="/admin/open" element={<OpenOffice />} />
          <Route path="/login" element={<Navigate to="/admin" replace />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/signup/superadmin" element={<Signup superadmin />} />
          <Route path="/give" element={<Give />} />
          <Route path="/give/paypal" element={<PaypalReturn />} />
          {/* Printable pages: no sidebar */}
          <Route path="/print/receipt/:id" element={<RequireAuth><ReceiptPrint /></RequireAuth>} />
          <Route path="/print/statement/:id" element={<RequireAuth><StatementPrint /></RequireAuth>} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/no-access" element={<NoAccess />} />
            <Route path="/dashboard" element={<RequireAuth feature="dashboard">{lazyPage(<Dashboard />)}</RequireAuth>} />
            <Route path="/members" element={<RequireAuth feature="members"><Members /></RequireAuth>} />
            <Route path="/members/:id" element={<RequireAuth feature="members"><MemberDetail /></RequireAuth>} />
            <Route path="/registrations" element={<RequireAuth feature="registrations"><Registrations /></RequireAuth>} />
            <Route path="/donations" element={<RequireAuth feature="giving"><Donations /></RequireAuth>} />
            <Route path="/branches" element={<RequireAuth feature="branches"><Branches /></RequireAuth>} />
            <Route path="/projects" element={<RequireAuth feature="projects"><Projects /></RequireAuth>} />
            <Route path="/sms" element={<RequireAuth feature="sms"><Sms /></RequireAuth>} />
            <Route path="/paybill" element={<RequireAuth feature="paybill"><Paybill /></RequireAuth>} />
            <Route path="/donation-types" element={<RequireAuth feature="donation_types"><DonationTypes /></RequireAuth>} />
            <Route path="/attendance" element={<RequireAuth feature="attendance">{lazyPage(<Attendance />)}</RequireAuth>} />
            <Route path="/attendance/:id" element={<RequireAuth feature="attendance"><ServiceDetail /></RequireAuth>} />
            <Route path="/users" element={<RequireAuth owner><Users /></RequireAuth>} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
