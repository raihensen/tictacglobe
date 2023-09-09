
import type { AppProps } from 'next/app'
import { appWithTranslation } from 'next-i18next'
import { useDarkMode } from '@/src/util'
import { NextComponentType } from 'next'
import Layout from '@/components/Layout'
import { useEffect, useState } from 'react'

type InitialPageProps = {
  [x: string]: any;
}

export type PageProps = InitialPageProps & {
  darkMode: boolean;
  toggleDarkMode: () => void;
  userIdentifier: string;
  sessionIdentifier: string;
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
  const userIdentifier = isClient ? initUserIdentifier() : undefined
  const sessionIdentifier = isClient ? initSessionIdentifier() : undefined

  const [darkMode, toggleDarkMode] = useDarkMode()
  // const getLayout = Component.getLayout ?? ((page: NextComponentType) => page)


  return (<>
    <Layout darkMode={darkMode}>
      <Component
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        userIdentifier={userIdentifier}
        sessionIdentifier={sessionIdentifier}
        {...pageProps}
      />
    </Layout>
  </>)

}

export default appWithTranslation(MyApp)
