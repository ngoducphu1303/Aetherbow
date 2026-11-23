import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { loadGlbRevisionIndex } from './engine/glbAssetUrl.ts';
import './index.css';

const AdminAssets = lazy(() => import('./components/AssetAdminPage.tsx'));
const assetAdmin = /^\/admin\/assets\/?$/.test(window.location.pathname);
const root = createRoot(document.getElementById('root')!);

function render() {
  root.render(
    <ErrorBoundary>
      {assetAdmin
        ? <Suspense fallback={<div className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">Đang mở danh mục mô hình…</div>}><AdminAssets /></Suspense>
        : <App />}
    </ErrorBoundary>
  );
}

if (assetAdmin) render();
else void loadGlbRevisionIndex().finally(render);
