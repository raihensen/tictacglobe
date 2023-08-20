
import styled from "styled-components";
import { forwardRef, useEffect, useId, useState } from 'react';
import { Game, Country, getCountry, RequestAction, countries, Query, GameData, PlayingMode } from "@/src/game.types"
import Autocomplete  from 'react-autocomplete'
import { PlusCircleFill } from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/Badge';
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { CircleFlag } from 'react-circle-flags'
import styles from '@/pages/Game.module.css'


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


const CountryFlag = ({ country, size, onClick }: { country: Country | null, size: number, onClick?: any }) => (
  <CircleFlag countryCode={country?.iso?.toLowerCase() ?? "xx"} height={size} onClick={onClick} />
);

export type FieldProps = {
  pos: number[];
  game: Game;
  userIdentifier: string;
  apiRequest: (query: Query) => any;
  hasTurn: boolean;
  countries: Country[];
  settings: {
    showIso: boolean;
    showNumSolutions: boolean;
    showNumSolutionsHint: boolean;
  }
  preventSpoilers: string[];
}

enum FieldMode {
  INITIAL = 0,
  SEARCH = 1,
  FILLED = 2
}
type FieldState = {
  guess: Country | null;
  markedBy: number;
  mode: FieldMode;
}


export const Field = ({ pos, game, userIdentifier, apiRequest, hasTurn, countries, settings, preventSpoilers }: FieldProps) => {
  const [i, j] = pos
  const solutions = countries.filter(c => game.setup.solutions[i][j].includes(c.iso))
  const alternativeSolutions = countries.filter(c => game.setup.alternativeSolutions[i][j].includes(c.iso))

  const [fieldState, setFieldState] = useState({
    guess: countries.find(c => c.iso == game.guesses[i][j]) ?? null,
    markedBy: game.marking[i][j] ?? -1,
    mode: countries.find(c => c.iso == game.guesses[i][j]) ? FieldMode.FILLED : FieldMode.INITIAL
  } as FieldState)

  const updateStates = () => {
    if (game.guesses[i][j]) {
      console.log(`updateStates() (${i},${j}). Guess: ${game.guesses[i][j] ?? "--"}`);
    }
    setFieldState({
      guess: countries.find(c => c.iso == game.guesses[i][j]) ?? null,
      markedBy: game.marking[i][j] ?? -1,
      mode: countries.find(c => c.iso == game.guesses[i][j]) ? FieldMode.FILLED : FieldMode.INITIAL
    })
  }
  const setMode = (mode: FieldMode) => {
    setFieldState({
      guess: fieldState.guess,
      markedBy: fieldState.markedBy,
      mode: mode
    })
  }
  
  useEffect(updateStates, [game])

  // const [guess, setGuess] = useState(countries.find(c => c.iso == game.guesses[i][j]) ?? null)
  // const [markedBy, setMarkedBy] = useState(game.marking[i][j] ?? -1)

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
        {fieldState.mode == FieldMode.FILLED && <OverlayTrigger placement="right" overlay={tooltipSolutions}><NumBadge /></OverlayTrigger>}
        {(fieldState.mode != FieldMode.FILLED && alternativeSolutions.length != 0) && <OverlayTrigger placement="right" overlay={tooltipInfo}><NumBadge /></OverlayTrigger>}
        {(fieldState.mode != FieldMode.FILLED && alternativeSolutions.length == 0) && <NumBadge />}
      </div>
    )
  }

  const makeGuess = (country: Country) => {
    const correct = game.isValidGuess(i, j, country)
    apiRequest({
      userIdentifier: userIdentifier,
      action: RequestAction.MakeGuess,
      playerIndex: game.turn,  // offline only
      countryId: country.iso,
      pos: pos.join(",")
    })

    if (!correct) {
      console.log("Wrong guess!" + ` (${country.iso} not in [${solutions.map(c => c.iso).join(", ")}]})`)
    }
    // updateStates()
    return correct
  }

  let tooltipCountryInfo = null
  const tooltipCountryInfoId = useId()
  if (fieldState.mode == FieldMode.FILLED && fieldState.guess) {
    // tooltipCountryInfo = (
      
    // )
  }

  // TODO extra mode: other player's turn

  return (
    <TableCellInner>
      {/* <span>{mode}</span> */}
      {/* <span>pt: {playerTurn}, has: {hasTurn ? "y" : "n"}</span> */}
      {fieldState.mode == FieldMode.INITIAL && (
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
          {settings.showNumSolutionsHint && <NumSolutions />}
        </>
      )}
      {(fieldState.mode == FieldMode.SEARCH && hasTurn) && (
        <>
          <div className="field-flex">
            <CountryAutoComplete
            countries={countries}
            makeGuess={makeGuess}
            onBlur={() => setMode(FieldMode.INITIAL)}
            />
          </div>
          {settings.showNumSolutionsHint && <NumSolutions />}
        </>
      )}
      {(fieldState.mode == FieldMode.FILLED && fieldState.guess) && (
        <>
          <MarkingBackground $player={fieldState.markedBy} />
          {/* <span>{markedBy == 0 ? "O" : (markedBy == 1 ? "X" : "???")}</span> */}
          <div className="field-center-50">
            <CountryFlag country={fieldState.guess} size={50} />
          </div>
          <div className="field-bottom">
            <div className="field-flex">
            <OverlayTrigger placement="right" overlay={(
              <Tooltip id={`tooltipCountryInfo-${tooltipCountryInfoId}`}>
                Capital: {fieldState.guess.capital}
              </Tooltip>
            )}>
              <span className="label">
                {fieldState.guess.name + (settings.showIso ? " " : "")}
                {settings.showIso && <span className="iso">({fieldState.guess.iso})</span>}
              </span>
            </OverlayTrigger>
            {/* <span className="capital">{guess.capital}</span> */}
            </div>
          </div>
          {settings.showNumSolutions && <NumSolutions />}
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
        <div key={country.iso} className={styles.autoCompleteItem} style={{ background: isHighlighted ? 'lightgray' : 'white' }}>
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