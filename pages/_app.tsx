"use client"

import type { AppProps } from 'next/app'
import { appWithTranslation } from 'next-i18next'
import { getLocalStorage, useDarkMode, useIsClient } from '@/src/util'
import { NextComponentType } from 'next'
import Layout from '@/components/Layout'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Alert from 'react-bootstrap/Alert'
import ConfirmationModalProvider from '@/components/common/Confirmation'
import { useTtgStore } from '@/src/zustand'

type InitialPageProps = {
  [x: string]: any;

  // props provided by Page/getServerSideProps()
  gameInformationMarkdown?: string;
}

export type PageProps = InitialPageProps & {
  // props provided by App
  isClient: boolean;
  // userIdentifier: string | undefined;
  // isCustomUserIdentifier: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  hasError: boolean;
  errorMessage: string | false;
  setErrorMessage: (msg: string | false) => void;
  isLoading: boolean;
  setLoadingText: (text: string | false) => void;

}

const MyApp: React.FC<AppProps<InitialPageProps>> = ({ Component, pageProps }) => {
  const pageName = Component.displayName || Component.name || 'UnknownComponent'
  const isClient = useIsClient()
  const searchParams = useSearchParams()

  const { user, setUser } = useTtgStore.useState.user()

  // const [userIdentifier, setUserIdentifier] = useState<string | undefined>(undefined)
  // const [isCustomUserIdentifier, setIsCustomUserIdentifier] = useState<boolean>(false)

  useEffect(() => {
    // Get userId from localStorage, and get user data from db
    effect()
    async function effect() {
      const storedUserId = getLocalStorage("tictacglobe:userId", null)
      if (storedUserId && !user) {
        const data = await fetch(`/api/user/${storedUserId}`).then(res => res.json())
        if ("user" in data) {
          setUser(data.user)
        }
        console.error(`Fetching user ${storedUserId} failed.`)
      }
    }

    // if (searchParams?.get("user")) {
    //   setIsCustomUserIdentifier(true)
    //   setUserIdentifier(searchParams.get("user") ?? undefined)

    // } else {
    //   setIsCustomUserIdentifier(false)
    //   setUserIdentifier(initUserIdentifier())
    // }
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
    <ConfirmationModalProvider>
      <Layout
        pageName={pageName}
        darkMode={darkMode}
        hasError={hasError}
        errorMessage={errorMessage}
        isLoading={isLoading}
        loadingText={loadingText}
      >
        <Component
          isClient={isClient}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          // userIdentifier={userIdentifier}
          // isCustomUserIdentifier={isCustomUserIdentifier}
          hasError={hasError}
          errorMessage={errorMessage}
          setErrorMessage={setErrorMessage}
          isLoading={isLoading}
          setLoadingText={setLoadingText}
          {...pageProps}
        />
      </Layout>
    </ConfirmationModalProvider>
  </>)

}

export default appWithTranslation(MyApp)

// userIdentifier: unique ID that is consistent across the browser (saved in localStorage)
// const initUserIdentifier = () => {
//   let storedUserIdentifier = localStorage.getItem('userIdentifier')

//   if (!storedUserIdentifier) {
//     console.log(`userIdentifier not found in localStorage. Generating ...`);
//     // Generate a random user identifier
//     storedUserIdentifier = `${Date.now() % 1000000}-${Math.random().toString(36).substring(10)}`
//     localStorage.setItem('userIdentifier', storedUserIdentifier)
//   }
//   return storedUserIdentifier
// }
