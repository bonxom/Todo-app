import React from 'react';
import ErrorPage from '@/features/errors';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          code="500"
          title="Ứng dụng gặp sự cố ngoài dự kiến"
          description="Đã xảy ra lỗi hệ thống trong quá trình xử lý giao diện. Bạn có thể tải lại trang hoặc quay về trang chủ."
          onRetry={() => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
