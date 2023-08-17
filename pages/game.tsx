
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
import { useEffect, useState } from 'react';
import { Game, GameSetup, Country, getCountry, RequestAction } from "../src/game.types"
import Autocomplete  from 'react-autocomplete'
import { PlusCircleFill } from 'react-bootstrap-icons';


// const Container = styled.div`
//   width: 100%;
//   max-width: 600px;
// `
const Row = styled.div`
  width: 100%;
`
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
`
const ColHeadings = styled.div`

`
const ColHeading = styled.th`
  height: 150px;
  & > span {
    transform: rotate(-60deg);
    display: block;
    text-align: left;
  }
`
const TableHeading = styled.span`
  text-transform: uppercase;
  font-weight: bold;
`

const countryFlagPath = (country: Country) => `/circle-flags-gh-pages/flags/${country.iso.toLowerCase()}.svg`
const CountryFlag = ({ country, size, onClick }: { country: Country | null, size: number, onClick?: any }) => (
  <CircleFlag countryCode={country?.iso?.toLowerCase() ?? "xx"} height={size} onClick={onClick} />
  // <Image src={countryFlagPath(country)} width={size} height={size} alt={country.name} />
);

function formatTableHeading(heading: string) {
  heading = heading.replace(/Capital starting letter: (\w)/i, "Capital $1..")
  heading = heading.replace(/Capital ending letter: (\w)/i, "Capital ..$1")
  heading = heading.replace(/Starting letter: (\w)/i, "Name $1..")
  heading = heading.replace(/Ending letter: (\w)/i, "Name ..$1")
  return heading
}

// TODO difficulty-limiting constraings
//    - prevent that a row has only cells with one equal solution
//    - or total number of cells with just one solution
//    - limit maximum difficulty score
// TODO gold = yellow (same solution as ambiguous continents: alternative solutions to NominalCategory that do not create new cells)
// TODO ambiguous capitals / capital names (Pretoria, Astana, Washington DC etc.)
// TODO add info icon in solved cell to clarify alternative names etc.
// TODO force flag reload when creating new game
// TODO category common neighbor


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
    apiRequest(RequestAction.NewGame)
  }

  function apiRequest(action: RequestAction) {
    // Fetch the game data from the server
    fetch(`/api/game?userIdentifier=${userIdentifier}&action=${action}`)
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

    apiRequest(RequestAction.ExistingOrNewGame)
    return () => {
      // this is called to finalize the effect hook, before it is triggered again
    }
  }, [])

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
              <th></th>
              {game.setup.labels.cols.map((col, j) => (
                <ColHeading key={j}><TableHeading>{formatTableHeading(col)}</TableHeading></ColHeading>
              ))}
            </tr>
          </thead>
          <tbody>
            {game.setup.cells.map((row: string[][], i: number) => (
              <tr key={i}>
                <RowHeading><TableHeading>{formatTableHeading(game.setup.labels.rows[i])}</TableHeading></RowHeading>
                {row.map((countryCodes: string[], j: number) => {
                  const solutions = countryCodes.map(c => getCountry(c)).filter(c => c) as Country[]
                  const guess = null
                  return (<TableCell key={j}>
                    <Field
                    playerTurn={playerTurn}
                    setPlayerTurn={setPlayerTurn}
                    hasTurn={hasTurn}
                    game={game}
                    solutions={solutions}
                    initialGuess={guess}
                    initialMarkedBy={game.marking[i][j]}
                    showIso={settings.showIso}
                    showNumSolutions={settings.showNumSolutions}
                    showNumSolutionsHint={settings.showNumSolutionsHint}
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
  playerTurn: number;
  setPlayerTurn: any;
  hasTurn: boolean;
  // pos: number[];
  game: Game;
  solutions: Country[];
  initialGuess: Country | null;
  initialMarkedBy: number;
  showIso: boolean;
  showNumSolutions: boolean;
  showNumSolutionsHint: boolean;
}

enum FieldMode {
  INITIAL = 0,
  SEARCH = 1,
  FILLED = 2
}

const Field = ({ playerTurn, setPlayerTurn, hasTurn, game, solutions, initialGuess, initialMarkedBy, showIso, showNumSolutions, showNumSolutionsHint }: FieldProps) => {

  const [mode, setMode] = useState(initialGuess ? FieldMode.FILLED : FieldMode.INITIAL)
  const [searchValue, setSearchValue] = useState("")
  const [guess, setGuess] = useState(initialGuess ?? null)
  const [markedBy, setMarkedBy] = useState(initialMarkedBy ?? -1)

  const countries = game.setup.values

  const NumSolutions = () => (<div className="field-abs-top-left">
    <Badge bg={solutions.length == 1 ? "danger" : "secondary"}>{solutions.length}</Badge>
  </div>)

  const makeGuess = (country: Country) => {
    if (solutions.map(c => c.iso).includes(country.iso)) {
      setGuess(country)
      setMarkedBy(playerTurn)
      setMode(FieldMode.FILLED)
    } else {
      console.log("Wrong guess!" + ` (${country.iso} not in [${solutions.map(c => c.iso).join(", ")}]})`)
      setSearchValue("")
    }
    setPlayerTurn(1 - playerTurn)
  }


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
            <Autocomplete
              items={countries}
              getItemValue={(country: Country) => country.iso}
              renderItem={(country: Country, isHighlighted: boolean) =>
                <div style={{ background: isHighlighted ? 'lightgray' : 'white' }}>
                  {country.name}
                </div>
              }
              value={searchValue}
              onChange={(e, q) => setSearchValue(q)}
              onSelect={(val: Country["iso"]) => {
                const country = countries.find(c => c.iso == val)
                if (country) {
                  console.log(`Make guess: '${country.name}'`)
                  makeGuess(country)
                }
              }}
              shouldItemRender={(country: Country, q: string) => {
                return q.length >= 3 && (country as Country).name.toLowerCase().startsWith(q.toLowerCase())
              }}
              wrapperStyle={{ width: "100%", padding: "5px" }}
              inputProps={{
                style: { width: "100%" },
                onBlur: () => setMode(FieldMode.INITIAL),
                autoFocus: 1
              }}
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
              <span className="label">
                {guess.name + (showIso ? " " : "")}
                {showIso && <span className="iso">({guess.iso})</span>}
              </span>
              <span className="capital">{guess.capital}</span>
            </div>
          </div>
          {showNumSolutions && <NumSolutions />}
        </>
      )}
    </TableCellInner>
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