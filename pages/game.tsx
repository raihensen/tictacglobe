
import Button from "react-bootstrap/Button";
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Alert from 'react-bootstrap/Alert';
import { confirm } from 'react-bootstrap-confirmation';

import 'bootstrap/dist/css/bootstrap.min.css';
import styled from "styled-components";
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { Game, Country, RequestAction, FrontendQuery, PlayingMode, GameState, Language, GameSession, SessionWithoutGames, defaultLanguage } from "../src/game.types"
import { capitalize, useDarkMode } from "@/src/util"
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
  timeLimit: 45,
}

const GamePage = ({ darkMode, toggleDarkMode, userIdentifier }: PageProps) => {
  
  const router = useRouter()
  const { t, i18n } = useTranslation('common')

  // TODO
  const playingMode = PlayingMode.Online


  const [settings, setSettings] = useSettings(defaultSettings)
  const [showSettings, setShowSettings] = useState(false)

  const [game, setGame] = useState<Game | null>(null)
  const [notifyDecided, setNotifyDecided] = useState<boolean>(false)
  
  // const [playerIndex, setPlayerIndex] = useState<0 | 1>(0)  // who am i? 0/1
  const [hasTurn, setHasTurn] = useState<boolean>(true)

  const [countries, setCountries] = useState<Country[]>([])

  // TODO consider using SWR https://nextjs.org/docs/pages/building-your-application/data-fetching/client-side#client-side-data-fetching-with-swr
  function apiRequest(params: FrontendQuery) {
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
        let newGame: Game | null = Game.fromApi(data.game)
        const session = data.session as SessionWithoutGames

        if (!newGame || !session) {
          return false
        }

        console.log("Session: " + JSON.stringify(session))
        if (newGame.playingMode == PlayingMode.Offline) {

          // in offline mode, userIndex != playerIndex (there's only one user at index 0)
          // setPlayerIndex(newGame.turn)
          setHasTurn(true)

        } else if (newGame.playingMode == PlayingMode.Online) {
          // TODO Online mode
          const userIndex = newGame.users.indexOf(userIdentifier)
          if (userIndex == -1) {
            console.log("userIdentifier is not part of the game!")
            return false
            // setPlayerIndex(userIndex)
          }
          setHasTurn(userIndex == newGame.turn)
        }

        // console.log("Update game");
        // setGameData(data)

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

  useEffect(() => {
    // First client-side init
    console.log(`First client-side init (GamePage) - userIdentifier ${userIdentifier}`)
    apiRequest({ action: RequestAction.ExistingOrNewGame })
    return () => {
      // this is called to finalize the effect hook, before it is triggered again
    }
  }, [])

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
    {!game && <Alert variant="warning">Game could not be initialized.</Alert>}
    {game && (<>
      {/* <p>{gameData.isNewGame ? "New Game" : "Existing Game"}</p> */}
      <SplitButtonToolbar className="mb-2">
        <div className="left">
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

          <span>hasTurn: {hasTurn ? "y" : "n"}</span>

          {(notifyDecided && game.state != GameState.Finished) && (<>
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
        {(game.winner === 0 || game.winner === 1) && (<>, {capitalize(t("winner"))}: <b>{capitalize(t(getPlayerColor(game.winner) ?? "noOne"))}</b></>)}
        {(game.winner === -1) && (<>, <b>{t("tieNotification")}</b></>)}
      </p>
      {/* {(notifyDecided && (game.winner === 0 || game.winner === 1)) && <Alert variant="success"><b>{capitalize(getPlayerColor(game.winner) ?? "No one")} wins!</b></Alert>} */}

      <table style={{ margin: "0 auto" }}>
        <thead>
          <tr>
            <th>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                {showTurnInfo && (<>
                  <span className={styles["badge-player"] + " " + styles[`bg-player-${getPlayerTurnColor()}`]}>{capitalize(t("turnInfo", { player: t(getPlayerTurnColor() ?? "noOne") }))}</span>
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
