import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useEffect } from 'react'
import { LayoutDashboard, Map, Users, LogOut } from 'lucide-react'
import Spinner from '../components/ui/Spinner.jsx'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'דשבורד', end: true },
  { to: '/admin/plots', icon: Map, label: 'חלקות' },
  { to: '/admin/leads', icon: Users, label: 'לידים' },
]

export default function AdminLayout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/admin/login', { replace: true })
    }
  }, [loading, user, navigate])

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-navy">
        <Spinner className="w-10 h-10 text-gold" />
      </div>
    )
  }

  if (!user) return null

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="h-screen flex bg-navy" dir="rtl">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-navy-mid border-l border-white/10 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏗️</span>
            <div>
              <div className="text-sm font-bold brand-text">LandMap</div>
              <div className="text-[10px] text-slate-500">ניהול מערכת</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive
                    ? 'bg-gold/15 text-gold font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/5">
          <div className="text-xs text-slate-500 px-3 mb-2 truncate">
            {user.email}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            התנתק
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
