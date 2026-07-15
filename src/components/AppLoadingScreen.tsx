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
      <img
        className="app-loading__brand"
        src="/jabajournal-wordmark.png"
        alt="jabajournal"
        width={720}
        height={479}
        decoding="async"
      />
    </div>
  );
}
