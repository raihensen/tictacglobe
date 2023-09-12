
import type { AppProps } from 'next/app'
import { appWithTranslation } from 'next-i18next'
import { useDarkMode } from '@/src/util'
import { NextComponentType } from 'next'
import Layout from '@/components/Layout'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Alert from 'react-bootstrap/Alert'

type InitialPageProps = {
  [x: string]: any;
}

export type PageProps = InitialPageProps & {
  isClient: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  userIdentifier: string | undefined;
  isCustomUserIdentifier: boolean;
  hasError: boolean;
  setErrorMessage: (msg: string | false) => void;
  isLoading: boolean;
  setLoadingText: (text: string | false) => void;
}

// userIdentifier: unique ID that is consistent across the browser (saved in localStorage)
const initUserIdentifier = () => {
  let storedUserIdentifier = localStorage.getItem('userIdentifier')

  if (!storedUserIdentifier) {
    console.log(`userIdentifier not found in localStorage. Generating ...`);
    // Generate a random user identifier
    storedUserIdentifier = `${Date.now() % 1000000}-${Math.random().toString(36).substring(10)}`
    localStorage.setItem('userIdentifier', storedUserIdentifier)
  }
  return storedUserIdentifier
}


const MyApp = ({ Component, pageProps }: AppProps<InitialPageProps>) => {
  const [isClient, setIsClient] = useState<boolean>(false)
  useEffect(() => {
    setIsClient(true)
  }, [])

  const searchParams = useSearchParams()

  const [userIdentifier, setUserIdentifier] = useState<string | undefined>(undefined)
  const [isCustomUserIdentifier, setIsCustomUserIdentifier] = useState<boolean>(false)

  useEffect(() => {
    if (searchParams?.get("user")) {
      setIsCustomUserIdentifier(true)
      setUserIdentifier(searchParams.get("user") ?? undefined)
    } else {
      setIsCustomUserIdentifier(false)
      setUserIdentifier(initUserIdentifier())
    }

    // console.log(`App: set userIdentifier to "${newUserIdentifier ?? undefined}"`)
  }, [searchParams])

  const [darkMode, toggleDarkMode] = useDarkMode()
  const [errorMessage, setErrorMessage] = useState<string | false>(false)
  const [hasError, setHasError] = useState<boolean>(false)
  useEffect(() => {
    setHasError(!!errorMessage)
    if (!!errorMessage) {
      setLoadingText(false)
    }
  }, [errorMessage])

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [loadingText, setLoadingText] = useState<string | false>("Loading")
  useEffect(() => {
    setIsLoading(!!loadingText)
  }, [loadingText])

  return (<>
    <Layout darkMode={darkMode} hasError={hasError} errorMessage={errorMessage} isLoading={isLoading} loadingText={loadingText}>
      <Component
        isClient={isClient}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        userIdentifier={userIdentifier}
        isCustomUserIdentifier={isCustomUserIdentifier}
        hasError={hasError}
        setErrorMessage={setErrorMessage}
        isLoading={isLoading}
        setLoadingText={setLoadingText}
        {...pageProps}
      />
    </Layout>
  </>)

}

export default appWithTranslation(MyApp)
