
import Container from "react-bootstrap/Container";
// import Row from "react-bootstrap/Row";
// import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Alert from 'react-bootstrap/Alert';
import { CircleFlag } from 'react-circle-flags'
import 'bootstrap/dist/css/bootstrap.min.css';
import styled from "styled-components";
import { useEffect, useState } from 'react';
import { Game, GameSetup, Country, getCountry } from "../src/game.types"


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
  width: 150px;
  height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  .label {
    margin-top: 5px;
    text-align: center;
  }
  .capital {
    margin-top: 5px;
    text-align: center;
    color: var(--bs-secondary);
    font-size: 75%;
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


export default function GameComponent(props: any) {

  // const [isNewGame, setIsNewGame] = useState(false)
  type GameData = {
    isNewGame: boolean;
    game: Game | null;
  }
  
  // const [userIdentifier, setUserIdentifier] = useState('');
  const [game, setGame] = useState(null as Game | null)
  const [gameData, setGameData] = useState({ isNewGame: true, game: null } as GameData)

  const [showIso, setShowIso] = useState(false)

  useEffect(() => {
    let userIdentifier = localStorage.getItem('userIdentifier')
    if (!userIdentifier) {
      // Generate a random user identifier
      userIdentifier = Math.random().toString(36).substring(7)
      localStorage.setItem('userIdentifier', userIdentifier)
    }

    // Fetch the game data from the server
    fetch(`/api/game?userIdentifier=${userIdentifier}`)
      .then(response => response.json())
      .then(data => {
        setGameData(data)
        setGame(data.game)
      })
  }, [])

  return (
    <Container>
      {!game && <Alert variant="warning">Game could not be initialized.</Alert>}
      {game && (<>
        <h1>{gameData.isNewGame ? "New Game" : "Existing Game"}</h1>
        <table>
          <thead>
            <tr>
              <th></th>
              {game.setup.labels.cols.map((col, j) => (
                <ColHeading key={j}><TableHeading>{col}</TableHeading></ColHeading>
              ))}
            </tr>
          </thead>
          <tbody>
            {game.setup.cells.map((row: string[][], i: number) => (
              <tr key={i}>
                <RowHeading><TableHeading>{game.setup.labels.rows[i]}</TableHeading></RowHeading>
                {row.map((countryCodes: string[], j: number) => (
                  <TableCell key={j}>
                    <Field solutions={countryCodes.map(c => getCountry(c)).filter(c => c) as Country[]} showIso={showIso} />
                  </TableCell>
                ))}
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
  solutions?: Country[];
  showIso: boolean;
}

const Field = ({ solutions, showIso }: FieldProps) => {
  // const [guess, setGuess] = useState(solutions ? solutions[0] : null)
  // const [guess, setGuess] = useState(solutions ? randomChoice(solutions) : null)
  const country = solutions ? solutions[0] : null

  return (
    <TableCellInner>
      {country && (
        <>
          <CountryFlag country={country} size={50} />
          <span className="label">{country.name + (showIso ? ` (${country.iso})` : "")}</span>
          <span className="capital">{country.capital}</span>
        </>
      )}
    </TableCellInner>
  )

}

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