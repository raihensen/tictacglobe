
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
  isCustomUserIdentifier: boolean;
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
    storedUserIdentifier = `${Date.now() % 1000000}-${Math.random().toString(36).substring(10)}`
    localStorage.setItem('userIdentifier', storedUserIdentifier)
  }
  return storedUserIdentifier
}


const MyApp = ({ Component, pageProps }: AppProps<InitialPageProps>) => {
  const isClient = typeof window !== 'undefined'

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

  return (<>
    <Layout darkMode={darkMode}>
      {errorMessage && <Alert variant="danger">Error: {errorMessage}</Alert>}
      <Component
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        userIdentifier={userIdentifier}
        isCustomUserIdentifier={isCustomUserIdentifier}
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
