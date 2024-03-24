"use client"
import Button from "react-bootstrap/Button";
import Alert from 'react-bootstrap/Alert';

import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { Settings, defaultSettings, Game, Country, Category, RequestAction, FrontendQuery, Language, defaultLanguage, autoRefreshInterval, settingsChanged, NewApiQuery, ApiResponse } from "@/src/game.types"
import { GET, capitalize, getLocalStorage, readReadme, setLocalStorage, useAutoRefresh } from "@/src/util"
import _ from "lodash";
var fs = require('fs').promises;

import RemoteTimer from "@/components/Timer";
import Field from "@/components/Field";
import { TableHeading } from '@/components/TableHeading';
import { FaArrowsRotate, FaEllipsis, FaPersonCircleXmark, FaXmark } from "react-icons/fa6";
import { useRouter } from "next/router";
import type { GetServerSideProps } from 'next'
import { PageProps } from "./_app";
import { SettingsModal, changeLanguage } from "@/components/Settings";
import { ButtonToolbar, IconButton, PlayerBadge, GameTable } from "@/components/styles";
import { MarkdownModal } from "@/components/MarkdownModal";
import Header from "@/components/Header";
import { DonationModal, ShareButtonProps } from "@/components/Share";
import useSWR from "swr";
import { useConfirmation } from "@/components/common/Confirmation";
import { useTtgStore } from "@/src/zustand";
import { Session, Game as DbGame } from "@/src/db.types";
import { GameState, PlayingMode, User } from "@prisma/client";
import styled from "styled-components";

const GamePage: React.FC<PageProps & GamePageProps> = ({
  isClient,
  darkMode, toggleDarkMode,
  hasError, errorMessage, setErrorMessage,
  isLoading, setLoadingText,
  gameInformationMarkdown
}) => {
  const confirm = useConfirmation()
  const user = useTtgStore.use.user()
  const { session, setSession } = useTtgStore.useState.session()
  const { game, setGame } = useTtgStore.useState.game()

  useEffect(() => {
    if (!user) return
    
    // TODO move to _app?
    if (!session) {
      const storedSessionId = getLocalStorage("tictacglobe:sessionId", null)
      if (!storedSessionId) return
      loadGame(storedSessionId)
    } else if (session && !game) {
      // First client-side init with user set
      loadGame(session.id)
    }
    async function loadGame(sessionId: number) {
      if (!user) return
      console.log(`First client-side init (GamePage) - userId ${user.id} - sessionId ${sessionId}`)
      apiRequest(`api/session/${sessionId}/user/${user.id}/game`, { action: "ExistingOrNewGame" })
    }
  }, [user, game, session])

  useEffect(() => {
    if (session) {
      setLocalStorage("tictacglobe:sessionId", session.id)
    }
  }, [session])

  const router = useRouter()
  const { t, i18n } = useTranslation('common')

  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [showSettings, setShowSettings] = useState(false)
  const triggerShowSettings = () => { if (game) setShowSettings(true) }
  const [showGameInformation, setShowGameInformation] = useState<boolean>(false)
  const [showDonationModal, setShowDonationModal] = useState<boolean>(false)
  const shareButtonProps: ShareButtonProps = {
    title: "TicTacGlobe",
    text: "Play TicTacGlobe, it's awesome!",
    onShare: () => setShowDonationModal(true)
  }

  const opponentUser = session?.users.filter(u => u.id != user?.id)[0] ?? null

  const [notifyDecided, setNotifyDecided] = useState<boolean>(false)

  const userIndex = session?.users.findIndex(u => u.id == user?.id)
  const isSessionAdmin = userIndex === 0 || session?.playingMode == PlayingMode.Offline
  const hasTurn = userIndex == game?.turn || session?.playingMode == PlayingMode.Offline
  // const [hasTurn, setHasTurn] = useState<boolean>(session?.playingMode == PlayingMode.Offline)
  const [turnStartTimestamp, setTurnStartTimestamp] = useState<number>(Date.now() - 60000)

  const [countries, setCountries] = useState<Country[]>([])
  const { data: categories, mutate: mutateCategories, error: categoriesError, isLoading: isLoadingCategories } = useSWR<Category[]>(`/api/categories?language=${router.locale}`, GET)

  const { scheduleAutoRefresh, clearAutoRefresh } = useAutoRefresh((game: Game) => {
    if (!game) return
    apiRequest(`api/game/${game.id}/refresh`, { action: "RefreshGame" })
  }, autoRefreshInterval)

  useEffect(() => {
    console.log(`settings after update: ${JSON.stringify(settings)}`)
  }, [settings])

  async function apiRequest(
    url: string,
    params: NewApiQuery
  ) {
    const { action, settings: newSettings } = params
    if (!user) {
      return false
    }
    clearAutoRefresh()

    if (action != "RefreshGame") {
      setLoadingText(action == "MakeGuess" ? "Submitting guess" : "Loading")
      if (timerRef.current) {
        (timerRef.current as any).stop()
      }
    }
    
    const formData = new FormData()
    formData.set("action", action)
    formData.set("user", user.id)
    if (game) {
      formData.set("turn", game?.turnCounter.toString())
    }
    if (newSettings) {
      formData.set("settings", JSON.stringify(newSettings))
    }
    if (!url.startsWith("/")) url = "/" + url
    const res = await fetch(url, {
      body: formData,
      method: "POST"
    })
    const data = await res.json() as ApiResponse
    
    if ("error" in data || !data.session || !data.game) {
      setErrorMessage("error" in data ? data.error : "Error loading the game.")
      setGame(null)
      setSession(null)
      return false
    }
    setErrorMessage(false)

    const newGameInstance = new Game(data.game, data.session)
    const gameHadBeenDecided = game?.isDecided() ?? false
    const gameSetup = newGameInstance.setup
    setSession(data.session)
    setGame(newGameInstance)

    setTurnStartTimestamp(oldValue => {
      const newValue = newGameInstance.turnStartTimestamp.getTime()
      if (newValue != oldValue) {
        console.log(`turnStartTimestamp changed by a difference of ${newValue - oldValue}`)
      }
      return newValue
    })

    if (data.session.playingMode == PlayingMode.Online) {

      const willHaveTurn = userIndex == data.game.turn
      // setHasTurn(willHaveTurn)

      // synchronize language
      if (router.locale != newGameInstance.language.toString()) {
        console.log(`Game language: ${newGameInstance.language}, Frontend language: ${router.locale} - changing frontend to ${newGameInstance.language}`)
        changeLanguage(router, i18n, newGameInstance.language)
      }

      if (!willHaveTurn || newGameInstance.isDecided()) {
        scheduleAutoRefresh(newGameInstance)
      }

    }

    let showNotifyDecided = false
    if (game) {  // game had been loaded before
      if (data.game.markings.length) {  // No new game
        if (newGameInstance.winner !== null && !gameHadBeenDecided) {  // There's a new winner (or a draw)
          showNotifyDecided = true
        }
      }
    }

    setNotifyDecided(showNotifyDecided)
    if (data.countries) {
      setCountries(data.countries)
    }
    setSettings(settings => {
      const sessionSettings = JSON.parse(data.session.settings) as Settings
      if (settingsChanged(settings, sessionSettings)) {
        console.log(`Session settings changed. New settings: ${JSON.stringify(data.session.settings)}`)
        return sessionSettings
      } else {
        // No changes, prevent re-render by passing the old object
        return settings
      }
    })

    setLoadingText(false)
    if (timerRef.current) {
      (timerRef.current as any).restart()
    }

    return true
      
  }

  const getPlayerColor = (player: number | null) => {
    return player === 0 ? "blue" : (player === 1 ? "red" : null)
  }
  const getPlayerTurnColor = () => {
    return getPlayerColor(game?.turn ?? null)
  }

  const [showTurnInfo, setShowTurnInfo] = useState(false)
  useEffect(() => {
    if (!game) {
      setShowTurnInfo(false)
    } else {
      if (game.state == GameState.Finished || game.state == GameState.Ended) {
        setShowTurnInfo(false)
      } else if (game.state == GameState.Decided) {
        setShowTurnInfo(!notifyDecided)
      } else {
        setShowTurnInfo(true)
      }
    }
  }, [game, notifyDecided])

  const timerRef = useRef()
  const [activeField, setActiveField] = useState<number[]>([-1, -1])
  const [isSearching, setIsSearching] = useState<boolean>(false)

  const canControlGame = game && (!(game.state == GameState.Running && !hasTurn))
  const canEndTurn = game && (hasTurn && !notifyDecided && !(game.state == GameState.Ended || game.state == GameState.Finished))
  const canEndGame = game && (isSessionAdmin && !(game.state == GameState.Ended || game.state == GameState.Finished))
  const canRequestNewGame = !game || (isSessionAdmin && (game.state == GameState.Ended || game.state == GameState.Finished))

  return (<>
    <Header
      isGame={true} game={game}
      darkMode={darkMode} toggleDarkMode={toggleDarkMode}
      triggerShowGameInformation={() => setShowGameInformation(true)}
      triggerShowSettings={triggerShowSettings}
      shareButtonProps={shareButtonProps}
      apiRequest={apiRequest}
      hasTurn={hasTurn}
    />
    {/* {(isClient && isCustomUserIdentifier) && (<h3>User: {userIdentifier}</h3>)} */}
    <p className="d-flex align-items-center gap-2">
      <UserAvatar user={user} />
      @{userIndex}
      <SessionScore perspective={user} />
      <UserAvatar user={opponentUser} />
    </p>
    {(hasError && errorMessage) && <Alert variant="danger">Error: {errorMessage}</Alert>}
    {hasError && (<>
      <p>
        <Button variant="secondary" onClick={() => {
          router.push("/")
        }}>Enter new game</Button>
      </p>
    </>)}

    {(session && game && user) && (<>
      <ButtonToolbar className="mb-2">
        <div className="left">

          {canEndGame && (
            <IconButton label={t("endGame.action")} variant="danger" onClick={async () => {
              if (await confirm(t("endGame.confirm.question"), {
                title: t("endGame.confirm.title"),
                confirmText: t("endGame.action"),
                cancelText: t("cancel")
              })) {
                apiRequest(`api/game/${game?.id}/guess`, {
                  action: "EndGame",
                })
              }
            }}><FaXmark /></IconButton>
          )}
          {canRequestNewGame && (
            <IconButton label={t("newGame")} variant="danger" onClick={() => {
              apiRequest(`api/session/${session.id}/user/${user.id}/game?newGame=true`, {
                action: "NewGame"
              })
            }}><FaArrowsRotate /></IconButton>
          )}
          {canEndTurn && (<>
            <IconButton label={t("endTurn")} variant="warning" onClick={() => {
              apiRequest(`api/game/${game?.id}/guess?guess=SKIP`, {
                action: "EndTurn",
              })
            }}><FaPersonCircleXmark /></IconButton>
          </>)}

          {(notifyDecided && game.state != GameState.Finished && hasTurn) && (<>
            <IconButton label={t("continuePlaying")} variant="secondary" onClick={() => { setNotifyDecided(false) }}><FaEllipsis /></IconButton>
          </>)}

        </div>
      </ButtonToolbar>

      <p>
        {/* State: <b>{GameState[game.state]}</b> */}
        {(game.winner === 0 || game.winner === 1) && (<>
          {game.playingMode == PlayingMode.Offline && (<>{capitalize(t("winner"))}: <b>{capitalize(t(getPlayerColor(game.winner) ?? "noOne"))}</b></>)}
          {game.playingMode == PlayingMode.Online && (<>{capitalize(t("winNotificationOnline", { player: t(game.winner == userIndex ? "youWin" : "youLose") }))}</>)}
        </>)}
        {(game.winner === -1) && (<b>{t("tieNotification")}</b>)}
      </p>
      {/* {(notifyDecided && (game.winner === 0 || game.winner === 1)) && <Alert variant="success"><b>{capitalize(getPlayerColor(game.winner) ?? "No one")} wins!</b></Alert>} */}

      <div style={{ display: "flex", marginBottom: "50px" }}>
        <GameTable style={{ margin: "0 auto" }}>
          <div className="tableRow header">
            <div className="topLeft">
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                {showTurnInfo && (<>
                  <PlayerBadge $playerColor={getPlayerTurnColor() ?? "none"}>
                    {game.playingMode == PlayingMode.Offline && capitalize(t("turnInfoOffline", { player: t(getPlayerTurnColor() ?? "noOne") }))}
                    {game.playingMode == PlayingMode.Online && capitalize(t("turnInfoOnline", { player: t(hasTurn ? "yourTurn" : "opponentsTurn") }))}
                  </PlayerBadge>
                  {settings.timeLimit !== false && (<>
                    <RemoteTimer
                      className="mt-2"
                      ref={timerRef}
                      initialTimestamp={turnStartTimestamp}
                      initialTime={settings.timeLimit * 1000}
                      onElapsed={() => {
                        if (hasTurn) {
                          apiRequest(`api/game/${game?.id}/guess?guess=SKIP`, {
                            action: "TimeElapsed",
                          })
                        } else {
                          setTimeout(() => apiRequest(`api/game/${game.id}/refresh`, { action: "RefreshGame" }), 500)
                        }
                      }}
                    />
                  </>)}
                </>)}
              </div>
            </div>
            {game.setup.cols.map((col, j) => (
              <TableHeading key={j} orient="col" active={activeField[1] == j} setActive={(active: boolean) => {
                if (!isSearching) {
                  setActiveField(field => active ? [field[0], j] : [-1, -1])
                }
              }} {...col} />
            ))}
          </div>
          {game.setup.solutions.map((row: string[][], i: number) => (
            <div className="tableRow" key={i}>
              <TableHeading key={i} orient="row" active={activeField[0] == i} setActive={(active: boolean) => {
                if (!isSearching) {
                  setActiveField(field => active ? [i, field[1]] : [-1, -1])
                }
              }} {...game.setup.rows[i]} />
              {row.map((countryCodes: string[], j: number) => {
                return (<div className="tableCell" key={j}>
                  <Field
                    pos={[i, j]}
                    active={activeField[0] == i && activeField[1] == j}
                    setActive={(active: boolean) => {
                      if (!isSearching) {
                        setActiveField(field => active ? [i, j] : [-1, -1])
                      }
                    }}
                    setIsSearching={setIsSearching}
                    game={game}
                    row={game.setup.rows[i]}
                    col={game.setup.cols[j]}
                    apiRequest={apiRequest}
                    hasTurn={hasTurn}
                    notifyDecided={notifyDecided}
                    countries={countries}
                    categories={categories ?? []}
                    settings={settings}
                  />
                </div>)
              })}
            </div>
          ))}
        </GameTable>
      </div>

      {/* <div>
        <MyWorldMap countries={countries} />
        <WorldMap
          color="red"
          title="Top 10 Populous Countries"
          value-suffix="people"
          size="lg"
          data={[
            { country: "cn", value: 1389618778 }, // china
            { country: "in", value: 1311559204 }, // india
            { country: "us", value: 331883986 }, // united states
            { country: "id", value: 264935824 }, // indonesia
            { country: "pk", value: 210797836 }, // pakistan
            { country: "br", value: 210301591 }, // brazil
            { country: "ng", value: 208679114 }, // nigeria
            { country: "bd", value: 161062905 }, // bangladesh
            { country: "ru", value: 141944641 }, // russia
            { country: "mx", value: 127318112 }, // mexico
          ]}
        />
      </div> */}

    </>)}

    <MarkdownModal show={showGameInformation} setShow={setShowGameInformation}>{gameInformationMarkdown}</MarkdownModal>
    {game && (
      <SettingsModal settings={settings} setSettings={setSettings} game={game} show={showSettings} setShow={setShowSettings} apiRequest={apiRequest} />
    )}

    <DonationModal show={showDonationModal} setShow={setShowDonationModal} href={process.env.NEXT_PUBLIC_PAYPAL_DONATE_LINK as string} />

  </>)
}

GamePage.displayName = "Game"
export default GamePage;

// export const MyWorldMap: React.FC<{
//   countries: Country[]
// }> = ({ countries }) => {

//   const geoUrl = "public/ne_110m_admin_0_countries_lakes.geojson"

//   const data = [
//     { iso3: "DEU", value: 5 }
//   ]

//   return (
//     <ComposableMap
//       projectionConfig={{
//         rotate: [-10, 0, 0],
//         scale: 147
//       }}
//     >
//       <Sphere stroke="#E4E5E6" strokeWidth={0.5} />
//       <Graticule stroke="#E4E5E6" strokeWidth={0.5} />
//       {data.length > 0 && (
//         <Geographies geography={geoUrl}>
//           {({ geographies }) =>
//             geographies.map((geo) => {
//               const d = data.find(s => s.iso3 === geo.id);
//               return (
//                 <Geography
//                   key={geo.rsmKey}
//                   geography={geo}
//                   fill={d ? colorScale(d.value) : "#F5F4F6"}
//                 />
//               );
//             })
//           }
//         </Geographies>
//       )}
//     </ComposableMap>
//   )
// }

export type GamePageProps = {
  gameInformationMarkdown: string
}

export const getServerSideProps: GetServerSideProps<GamePageProps> = (async ({ locale }) => {
  return {
    props: {
      gameInformationMarkdown: await readReadme(locale, file => fs.readFile(file, { encoding: "utf8" })),
      ...(await serverSideTranslations(locale ?? defaultLanguage, ['common']))
    }
  }
})

const UnstyledUserAvatar: React.FC<React.HTMLProps<HTMLSpanElement> & {
  user: User | null
}> = ({ user, className, ...props }) => {

  const text = user?.name?.substring(0, 1).toUpperCase()

  return (
    <span className={className}>
      {text}
    </span>
  )

}

export const UserAvatar = styled(UnstyledUserAvatar)`

  background: ${({ user }) => user ? `#${user.id.substring(0, 6)}` : "var(--bs-secondary)"};
  color: ${({ user }) => user ? `#${user.id.substring(0, 6)}` : "var(--bs-secondary)"};
  display: inline-flex;
  width: 30px;
  height: 30px;
  border-radius: 15px;

`

export const SessionScore: React.FC<React.HTMLProps<HTMLSpanElement> & {
  perspective: User | null
}> = ({ perspective: user, className, ...props }) => {
  const session = useTtgStore.use.session()
  if (!session) return false
  const userIndex = user ? session.users.map(u => u.id).indexOf(user.id) : -1
  const score = userIndex != 1 ? [session.score1, session.score2] : [session.score2, session.score1]
  return (
    <span className={className}>
      {score[0]}:{score[1]}
    </span>
  )
}
