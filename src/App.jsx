import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import ScrollToTop from '@/components/ScrollToTop';
import Header from '@/components/Header';
import Home from '@/pages/Home';
import Landing from '@/pages/Landing';
import Archive from '@/pages/Archive';
import Today from '@/pages/Today';
import Together from '@/pages/Together';
import TogetherRoom from '@/pages/TogetherRoom';

function Shell() {
  const { pathname } = useLocation();
  const isLanding = pathname === '/';
  const isPick = pathname === '/pick';

  return (
    <div className={`relative ${isLanding ? 'h-dvh overflow-hidden bg-black' : 'min-h-screen bg-black'}`}>
      {isPick && (
        <div className="pointer-events-none absolute inset-0 cinematic-wash" aria-hidden="true" />
      )}
      <div className="relative">
        <Header />
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Landing />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/pick" element={<Home />} />
          <Route path="/today" element={<Today />} />
          <Route path="/together" element={<Together />} />
          <Route path="/together/:code" element={<TogetherRoom />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
