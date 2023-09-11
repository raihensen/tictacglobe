
import Button from "react-bootstrap/Button";
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Alert from 'react-bootstrap/Alert';
import { confirm } from 'react-bootstrap-confirmation';

import 'bootstrap/dist/css/bootstrap.min.css';
import styled from "styled-components";
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { Game, Country, RequestAction, FrontendQuery, PlayingMode, GameState, Language, GameSession, SessionWithoutGames, defaultLanguage, PlayerIndex, autoRefreshInterval } from "../src/game.types"
import { capitalize, useAutoRefresh, useInitEffect } from "@/src/util"
var _ = require('lodash');

import styles from '@/pages/Game.module.css'
import Timer from "@/components/Timer";
import { Field } from "@/components/Field";
import { TableHeading, RowHeading, ColHeading } from '@/components/TableHeading';
import { FaArrowsRotate, FaEllipsis, FaGear, FaMoon, FaPause, FaPersonCircleXmark, FaPlay } from "react-icons/fa6";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import type { GetStaticProps, InferGetStaticPropsType } from 'next'
import { PageProps } from "./_app";
import { Settings, SettingsModal, useSettings, LanguageSelector, changeLanguage } from "@/components/Settings";


// TODO
// dont show solution list until game is over. Number can still be toggled
// island icon: 3 stack, water, circle-"bordered", circle
// category common neighbor

type Props = {
  // Add custom props here
}

const TableCell = styled.td`
  border: 1px solid rgba(0,0,0,.25);
  padding: 0;
`
const SplitButtonToolbar = styled(ButtonToolbar)`
  & > .left {
    margin-right: auto;
  }
  & > .left, & > .right {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    & > :not(:last-child) {
      margin-right: .5rem !important;
    }
  }
`

const IconButton = ({ children, label, className, ...props }: any) => (
  <Button className={([styles.btnIcon].concat(className ? [className] : [])).join(" ")} {...props}>
    {children}
    {label && <span>{label}</span>}
  </Button>
)

const defaultSettings: Settings = {
  difficulty: "easy",
  showIso: false,
  showNumSolutions: true,
  showNumSolutionsHint: false,
  timeLimit: false,
}


const GamePage = ({ darkMode, toggleDarkMode, userIdentifier, isCustomUserIdentifier, errorMessage, setErrorMessage }: PageProps) => {
  
  const [isClient, setIsClient] = useState<boolean>(false)

  useEffect(() => {
    setIsClient(true)
    if (userIdentifier) {
      // First client-side init
      console.log(`First client-side init (GamePage) - userIdentifier ${userIdentifier}`)
      apiRequest({ action: RequestAction.ExistingOrNewGame })
    }
  }, [userIdentifier])


  const router = useRouter()
  const { t, i18n } = useTranslation('common')

  // TODO
  const playingMode: PlayingMode = PlayingMode.Online as PlayingMode

  const [settings, setSettings] = useSettings(defaultSettings)
  const [showSettings, setShowSettings] = useState(false)

  const [game, setGame] = useState<Game | null>(null)
  const [notifyDecided, setNotifyDecided] = useState<boolean>(false)
  
  const [userIndex, setUserIndex] = useState<PlayerIndex>(0)  // who am i? 0/1
  const [hasTurn, setHasTurn] = useState<boolean>(true)

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

  // TODO consider using SWR https://nextjs.org/docs/pages/building-your-application/data-fetching/client-side#client-side-data-fetching-with-swr
  function apiRequest(params: FrontendQuery) {
    if (!userIdentifier) {
      return false
    }

    clearAutoRefresh()

    // Fetch the game data from the server
    const query = {
      userIdentifier: userIdentifier,
      playingMode: playingMode,
      ...params
    }
    if (params.action == RequestAction.NewGame || params.action == RequestAction.ExistingOrNewGame) {
      query.difficulty = settings.difficulty,
      query.language = (router.locale ?? defaultLanguage) as Language
    }

    const search = Object.entries(query).filter(([key, val]) => val != undefined).map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join("&")
    const url = "/api/game?" + search
    console.log(`API request: ${url}`);

    fetch(url)
      .then(response => response.json())
      .then(data => {
        const newGame = data.game ? Game.fromApi(data.game) : null
        const session = data.session ? data.session as SessionWithoutGames : null
        const error = data.error ? data.error as string : null

        if (error) {
          setErrorMessage(error)
          return false
        } else {
          setErrorMessage(false)
        }

        if (!newGame || !session) {
          setErrorMessage("Error loading the game.")
          return false
        }

        console.log("Session: " + JSON.stringify(session))

        if (newGame.playingMode == PlayingMode.Offline) {
          setHasTurn(true)

        } else if (newGame.playingMode == PlayingMode.Online) {
          // TODO Online mode
          const newUserIndex = newGame.users.indexOf(userIdentifier) as PlayerIndex | -1
          if (newUserIndex == -1) {
            setErrorMessage("userIdentifier is not part of the game!")
            return false
          }
          setUserIndex(newUserIndex)
          const willHaveTurn = newUserIndex == newGame.turn
          setHasTurn(willHaveTurn)

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

        setGame(newGame)
        setNotifyDecided(showNotifyDecided)
        if (data.countries) {
          setCountries(data.countries)
        }

        if (timerRef.current) {
          (timerRef.current as any).reset()
        }
        setTimerRunning(true)

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

  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef()

  return (<>
    {(isClient && isCustomUserIdentifier) && (<h3>User: {userIdentifier}</h3>)}
    {(!errorMessage && !game) && <Alert variant="warning">Loading game...</Alert>}
    {errorMessage && (<>
      <p>
        <Button variant="secondary" onClick={() => { 
          router.push(getIndexUrl())
        }}>Enter new game</Button>
      </p>
    </>)}
    {game && (<>
      {/* <p>{gameData.isNewGame ? "New Game" : "Existing Game"}</p> */}
      <SplitButtonToolbar className="mb-2">
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
        <div className="right">
          <IconButton variant="secondary" onClick={toggleDarkMode} className="me-2"><FaMoon /></IconButton>
          <LanguageSelector onChange={async (oldLanguage, newLanguage) => {
            if (await confirm(t("changeLanguage.confirm.question"), {
              title: t("changeLanguage.confirm.title"),
              okText: t("newGame"),
              cancelText: t("cancel")
            })) {
              apiRequest({ action: RequestAction.NewGame })  // TODO if language change does not work, have to pass newLanguage here
              return true
            } else {
              // undo change
              changeLanguage(router, i18n, oldLanguage)
              return false
            }
          }} />
          <IconButton variant="secondary" onClick={() => setShowSettings(true)}><FaGear /></IconButton>
        </div>
      </SplitButtonToolbar>

      <SettingsModal settings={settings} setSettings={setSettings} showSettings={showSettings} setShowSettings={setShowSettings} />

      <p>
        {/* State: <b>{GameState[game.state]}</b> */}
        {(game.winner === 0 || game.winner === 1) && (<>
          {playingMode == PlayingMode.Offline && (<>{capitalize(t("winner"))}: <b>{capitalize(t(getPlayerColor(game.winner) ?? "noOne"))}</b></>)}
          {playingMode == PlayingMode.Online && (<>{capitalize(t("winNotificationOnline", { player: t(game.winner == userIndex ? "youWin" : "youLose") }))}</>)}
        </>)}
        {(game.winner === -1) && (<b>{t("tieNotification")}</b>)}
      </p>
      {/* {(notifyDecided && (game.winner === 0 || game.winner === 1)) && <Alert variant="success"><b>{capitalize(getPlayerColor(game.winner) ?? "No one")} wins!</b></Alert>} */}

      <table style={{ margin: "0 auto" }}>
        <thead>
          <tr>
            <th>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                {showTurnInfo && (<>
                  <span className={styles["badge-player"] + " " + styles[`bg-player-${getPlayerTurnColor()}`]}>
                    {playingMode == PlayingMode.Offline && capitalize(t("turnInfoOffline", { player: t(getPlayerTurnColor() ?? "noOne") }))}
                    {playingMode == PlayingMode.Online && capitalize(t("turnInfoOnline", { player: t(hasTurn ? "yourTurn" : "opponentsTurn") }))}
                  </span>
                  {settings.timeLimit !== false && (<>
                    <Timer className="mt-2" ref={timerRef} running={timerRunning} setRunning={setTimerRunning} initialTime={settings.timeLimit * 1000} onElapsed={() => {
                      apiRequest({
                        action: RequestAction.TimeElapsed,
                        player: game.turn
                      })
                    }} />
                  </>)}
                </>)}
              </div>
            </th>
            {game.setup.cols.map((col, j) => (
              <ColHeading key={j}><div><TableHeading {...col} /></div></ColHeading>
            ))}
          </tr>
        </thead>
        <tbody>
          {game.setup.solutions.map((row: string[][], i: number) => (
            <tr key={i}>
              <RowHeading><div><TableHeading {...game.setup.rows[i]} /></div></RowHeading>
              {row.map((countryCodes: string[], j: number) => {
                return (<TableCell key={j}>
                  <Field
                    pos={[i, j]}
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
                </TableCell>)
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </>)}
  </>)
}

export const getStaticProps: GetStaticProps<Props> = async ({
  locale,
}) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', [
      'common',
    ])),
  },
});

export default GamePage;
