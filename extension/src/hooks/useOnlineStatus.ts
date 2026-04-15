import { useEffect } from "react";
import { useAppStore } from "@/state/appStore";

export function useOnlineStatus() {
  const setOnline = useAppStore((store) => store.setOnline);

  useEffect(() => {
    const update = () => setOnline(window.navigator.onLine);

    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [setOnline]);
}
