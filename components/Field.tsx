
import styled from "styled-components";
import { forwardRef, useEffect, useId, useMemo, useState } from 'react';
import { Game, Country, CategoryValue, RequestAction, FrontendQuery, GameData, PlayingMode, GameState } from "@/src/game.types"
import Autocomplete from 'react-autocomplete'
import { PlusCircleFill } from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/Badge';
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { CircleFlag } from 'react-circle-flags'
import styles from '@/pages/Game.module.css'
import { useTranslation } from "next-i18next";
const NodeCache = require("node-cache");
import _ from "lodash";
import { AutoCompleteItem, TableCellInner, MarkingBackground } from "@/components/styles";


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

const Field = ({ pos, game, row, col, userIdentifier, apiRequest, hasTurn, notifyDecided, countries, settings }: FieldProps) => {
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
    <TableCellInner>
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

type CountryAutoCompleteProps = {
  countries: Country[];
  makeGuess: (country: Country) => boolean;
  onBlur: () => void;
}

type AutoCompleteItem = {
  country: Country;
  name: string;  // the country's name or one of the alternative names
  nameNormalized: string;
  nameIndex: number;
  key: string;
}

const CountryAutoComplete = ({ countries, makeGuess, onBlur }: CountryAutoCompleteProps) => {
  const { t, i18n } = useTranslation('common')

  const [searchValue, setSearchValue] = useState("")

  // Init regexes to replace equivalent words
  const equivalentWordCategories = ["saint", "and"]
  const equivalentWordReplacements = equivalentWordCategories.map(key => {
    let [word, others] = t(`equivalentCountryWords.${key}`).split(":").map(s => s.trim())
    word = word.toLowerCase().substring(1, word.length - 1)
    const words = others.split(",").map(w => w.trim().toLowerCase().substring(1, w.trim().length - 1))
    const regexes = words.map(w => new RegExp(`(?<prefix>\\s|^)(?<hit>${_.escapeRegExp(w)})(?<suffix>\\s|$)`, "gi"))  // \b does not work for w = "St."
    // console.log(`Built regexes ${regexes.join(", ")} for word "${word.toLowerCase()}"`);
    
    return [regexes, word.toLowerCase()]
    // const [word, others] = t(`equivalentCountryWords.${key}`).split(":").map(s => s.trim())
    // const words = others.split(", ").map(w => w.trim().toLowerCase().substring(1, w.trim().length - 1))
    // const regex = new RegExp(`\\b(${words.map(w => `(${_.escapeRegExp(w)})`).join("|")})\\b`, "gi")
    // console.log(`Built regex ${regex} for word "${word.toLowerCase()}"`);
  }) as [RegExp[], string][]  // TODO Reduce the number this gets executed
  
  const normalize = (str: string) => {
    // let str1 = str.toLowerCase()
    str = str.toLowerCase()
    let str1 = str
    // normalize equivalent words ("Saint", "and" etc.)
    equivalentWordReplacements.forEach(([regexes, word]) => {
      const str0 = str1
      const replaceInfo = regexes.map(regex => str0.replaceAll(regex, `$<prefix>${word}$<suffix>`)).filter(s => s != str0) as string[]
      if (replaceInfo.length) {
        // Find regex that caused the longest hit ("St." vs "St") -> shortest replacement
        const lengths = replaceInfo.map(s => s.length)
        str1 = replaceInfo[lengths.indexOf(Math.min(...lengths))]
      }
    })
    // replace diacritics
    str1 = str1.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    // console.log(`Normalize: "${str}" -> "${str1}"`)
    return str1
  }

  const items = countries.map(c => [c.name, ...(c.alternativeValues?.name ?? [])].map((name, i) => ({
    country: c,
    name: name,
    nameNormalized: normalize(name),
    nameIndex: i,
    key: `${c.iso}-${i}`
  }))).flat(1) as AutoCompleteItem[]

  const noSpoilerSearch = (q: string) => {
    q = normalize(q)
    if (q.length < 3) {
      return []
    }
    // https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
    let results = items.filter(item => item.nameNormalized.includes(q))
    // retain only one result per country
    const countryCodes = [...new Set(results.map(item => item.country.iso))]
    results.sort((a, b) => {
      if (a.country === b.country) {
        return a.nameIndex - b.nameIndex
      }
      if (a.name > b.name) {
        return 1
      }
      return -1
    })
    if (countryCodes.length < results.length) {
      results = countryCodes.map(iso => results.find(item => item.country.iso == iso) as AutoCompleteItem)
    }

    if (countryCodes.length <= 1) {
      // unique result
      return results
    }
    const exactResults = results.filter(item => item.nameNormalized == q)
    const prefixResults = results.filter(item => item.nameNormalized.startsWith(q))
    if (exactResults.length) {
      // if there's an exact hit "A", also return others named "ABC"
      return prefixResults
    }
    // const containedCompletely = items.filter(item => q.startsWith(c.name.toLowerCase()))
    // there might have been a previous exact hit (query "AB"). In this case, the results should be retained.
    // multiple results, do not show any
    return []
  }

  const [searchCache, setSearchCache] = useState(new NodeCache())

  useEffect(() => {
    setSearchCache(new NodeCache())
  }, [])

  const getSearchResults = (q: string) => {
    const cached = searchCache.get(q)
    if (cached !== undefined) {
      return cached as AutoCompleteItem[]
    }
    const results = noSpoilerSearch(q)
    searchCache.set(q, results)
    return results
  }
  
  return (
    <Autocomplete
      items={items}
      getItemValue={(item: AutoCompleteItem) => item.country.iso}
      renderItem={(item: AutoCompleteItem, isHighlighted: boolean) =>
        <AutoCompleteItem key={`${item.country.iso}-${item.nameIndex}`} $highlighted={isHighlighted}>
          {item.nameIndex == 0 && item.country.name}
          {item.nameIndex != 0 && (<>
            {item.name} <small className="text-muted">({item.country.name})</small>
          </>)}
        </AutoCompleteItem>
      }
      value={searchValue}
      onChange={(e: any, q: string) => {
        setSearchValue(q)
        const results = getSearchResults(q)
      }}
      onSelect={(val: string) => {
        const country = countries.find(c => c.iso == val)
        if (country) {
          const correct = makeGuess(country)
          setSearchValue("")
        }
      }}
      shouldItemRender={(item: AutoCompleteItem, q: string) => {
        return getSearchResults(q).some(resultItem => resultItem.key == item.key)
      }}
      wrapperStyle={{ width: "100%", padding: "5px" }}
      inputProps={{
        style: { width: "100%" },
        onBlur: () => { onBlur() },
        autoFocus: true
      }}
    />
  )
}



export type FieldProps = {
  pos: number[];
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
