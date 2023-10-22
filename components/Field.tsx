
import styled from "styled-components";
import { ReactNode, forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Game, Country, CategoryValue, RequestAction, FrontendQuery, GameData, PlayingMode, GameState, FieldSettings } from "@/src/game.types"

import { PlusCircleFill } from 'react-bootstrap-icons';
import Badge, { BadgeProps } from 'react-bootstrap/Badge';
import { Button, Col, ColProps, Modal, OverlayTrigger, Row, RowProps, Tooltip } from "react-bootstrap";
import { CircleFlag } from 'react-circle-flags'
import { useTranslation } from "next-i18next";
import _ from "lodash";
import { randomChoice } from "@/src/util";
import { TableCellInner, MarkingBackground } from "@/components/styles";
import CountryAutoComplete from "./Autocomplete";
import { t } from "i18next";
import { getCategoryInfo, translateCategory } from "./TableHeading";
import { FaCircleInfo } from "react-icons/fa6";

enum FieldMode {
  INITIAL = 0,
  SEARCH = 1,
  FILLED = 2
}
type FieldState = {
  guess: Country | null;
  // exampleSolution: Country;
  markedBy: number;
  isWinning: boolean;
  mode: FieldMode;
}

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
  const [exampleSolution, setExampleSolution] = useState<Country>(randomChoice(solutions) as Country)
  const alternativeSolutions = countries.filter(c => game.setup.alternativeSolutions[i][j].includes(c.iso))
  const initFieldState = (game: Game) => ({
    guess: countries.find(c => c.iso == game.guesses[i][j]) ?? null,
    // exampleSolution: randomChoice(solutions),
    markedBy: game.marking[i][j] ?? -1,
    isWinning: game.winCoords !== null && game.winCoords.some(([i1, j1]) => i1 == i && j1 == j),
    mode: (countries.find(c => c.iso == game.guesses[i][j]) || game.state == GameState.Ended) ? FieldMode.FILLED : FieldMode.INITIAL
  } as FieldState)

  const getCountry = (game: Game, fieldState: FieldState) => {
    if (fieldState.guess) {
      return fieldState.guess
    }
    if (game.state == GameState.Ended) {
      return exampleSolution
    }
    return null
  }

  const [fieldState, setFieldState] = useState<FieldState>(initFieldState(game))
  useEffect(() => {
    setFieldState(initFieldState(game))
  }, [game])

  const [showFieldInfoModal, setShowFieldInfoModal] = useState<boolean>(false)
  const categoryDescriptions = [row, col].map(({ category, value }) => getCategoryInfo({ category, value, badge: false }).description)
  
  useEffect(() => {
    console.log(`show modal: ${showFieldInfoModal}`)
  }, [showFieldInfoModal])


  // TODO design modal. to be opened when clicking on the field after game ended.

  const setMode = (mode: FieldMode) => {
    setFieldState(fieldState => ({
      ...fieldState,
      mode: mode
    }))
  }
  useEffect(() => {
    if (fieldState.mode == FieldMode.SEARCH) {
      setActive(true)
      setIsSearching(true)
    }
    
  }, [fieldState])

  // TODO define this out of Field
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
        {game.isDecided() && (
          <OverlayTrigger placement="top" overlay={tooltipSolutions}>
            <NumSolutionsBadge bg={solutions.length == 1 ? "danger" : "secondary"}>{badgeContent}</NumSolutionsBadge>
          </OverlayTrigger>
        )}
        {(!game.isDecided() && ((fieldState.mode == FieldMode.FILLED && settings.showNumSolutions) || (fieldState.mode != FieldMode.FILLED && settings.showNumSolutionsHint))) && (<>
          {alternativeSolutions.length != 0 && (
            <OverlayTrigger placement="top" overlay={tooltipInfo}>
              <NumSolutionsBadge bg="secondary">{badgeContent}</NumSolutionsBadge>
            </OverlayTrigger>
          )}
          {alternativeSolutions.length == 0 && (
            <NumSolutionsBadge>{badgeContent}</NumSolutionsBadge>
          )}
        </>)}
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
  const canShowFieldInfo = (game: Game) => game.state == GameState.Ended || game.state == GameState.Finished || (game.state == GameState.Decided && notifyDecided)

  return (
    <TableCellInner
      onMouseEnter={() => { setActive(true) }}
      onMouseLeave={() => { setActive(false) }}
      onClick={() => { setShowFieldInfoModal(canShowFieldInfo(game)) }}
      style={canShowFieldInfo(game) ? { cursor: "pointer" } : undefined}
    >
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
      {(fieldState.mode == FieldMode.FILLED && getCountry(game, fieldState)) && (
        <>
          <MarkingBackground $player={fieldState.markedBy} $isWinning={fieldState.isWinning} />
          <div className="field-center-50">
            <OverlayTrigger placement="bottom" overlay={(
              <TextTooltip id={tooltipCountryInfoIds[0]} className="d-md-none">
                <CountryInfoTooltipContents
                  context="flag"
                  game={game}
                  fieldState={fieldState}
                  country={getCountry(game, fieldState)}
                  isNameRelevant={isNameRelevant()}
                  isCapitalRelevant={isCapitalRelevant()}
                />
              </TextTooltip>
            )}>
              <TooltipTriggerDiv className="flag-wrapper">
                <CountryFlag country={getCountry(game, fieldState)} size={50} />
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
                    country={getCountry(game, fieldState)}
                    isNameRelevant={isNameRelevant()}
                    isCapitalRelevant={isCapitalRelevant()}
                  />
                </TextTooltip>
              )}>
                <TooltipTriggerSpan className="label">
                  {getCountry(game, fieldState)?.name}
                </TooltipTriggerSpan>
              </OverlayTrigger>
            </div>
          </div>
          {settings.showNumSolutions && <NumSolutions />}
        </>
      )}
      <Modal id={useId()} show={showFieldInfoModal} fullscreen="sm-down" onHide={() => setShowFieldInfoModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{t("fieldInfo.title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5>{t("fieldInfo.categories")}</h5>
          <ul>
            {categoryDescriptions.map((descr, i) => {
              descr = translateCategory(descr, t)
              return descr ? (<li key={i}>
                {t(...descr)}
              </li>) : undefined
            })}
          </ul>
          <h5>{t("fieldInfo.solutions")}</h5>
          <ColumnList contents={[
            ..._.sortBy(solutions, country => country.name),
            ..._.sortBy(alternativeSolutions, country => country.name)
          ].map((country, i) => (
            <SolutionInfoItem key={i}>
              <CountryFlag country={country} size={25} />
              <span>{country.name}</span>
              {isCapitalRelevant() ? (
                <span className="capital text-secondary">({t("countryInfo.capital", { value: country.capital })})</span>
              ) : undefined}
              {!_.isEmpty(country.alternativeValues) && (
                <OverlayTrigger placement="right" overlay={(
                  <TextTooltip id={tooltipCountryInfoIds[1]} className="d-none d-md-block">
                    <CountryInfoTooltipContents
                      context="fieldInfo"
                      game={game}
                      fieldState={fieldState}
                      country={country}
                      isNameRelevant={isNameRelevant()}
                      isCapitalRelevant={isCapitalRelevant()}
                    />
                  </TextTooltip>
                )}>
                  <TooltipTriggerSpan className="ms-1">
                    <FaCircleInfo />
                  </TooltipTriggerSpan>
                </OverlayTrigger>
              )}
            </SolutionInfoItem>
          ))} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFieldInfoModal(false)}>{t("info.close")}</Button>
        </Modal.Footer>
      </Modal>
    </TableCellInner>
  )

}

export default Field;

const SolutionInfoItem = styled.div`
  padding: .25rem;
  display: flex;
  align-items: center;
  img {
    margin-right: .5rem;
  }
  span {
    line-height: 1rem;
    &.capital {
      margin-left: .25rem;
    }
  }
`

export const ColumnList: React.FC<Omit<RowProps, "children"> & { contents: ReactNode[] }> = ({ contents }) => {
  let chunks: ReactNode[] = [], colProps: ColProps = {}

  if (contents.length >= 8) {
    chunks = _.chunk(contents, contents.length / 2)
    colProps = { md: 6 }
  } else {
    chunks = [contents]
  }
  
  return (<Row>
    {chunks.map((chunk, i) => (
      <Col key={i} {...colProps}>
        {chunk}
      </Col>
    ))}
  </Row>)

}

const CountryFlag = ({ country, size, onClick }: { country: Country | null, size: number, onClick?: any }) => (
  <CircleFlag countryCode={country?.iso?.toLowerCase() ?? "xx"} height={size} onClick={onClick} title="" />
);

type CountryInfoTooltipContentProps = {
  context: "flag" | "name" | "fieldInfo",
  game: Game,
  fieldState: FieldState,
  country: Country | null,
  isNameRelevant: boolean,
  isCapitalRelevant: boolean
}
const CountryInfoTooltipContents = ({ context, game, country, isNameRelevant, isCapitalRelevant }: CountryInfoTooltipContentProps) => {
  const { t } = useTranslation("common")
  const c = country
  const isGameFinished = (game: Game) => game.state == GameState.Finished || game.state == GameState.Ended

  const texts = c ? [
    t("countryInfo.name", { value: c.name }),
    ((isNameRelevant || isGameFinished(game)) && c.alternativeValues.name !== undefined ? t("countryInfo.alternativeNames", { count: c.alternativeValues.name.length, values: c.alternativeValues.name.join(", ") }) : undefined),
    (isCapitalRelevant || isGameFinished(game) ? t("countryInfo.capital", { value: c.capital }) : undefined),
    ((isCapitalRelevant || isGameFinished(game)) && c.alternativeValues.capital !== undefined ? t("countryInfo.alternativeCapitals", { count: c.alternativeValues.capital.length, values: c.alternativeValues.capital.join(", ") }) : undefined)
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
const NumSolutionsBadge = forwardRef<typeof Badge, BadgeProps & { children?: any }>(({ children, ...props }, ref: any) => (
  <ResponsiveBadge ref={ref} {...props}>{children}</ResponsiveBadge>
))
