import { Country } from "@/src/game.types";
import _ from "lodash";
import { useTranslation } from "next-i18next";
import { useEffect, useState } from 'react';
import Select from "react-select";
const NodeCache = require("node-cache");


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

  const [searchCache, setSearchCache] = useState(new NodeCache())

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
    // https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
    str1 = str1.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    // console.log(`Normalize: "${str}" -> "${str1}"`)
    return str1
  }

  const comapreResults = (a: AutoCompleteItem, b: AutoCompleteItem) => {
    if (a.country === b.country) {
      return a.nameIndex - b.nameIndex
    }
    if (a.name > b.name) {
      return 1
    }
    return -1
  }
  
  const noSpoilerSearch = (queries: string[]) => {
    
    queries = [...new Set(queries.filter(q => q.length >= 3))]
    if (!queries.length) {
      return []
    }

    let results = items.filter(item => queries.some(q => [item.name, item.nameNormalized].some(name => name.includes(q))))
    // retain only one result per country
    const countryCodes = [...new Set(results.map(item => item.country.iso))]
    results.sort((a, b) => comapreResults(a, b))
    if (countryCodes.length < results.length) {
      results = countryCodes.map(iso => results.find(item => item.country.iso == iso) as AutoCompleteItem)
    }
    if (countryCodes.length <= 1) {
      // unique result
      return results
    }
    const exactResults = results.filter(item => queries.some(q => [item.name, item.nameNormalized].some(name => name == q)))
    const prefixResults = results.filter(item => queries.some(q => [item.name, item.nameNormalized].some(name => name.startsWith(q))))
    if (exactResults.length) {
      // if there's an exact hit "A", also return others named "ABC"
      return prefixResults
    }
    // const containedCompletely = items.filter(item => q.startsWith(c.name.toLowerCase()))
    // there might have been a previous exact hit (query "AB"). In this case, the results should be retained.
    // multiple results, do not show any
    return []

  
  }
  
  const items = countries.map(c => [c.name, ...(c.alternativeValues?.name ?? [])].map((name, i) => ({
    country: c,
    name: name,
    nameNormalized: normalize(name),
    nameIndex: i,
    key: `${c.iso}-${i}`
  }))).flat(1) as AutoCompleteItem[]

  useEffect(() => {
    setSearchCache(new NodeCache())
  }, [])

  const getSearchResults = (q: string) => {
    const cached = searchCache.get(q)
    if (cached !== undefined) {
      return cached as AutoCompleteItem[]
    }
    const results = noSpoilerSearch([q, normalize(q)])
    searchCache.set(q, results)
    return results
  }

  const [isDisabled, setIsDisabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  type Option = { label: string, value: string, data: AutoCompleteItem }

  return (<Select
    inputValue={searchValue}
    className="basic-single"
    classNamePrefix="select"
    defaultValue={undefined}
    autoFocus
    isDisabled={isDisabled}
    isLoading={isLoading}
    isClearable={false}
    isSearchable={true}
    menuPlacement="auto"
    menuPosition="absolute"
    options={items}
    placeholder="Country"
    noOptionsMessage={() => t("countrySearch.noResults")}

    filterOption={(option: Option, inputValue: string) => {
      return getSearchResults(inputValue).some(resultItem => resultItem.key == option.data.key)
    }}
    formatOptionLabel={(item: AutoCompleteItem, formatOptionLabelMeta: { context: "menu" | "value", inputValue: string }) => (<>
      {item.nameIndex == 0 && item.country.name}
      {item.nameIndex != 0 && (<>
        {item.name} <small className="text-muted">({item.country.name})</small>
      </>)}
    </>)}
    getOptionValue={item => item.key}

    onBlur={() => { onBlur() }}
    onInputChange={(newValue: string) => {
      setSearchValue(newValue)
      // pre-compute results for cache
      const results = getSearchResults(newValue)
    }}
    onChange={item => {
      if (item) {
        const correct = makeGuess(item.country)
        setSearchValue("")
        // if (selectRef.current) {
        //   selectRef.current.select.clearValue()
        // }
      }
    }}
    components={{
      DropdownIndicator: () => null,
      IndicatorSeparator: () => null
    }}
    styles={{
      control: (provided, { isDisabled, isFocused }) => ({
        ...provided,
        backgroundColor: `var(--bs-body-bg)`,
        color: "var(--bs-body-color)",
        border: "var(--bs-border-width) solid var(--bs-border-color)",
        borderRadius: "var(--bs-border-radius)",
        lineHeight: 1.5,
        padding: ".375rem .75rem",
        fontSize: "1rem",
        fontWeight: 400,
        appearance: "none",
        backgroundClip: "padding-box",
        borderColor: isFocused ? "#86b7fe" : undefined,
        boxShadow: isFocused ? "boxShadow: 0 0 0 .25rem rgba(13,110,253,.25)" : undefined,
        outline: isFocused ? "0" : undefined
      }),
      input: ({margin, paddingTop, paddingBottom, ...base}, state) => ({
        ...base,
        cursor: "text",
        color: "var(--bs-body-color)"
      }),
      menu: (provided, state) => ({
        ...provided,
        backgroundColor: `var(--bs-body-bg)`,
        color: "var(--bs-body-color)"
      }),
      option: (provided, { isFocused }) => ({
        ...provided,
        backgroundColor: isFocused ? "var(--bs-secondary)" : `var(--bs-body-bg)`,
        color: "var(--bs-body-color)"
      }),
    }}
  />)

}

export default CountryAutoComplete;



/* https://github.com/JedWatson/react-select/issues/2345 */
/* <p>
        <CountryAutoComplete countries={countries} onBlur={() => {}} makeGuess={(c: Country) => false} />
      </p>
      <p>
        <Form.Select aria-label="Default select example">
          <option>Open this select menu</option>
          <option value="1">One</option>
          <option value="2">Two</option>
          <option value="3">Three</option>
        </Form.Select>
      </p>
      <p>
        <Form.Control type="text" />
      </p> */

// https://github.com/JedWatson/react-select/issues/2345#issuecomment-843674624
// function getSelectStyles(multi, size='') {
// 	const suffix = size ? `-${size}` : '';
// 	const multiplicator = multi ? 2 : 1;
// 	return {
// 		control: (provided, { isDisabled, isFocused }) => ({
// 			...provided,
// 			backgroundColor: `var(--bs-select${isDisabled ? '-disabled' : ''}-bg)`,
// 			borderColor: `var(--bs-select${isDisabled ? '-disabled' : (isFocused ? '-focus' : '')}-border-color)`,
// 			borderWidth: "var(--bs-select-border-width)",
// 			lineHeight: "var(--bs-select-line-height)",
// 			fontSize: `var(--bs-select-font-size${suffix})`,
// 			fontWeight: "var(--bs-select-font-weight)",
// 			minHeight: `calc((var(--bs-select-line-height)*var(--bs-select-font-size${suffix})) + (var(--bs-select-padding-y${suffix})*2) + (var(--bs-select-border-width)*2))`,
// 			':hover': {
// 				borderColor: "var(--bs-select-focus-border-color)",
// 			},
// 		}),
// 		singleValue: ({marginLeft, marginRight, ...provided}, { isDisabled }) => ({
// 			...provided,
// 			color: `var(--bs-select${isDisabled ? '-disabled' : ''}-color)`,
// 		}),
// 		valueContainer: (provided, state) => ({
// 			...provided,
// 			padding: `calc(var(--bs-select-padding-y${suffix})/${multiplicator}) calc(var(--bs-select-padding-x${suffix})/${multiplicator})`,
// 		}),
// 		dropdownIndicator: (provided, state) => ({
// 			height: "100%",
// 			width: "var(--bs-select-indicator-padding)",
// 			backgroundImage: "var(--bs-select-indicator)",
// 			backgroundRepeat: "no-repeat",
// 			backgroundPosition: `right var(--bs-select-padding-x) center`,
// 			backgroundSize: "var(--bs-select-bg-size)",			
// 		}),
// 		input: ({margin, paddingTop, paddingBottom, ...provided}, state) => ({
// 			...provided
// 		}),
// 		option: (provided, state) => ({
// 			...provided,
// 			margin: `calc(var(--bs-select-padding-y${suffix})/2) calc(var(--bs-select-padding-x${suffix})/2)`,
// 		}),
// 		menu: ({marginTop, ...provided}, state) => ({
// 			...provided
// 		}),
// 		multiValue: (provided, state) => ({
// 			...provided,
// 			margin: `calc(var(--bs-select-padding-y${suffix})/2) calc(var(--bs-select-padding-x${suffix})/2)`,
// 		}),
// 		clearIndicator: ({padding, ...provided}, state) => ({
// 			...provided,
// 			alignItems: "center",
// 			justifyContent: "center",
// 			height: "100%",
// 			width: "var(--bs-select-indicator-padding)"
// 		}),
// 		multiValueLabel: ({padding, paddingLeft, fontSize, ...provided}, state) => ({
// 			...provided,
// 			padding: `0 var(--bs-select-padding-y${suffix})`,
// 			whiteSpace: "normal"
// 		})
// 	}
// }

// .form-control {
//   display: block;
//   width: 100%;
//   padding: .375rem .75rem;
//   fontSize: 1rem;
//   fontWeight: 400;
//   lineHeight: 1.5;
//   color: var(--bs-body-color);
//   -webkit-appearance: none;
//   -moz-appearance: none;
//   appearance: none;
//   backgroundColor: var(--bs-body-bg);
//   backgroundClip: padding-box;
//   border: var(--bs-border-width) solid var(--bs-border-color);
//   borderRadius: var(--bs-border-radius);
// }
// .form-select:focus {
//   borderColor: #86b7fe;
//   outline: 0;
//   boxShadow: 0 0 0 .25rem rgba(13,110,253,.25);
// }
// .form-control:focus {
//   color: var(--bs-body-color);
//   backgroundColor: var(--bs-body-bg);
//   borderColor: #86b7fe;
//   outline: 0;
//   boxShadow: 0 0 0 .25rem rgba(13,110,253,.25);
// }
