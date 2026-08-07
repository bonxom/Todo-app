import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  ArrowLeft,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  FileQuestion,
  Lock,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
} from 'lucide-react';

const ERROR_CONFIGS = {
  '404': {
    badge: 'Lỗi 404',
    title: 'Trang không tồn tại',
    description: 'Đường dẫn bạn truy cập không tồn tại hoặc đã bị di chuyển. Vui lòng kiểm tra lại URL hoặc quay lại trang trước.',
    icon: FileQuestion,
    accentColor: 'from-blue-500 to-cyan-500',
    badgeColor: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  '403': {
    badge: 'Lỗi 403',
    title: 'Quyền truy cập bị từ chối',
    description: 'Bạn không có quyền truy cập vào nội dung này. Vui lòng kiểm tra tài khoản hoặc quay lại trang trước.',
    icon: Lock,
    accentColor: 'from-amber-500 to-orange-500',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  '500': {
    badge: 'Lỗi 500',
    title: 'Lỗi máy chủ nội bộ',
    description: 'Đã xảy ra sự cố từ phía máy chủ trong quá trình xử lý. Vui lòng thử lại sau hoặc quay về trang chủ.',
    icon: AlertTriangle,
    accentColor: 'from-rose-500 to-red-600',
    badgeColor: 'bg-rose-50 text-rose-600 border-rose-200',
  },
  '503': {
    badge: 'Lỗi 503',
    title: 'Dịch vụ tạm thời không khả dụng',
    description: 'Hệ thống đang được nâng cấp hoặc bảo trì định kỳ. Vui lòng quay lại sau ít phút.',
    icon: ShieldAlert,
    accentColor: 'from-purple-500 to-indigo-500',
    badgeColor: 'bg-purple-50 text-purple-600 border-purple-200',
  },
};

const ErrorPage = ({ code = '404', title, description, onRetry }) => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const config = ERROR_CONFIGS[code] || ERROR_CONFIGS['404'];
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const IconComponent = config.icon;

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 animate-fadeIn relative overflow-hidden">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-blue-200/30 to-indigo-200/30 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-gradient-to-br from-amber-200/20 to-rose-200/20 blur-3xl rounded-full pointer-events-none" />

      <main className="max-w-2xl w-full bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[var(--radius-2xl)] shadow-lg overflow-hidden relative z-10">
        {/* Header Accent Line */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${config.accentColor}`} />

        <div className="p-6 sm:p-10 flex flex-col items-center text-center">
          {/* Badge & Code */}
          <div className="flex items-center gap-2 mb-6">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${config.badgeColor}`}>
              <IconComponent className="w-3.5 h-3.5" />
              {config.badge}
            </span>
          </div>

          {/* Video Container (Robot hihi) */}
          <div className="relative group w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-white shadow-xl ring-4 ring-slate-100/80 mb-8 transition-transform duration-300 hover:scale-105 bg-slate-900">
            <video
              ref={videoRef}
              src="/robothihi1.mp4"
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Video Controls Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
              <button
                onClick={togglePlay}
                type="button"
                className="p-2.5 rounded-full bg-white/90 text-slate-800 hover:bg-white hover:scale-110 transition-all shadow-md"
                title={isPlaying ? 'Tạm dừng video' : 'Phát video'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleMute}
                type="button"
                className="p-2.5 rounded-full bg-white/90 text-slate-800 hover:bg-white hover:scale-110 transition-all shadow-md"
                title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

            {/* Floating Sparkle Badge */}
            <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-xs p-1.5 rounded-full shadow-md text-amber-500">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
          </div>

          {/* Title & Description */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text)] mb-3">
            {displayTitle}
          </h1>

          <p className="text-sm sm:text-base text-[var(--color-text-muted)] max-w-md mb-8 leading-relaxed">
            {displayDescription}
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleBack}
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] font-medium text-sm transition-colors shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại trang trước
            </button>

            {onRetry ? (
              <button
                onClick={onRetry}
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-strong)] font-medium text-sm transition-colors shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                Thử lại
              </button>
            ) : (
              <Link
                to="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-strong)] font-medium text-sm transition-colors shadow-xs"
              >
                <Home className="w-4 h-4" />
                Về Trang Chủ
              </Link>
            )}
          </div>
        </div>

        {/* Quick Error Code Switcher Footer */}
        <div className="bg-[var(--color-surface-muted)] px-6 py-4 border-t border-[var(--color-line)] flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
          <span>Mã lỗi: <strong className="font-semibold text-[var(--color-text)]">{code}</strong></span>

          <div className="flex items-center gap-2">
            <span>Xem thử trang lỗi khác:</span>
            <Link to="/404" className="hover:text-[var(--color-accent)] hover:underline font-medium">404</Link>
            <span>•</span>
            <Link to="/403" className="hover:text-[var(--color-accent)] hover:underline font-medium">403</Link>
            <span>•</span>
            <Link to="/500" className="hover:text-[var(--color-accent)] hover:underline font-medium">500</Link>
            <span>•</span>
            <Link to="/503" className="hover:text-[var(--color-accent)] hover:underline font-medium">503</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ErrorPage;
