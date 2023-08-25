
import Container from "react-bootstrap/Container";
import Head from 'next/head';
import Button from "react-bootstrap/Button";
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Alert from 'react-bootstrap/Alert';
import Form from 'react-bootstrap/Form';
import Dropdown from 'react-bootstrap/Dropdown';
import Modal from 'react-bootstrap/Modal';

import { TableHeading, RowHeading, ColHeading } from '../components/TableHeading';
import 'bootstrap/dist/css/bootstrap.min.css';
import styled from "styled-components";
import { forwardRef, useEffect, useId, useState } from 'react';
import { Game, Country, getCountry, RequestAction, countries, Query, GameData, PlayingMode, GameState } from "../src/game.types"
import { capitalize, getLocalStorage, setLocalStorage, useDarkMode } from "@/src/util"
var _ = require('lodash');

import styles from '@/pages/Game.module.css'
import { Field } from "@/components/Field";
import { FaArrowsRotate, FaEllipsis, FaGear, FaMoon, FaPersonCircleXmark } from "react-icons/fa6";
import Image from "next/image";

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
  showIso: boolean;
  showNumSolutions: boolean;
  showNumSolutionsHint: boolean;
  timeLimit: number | false;
}


const Timer = (props: { initialTime: number, onElapsed: () => any, className?: string | undefined }) => {
  const [time, setTime] = useState(props.initialTime)
  const [danger, setDanger] = useState(props.initialTime <= 5)
  useEffect(() => {
    const intervalHandle = setInterval(() => {
      setTime(time - 1)
      if (time <= 5) {
        setDanger(true)
      }
    }, 1000)
    if (time === 0) {
      clearInterval(intervalHandle)
      props.onElapsed()
    }
    return () => {
      clearInterval(intervalHandle)
    }
  })
  const padZeros = (t: number) => t.toString().padStart(2, "0")
  return (<>
    <div className={`timer${danger ? " danger" : ""} ${props.className ? props.className : ""}`}>
      <span className="minutes">{padZeros(Math.floor(time / 60))}</span>
      <span className="colon">:</span>
      <span className="seconds">{padZeros(Math.floor(time % 60))}</span>
    </div>
  </>)
}
const MyTimer = styled(Timer)`
  font-family: "Roboto Slab", Arial;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: .25rem;

  & > span {
    &.minutes { text-align: right; }
    &.colon { text-align: center; padding: 2px; }
    &.seconds { text-align: left; }
  }
  &.danger {
    background: var(--bs-danger);
    color: #fff;
  }

}`


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
          // TODO
          const userIndex = data.game.users.indexOf(userIdentifier)
          // if (userIndex != -1) {
          //   setPlayerIndex(userIndex)
          // }
          setHasTurn(playerIndex == data.game.turn)
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

      })
  }

  useEffect(() => {
    // First client-side init
    const storedUserIdentifier = initUserIdentifier()
    setUserIdentifier(storedUserIdentifier)
    apiRequest({
      userIdentifier: storedUserIdentifier,
      action: RequestAction.ExistingOrNewGame,
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

  const [settings, setSettings] = useState<Settings>({
    showIso: false,
    showNumSolutions: true,
    showNumSolutionsHint: false,
    timeLimit: 20,
  })

  function updateSettings(e: React.ChangeEvent<HTMLInputElement>) {
    const newSettings = {
      showIso: e.target.id == "settingsShowIso" ? e.target.checked : settings.showIso,
      showNumSolutions: e.target.id == "settingsShowNumSolutions" ? e.target.checked : settings.showNumSolutions,
      showNumSolutionsHint: e.target.id == "settingsShowNumSolutionsHint" ? e.target.checked : settings.showNumSolutionsHint,
      timeLimit: e.target.id == "settingsTimeLimit" ? Number(e.target.value) : settings.timeLimit,  // TODO
    } as Settings
    if (!newSettings.showNumSolutions) {
      newSettings.showNumSolutionsHint = false
    }
    setSettings(newSettings)
  }

  const [showSettings, setShowSettings] = useState(false)
  const [darkMode, toggleDarkMode] = useDarkMode()

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
            {!notifyDecided && (<>
              <IconButton label="New Game" variant="danger" onClick={() => {
                apiRequest({
                  userIdentifier: userIdentifier,
                  action: RequestAction.NewGame,
                })
              }} className="me-2"><FaArrowsRotate /></IconButton>
              <IconButton label="End turn" variant="warning" onClick={() => {
                apiRequest({
                  userIdentifier: userIdentifier,
                  action: RequestAction.EndTurn,
                  player: game.turn
                })
              }} className="me-auto"><FaPersonCircleXmark /></IconButton>
            </>)}
            {notifyDecided && (<>
              <IconButton label="New Game" variant="danger" onClick={() => {
                apiRequest({
                  userIdentifier: userIdentifier,
                  action: RequestAction.NewGame,
                })
              }} className="me-2"><FaArrowsRotate /></IconButton>
              <IconButton label="Continue playing" variant="secondary" onClick={() => { setNotifyDecided(false) }} className="me-auto"><FaEllipsis /></IconButton>
            </>)}
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
            <Form.Check type="switch" onChange={updateSettings} checked={settings.showIso} id="settingsShowIso" label="Show country ISO codes" />
            <Form.Check type="switch" onChange={updateSettings} checked={settings.showNumSolutions} id="settingsShowNumSolutions" label="Show number of solutions" />
            <Form.Check type="switch" onChange={updateSettings} checked={settings.showNumSolutionsHint} disabled={!settings.showNumSolutions} id="settingsShowNumSolutionsHint" label="Show number of solutions before guess" />
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
                  <span className={styles["badge-player"] + " " + styles[`bg-player-${getPlayerTurnColor()}`]}>{capitalize(getPlayerTurnColor() ?? "No one")}'s turn</span>
                  {settings.timeLimit !== false && <MyTimer className="ms-2" initialTime={settings.timeLimit} onElapsed={() => {
                    apiRequest({
                      userIdentifier: userIdentifier,
                      action: RequestAction.TimeElapsed,
                      player: game.turn
                    })
                  }} />}
                </div>
              </th>
              {game.setup.labels.cols.map((col, j) => (
                <ColHeading key={j}><div><TableHeading catValue={col} /></div></ColHeading>
              ))}
            </tr>
          </thead>
          <tbody>
            {game.setup.solutions.map((row: string[][], i: number) => (
              <tr key={i}>
                <RowHeading key={-1}><div><TableHeading catValue={game.setup.labels.rows[i]} /></div></RowHeading>
                {row.map((countryCodes: string[], j: number) => {
                  return (<TableCell key={j}>
                    <Field
                      pos={[i, j]}
                      game={game}
                      rowLabel={game.setup.labels.rows[i]}
                      colLabel={game.setup.labels.cols[j]}
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




