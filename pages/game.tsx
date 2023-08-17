
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
    position: absolute;
    top: 0; bottom: 0; left: 0; right: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    .label {
      margin-top: 5px;
      text-align: center;
      .iso {
        color: var(--bs-secondary);
      }
    }
    .capital {
      margin-top: 5px;
      text-align: center;
      color: var(--bs-secondary);
      font-size: 75%;
    }
  }
  .field-abs-top-left {
    position: absolute;
    top: 5px;
    left: 5px;
  }
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
const CountryFlag = ({ country, size }: { country: Country, size: number }) => (
  <CircleFlag countryCode={country.iso.toLowerCase()} height={size} />
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
// TODO add info icon in solved cell to clarify alternative names etc.
// TODO force flag reload when creating new game


export default function GameComponent(props: any) {

  type GameData = {
    isNewGame: boolean;
    game: Game | null;
  }

  const [userIdentifier, setUserIdentifier] = useState("")
  
  const [game, setGame] = useState(null as Game | null)
  const [gameData, setGameData] = useState({ isNewGame: true, game: null } as GameData)

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
    console.log([e.target.id, e.target.checked])
    setSettings({
      showIso: e.target.id == "settings-show-iso" ? e.target.checked : settings.showIso,
      showNumSolutions: e.target.id == "settings-show-num-solutions" ? e.target.checked : settings.showNumSolutions,
      showNumSolutionsHint: e.target.id == "settings-show-num-solutions-hint" ? e.target.checked : settings.showNumSolutionsHint,
    })
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
          <Form.Check type="switch" onChange={updateSettings} id="settings-show-num-solutions-hint" label="Show number of solutions before guess" />
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
                    countries={game.setup.values}
                    solutions={solutions}
                    guess={guess}
                    showIso={settings.showIso}
                    showNumSolutions={settings.showNumSolutions}
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
  countries: Country[];
  solutions: Country[];
  guess: Country | null;
  showIso: boolean;
  showNumSolutions: boolean;
}

const Field = ({ countries, solutions, guess, showIso, showNumSolutions }: FieldProps) => {
  // const [guess, setGuess] = useState(solutions ? solutions[0] : null)
  // const [guess, setGuess] = useState(solutions ? randomChoice(solutions) : null)
  // const guess = solutions ? solutions[0] : null

  // const [value, setValue] = useState("nA")

  const shouldItemRender = (country: Country, query: string) => {
    return query.length >= 3 && country.name.toLowerCase().startsWith(query.toLowerCase());
  };

  return (
    <TableCellInner>
      {guess && (
        <>
          <div className="field-flex">
            <CountryFlag country={guess} size={50} />
            <span className="label">
              {guess.name + (showIso ? " " : "")}
              {showIso && <span className="iso">({guess.iso})</span>}
            </span>
            <span className="capital">{guess.capital}</span>
          </div>
          {showNumSolutions && <div className="field-abs-top-left">
            <Badge bg={solutions.length == 1 ? "danger" : "secondary"}>{solutions.length}</Badge>
          </div>}
        </>
      )}
      {!guess && (
        <div className="field-flex">
          <p>Hi</p>
          <Autocomplete
            getItemValue={(country: Country) => country.iso}
            items={countries}
            renderItem={(country: Country, isHighlighted: boolean) =>
              <div style={{ background: isHighlighted ? 'lightgray' : 'white' }}>
                {country.name}
              </div>
            }
            value={""}
            onSelect={(val: Country["iso"]) => console.log("onSelect " + val)}
          />
        </div>
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