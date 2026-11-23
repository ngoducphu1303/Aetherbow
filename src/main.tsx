import { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { loadGlbRevisionIndex } from './engine/glbAssetUrl.ts';
import './index.css';

const AdminAssets = lazy(() => import('./components/AssetAdminPage.tsx'));

function isAdminAssetsLocation(): boolean {
  if (/^\/admin\/assets\/?$/.test(window.location.pathname)) return true;
  const hashPath = window.location.hash.replace(/^#/, '').split('?')[0];
  return /^\/admin\/assets\/?$/.test(hashPath);
}

function RootRouter() {
  const [adminAssets, setAdminAssets] = useState(isAdminAssetsLocation);

  useEffect(() => {
    const sync = () => setAdminAssets(isAdminAssetsLocation());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  if (adminAssets) {
    return (
      <Suspense fallback={<div className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">Đang mở danh mục mô hình…</div>}>
        <AdminAssets />
      </Suspense>
    );
  }
  return <App />;
}

const root = createRoot(document.getElementById('root')!);

function render() {
  root.render(
    <ErrorBoundary>
      <RootRouter />
    </ErrorBoundary>
  );
}

if (isAdminAssetsLocation()) render();
else void loadGlbRevisionIndex().finally(render);
