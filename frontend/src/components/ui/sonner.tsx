"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

// A small wrapper that derives theme from the document 'dark' class so it works
// in this Vite app (no next-themes dependency required). Default position is
// set to top-right as requested.
function Toaster({ position = "top-right", theme, closeButton = false, ...props }: ToasterProps) {
  // Prefer reading the DOM class to decide theme so the toaster matches the
  // existing app theming (the ThemeToggle sets a 'dark' class on the root).
  let resolvedTheme: ToasterProps["theme"] | undefined = theme;
  try {
    const isDark = document.documentElement.classList.contains("dark");
    resolvedTheme = isDark ? "dark" : "light";
  } catch {
    // ignore in SSR or environments without document
  }

  return (
    <Sonner
      position={position}
      theme={resolvedTheme}
      closeButton={closeButton}
      visibleToasts={6}
      expand
      {...props}
    />
  );
}

export { Toaster };
