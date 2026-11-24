import type { User } from 'firebase/auth';
import { X } from 'lucide-react';
import type { LiveOpsConfig } from '../data/liveOpsConfig';
import type { LiveOpsSource } from '../services/liveOpsConfigService';
import AssetAdminLiveOpsTab from './AssetAdminLiveOpsTab';

export interface AdminLiveOpsModalProps {
  authUser: User | null;
  activeConfig: LiveOpsConfig;
  configSource: LiveOpsSource;
  onConfigUpdated: (nextCfg: LiveOpsConfig) => void;
  onClose: () => void;
}

export function AdminLiveOpsModal({
  authUser,
  activeConfig,
  configSource,
  onConfigUpdated,
  onClose,
}: AdminLiveOpsModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bảng Quản Trị LiveOps và Kiểm Định Asset"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 p-3 sm:p-5"
    >
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-slate-100">
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-5 py-3.5">
          <div>
            <h2 className="text-base font-bold text-amber-300">
              Bảng Quản Trị LiveOps &amp; Kiểm Định Kho GLB
            </h2>
            <p className="text-xs text-slate-400">
              Cân bằng trực tiếp, khôi phục phiên bản 1 chạm và giám sát ngân sách Dell Latitude E5430.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng quản trị LiveOps"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {authUser ? (
            <AssetAdminLiveOpsTab
              user={authUser}
              externalActiveConfig={activeConfig}
              externalSource={configSource}
              onConfigPublished={(nextCfg) => onConfigUpdated(nextCfg)}
            />
          ) : (
            <div className="mx-auto mt-8 max-w-md rounded-xl border border-slate-800 bg-slate-900 p-5 text-center text-sm text-slate-300">
              Cần đăng nhập tài khoản quản trị đã xác minh để chỉnh sửa LiveOps.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
