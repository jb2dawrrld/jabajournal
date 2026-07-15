type Props = {
  /** Fill the viewport (auth bootstrap). Default centers within available space. */
  fullViewport?: boolean;
};

export function AppLoadingScreen({ fullViewport = false }: Props) {
  return (
    <div
      className={`app-loading${fullViewport ? " app-loading--viewport" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <span className="app-loading__brand">jabajournal</span>
    </div>
  );
}
