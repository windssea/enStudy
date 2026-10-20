import { Component, lazy, type ComponentType, type ReactNode } from "react";

class FeatureLoadError extends Error {}

export function FeatureRecovery() {
  return (
    <section className="feature-recovery" role="alert">
      <div>
        <h2>这部分暂时没打开</h2>
        <p>请检查网络后重新加载。未保存的文字请先保存。</p>
      </div>
      <button
        type="button"
        className="secondary"
        onClick={() => window.location.reload()}
      >
        重新加载页面
      </button>
    </section>
  );
}

class FeatureBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError(error: unknown) {
    // Only module-loading failures belong here. Rendering bugs must not be
    // mislabeled as network problems or silently hidden.
    if (!(error instanceof FeatureLoadError)) throw error;
    return { failed: true };
  }
  render() {
    return this.state.failed ? <FeatureRecovery /> : this.props.children;
  }
}

/** Keep a failed optional module from unmounting its editor or the app shell. */
export function featureLazy<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
): ComponentType<P> {
  const Feature = lazy(async () => {
    try {
      return await load();
    } catch {
      // Never expose provider errors, module URLs or other internal details.
      throw new FeatureLoadError("Feature unavailable");
    }
  });
  return function RecoverableFeature(props: P) {
    return (
      <FeatureBoundary>
        <Feature {...props} />
      </FeatureBoundary>
    );
  };
}
