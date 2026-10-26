import { useEffect, useState } from "react"
import { loadPersistUsageHistory, PERSIST_USAGE_HISTORY_CHANGED_EVENT } from "@/lib/settings"

export function usePersistUsageHistory() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let mounted = true
    let changed = false
    const onChanged = (event: Event) => {
      changed = true
      setEnabled((event as CustomEvent<boolean>).detail)
    }
    window.addEventListener(PERSIST_USAGE_HISTORY_CHANGED_EVENT, onChanged)
    void loadPersistUsageHistory()
      .then((v) => {
        if (mounted && !changed) setEnabled(v)
      })
      .catch((e) => console.error("loadPersistUsageHistory:", e))
    return () => {
      mounted = false
      window.removeEventListener(PERSIST_USAGE_HISTORY_CHANGED_EVENT, onChanged)
    }
  }, [])

  return enabled
}
