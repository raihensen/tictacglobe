
import Container from "react-bootstrap/Container";
// import Row from "react-bootstrap/Row";
// import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Alert from 'react-bootstrap/Alert';
import Form from 'react-bootstrap/Form';
import Badge from 'react-bootstrap/Badge';
import { CircleFlag } from 'react-circle-flags'
import 'bootstrap/dist/css/bootstrap.min.css';
import styled from "styled-components";
import { forwardRef, useEffect, useId, useState } from 'react';
import { Game, Country, getCountry, RequestAction, countries, Query } from "../src/game.types"
import Autocomplete  from 'react-autocomplete'
import { PlusCircleFill } from 'react-bootstrap-icons';
import { FaBuildingColumns, FaFlag, FaEarthAmericas, FaEarthAfrica, FaEarthAsia, FaEarthEurope, FaEarthOceania } from "react-icons/fa6";
import { capitalize } from "../src/util"
var _ = require('lodash');

import styles from './Game.module.css'
import { OverlayTrigger, Tooltip } from "react-bootstrap";

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
const TableCellInner = styled.div`
  position: relative;
  top: 0;
  left: 0;
  width: 150px;
  height: 150px;
  .field-flex {
    padding: 5px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    > span {
      display: block;
      width: 100%;
      margin-top: 5px;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      &.label {
        .iso {
          color: var(--bs-secondary);
        }
      }
      &.capital {
        color: var(--bs-secondary);
        font-size: 75%;
      }
    }
  }
  .field-abs-top-left {
    position: absolute;
    top: 5px;
    left: 5px;
  }
  .field-center-50 {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 50px;
    height: 50px;
    margin-top: -25px;
    margin-left: -25px;
  }
  .field-bottom {
    position: absolute;
    left: 0; bottom: 0;
    width: 100%; height: 50px;
  }
`
const MarkingBackground = styled.div<{ $player: number }>`
  background: ${props => props.$player == 0 ? "var(--bs-blue)" : "var(--bs-red)"};
  display: ${props => props.$player == -1 ? "none" : "block"};
  opacity: .25;
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: -10;
`
const RowHeading = styled.td`
  & > div {
    width: 150px;
    height: 150px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 10px;
  }
`

const ColHeading = styled.th`
  & > div {
    width: 150px;
    height: 100px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 10px;
  }
`
const SimpleTableHeading = styled.span`
  text-transform: uppercase;
  font-weight: bold;
`

const TableHeadingStartsWithChar = styled.span<{ $i: number, $mode: "first" | "last" }>`
  font-weight: bold;
  font-size: ${props => props.$i == 0 ? 100 : (1 - .5 * (props.$i - 1) / 3) * 100}%;
  ${props => props.$i == 0 ? "" : "text-shadow: 0 0 3px white"};
  ${props => props.$i == 0 ? "" : "color: transparent"};
  ${props => props.$i == 0 ? `margin-${props.$mode == "first" ? "right" : "left"}: 3px` : ""};
  align-self: ${props => props.$mode} baseline;
  ${props => props.$i == 0 ? `
    transform: scale(1.2);
    font-size: 1.25em;
    margin-top: -.25em;
    margin-bottom: -.25em;
  ` : ""}
`

const CategoryBadge = styled.span`
  display: flex;
  align-items: center;
  background: var(--bs-secondary);
  color: white;
  padding: .5rem;
  border-radius: 5px;

  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10 and IE 11 */
  user-select: none; /* Standard syntax */

  svg {
    margin-right: 6px;
    font-size: 24px;
  }
  .color-name {
    font-size: 80%;
  }
`

const TableHeading = (props: { catValue?: string, children: string }) => {
  if (props.catValue) {
    if (props.catValue.startsWith("Starting letter") || props.catValue.startsWith("Capital starting letter")) {
      const isCapital = props.catValue.startsWith("Capital starting letter")
      const letter = props.catValue.substring(props.catValue.length - 1).toUpperCase()
      const word = [letter, "a", "b", "c", "d"]
      const tooltipCategoryInfo = (<Tooltip id={`tooltipCategoryInfo-${useId()}`}>{isCapital ? "Capital" : "Country name"} starts with {"AEFHILMNORSX".includes(letter) ? "an" : "a"} {letter}</Tooltip>)
      return (
        <OverlayTrigger placement="top" overlay={tooltipCategoryInfo}>
          <CategoryBadge>
            {isCapital && (<>
              <FaBuildingColumns className={styles.categoryIcon} />
            </>)}
            {word.map((c, i) => (<TableHeadingStartsWithChar $i={i} $mode="first">{i == 4 ? `${c}...` : c}</TableHeadingStartsWithChar>))}
          </CategoryBadge>
        </OverlayTrigger>
      )
    }
    if (props.catValue.startsWith("Ending letter") || props.catValue.startsWith("Capital ending letter")) {
      const isCapital = props.catValue.startsWith("Capital ending letter")
      const letter = props.catValue.substring(props.catValue.length - 1).toUpperCase()
      const word = ["a", "b", "c", letter]
      const tooltipCategoryInfo = (<Tooltip id={`tooltipCategoryInfo-${useId()}`}>{isCapital ? "Capital" : "Country name"} ends with {"AEFHILMNORSX".includes(letter) ? "an" : "a"} {letter}</Tooltip>)
      return (
        <OverlayTrigger placement="top" overlay={tooltipCategoryInfo}>
          <CategoryBadge>
            {isCapital && (<>
              <FaBuildingColumns className={styles.categoryIcon} />
            </>)}
            {word.map((c, i) => (<TableHeadingStartsWithChar $i={3 - i} $mode="last">{i == 0 ? `...${c}` : c}</TableHeadingStartsWithChar>))}
          </CategoryBadge>
        </OverlayTrigger>
      )
    }
    if (props.catValue.startsWith("Flag color")) {
      const color = props.catValue.replace(/^Flag color: (.+)$/i, "$1")
      const colorMap = {
        "Red": styles.flagColorRed,
        "Yellow/Gold": styles.flagColorYellow,
        "Orange": styles.flagColorOrange,
        "Green": styles.flagColorGreen,
        "Blue": styles.flagColorBlue,
        "White": styles.flagColorWhite,
        "Black": styles.flagColorBlack
      }
      const colorClass = _.get(colorMap, color, styles.flagColorBlack)
      const tooltipCategoryInfo = (<Tooltip id={`tooltipCategoryInfo-${useId()}`}>Flag contains the color {color}</Tooltip>)
      return (
        <OverlayTrigger placement="top" overlay={tooltipCategoryInfo}>
          <CategoryBadge className={`flagColorBadge ${colorClass}`}>
            <FaFlag className={styles.categoryIcon} />
            <span className="color-name">{color.toUpperCase()}</span>
          </CategoryBadge>
        </OverlayTrigger>
      )
    }
    const continentIconMap = {
      "Asia": FaEarthAsia,
      "N. America": FaEarthAmericas,
      "S. America": FaEarthAmericas,
      "Europe": FaEarthEurope,
      "Africa": FaEarthAfrica,
      "Oceania": FaEarthOceania
    }
    const continentNameMap = {
      "N. America": "North America",
      "S. America": "South America"
    }

    if (props.catValue in continentIconMap) {
      const continent = props.catValue
      const continentName = _.get(continentNameMap, continent, continent)
      const ContinentIcon = _.get(continentIconMap, continent, FaEarthAfrica)
      const tooltipCategoryInfo = (<Tooltip id={`tooltipCategoryInfo-${useId()}`}>Continent: {continentName}</Tooltip>)
      return (<OverlayTrigger placement="top" overlay={tooltipCategoryInfo}>
        <CategoryBadge>
          <ContinentIcon className={styles.categoryIcon} />
          <span className="continent-name">{continent}</span>
        </CategoryBadge>
      </OverlayTrigger>)
    }
  }
  return <SimpleTableHeading>{props.children}</SimpleTableHeading>
}


function formatTableHeading(heading: string, settings: { fancy?: boolean }) {

  if (settings.fancy) {
    if (heading.startsWith("Starting letter")) {
      return heading.substring(heading.length - 1)
    }
    if (heading.startsWith("Ending letter")) {
      return heading.substring(heading.length - 1)
    }
  }

  heading = heading.replace(/Capital starting letter: (\w)/i, "Capital $1..")
  heading = heading.replace(/Capital ending letter: (\w)/i, "Capital ..$1")
  heading = heading.replace(/Starting letter: (\w)/i, "Name $1..")
  heading = heading.replace(/Ending letter: (\w)/i, "Name ..$1")
  return heading
}

const CountryFlag = ({ country, size, onClick }: { country: Country | null, size: number, onClick?: any }) => (
  <CircleFlag countryCode={country?.iso?.toLowerCase() ?? "xx"} height={size} onClick={onClick} />
);


export default function GameComponent(props: any) {

  type GameData = {
    isNewGame: boolean;
    game: Game | null;
  }

  const [userIdentifier, setUserIdentifier] = useState("")
  
  const [game, setGame] = useState(null as Game | null)
  const [playerIndex, setPlayerIndex] = useState(0)  // who am i? 0/1
  const [playerTurn, setPlayerTurn] = useState(0)  // whose turn is it? 0/1
  const [gameData, setGameData] = useState({ isNewGame: true, game: null } as GameData)

  // TODO game logic
  // let hasTurn = playerIndex == playerTurn
  const [hasTurn, setHasTurn] = useState(true)

  function newGame() {
    apiRequest({
      userIdentifier: userIdentifier,
      action: RequestAction.NewGame,
    })
  }

  function apiRequest(query: Query) {
    // Fetch the game data from the server
    const { userIdentifier, action, countryId, pos } = query
    const search = Object.entries(query).filter(([key, val]) => val != undefined).map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join("&")
    const url = "/api/game?" + search
    console.log(search);
    
    fetch(url)
    .then(response => response.json())
    .then(data => {
      setGameData(data)
      setGame(data.game)
      const userIndex = data.game.users.indexOf(userIdentifier)
      if (userIndex != -1) {
        setPlayerIndex(userIndex)
      }
    })
  }

  useEffect(() => {
    let storedUserIdentifier = localStorage.getItem('userIdentifier')
    if (!storedUserIdentifier) {
      // Generate a random user identifier
      storedUserIdentifier = Math.random().toString(36).substring(7)
      localStorage.setItem('userIdentifier', userIdentifier)
      setUserIdentifier(storedUserIdentifier)
    }

    apiRequest({
      userIdentifier: userIdentifier,
      action: RequestAction.ExistingOrNewGame,
    })
    return () => {
      // this is called to finalize the effect hook, before it is triggered again
    }
  }, [])

  const getPlayerTurnColor = () => {
    return playerTurn == 0 ? "blue" : "red"
  }

  const [settings, setSettings] = useState({
    showIso: false,
    showNumSolutions: false,
    showNumSolutionsHint: false
  })

  function updateSettings(e: React.ChangeEvent<HTMLInputElement>) {
    const newSettings = {
      showIso: e.target.id == "settings-show-iso" ? e.target.checked : settings.showIso,
      showNumSolutions: e.target.id == "settings-show-num-solutions" ? e.target.checked : settings.showNumSolutions,
      showNumSolutionsHint: e.target.id == "settings-show-num-solutions-hint" ? e.target.checked : settings.showNumSolutionsHint,
    }
    if (!newSettings.showNumSolutions) {
      newSettings.showNumSolutionsHint = false
    }
    setSettings(newSettings)
  }

  return (
    <Container>
      {!game && <Alert variant="warning">Game could not be initialized.</Alert>}
      {game && (<>
        <h1>{gameData.isNewGame ? "New Game" : "Existing Game"}</h1>
        <div>
          <Button variant="primary" onClick={newGame}>New Game</Button>
        </div>
        <div>
          <Form.Check type="switch" onChange={updateSettings} id="settings-show-iso" label="Show country ISO codes" />
          <Form.Check type="switch" onChange={updateSettings} id="settings-show-num-solutions" label="Show number of solutions" />
          <Form.Check type="switch" onChange={updateSettings} checked={settings.showNumSolutionsHint} disabled={!settings.showNumSolutions} id="settings-show-num-solutions-hint" label="Show number of solutions before guess" />
        </div>
        <table>
          <thead>
            <tr>
              <th>
                <div style={{width: "100%", height: "100%"}}>
                  <span className={styles["badge-player"] + " " + styles[`bg-player-${getPlayerTurnColor()}`]}>{capitalize(getPlayerTurnColor())}'s turn</span>
                </div>
              </th>
              {game.setup.labels.cols.map((col, j) => (
                <ColHeading key={j}><div><TableHeading catValue={col}>{formatTableHeading(col, { fancy: true })}</TableHeading></div></ColHeading>
              ))}
            </tr>
          </thead>
          <tbody>
            {game.setup.solutions.map((row: string[][], i: number) => (
              <tr key={i}>
                <RowHeading><div><TableHeading catValue={game.setup.labels.rows[i]}>{formatTableHeading(game.setup.labels.rows[i], { fancy: true })}</TableHeading></div></RowHeading>
                {row.map((countryCodes: string[], j: number) => {
                  const solutions = countryCodes.map(c => getCountry(c)).filter(c => c) as Country[]
                  const alternativeSolutions = game.setup.alternativeSolutions[i][j].map(c => getCountry(c)).filter(c => c) as Country[]
                  const guess = null
                  return (<TableCell key={j}>
                    <Field
                    pos={[i, j]}
                    game={game}
                    userIdentifier={userIdentifier}
                    apiRequest={apiRequest}
                    playerTurn={playerTurn}
                    setPlayerTurn={setPlayerTurn}
                    hasTurn={hasTurn}
                    countries={countries}
                    solutions={solutions}
                    alternativeSolutions={alternativeSolutions}
                    initialGuess={guess}
                    initialMarkedBy={game.marking[i][j]}
                    showIso={settings.showIso}
                    showNumSolutions={settings.showNumSolutions}
                    showNumSolutionsHint={settings.showNumSolutionsHint}
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
  )
}


type FieldProps = {
  pos: number[];
  game: Game;
  userIdentifier: string;
  apiRequest: (query: Query) => any;
  playerTurn: number;
  setPlayerTurn: any;
  hasTurn: boolean;
  countries: Country[];
  solutions: Country[];
  alternativeSolutions: Country[];
  initialGuess: Country | null;
  initialMarkedBy: number;
  showIso: boolean;
  showNumSolutions: boolean;
  showNumSolutionsHint: boolean;
  preventSpoilers: string[];
}

enum FieldMode {
  INITIAL = 0,
  SEARCH = 1,
  FILLED = 2
}

const Field = ({ pos, game, userIdentifier, apiRequest, playerTurn, setPlayerTurn, hasTurn, countries, solutions, alternativeSolutions, initialGuess, initialMarkedBy, showIso, showNumSolutions, showNumSolutionsHint, preventSpoilers }: FieldProps) => {

  const [mode, setMode] = useState(initialGuess ? FieldMode.FILLED : FieldMode.INITIAL)
  
  const [guess, setGuess] = useState(initialGuess ?? null)
  const [markedBy, setMarkedBy] = useState(initialMarkedBy ?? -1)

  const NumSolutions = () => {
    const tooltipSolutions = (
      <Tooltip id={`tooltipNumSolutions-${useId()}`}>
        <p>Solutions: {solutions.map(c => c.name).join(", ")}</p>
        {alternativeSolutions.length != 0 && (<>
          <p>Also accepted: {alternativeSolutions.map(c => c.name).join(", ")}</p>
        </>)}
      </Tooltip>
    );
    const tooltipInfo = (
      <Tooltip id={`tooltipNumSolutions-${useId()}`}>
        {alternativeSolutions.length != 0 && (<>
          There {solutions.length > 1 ? `are ${solutions.length} regular solutions` : `is 1 regular solution`},
          and {alternativeSolutions.length} more when using alternative values or spellings.
        </>)}
      </Tooltip>
    );
    const NumBadge = forwardRef((props, ref: any) => (
      <Badge bg={solutions.length == 1 ? "danger" : "secondary"} ref={ref} {...props}>{solutions.length}{(alternativeSolutions.length ? "*" : "")}</Badge>
    ))
    return (
      <div className="field-abs-top-left">
        {mode == FieldMode.FILLED && <OverlayTrigger placement="right" overlay={tooltipSolutions}><NumBadge /></OverlayTrigger>}
        {(mode != FieldMode.FILLED && alternativeSolutions.length != 0) && <OverlayTrigger placement="right" overlay={tooltipInfo}><NumBadge /></OverlayTrigger>}
        {(mode != FieldMode.FILLED && alternativeSolutions.length == 0) && <NumBadge />}
      </div>
    )
  }

  const makeGuess = (country: Country) => {
    const correct = solutions.concat(alternativeSolutions).map(c => c.iso).includes(country.iso)
    if (correct) {


      setGuess(country)
      setMarkedBy(playerTurn)

      apiRequest({
        userIdentifier: userIdentifier,
        action: RequestAction.MakeGuess,
        countryId: country.iso,
        pos: pos.join(",")
      })

      setMode(FieldMode.FILLED)
    } else {
      console.log("Wrong guess!" + ` (${country.iso} not in [${solutions.map(c => c.iso).join(", ")}]})`)
    }
    setPlayerTurn(1 - playerTurn)
    return correct
  }

  const TooltipCountryInfo = forwardRef((props: { country: Country}, ref: any) => (
    <Tooltip id={`tooltipCountryInfo-${useId()}`} ref={ref}>
      Capital: {props.country.capital}
    </Tooltip>
  ))


  return (
    <TableCellInner>
      {/* <span>pt: {playerTurn}, has: {hasTurn ? "y" : "n"}</span> */}
      {mode == FieldMode.INITIAL && (
        <>
          {hasTurn && <div className="field-center-50">
            <PlusCircleFill
              size={50}
              style={{ cursor: "pointer" }}
              color="var(--bs-secondary)"
              onClick={() => {
                setMode(FieldMode.SEARCH)
              }}
            />
          </div>}
          {showNumSolutionsHint && <NumSolutions />}
        </>
      )}
      {(mode == FieldMode.SEARCH && hasTurn) && (
        <>
          <div className="field-flex">
            <CountryAutoComplete
            countries={countries}
            makeGuess={makeGuess}
            onBlur={() => setMode(FieldMode.INITIAL)}
            />
          </div>
          {showNumSolutionsHint && <NumSolutions />}
        </>
      )}
      {(mode == FieldMode.FILLED && guess) && (
        <>
          <MarkingBackground $player={markedBy} />
          {/* <span>{markedBy == 0 ? "O" : (markedBy == 1 ? "X" : "???")}</span> */}
          <div className="field-center-50">
            <CountryFlag country={guess} size={50} />
          </div>
          <div className="field-bottom">
            <div className="field-flex">
            <OverlayTrigger placement="right" overlay={<TooltipCountryInfo country={guess} />}>
              <span className="label">
                {guess.name + (showIso ? " " : "")}
                {showIso && <span className="iso">({guess.iso})</span>}
              </span>
            </OverlayTrigger>
            {/* <span className="capital">{guess.capital}</span> */}
            </div>
          </div>
          {showNumSolutions && <NumSolutions />}
        </>
      )}
    </TableCellInner>
  )

}

type CountryAutoCompleteProps = {
  countries: Country[];
  makeGuess: (country: Country) => boolean;
  onBlur: () => void;
}

const CountryAutoComplete = ({ countries, makeGuess, onBlur }: CountryAutoCompleteProps) => {

  const [searchValue, setSearchValue] = useState("")

  return (
    <Autocomplete
      items={countries}
      getItemValue={(country: Country) => country.iso}
      renderItem={(country: Country, isHighlighted: boolean) =>
        <div className={styles.autoCompleteItem} style={{ background: isHighlighted ? 'lightgray' : 'white' }}>
          {country.name}
        </div>
      }
      value={searchValue}
      onChange={(e, q) => setSearchValue(q)}
      onSelect={(val: Country["iso"]) => {
        const country = countries.find(c => c.iso == val)
        if (country) {
          console.log(`Make guess: '${country.name}'`)
          const correct = makeGuess(country)
          setSearchValue("")
        }
      }}
      shouldItemRender={(country: Country, q: string) => {
        return q.length >= 3 && (country as Country).name.toLowerCase().startsWith(q.toLowerCase())
      }}
      wrapperStyle={{ width: "100%", padding: "5px" }}
      inputProps={{
        style: { width: "100%" },
        onBlur: () => { onBlur() },
        autoFocus: 1
      }}
    />
  )
}


//<td class="sc-ilpitK etiGbc"><div style="position: relative;left: 0;top: 0;width: 150px;height: 150px;background: red;right: 0;/*! bottom: 0; */">

//{/* <div class="abs-top-left"><span class="badge bg-info">1</span></div><div class="sc-jIJgYh cQewnF" style="position: absolute;top: 0;left: 0;"><img data-testid="circle-country-flag" height="50" title="fi" src="https://hatscripts.github.io/circle-flags/flags/fi.svg"><span class="label">Finland <span class="iso">(FI)</span></span><span class="capital">Helsinki</span></div></div></td> */}


// let cols = ["Africa", "South America", "Green"]
// let rows = [
//   "Name C..",
//   "Name ..U",
//   "Capital ..A"
// ]
// let fields = [
//   ["Central African Republic", "Chile", "Comoros"],
//   ["Guinea-Bissau", "Peru", "Vanuatu"],
//   ["Angola", "Colombia", "Brazil"]
// ]