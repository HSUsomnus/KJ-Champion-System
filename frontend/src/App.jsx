/**
 * React 主應用：路由與進入層
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { AlertProvider } from './components/AppAlert';
import Layout from './components/Layout';
import EntryGate from './pages/EntryGate';
import CalendarPage from './pages/CalendarPage';
import ListPage from './pages/ListPage';
import MembersPage from './pages/MembersPage';
import MemberDetailPage from './pages/MemberDetailPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <AlertProvider>
      <Routes>
        {/* 根路徑：需通過 EntryGate（登入+註冊檢查） */}
        <Route path="/" element={<Layout />}>
          <Route
            index
            element={
              <EntryGate>
                <CalendarPage />
              </EntryGate>
            }
          />
          <Route path="list" element={<ListPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="add-event" element={<div className="p-4">新增行程（待實作）</div>} />
          <Route path="event/:id" element={<div className="p-4">行程詳情（待實作）</div>} />
          <Route path="member/:lineId" element={<MemberDetailPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AlertProvider>
  );
}
