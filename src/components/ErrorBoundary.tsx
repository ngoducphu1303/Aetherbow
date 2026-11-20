import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isQuota: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '', isQuota: false };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const raw = error instanceof Error ? error.message : String(error ?? '');
    const isQuota = raw.includes('Quota exceeded');
    let friendly = 'Ứng dụng gặp sự cố kết nối hoặc dữ liệu bất thường. Bạn có thể tải lại để tiếp tục.';
    if (isQuota) {
      friendly =
        'Hạn mức đọc/ghi miễn phí hôm nay của cơ sở dữ liệu đám mây đã đạt giới hạn và sẽ được làm mới vào ngày mai.';
    } else if (raw.includes('permission') || raw.includes('PERMISSION_DENIED')) {
      friendly =
        'Không đủ quyền truy cập dữ liệu đám mây. Vui lòng đăng nhập lại tài khoản để tiếp tục đồng bộ.';
    }
    return { hasError: true, message: friendly, isQuota };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Artemis3D ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050813] p-5 text-slate-100">
        <div className="cel-panel-ornate w-full max-w-md rounded-3xl p-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-400/40 bg-rose-500/15 text-rose-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="font-display text-xl font-black text-white">
            {this.state.isQuota ? 'Hạn Mức Cơ Sở Dữ Liệu' : 'Đã Xảy Ra Gián Đoạn'}
          </h1>
          <p className="text-sm leading-relaxed text-slate-300">{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="a2-yellow-btn w-full rounded-xl py-3 px-5 text-sm font-black flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Tải Lại Trò Chơi</span>
          </button>
        </div>
      </div>
    );
  }
}
