
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
  darkMode: boolean;
  toggleDarkMode: () => void;
  userIdentifier: string | undefined;
  // userIdentifier2: string | undefined;
  // sessionIdentifier: string;
  errorMessage: string | false;
  setErrorMessage: (msg: string | false) => void;
}

// userIdentifier: unique ID that is consistent across the browser (saved in localStorage)
const initUserIdentifier = () => {
  let storedUserIdentifier = localStorage.getItem('userIdentifier')

  if (!storedUserIdentifier) {
    console.log(`userIdentifier not found in localStorage. Generating ...`);
    // Generate a random user identifier
    storedUserIdentifier = Math.random().toString(36).substring(10)
    localStorage.setItem('userIdentifier', storedUserIdentifier)
  }
  return storedUserIdentifier
}

// sessionIdentifier: unique ID that changes in every browser tab etc.
const initSessionIdentifier = () => {
  let storedSessionIdentifier = sessionStorage.getItem('sessionIdentifier')

  if (!storedSessionIdentifier) {
    console.log(`storedSessionIdentifier not found in sessionStorage. Generating ...`);
    // Generate a random session identifier
    storedSessionIdentifier = Math.random().toString(36).substring(10)
    localStorage.setItem('sessionIdentifier', storedSessionIdentifier)
  }
  return storedSessionIdentifier
}


const MyApp = ({ Component, pageProps }: AppProps<InitialPageProps>) => {
  const isClient = typeof window !== 'undefined'

  const searchParams = useSearchParams()

  const [userIdentifier, setUserIdentifier] = useState<string | undefined>(undefined)
  useEffect(() => {
    let newUserIdentifier = searchParams?.get("user") || initUserIdentifier()
    setUserIdentifier(newUserIdentifier ?? undefined)
    // console.log(`App: set userIdentifier to "${newUserIdentifier ?? undefined}"`)
  }, [searchParams])

  const [darkMode, toggleDarkMode] = useDarkMode()
  const [errorMessage, setErrorMessage] = useState<string | false>(false)

  return (<>
    <Layout darkMode={darkMode}>
      {errorMessage && <Alert variant="danger">Error: {errorMessage}</Alert>}
      <Component
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        userIdentifier={userIdentifier}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
        // userIdentifier2={userIdentifier2}
        // sessionIdentifier={sessionIdentifier}
        {...pageProps}
      />
    </Layout>
  </>)

}

export default appWithTranslation(MyApp)
