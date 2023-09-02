
import Container from "react-bootstrap/Container";
import Head from 'next/head';
import Button from "react-bootstrap/Button";
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Alert from 'react-bootstrap/Alert';
import Form from 'react-bootstrap/Form';
import Dropdown from 'react-bootstrap/Dropdown';
import Modal from 'react-bootstrap/Modal';

import 'bootstrap/dist/css/bootstrap.min.css';
import styled from "styled-components";
import { useEffect, useRef, useState } from 'react';
import { Game, Country, getCountry, RequestAction, countries, Query, GameData, PlayingMode, GameState } from "../src/game.types"
import { capitalize, useDarkMode } from "@/src/util"
var _ = require('lodash');

import styles from '@/pages/Game.module.css'
import { Timer } from "@/components/Timer";
import { Field } from "@/components/Field";
import { TableHeading, RowHeading, ColHeading } from '@/components/TableHeading';
import { FaArrowsRotate, FaEllipsis, FaGear, FaMoon, FaPause, FaPersonCircleXmark, FaPlay } from "react-icons/fa6";
import Image from "next/image";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

// TODO
// dont show solution list until game is over. Number can still be toggled
// game winning logic. option to play on. -> two more game states
// island icon: 3 stack, water, circle-"bordered", circle

// TODO difficulty-limiting constraints
//    - prevent that a row has only cells with one equal solution
//    - or total number of cells with just one solution
//    - limit maximum difficulty score
// TODO category common neighbor
// TODO 3 difficulty levels


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

type Settings = {
  difficulty: "easy" | "medium" | "hard";
  showIso: boolean;
  showNumSolutions: boolean;
  showNumSolutionsHint: boolean;
  timeLimit: number | false;
}
type BooleanSettingsKeys = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];


export default function GameComponent(props: any) {

  const [game, setGame] = useState<Game | null>(null)
  // const [gameData, setGameData] = useState({ isNewGame: true, game: null } as GameData)
  const [notifyDecided, setNotifyDecided] = useState<boolean>(false)
  const [userIdentifier, setUserIdentifier] = useState<string>("")
  const [playerIndex, setPlayerIndex] = useState<0 | 1>(0)  // who am i? 0/1
  const [hasTurn, setHasTurn] = useState<boolean>(true)

  // TODO consider using SWR https://nextjs.org/docs/pages/building-your-application/data-fetching/client-side#client-side-data-fetching-with-swr
  function apiRequest(query: Query) {
    // Fetch the game data from the server
    const { userIdentifier, action, player: playerIndex, countryId, pos } = query
    const search = Object.entries(query).filter(([key, val]) => val != undefined).map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join("&")
    const url = "/api/game?" + search
    console.log(`API request: ${url}`);

    fetch(url)
      .then(response => response.json())
      .then(data => {
        const newGame = Game.fromApi(data.game)

        if (newGame.playingMode == PlayingMode.Offline) {

          // in offline mode, userIndex != playerIndex (there's only one user at index 0)
          // setPlayerIndex(newGame.turn)
          setHasTurn(true)

        } else if (newGame.playingMode == PlayingMode.Online) {
          // TODO Online mode
          // const userIndex = data.game.users.indexOf(userIdentifier)
          // if (userIndex != -1) {
          //   setPlayerIndex(userIndex)
          // }
          // setHasTurn(playerIndex == data.game.turn)
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
        if (timerRef.current) {
          timerRef.current.reset()
        }
        setTimerRunning(true)


      })
  }

  // Actions to execute when the game is loaded
  // useEffect(() => {

  // }, [game])

  useEffect(() => {
    // First client-side init
    const storedUserIdentifier = initUserIdentifier()
    setUserIdentifier(storedUserIdentifier)
    apiRequest({
      userIdentifier: storedUserIdentifier,
      action: RequestAction.ExistingOrNewGame,
      difficulty: settings.difficulty
    })
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

  const defaultSettings: Settings = {
    difficulty: "easy",
    showIso: false,
    showNumSolutions: true,
    showNumSolutionsHint: false,
    timeLimit: 10,
  }

  const [settings, setSettings] = useState<Settings>(defaultSettings)

  // Two settings objects/states: Active + Apply for next game
  // TODO
  // const [nextGameSettings, setNextGameSettings] = useState<Settings>(defaultSettings)

  function updateSettings(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { id: string, value: number | false }}) {
    // const newSettings = {
    //   showIso: e.target.id == "settingsShowIso" ? e.target.checked : settings.showIso,
    //   showNumSolutions: e.target.id == "settingsShowNumSolutions" ? e.target.checked : settings.showNumSolutions,
    //   showNumSolutionsHint: e.target.id == "settingsShowNumSolutionsHint" ? e.target.checked : settings.showNumSolutionsHint,
    //   timeLimit: e.target.id == "settingsTimeLimit" ? Number(e.target.value) : settings.timeLimit,  // TODO
    // } as Settings
    const newSettings = {...settings} as Settings
    Object.entries(settings).forEach(([prop, value]) => {
      if (e.target.id == `settings${capitalize(prop)}`) {
        if (prop == "timeLimit") {
          newSettings.timeLimit = e.target.value as number | false
          return
        }
        if (prop == "difficulty") {
          newSettings.difficulty = e.target.value as string
        }

        // boolean
        if ("checked" in e.target) {
          (newSettings as any)[prop as keyof Settings] = e.target.checked
        }
      }
    })

    console.log(`New settings: ${JSON.stringify(newSettings)}`)
    if (!newSettings.showNumSolutions) {
      newSettings.showNumSolutionsHint = false
    }
    setSettings(newSettings)
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

  const [showSettings, setShowSettings] = useState(false)
  const [darkMode, toggleDarkMode] = useDarkMode()

  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef()

  const timeLimitValues = [10, 20, 30, 45, 60, 90, 120]
  const timeLimitDummyValue = 150
  const [timeLimitSliderValue, setTimeLimitSliderValue] = useState(settings.timeLimit !== false ? settings.timeLimit : timeLimitDummyValue)

  const formatTimeLimit = (t: number): string => {
    if (t <= 90) {
      return `${t} s`
    }
    const mins = Math.floor(t / 60)
    const secs = Math.floor(t % 60)
    if (secs == 0) {
      return `${mins} min`
    }
    return `${mins}:${secs}`
  }


  return (<>
    <Head>
      <title>TicTacGlobe</title>
    </Head>
    <Container style={{ maxWidth: "720px" }}>
      <div className="my-3">
        <Image src={`tictacglobe-logo${darkMode ? "-white" : ""}.svg`} width={80} height={80} alt={"TicTacGlobe logo"} />
      </div>
      {!game && <Alert variant="warning">Game could not be initialized.</Alert>}
      {game && (<>
        {/* <p>{gameData.isNewGame ? "New Game" : "Existing Game"}</p> */}
        <SplitButtonToolbar className="mb-2">
          <div className="left">
            <IconButton label="New Game" variant="danger" onClick={() => {
              apiRequest({
                userIdentifier: userIdentifier,
                action: RequestAction.NewGame,
                difficulty: settings.difficulty
              })
            }}><FaArrowsRotate /></IconButton>
            {!notifyDecided && (<>
              <IconButton label="End turn" variant="warning" onClick={() => {
                apiRequest({
                  userIdentifier: userIdentifier,
                  action: RequestAction.EndTurn,
                  player: game.turn
                })
              }}><FaPersonCircleXmark /></IconButton>
            </>)}
            {notifyDecided && (<>
              <IconButton label="Continue playing" variant="secondary" onClick={() => { setNotifyDecided(false) }}><FaEllipsis /></IconButton>
            </>)}
            {/* {!timerRunning && (<IconButton variant="secondary" onClick={() => { setTimerRunning(true) }}><FaPlay /></IconButton>)}
            {timerRunning && (<IconButton variant="secondary" onClick={() => { setTimerRunning(false) }}><FaPause /></IconButton>)} */}
          </div>
          <div className="right">
            <IconButton variant="secondary" onClick={toggleDarkMode} className="me-2"><FaMoon /></IconButton>
            <IconButton variant="secondary" onClick={() => setShowSettings(true)}><FaGear /></IconButton>
          </div>
        </SplitButtonToolbar>
        <Modal show={showSettings} onHide={() => setShowSettings(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Settings</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Select onChange={updateSettings} defaultValue={settings.difficulty} id="settingsDifficulty" className="mb-3">
              <option value="easy">Difficulty: Easy</option>
              <option value="medium">Difficulty: Medium</option>
              <option value="hard">Difficulty: Hard</option>
            </Form.Select>
            <Form.Check type="switch" onChange={updateSettings} checked={settings.showIso} id="settingsShowIso" label="Show country ISO codes" />
            <Form.Check type="switch" onChange={updateSettings} checked={settings.showNumSolutions} id="settingsShowNumSolutions" label="Show number of solutions" />
            <Form.Check type="switch" onChange={updateSettings} checked={settings.showNumSolutionsHint} disabled={!settings.showNumSolutions} id="settingsShowNumSolutionsHint" label="Show number of solutions before guess" />
            <Form.Label className="mt-3">Time Limit: {settings.timeLimit !== false ? formatTimeLimit(settings.timeLimit) : "No limit"}</Form.Label>
            <div className="px-3">
              <Slider
                marks={Object.fromEntries([...timeLimitValues.map(t => [t, formatTimeLimit(t)]), [timeLimitDummyValue, "No limit"]])}
                step={null}
                onChange={(v: number | number[]) => {
                  const t = v as number
                  setTimeLimitSliderValue(t)
                  updateSettings({ target: { id: "settingsTimeLimit", value: t < timeLimitDummyValue ? t : false }})
                }}
                min={Math.min(...timeLimitValues)}
                max={timeLimitDummyValue}
                value={timeLimitSliderValue}
                railStyle={{ backgroundColor: 'var(--bs-gray-100)' }} // Customize the rail color
                trackStyle={{ backgroundColor: 'var(--bs-primary)' }} // Customize the track color
                handleStyle={{ backgroundColor: 'var(--bs-primary)', border: "none", opacity: 1 }} // Customize the handle color
                dotStyle={{ backgroundColor: 'var(--bs-gray-100)', border: "none", width: "12px", height: "12px", bottom: "-4px" }} // Customize the handle color
                activeDotStyle={{ border: "2px solid var(--bs-primary)" }} // Customize the handle color
                className="mb-5"
              />
            </div>
            {/* <Form.Range id="settingsTimeLimit" list="timeLimitValues" className="mt-5" /> */}

          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSettings(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        <p>
          State: <b>{GameState[game.state]}</b>
          {(game.winner === 0 || game.winner === 1) && (<>, Winner: <b>{capitalize(getPlayerColor(game.winner) ?? "No one")}</b></>)}
          {(game.winner === -1) && (<>, <b>It's a draw!</b></>)}
        </p>
        {/* {(notifyDecided && (game.winner === 0 || game.winner === 1)) && <Alert variant="success"><b>{capitalize(getPlayerColor(game.winner) ?? "No one")} wins!</b></Alert>} */}

        <table style={{ margin: "0 auto" }}>
          <thead>
            <tr>
              <th>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                  {showTurnInfo && (<>
                    <span className={styles["badge-player"] + " " + styles[`bg-player-${getPlayerTurnColor()}`]}>{capitalize(getPlayerTurnColor() ?? "No one")}'s turn</span>
                    {settings.timeLimit !== false && (<>
                      <Timer className="mt-2" ref={timerRef} running={timerRunning} setRunning={setTimerRunning} initialTime={settings.timeLimit * 1000} onElapsed={() => {
                        apiRequest({
                          userIdentifier: userIdentifier,
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
    </Container>
  </>)
}




