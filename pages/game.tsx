
import Container from "react-bootstrap/Container";
import Head from 'next/head';
import Button from "react-bootstrap/Button";
import Alert from 'react-bootstrap/Alert';
import Form from 'react-bootstrap/Form';
import { TableHeading, RowHeading, ColHeading } from '../components/TableHeading';
import 'bootstrap/dist/css/bootstrap.min.css';
import styled from "styled-components";
import { forwardRef, useEffect, useId, useState } from 'react';
import { Game, Country, getCountry, RequestAction, countries, Query, GameData, PlayingMode } from "../src/game.types"
import { capitalize } from "@/src/util"
var _ = require('lodash');

import styles from '@/pages/Game.module.css'
import { Field } from "@/components/Field";

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

  function newGame() {
    apiRequest({
      userIdentifier: userIdentifier,
      action: RequestAction.NewGame,
    })
  }

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

  return (<>
    <Head>
      <title>TicTacGlobe</title>
    </Head>
    <Container>
      {!game && <Alert variant="warning">Game could not be initialized.</Alert>}
      {game && (<>
        <h1>{gameData.isNewGame ? "New Game" : "Existing Game"}</h1>
        <div>
          <Button variant="primary" onClick={newGame}>New Game</Button>
        </div>
        <div>
          <Form.Check type="switch" onChange={updateSettings} checked={settings.showIso} id="settingsShowIso" label="Show country ISO codes" />
          <Form.Check type="switch" onChange={updateSettings} checked={settings.showNumSolutions} id="settingsShowNumSolutions" label="Show number of solutions" />
          <Form.Check type="switch" onChange={updateSettings} checked={settings.showNumSolutionsHint} disabled={!settings.showNumSolutions} id="settingsShowNumSolutionsHint" label="Show number of solutions before guess" />
        </div>
        <table>
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
      {/* <p><pre>{JSON.stringify(game.cells, null, 4)}</pre></p> */}
    </Container>
  </>)
}




