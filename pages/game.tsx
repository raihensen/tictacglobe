
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
import { Game, Country, getCountry, RequestAction, countries, Query, GameData, PlayingMode } from "../src/game.types"
import { capitalize } from "@/src/util"
var _ = require('lodash');

import styles from '@/pages/Game.module.css'
import { Field } from "@/components/Field";
import { FaArrowsRotate, FaGear, FaPersonCircleXmark } from "react-icons/fa6";
import Image from "next/image";

// TODO difficulty-limiting constraings
//    - prevent that a row has only cells with one equal solution
//    - or total number of cells with just one solution
//    - limit maximum difficulty score
// TODO category common neighbor
// TODO force flag reload when creating new game
// TODO 3 difficulty levels


const TableCell = styled.td`
  border: 1px solid rgba(0,0,0,.25);
  padding: 0;
`

// const Header = styled.div`
//   margin-bottom: 10px;
// `

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


export default function GameComponent(props: any) {

  const [game, setGame] = useState(null as Game | null)
  const [gameData, setGameData] = useState({ isNewGame: true, game: null } as GameData)
  const [userIdentifier, setUserIdentifier] = useState("")
  const [playerIndex, setPlayerIndex] = useState(0)  // who am i? 0/1
  const [hasTurn, setHasTurn] = useState(true)

  function apiRequest(query: Query) {
    // Fetch the game data from the server
    const { userIdentifier, action, playerIndex, countryId, pos } = query
    const search = Object.entries(query).filter(([key, val]) => val != undefined).map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join("&")
    const url = "/api/game?" + search
    console.log(`API request: ${url}`);
    
    fetch(url)
    .then(response => response.json())
    .then(data => {
      const newGame = Game.fromApi(data.game)
      
      if (newGame.playingMode == PlayingMode.Offline) {

        // in offline mode, userIndex != playerIndex (there's only one user at index 0)
        console.log("Update playerIndex and hasTurn()");
        setPlayerIndex(newGame.turn)
        setHasTurn(true)

      } else if (newGame.playingMode == PlayingMode.Online) {

        // TODO
        const userIndex = data.game.users.indexOf(userIdentifier)
        
        if (userIndex != -1) {
          setPlayerIndex(userIndex)
        }
        setHasTurn(playerIndex == data.game.turn)

      }

      console.log("Update game");
      setGameData(data)
      setGame(newGame)

    })
  }

  useEffect(() => {
    // First client-side init
    const storedUserIdentifier = initUserIdentifier()
    setUserIdentifier(storedUserIdentifier)

    // if (userIdentifier.length != 0) {
    apiRequest({
      userIdentifier: storedUserIdentifier,
      action: RequestAction.ExistingOrNewGame,
    })
    return () => {
      // this is called to finalize the effect hook, before it is triggered again
    }
  }, [])

  const getPlayerTurnColor = () => {
    return game?.turn == 0 ? "blue" : "red"
  }

  const [settings, setSettings] = useState({
    showIso: false,
    showNumSolutions: true,
    showNumSolutionsHint: false
  })

  function updateSettings(e: React.ChangeEvent<HTMLInputElement>) {
    const newSettings = {
      showIso: e.target.id == "settingsShowIso" ? e.target.checked : settings.showIso,
      showNumSolutions: e.target.id == "settingsShowNumSolutions" ? e.target.checked : settings.showNumSolutions,
      showNumSolutionsHint: e.target.id == "settingsShowNumSolutionsHint" ? e.target.checked : settings.showNumSolutionsHint,
    }
    if (!newSettings.showNumSolutions) {
      newSettings.showNumSolutionsHint = false
    }
    setSettings(newSettings)
  }

  const [showSettings, setShowSettings] = useState(false)

  return (<>
    <Head>
      <title>TicTacGlobe</title>
    </Head>
    <Container style={{ maxWidth: "720px" }}>
      <div style={{}} className="my-3">
        <Image src={"tictacglobe-logo.svg"} width={80} height={80} alt={"TicTacGlobe logo"} />
      </div>
      {!game && <Alert variant="warning">Game could not be initialized.</Alert>}
      {game && (<>
        {/* <p>{gameData.isNewGame ? "New Game" : "Existing Game"}</p> */}
        <ButtonToolbar className="mb-2">
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
              playerIndex: game.turn
            })
          }} className="me-auto"><FaPersonCircleXmark /></IconButton>
          <IconButton variant="secondary" onClick={ () => setShowSettings(true) }><FaGear /></IconButton>
        </ButtonToolbar>
        <Modal show={showSettings} onHide={ () => setShowSettings(false) }>
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
        
        <table style={{ margin: "0 auto" }}>
          <thead>
            <tr>
              <th>
                <div style={{ width: "100%", height: "100%" }}>
                  <span className={styles["badge-player"] + " " + styles[`bg-player-${getPlayerTurnColor()}`]}>{capitalize(getPlayerTurnColor())}'s turn</span>
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
                      userIdentifier={userIdentifier}
                      apiRequest={apiRequest}
                      hasTurn={hasTurn}
                      countries={countries}
                      settings={settings}
                      preventSpoilers={[]}
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




