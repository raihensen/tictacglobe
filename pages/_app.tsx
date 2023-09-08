
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
  // userIdentifier: string;
}

// const initUserIdentifier = () => {
//   let storedUserIdentifier = localStorage.getItem('userIdentifier')

//   if (!storedUserIdentifier) {
//     console.log(`userIdentifier not found in localStorage. Generating ...`);
//     // Generate a random user identifier
//     storedUserIdentifier = Math.random().toString(36).substring(10)
//     localStorage.setItem('userIdentifier', storedUserIdentifier)
//   }
//   return storedUserIdentifier
// }


const MyApp = ({ Component, pageProps }: AppProps<InitialPageProps>) => {

  const [darkMode, toggleDarkMode] = useDarkMode()
  // const getLayout = Component.getLayout ?? ((page: NextComponentType) => page)


  // useEffect(() => {
  //   // First client-side init
  //   const storedUserIdentifier = initUserIdentifier()
  //   setUserIdentifier(storedUserIdentifier)
  //   apiRequest({
  //     userIdentifier: storedUserIdentifier,
  //     action: RequestAction.ExistingOrNewGame,
  //     difficulty: settings.difficulty,
  //     language: router.locale as Language
  //   })
  //   return () => {
  //     // this is called to finalize the effect hook, before it is triggered again
  //   }
  // }, [])
  

  return (<>
    <Layout darkMode={darkMode}>
      <Component
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        // userIdentifier={userIdentifier}
        {...pageProps}
      />
    </Layout>
  </>)

}

export default appWithTranslation(MyApp)
