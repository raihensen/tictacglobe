
import styled from "styled-components";
import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Game, Country, CategoryValue, RequestAction, FrontendQuery, GameData, PlayingMode, GameState, FieldSettings } from "@/src/game.types"

import { PlusCircleFill } from 'react-bootstrap-icons';
import Badge, { BadgeProps } from 'react-bootstrap/Badge';
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { CircleFlag } from 'react-circle-flags'
import styles from '@/pages/Game.module.css'
import { useTranslation } from "next-i18next";
import _ from "lodash";
import { TableCellInner, MarkingBackground } from "@/components/styles";
import CountryAutoComplete from "./Autocomplete";


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

const CountryFlag = ({ country, size, onClick }: { country: Country | null, size: number, onClick?: any }) => (
  <CircleFlag countryCode={country?.iso?.toLowerCase() ?? "xx"} height={size} onClick={onClick} title="" />
);

type CountryInfoTooltipContentProps = {
  context: "flag" | "name",
  game: Game,
  fieldState: FieldState,
  isNameRelevant: boolean,
  isCapitalRelevant: boolean
}
const CountryInfoTooltipContents = ({ context, game, fieldState, isNameRelevant, isCapitalRelevant }: CountryInfoTooltipContentProps) => {
  const { t } = useTranslation("common")
  const c = fieldState.guess
  const texts = c ? [
    t("countryInfo.name", { value: c.name }),
    ((isNameRelevant || game.state == GameState.Finished) && c.alternativeValues.name !== undefined ? t("countryInfo.alternativeNames", { count: c.alternativeValues.name.length, values: c.alternativeValues.name.join(", ") }) : undefined),
    (isCapitalRelevant || game.state == GameState.Finished ? t("countryInfo.capital", { value: c.capital }) : undefined),
    ((isCapitalRelevant || game.state == GameState.Finished) && c.alternativeValues.capital !== undefined ? t("countryInfo.alternativeCapitals", { count: c.alternativeValues.capital.length, values: c.alternativeValues.capital.join(", ") }) : undefined)
  ].filter(s => s) as string[] : []
  return (<>
    {texts.map((text, i) => (<p key={i}>{text}</p>))}
  </>)
}

const TextTooltip = styled(Tooltip)`
  p:last-child {
    margin-bottom: 0;
  }
`

const TooltipTriggerDiv = forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(({ children, ...props }, ref: any) => (
  <div ref={ref} {...props}>
    {children}
  </div>
))
const TooltipTriggerSpan = forwardRef<HTMLSpanElement, React.HTMLProps<HTMLSpanElement>>(({ children, ...props }, ref: any) => (
  <span ref={ref} {...props}>
    {children}
  </span>
))
const ResponsiveBadge = styled(Badge)`
  cursor: default;
  font-size: .6em;
  @media only screen and (min-width: 768px) {
    font-size: .75em;
  }
`
const NumSolutionsBadge = forwardRef<typeof Badge, BadgeProps & { children?: any }>(({children, ...props}, ref: any) => (
  <ResponsiveBadge ref={ref} {...props}>{children}</ResponsiveBadge>
))

const Field = ({ pos, setActive, setIsSearching, game, row, col, apiRequest, hasTurn, notifyDecided, countries, settings }: {
  pos: number[],
  active: boolean,
  setActive: (active: boolean) => void,
  setIsSearching: (searching: boolean) => void,
  game: Game,
  row: CategoryValue,
  col: CategoryValue,
  userIdentifier: string | undefined,
  apiRequest: (query: FrontendQuery) => any,
  hasTurn: boolean,
  notifyDecided: boolean,
  countries: Country[],
  settings: FieldSettings,
}) => {
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
      setIsSearching(true)
    }
    
  }, [fieldState])

  const NumSolutions = () => {
    const tooltipSolutions = (
      <TextTooltip id={`tooltipNumSolutions-${useId()}`}>
        <p>{t("solutions.solutions", { count: solutions.length })}: {solutions.map(c => c.name).join(", ")}</p>
        {alternativeSolutions.length != 0 && (<>
          <p>{t("solutions.alsoAccepted", { count: alternativeSolutions.length })}: {alternativeSolutions.map(c => c.name).join(", ")}</p>
        </>)}
      </TextTooltip>
    );
    const tooltipInfo = (
      <TextTooltip id={`tooltipNumSolutions-${useId()}`}>
        {alternativeSolutions.length != 0 && (<>
          {t("solutions.numSolutionsTooltip", { count: solutions.length })}
          {alternativeSolutions.length && t("solutions.numAlternativeSolutionsTooltip", { count: alternativeSolutions.length })}
        </>)}
      </TextTooltip>
    );
    const badgeContent = `${solutions.length}${alternativeSolutions.length ? "*" : ""}`

    return (
      <div className="field-abs-top-left">
        {fieldState.mode == FieldMode.FILLED && <OverlayTrigger placement="top" overlay={tooltipSolutions}>
          <NumSolutionsBadge bg={solutions.length == 1 ? "danger" : "secondary"} >{badgeContent}</NumSolutionsBadge>
        </OverlayTrigger>}
        {(fieldState.mode != FieldMode.FILLED && alternativeSolutions.length != 0) && <OverlayTrigger placement="top" overlay={tooltipInfo}>
          <NumSolutionsBadge bg="secondary">{badgeContent}</NumSolutionsBadge>
        </OverlayTrigger>}
        {(fieldState.mode != FieldMode.FILLED && alternativeSolutions.length == 0) && <NumSolutionsBadge>{badgeContent}</NumSolutionsBadge>}
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
    setIsSearching(false)
    return correct
  }

  const isNameRelevant = () => {
    return [row, col].some(({ category, value }) => category == "starting_letter" || category == "ending_letter")
  }
  const isCapitalRelevant = () => {
    return [row, col].some(({ category, value }) => category.startsWith("capital"))
  }

  const tooltipCountryInfoIds = [useId(), useId()]

  return (
    <TableCellInner onMouseEnter={() => { setActive(true) }} onMouseLeave={() => { setActive(false) }}>
      {/* <span>{mode}</span> */}
      {fieldState.mode == FieldMode.INITIAL && <>
        {/* Field is still free */}
        {!notifyDecided && <>
          {hasTurn && <><div className="field-center-50">
            <PlusCircleFill
              size={50}
              style={{ cursor: "pointer", opacity: .5 }}
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
                onBlur={() => {
                  setIsSearching(false)
                  setMode(FieldMode.INITIAL)
                }}
              />
            </div>
          </div>
          {settings.showNumSolutionsHint && <NumSolutions />}
        </>
      )}
      {(fieldState.mode == FieldMode.FILLED && fieldState.guess) && (
        <>
          <MarkingBackground $player={fieldState.markedBy} $isWinning={fieldState.isWinning} />
          <div className="field-center-50">
            <OverlayTrigger placement="bottom" overlay={(
              <TextTooltip id={tooltipCountryInfoIds[0]} className="d-md-none">
                <CountryInfoTooltipContents
                  context="flag"
                  game={game}
                  fieldState={fieldState}
                  isNameRelevant={isNameRelevant()}
                  isCapitalRelevant={isCapitalRelevant()}
                />
              </TextTooltip>
            )}>
              <TooltipTriggerDiv className="flag-wrapper">
                <CountryFlag country={fieldState.guess} size={50} />
              </TooltipTriggerDiv>
            </OverlayTrigger>
          </div>
          <div className="field-bottom">
            <div className="field-flex">
              <OverlayTrigger placement="right" overlay={(
                <TextTooltip id={tooltipCountryInfoIds[1]} className="d-none d-md-block">
                  <CountryInfoTooltipContents
                    context="name"
                    game={game}
                    fieldState={fieldState}
                    isNameRelevant={isNameRelevant()}
                    isCapitalRelevant={isCapitalRelevant()}
                  />
                </TextTooltip>
              )}>
                <TooltipTriggerSpan className="label">
                  {fieldState.guess.name}
                </TooltipTriggerSpan>
              </OverlayTrigger>
            </div>
          </div>
          {settings.showNumSolutions && <NumSolutions />}
        </>
      )}
    </TableCellInner>
  )

}

export default Field;
