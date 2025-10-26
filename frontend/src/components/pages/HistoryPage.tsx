interface HistoryPageProps {
  isDark: boolean;
  onThemeToggle: () => void;
  onGetStarted: () => void;
}

export function HistoryPage({ isDark, onThemeToggle, onGetStarted }: HistoryPageProps) {
  return (
    <main className="container mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-4">History</h1>
      <p className="text-muted-foreground">View your past scraping analyses and reports.</p>
    </main>
  );
}
