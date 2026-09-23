import { Component, createRef } from "react";
import type { ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

/** Recover from render errors, including unavailable lazy chunks after a rebuild. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  private heading = createRef<HTMLHeadingElement>();

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidUpdate(_previousProps: Props, previousState: State) {
    if (this.state.failed && !previousState.failed) this.heading.current?.focus();
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
        <section
          role="alert"
          aria-labelledby="app-recovery-title"
          className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm"
        >
          <h1
            id="app-recovery-title"
            ref={this.heading}
            tabIndex={-1}
            className="text-xl font-semibold outline-none"
          >
            The workspace couldn’t load
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Reload the workspace to try again. Conversations in this tab will be cleared.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Reload workspace
          </button>
        </section>
      </main>
    );
  }
}
