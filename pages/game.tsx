
import Button from "react-bootstrap/Button";
import Alert from 'react-bootstrap/Alert';

import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { Settings, defaultSettings, Game, Country, RequestAction, FrontendQuery, PlayingMode, GameState, Language, SessionWithoutGames, defaultLanguage, PlayerIndex, autoRefreshInterval, Query, settingsToQuery, settingsChanged, getApiUrl } from "@/src/game.types"
import { capitalize, readReadme, useAutoRefresh } from "@/src/util"
import _ from "lodash";
var fs = require('fs').promises;

import RemoteTimer from "@/components/Timer";
import Field from "@/components/Field";
import { TableHeading } from '@/components/TableHeading';
import { FaArrowsRotate, FaBars, FaCircleInfo, FaEllipsis, FaGear, FaMoon, FaPause, FaPersonCircleXmark, FaPlay } from "react-icons/fa6";
import { useRouter } from "next/router";
import type { GetServerSideProps } from 'next'
import { PageProps } from "./_app";
import { SettingsModal, useSettings, LanguageSelector, changeLanguage } from "@/components/Settings";
import { ButtonToolbar, IconButton, PlayerBadge, GameTable, HeaderStyle } from "@/components/styles";
import { MarkdownModal } from "@/components/MarkdownModal";
import Header from "@/components/Header";


const GamePage: React.FC<PageProps & GamePageProps> = ({
  isClient,
  darkMode, toggleDarkMode,
  userIdentifier, isCustomUserIdentifier,
  hasError, errorMessage, setErrorMessage,
  isLoading, setLoadingText,
  gameInformationMarkdown
}) => {

  useEffect(() => {
    if (userIdentifier) {
      // First client-side init
      console.log(`First client-side init (GamePage) - userIdentifier ${userIdentifier}`)
      apiRequest({ action: RequestAction.ExistingOrNewGame })
    }
  }, [userIdentifier])

  const router = useRouter()
  const { t, i18n } = useTranslation('common')

  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [showSettings, setShowSettings] = useState(false)
  const triggerShowSettings = () => { if (game) setShowSettings(true) }
  const [showGameInformation, setShowGameInformation] = useState<boolean>(false)

  const [game, setGame] = useState<Game | null>(null)
  const [session, setSession] = useState<SessionWithoutGames | null>(null)
  const [notifyDecided, setNotifyDecided] = useState<boolean>(false)
  
  const [userIndex, setUserIndex] = useState<PlayerIndex>(0)  // who am i? 0/1
  const [hasTurn, setHasTurn] = useState<boolean>(true)
  const [turnStartTimestamp, setTurnStartTimestamp] = useState<number>(Date.now() - 60000)

  const [countries, setCountries] = useState<Country[]>([])


  const getIndexUrl = (absolute: boolean = false) => {
    let url = ""
    if (absolute) {
      url = isClient && window.location.origin ? window.location.origin : ""
    }
    return url + `/${isCustomUserIdentifier ? `?user=${userIdentifier}` : ""}`
  }

  const { scheduleAutoRefresh, clearAutoRefresh } = useAutoRefresh(() => {
    apiRequest({ action: RequestAction.RefreshGame })
  }, autoRefreshInterval)

  useEffect(() => {
    console.log(`settings after update: ${JSON.stringify(settings)}`)
  }, [settings])

  function apiRequest(params: FrontendQuery) {
    if (!userIdentifier) {
      return false
    }
    clearAutoRefresh()

    if (params.action != RequestAction.RefreshGame) {
      setLoadingText(params.action == RequestAction.MakeGuess ? "Submitting guess" : "Loading")
      if (timerRef.current) {
        (timerRef.current as any).stop()
      }
    }

    // Fetch the game data from the server
    const url = getApiUrl({
      userIdentifier: userIdentifier,
      ...params
    }, {
      settings: settings,
      router: router
    })
    console.log(`API request: ${url}`)
    fetch(url)
      .then(response => response.json())
      .then(data => {
        const newGame = data.game ? Game.fromApi(data.game) : null
        const newSession = data.session ? data.session as SessionWithoutGames : null
        const error = data.error ? data.error as string : null

        if (error || !newGame || !newSession) {
          setErrorMessage(error ?? "Error loading the game.")
          setGame(null)
          setSession(null)
          return false
        } else {
          setErrorMessage(false)
        }

        setGame(newGame)
        setTurnStartTimestamp(oldValue => {
          const newValue = newGame.turnStartTimestamp ?? Date.now() - 60000
          if (newValue != oldValue) {
            console.log(`turnStartTimestamp changed by a difference of ${newValue - oldValue}`)
          }
          return newValue
        })
        setSession(newSession)

        if (newGame.playingMode == PlayingMode.Offline) {
          setHasTurn(true)

        } else if (newGame.playingMode == PlayingMode.Online) {
          
          const newUserIndex = newGame.users.indexOf(userIdentifier) as PlayerIndex | -1
          if (newUserIndex == -1) {
            setErrorMessage("userIdentifier is not part of the game!")
            return false
          }
          setUserIndex(newUserIndex)
          const willHaveTurn = newUserIndex == newGame.turn
          setHasTurn(willHaveTurn)

          // synchronize language (TODO TTG-43 synchronize all settings)
          if (router.locale != newGame.setup.language.toString()) {
            console.log(`Game language: ${newGame.setup.language}, Frontend language: ${router.locale} - changing frontend to ${newGame.setup.language}`)
            changeLanguage(router, i18n, newGame.setup.language)
          }

          if (!willHaveTurn) {
            scheduleAutoRefresh()
          }

        }

        let showNotifyDecided = false
        if (game) {  // game had been loaded before
          if (newGame.marking.flat(1).some(m => m != -1)) {  // No new game
            if (newGame.winner !== game.winner) {  // There's a new winner (or a draw)
              showNotifyDecided = true
            }
          }
        }

        setNotifyDecided(showNotifyDecided)
        if (data.countries) {
          setCountries(data.countries)
        }
        setSettings(settings => {
          if (settingsChanged(settings, newSession.settings)) {
            console.log(`Session settings changed. New settings: ${JSON.stringify(newSession.settings)}`)
            return newSession.settings
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

      })
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
      if (game.state == GameState.Finished) {
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

  return (<>
    <Header
      isGame={true} game={game}
      darkMode={darkMode} toggleDarkMode={toggleDarkMode}
      triggerShowGameInformation={() => setShowGameInformation(true)}
      triggerShowSettings={triggerShowSettings}
      apiRequest={apiRequest}
      hasTurn={hasTurn}
    />
    {(isClient && isCustomUserIdentifier) && (<h3>User: {userIdentifier}</h3>)}
    {(hasError && errorMessage) && <Alert variant="danger">Error: {errorMessage}</Alert>}
    {hasError && (<>
      <p>
        <Button variant="secondary" onClick={() => { 
          router.push(getIndexUrl())
        }}>Enter new game</Button>
      </p>
    </>)}
    {game && (<>
      {/* <p>{gameData.isNewGame ? "New Game" : "Existing Game"}</p> */}
      <ButtonToolbar className="mb-2">
        <div className="left">
          {(!(game.state == GameState.Running && !hasTurn)) && (<>
            <IconButton label={t("newGame")} variant="danger" onClick={() => {
              apiRequest({ action: RequestAction.NewGame })
            }}><FaArrowsRotate /></IconButton>

            {!notifyDecided && (<>
              <IconButton label={t("endTurn")} variant="warning" onClick={() => {
                apiRequest({
                  action: RequestAction.EndTurn,
                  player: game.turn
                })
              }}><FaPersonCircleXmark /></IconButton>
            </>)}
          </>)}

          {(notifyDecided && game.state != GameState.Finished && hasTurn) && (<>
            <IconButton label={t("continuePlaying")} variant="secondary" onClick={() => { setNotifyDecided(false) }}><FaEllipsis /></IconButton>
          </>)}
          
        </div>
      </ButtonToolbar>

      {/* https://github.com/JedWatson/react-select/issues/2345 */}
      {/* <p>
        <CountryAutoComplete countries={countries} onBlur={() => {}} makeGuess={(c: Country) => false} />
      </p>
      <p>
        <Form.Select aria-label="Default select example">
          <option>Open this select menu</option>
          <option value="1">One</option>
          <option value="2">Two</option>
          <option value="3">Three</option>
        </Form.Select>
      </p>
      <p>
        <Form.Control type="text" />
      </p> */}

      <p>
        {/* State: <b>{GameState[game.state]}</b> */}
        {(game.winner === 0 || game.winner === 1) && (<>
          {game.playingMode == PlayingMode.Offline && (<>{capitalize(t("winner"))}: <b>{capitalize(t(getPlayerColor(game.winner) ?? "noOne"))}</b></>)}
          {game.playingMode == PlayingMode.Online && (<>{capitalize(t("winNotificationOnline", { player: t(game.winner == userIndex ? "youWin" : "youLose") }))}</>)}
        </>)}
        {(game.winner === -1) && (<b>{t("tieNotification")}</b>)}
      </p>
      {/* {(notifyDecided && (game.winner === 0 || game.winner === 1)) && <Alert variant="success"><b>{capitalize(getPlayerColor(game.winner) ?? "No one")} wins!</b></Alert>} */}
      
      <div style={{ display: "flex" }}>
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
                        console.log(`Timer elapsed --- ${hasTurn ? "hasTurn = true" : "hasTurn = false"}`)
                        if (hasTurn) {
                          apiRequest({
                            action: RequestAction.TimeElapsed,
                            player: game.turn
                          })
                        } else {
                          apiRequest({ action: RequestAction.RefreshGame })
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
                    userIdentifier={userIdentifier}
                    apiRequest={apiRequest}
                    hasTurn={hasTurn}
                    notifyDecided={notifyDecided}
                    countries={countries}
                    settings={settings}
                  />
                </div>)
              })}
            </div>
          ))}
        </GameTable>
      </div>
    </>)}

    <MarkdownModal show={showGameInformation} setShow={setShowGameInformation}>{gameInformationMarkdown}</MarkdownModal>
    {game && (
      <SettingsModal settings={settings} setSettings={setSettings} game={game} show={showSettings} setShow={setShowSettings} apiRequest={apiRequest} />
    )}

  </>)
}

GamePage.displayName = "Game"

export default GamePage;

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
