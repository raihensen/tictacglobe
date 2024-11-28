"use client"

import Layout from '@/components/Layout'
import ConfirmationModalProvider from '@/components/common/Confirmation'
import { getLocalStorage, setLocalStorage, useDarkMode, useInitEffect, useIsClient } from '@/src/util'
import { useTtgStore } from '@/src/zustand'
import { appWithTranslation } from 'next-i18next'
import type { AppProps } from 'next/app'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type InitialPageProps = {
  [x: string]: any;

  // props provided by Page/getServerSideProps()
  gameInformationMarkdown?: string;
}

export type PageProps = InitialPageProps & {
  // props provided by App
  isClient: boolean;
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

  const { user, setUser } = useTtgStore.useState.user()

  useInitEffect(() => {
    // Get userId from localStorage, and get user data from db, or create new user
    effect()
    async function effect() {
      const storedUserId = getLocalStorage("tictacglobe:userId", null)
      if (storedUserId) {
        // if (!!user) throw Error("User state already set.")
        const data = await fetch(`/api/user/${storedUserId}`).then(res => res.json())
        if ("user" in data) {
          setUser(data.user)
        } else throw Error(`Fetching user ${storedUserId} failed.`)
      } else {
        if (!!user) throw Error("User state already set.")
        // Create new user
        const data = await fetch(`/api/user/create`, { method: "POST" }).then(res => res.json())
        if ("user" in data) {
          setUser(data.user)
          setLocalStorage("tictacglobe:userId", data.user.id)
        } else throw Error(`Creating new user failed.`)
      }
    }

  }, [user])

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
