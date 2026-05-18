import { Routes, Route } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import Dashboard from '../../pages/Dashboard'
import Profile from '../../pages/Profile'
import OrgChart from '../../pages/OrgChart'
import Scorecard from '../../pages/Scorecard'
import Todos from '../../pages/Todos'
import Issues from '../../pages/Issues'
import Meetings from '../../pages/Meetings'
import ComingSoon from '../../pages/ComingSoon'
import NotFound from '../../pages/NotFound'

export default function Layout() {
  return (
    <div className="flex h-screen bg-warm-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/scorecard" element={<Scorecard />} />
            <Route path="/wigs" element={<ComingSoon title="WIGs & Rocks" />} />
            <Route path="/todos" element={<Todos />} />
            <Route path="/issues" element={<Issues />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/vision" element={<ComingSoon title="Vision" />} />
            <Route path="/org-chart" element={<OrgChart />} />
            <Route path="/check-in" element={<ComingSoon title="Weekly Check-In" />} />
            <Route path="/reviews" element={<ComingSoon title="Quarterly Reviews" />} />
            <Route path="/admin" element={<ComingSoon title="Admin Panel" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
