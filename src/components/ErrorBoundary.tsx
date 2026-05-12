"use client";

import { Component } from "react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center p-8 text-sm text-[#64748b]">
          <p>Something went wrong loading this section.</p>
          <button
            className="mt-3 text-xs px-3 py-1.5 rounded border border-[#e2e8f0] hover:bg-[#f8fafc]"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
