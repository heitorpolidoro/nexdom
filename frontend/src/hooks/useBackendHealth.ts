import { useState, useEffect } from "react";
import apiClient from "../api/client";

export const useBackendHealth = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await apiClient.get("/health");
        setIsOffline(false);
      } catch (err) {
        const axiosErr = err as { response?: unknown };
        if (!axiosErr.response) {
          setIsOffline(true);
        }
      }
    };

    void checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return isOffline;
};
