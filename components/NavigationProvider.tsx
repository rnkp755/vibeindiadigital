"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface NavigationContextType {
  isNavigating: boolean;
  startNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
  startNavigation: () => {},
});

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Reset navigation state when route changes
    setIsNavigating(false);
  }, [pathname, searchParams]);

  const startNavigation = () => {
    setIsNavigating(true);
  };

  return (
    <NavigationContext.Provider value={{ isNavigating, startNavigation }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}