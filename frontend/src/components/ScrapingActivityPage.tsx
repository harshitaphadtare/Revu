import { SiteHeader } from "./layout/SiteHeader";

interface ScrapingActivityPageProps {
  isDark: boolean;
  onThemeToggle: () => void;
  onGetStarted: () => void;
}

export function ScrapingActivityPage({ isDark, onThemeToggle, onGetStarted }: ScrapingActivityPageProps) {
  return (
    <div className={isDark ? "dark" : ""}>
      <SiteHeader isDark={isDark} onThemeToggle={onThemeToggle} onGetStarted={onGetStarted} />
      <main className="container mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-4">Scraping Activity</h1>
        <p className="text-muted-foreground">Track your current and recent scraping jobs here.</p>
      </main>
    </div>
  );
}
