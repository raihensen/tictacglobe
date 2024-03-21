import { Mutex } from "async-mutex";
import { useEffect, useRef, useState } from "react";
import path from "path";
import { defaultLanguage } from "@/src/game.types";


export async function GET<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const data = await res.json()
  console.log(`SWR: GET ${url}`)
  return (data?.data || {}) as T
}


export const capitalize = <T extends string>(s: T) => (s[0].toUpperCase() + s.slice(1)) as Capitalize<typeof s>;

export function randomChoice<T>(arr: Array<T>): T | undefined {
  if (!arr.length) {
    return undefined
  }
  return arr[Math.floor(arr.length * Math.random())];
}

/**
 * localStorage.getItem() wrapper, using JSON encoding
 * @param key 
 * @param defaultValue 
 * @returns 
 */
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  const value = localStorage.getItem(key)
  console.log(`get localStorage[${key}]: ${value ?? "not found"}`)
  if (value === null) {
    return defaultValue
  }
  try {
    return JSON.parse(value)
  } catch (e) {
    return defaultValue
  }
}

/**
 * localStorage.setItem() wrapper, using JSON encoding
 * @param key 
 * @param value 
 */
export function setLocalStorage<T>(key: string, value: T) {
  console.log(`set localStorage[${key}]:= ${JSON.stringify(value)}`)
  localStorage.setItem(key, JSON.stringify(value))
}

/**
 * A custom useEffect hook that only triggers on updates, not on initial mount
 * From https://stackoverflow.com/a/57632587
 * @param {() => any} effect
 * @param {any[]} dependencies
 */
export function useUpdateEffect(effect: () => any, dependencies: any[] = []) {
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      return effect();
    }
  }, dependencies);
}

/**
 * A custom useEffect hook that only triggers on first update of a state (or multiple states)
 * @param {() => any} effect
 * @param {any[]} dependencies
 */
export function useInitEffect(effect: () => any, dependencies: any[] = []) {
  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return effect()
    }
  }, dependencies)
}


export function useDarkMode(initialValue: boolean = false): [boolean, () => void] {

  const [darkMode, setDarkMode] = useState(initialValue);

  // manually toggle the dark mode (called by a button), saving an individual preference
  const toggleDarkMode = () => {
    const newState = !darkMode
    setDarkMode(newState)
    setLocalStorage("darkMode", newState)
  }

  // Update the bootstrap theme when state changes
  useUpdateEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Get initial value
  useEffect(() => {
    // Get individual preference from localStorage
    const storedDarkMode = getLocalStorage<boolean | null>('darkMode', null)
    if (storedDarkMode !== null) {
      setDarkMode(storedDarkMode)
    } else {
      // If there's no individual preference for this page, use system preference and listen to changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        // console.log(`System preference changed: ${event.matches ? "dark" : "light"}`);
        setDarkMode(event.matches)
        localStorage.removeItem("darkMode")
      });
    }
  }, [])

  return [darkMode, toggleDarkMode]

}

/**
 * This hook offers an auto-refresh feature. The action is executed after the specified duration when calling scheduleAutoRefresh().
 * Existing schedules can be deleted by calling clearAutoRefresh().
 * For repeated execution, include a call to scheduleAutoRefresh in the action.
 * @param action The action to be executed.
 * @param interval The time duration [ms].
 * @returns an object with the two functions scheduleAutoRefresh and clearAutoRefresh.
 */
export function useAutoRefresh(action: (...args: any[]) => void, interval: number) {

  const autoRefreshIntervalMutex = new Mutex()
  const [autoRefreshIntervalHandle, setAutoRefreshIntervalHandle] = useState<NodeJS.Timeout>()

  useEffect(() => {
    // clear the autoRefresh interval when the component unmounts
    return () => clearAutoRefresh()
  }, [])

  const clearAutoRefresh = () => {
    autoRefreshIntervalMutex.runExclusive(() => {
      if (typeof autoRefreshIntervalHandle !== 'undefined') {
        clearTimeout(autoRefreshIntervalHandle)
      }
    })
  }

  const scheduleAutoRefresh = (...args: any[]) => {
    autoRefreshIntervalMutex.runExclusive(() => {
      if (typeof autoRefreshIntervalHandle !== 'undefined') {
        clearTimeout(autoRefreshIntervalHandle)
      }
      setAutoRefreshIntervalHandle(setTimeout(() => {
        action(...args)
      }, interval))
    })
  }

  return {
    scheduleAutoRefresh: scheduleAutoRefresh,
    clearAutoRefresh: clearAutoRefresh
  }

}


export async function readReadme(locale: string | undefined, readFile: (file: string) => Promise<string>) {
  const file = path.join(process.cwd(), "public", `game-info-${(locale ?? defaultLanguage).toLowerCase()}.md`)
  return await readFile(file)
}

export function addClassName(passedClassName: string | undefined, extraClassName: string) {
  return [passedClassName, extraClassName].filter(x => x !== undefined).join(" ")
}

export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState<boolean>(false)
  useEffect(() => {
    setIsClient(true)
  }, [])
  return isClient
}
