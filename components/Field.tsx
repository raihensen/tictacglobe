
import styled from "styled-components";
import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Game, Country, CategoryValue, RequestAction, FrontendQuery, GameData, PlayingMode, GameState } from "@/src/game.types"

import { PlusCircleFill } from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/Badge';
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { CircleFlag } from 'react-circle-flags'
import styles from '@/pages/Game.module.css'
import { useTranslation } from "next-i18next";
import _ from "lodash";
import { TableCellInner, MarkingBackground } from "@/components/styles";
import CountryAutoComplete from "./Autocomplete";


const CountryFlag = ({ country, size, onClick }: { country: Country | null, size: number, onClick?: any }) => (
  <CircleFlag countryCode={country?.iso?.toLowerCase() ?? "xx"} height={size} onClick={onClick} />
);

enum FieldMode {
  INITIAL = 0,
  SEARCH = 1,
  FILLED = 2
}
type FieldState = {
  guess: Country | null;
  markedBy: number;
  isWinning: boolean;
  mode: FieldMode;
}

const Field = ({ pos, setActive, game, row, col, apiRequest, hasTurn, notifyDecided, countries, settings }: FieldProps) => {
  const { t, i18n } = useTranslation('common')
  const [i, j] = pos
  const solutions = countries.filter(c => game.setup.solutions[i][j].includes(c.iso))
  const alternativeSolutions = countries.filter(c => game.setup.alternativeSolutions[i][j].includes(c.iso))
  const initFieldState = (game: Game) => ({
    guess: countries.find(c => c.iso == game.guesses[i][j]) ?? null,
    markedBy: game.marking[i][j] ?? -1,
    isWinning: game.winCoords !== null && game.winCoords.some(([i1, j1]) => i1 == i && j1 == j),
    mode: countries.find(c => c.iso == game.guesses[i][j]) ? FieldMode.FILLED : FieldMode.INITIAL
  } as FieldState)

  const [fieldState, setFieldState] = useState<FieldState>(initFieldState(game))
  useEffect(() => {
    setFieldState(initFieldState(game))
  }, [game])

  const setMode = (mode: FieldMode) => {
    setFieldState({
      guess: fieldState.guess,
      markedBy: fieldState.markedBy,
      isWinning: fieldState.isWinning,
      mode: mode
    })
  }
  useEffect(() => {
    if (fieldState.mode == FieldMode.SEARCH) {
      setActive(true)
    }
  }, [fieldState])

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
      action: RequestAction.MakeGuess,
      player: game.turn,  // offline only
      countryId: country.iso,
      pos: pos.join(",")
    })
    return correct
  }

  let tooltipCountryInfo = null
  const tooltipCountryInfoId = useId()
  if (fieldState.mode == FieldMode.FILLED && fieldState.guess) {
    // tooltipCountryInfo = (
      
    // )
  }

  const isNameRelevant = () => {
    return [row, col].some(({ category, value }) => category == "starting_letter" || category == "ending_letter")
  }
  const isCapitalRelevant = () => {
    return [row, col].some(({ category, value }) => category.startsWith("capital"))
  }

  const CountryInfoTooltip = () => {
    if (!fieldState.guess) {
      return false
    }
    const texts = [
      ...(fieldState.guess.alternativeValues.name !== undefined && (isNameRelevant() || game.state == GameState.Finished) ? [`Alternative name${fieldState.guess.alternativeValues.name.length > 1 ? "s" : ""}: ${fieldState.guess.alternativeValues.name.join(", ")}`] : []),
      ...(isCapitalRelevant() || game.state == GameState.Finished ? [`Capital: ${fieldState.guess.capital}`] : []),
      ...((isCapitalRelevant() || game.state == GameState.Finished) && fieldState.guess.alternativeValues.capital !== undefined ? [`Alternative capital${fieldState.guess.alternativeValues.capital.length > 1 ? "s" : ""}: ${fieldState.guess.alternativeValues.capital.join(", ")}`] : [])
    ]
    if (!texts.length) {
      return false
    }
    return (
      <Tooltip id={`tooltipCountryInfo-${tooltipCountryInfoId}`}>
        {texts.map((text, i) => (<p key={i}>{text}</p>))}
      </Tooltip>
    )
  }

  // TODO extra mode: other player's turn

  return (
    <TableCellInner onMouseEnter={() => { setActive(true) }} onMouseLeave={() => { setActive(false) }}>
      {/* <span>{mode}</span> */}
      {fieldState.mode == FieldMode.INITIAL && <>
        {/* Field is still free */}
        {!notifyDecided && <>
          {hasTurn && <><div className="field-center-50">
            <PlusCircleFill
              size={50}
              style={{ cursor: "pointer" }}
              color="var(--bs-secondary)"
              onClick={() => {
                setMode(FieldMode.SEARCH)
              }}
            />
          </div></>}
          {settings.showNumSolutionsHint && <NumSolutions />}
        </>}
        {/* Game just became a tie: grey out */}
        {notifyDecided && (<MarkingBackground $player={-1} $isWinning={false} />)}
      </>}
      {(fieldState.mode == FieldMode.SEARCH && hasTurn) && (
        <>
          <div className="field-flex">
            <div style={{ width: "100%" }}>
              <CountryAutoComplete
                countries={countries}
                makeGuess={makeGuess}
                onBlur={() => setMode(FieldMode.INITIAL)}
              />
            </div>
          </div>
          {settings.showNumSolutionsHint && <NumSolutions />}
        </>
      )}
      {(fieldState.mode == FieldMode.FILLED && fieldState.guess) && (
        <>
          <MarkingBackground $player={fieldState.markedBy} $isWinning={fieldState.isWinning} />
          {/* <span>{markedBy == 0 ? "O" : (markedBy == 1 ? "X" : "???")}</span> */}
          <div className="field-center-50">
            <CountryFlag country={fieldState.guess} size={50} />
          </div>
          <div className="field-bottom">
            <div className="field-flex">
            {/* <OverlayTrigger placement="right" overlay={<CountryInfoTooltip />}> */}
            <OverlayTrigger placement="right" overlay={(
                <Tooltip id={`tooltipCountryInfo-${tooltipCountryInfoId}`} className={styles.tooltip}>
                  {(fieldState.guess.alternativeValues.name !== undefined && (isNameRelevant() || game.state == GameState.Finished)) && (<p>Alternative name{fieldState.guess.alternativeValues.name.length > 1 ? "s" : ""}: {fieldState.guess.alternativeValues.name.join(", ")}</p>)}
                  {(isCapitalRelevant() || game.state == GameState.Finished) && (<p>Capital: {fieldState.guess.capital}</p>)}
                  {((isCapitalRelevant() || game.state == GameState.Finished) && fieldState.guess.alternativeValues.capital !== undefined) && (<p>Alternative capital{fieldState.guess.alternativeValues.capital.length > 1 ? "s" : ""}: {fieldState.guess.alternativeValues.capital.join(", ")}</p>)}
                </Tooltip>
            )}>
              <span className="label">
                {fieldState.guess.name + (settings.showIso ? " " : "")}
                {settings.showIso && <span className="iso">({fieldState.guess.iso})</span>}
              </span>
            </OverlayTrigger>
            </div>
          </div>
          {settings.showNumSolutions && <NumSolutions />}
        </>
      )}
    </TableCellInner>
  )

}


export type FieldProps = {
  pos: number[];
  active: boolean;
  setActive: (active: boolean) => void;
  game: Game;
  row: CategoryValue;
  col: CategoryValue;
  userIdentifier: string | undefined;
  apiRequest: (query: FrontendQuery) => any;
  hasTurn: boolean;
  notifyDecided: boolean;
  countries: Country[];
  settings: {
    showIso: boolean;
    showNumSolutions: boolean;
    showNumSolutionsHint: boolean;
  }
}

export default Field;
