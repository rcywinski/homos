/**
 * One failing section (for example a malformed data file from a nightly step) must not blank the whole Live page:
 * each section renders inside this boundary, which shows a short fixed note instead.
 */
import { Component, type ReactNode } from 'react';

export class SectionBoundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <div className="morning-note muted live-section-failed">{this.props.name}: this section could not be shown.</div>;
    return this.props.children;
  }
}
