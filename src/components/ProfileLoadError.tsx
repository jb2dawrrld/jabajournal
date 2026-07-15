type Props = {
  message: string;
  onRetry: () => void;
};

export function ProfileLoadError({ message, onRetry }: Props) {
  return (
    <div className="app-shell app-shell--narrow">
      <header className="app-header">
        <span className="app-header__brand">jabajournal</span>
      </header>
      <main className="app-main page-stack">
        <h1 className="page-title">Could not load profile</h1>
        <div className="error-banner">{message}</div>
        <p className="page-copy muted">Check your connection, then try again.</p>
        <div className="action-row action-row--end">
          <button type="button" className="btn-primary" onClick={onRetry}>
            Retry
          </button>
        </div>
      </main>
    </div>
  );
}
