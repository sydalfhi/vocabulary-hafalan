import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Home from './routes/Home'
import InputHari from './routes/InputHari'
import Hafalan from './routes/Hafalan'
import { HomeIcon, BookOpenIcon, PlusCircleIcon } from '@heroicons/react/24/outline'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-white">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/input" element={<InputHari />} />
          <Route path="/hafalan" element={<Hafalan />} />
        </Routes>

        {/* Bottom Navigation Mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700">
          <div className="flex justify-around py-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex flex-col items-center p-2 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`
              }
            >
              <HomeIcon className="w-6 h-6" />
              <span className="text-xs mt-1">Home</span>
            </NavLink>
            <NavLink
              to="/input"
              className={({ isActive }) =>
                `flex flex-col items-center p-2 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`
              }
            >
              <PlusCircleIcon className="w-6 h-6" />
              <span className="text-xs mt-1">Input</span>
            </NavLink>
            <NavLink
              to="/hafalan"
              className={({ isActive }) =>
                `flex flex-col items-center p-2 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`
              }
            >
              <BookOpenIcon className="w-6 h-6" />
              <span className="text-xs mt-1">Hafalan</span>
            </NavLink>
          </div>
        </div>
      </div>
    </BrowserRouter>
  )
}