
import { FaBuildingColumns, FaFlag, FaEarthAmericas, FaEarthAfrica, FaEarthAsia, FaEarthEurope, FaEarthOceania, FaWater, FaSlash, FaCircle } from "react-icons/fa6";
import styles from './TableHeading.module.css'
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import Badge from 'react-bootstrap/Badge';
import styled from "styled-components";
import { useId } from "react";
var _ = require('lodash');


export const TableHeading = (props: { catValue: string }) => {
  if (props.catValue == "Landlocked") {
    const tooltipCategoryInfo = (<Tooltip id={`tooltipCategoryInfo-${useId()}`}>Landlocked countries (without direct ocean access)</Tooltip>)
    return (
      <OverlayTrigger placement="top" overlay={tooltipCategoryInfo}>
        <CategoryBadge>
          <IconStack>
            <FaWater color="white" />
            <FaSlash color="white" />
          </IconStack>
          <span>Landlocked</span>
        </CategoryBadge>
      </OverlayTrigger>
    )
    
  }
  if (props.catValue == "Island Nation") {
    const tooltipCategoryInfo = (<Tooltip id={`tooltipCategoryInfo-${useId()}`}>Island Nations (all parts of the country are located on islands)</Tooltip>)
    return (
      <OverlayTrigger placement="top" overlay={tooltipCategoryInfo}>
        <CategoryBadge>
          <FaCircle />
          <span>Island</span>
        </CategoryBadge>
      </OverlayTrigger>
    )
    
  }
  if (props.catValue.startsWith("Starting letter") || props.catValue.startsWith("Capital starting letter")) {
    const isCapital = props.catValue.startsWith("Capital starting letter")
    const letter = props.catValue.substring(props.catValue.length - 1).toUpperCase()
    const word = [letter, "a", "b", "c", "d"]
    const tooltipCategoryInfo = (<Tooltip id={`tooltipCategoryInfo-${useId()}`}>{isCapital ? "Capital" : "Country name"} starts with {"AEFHILMNORSX".includes(letter) ? "an" : "a"} {letter}</Tooltip>)
    return (
      <OverlayTrigger key="starting-letter" placement="top" overlay={tooltipCategoryInfo}>
        <CategoryBadge>
          {isCapital && (<>
            <FaBuildingColumns className={styles.categoryIcon} />
          </>)}
          {word.map((c, i) => (<TableHeadingLetter key={i} $i={i} $mode="first">{i == 4 ? `${c}...` : c}</TableHeadingLetter>))}
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
          {word.map((c, i) => (<TableHeadingLetter key={i} $i={3 - i} $mode="last">{i == 0 ? `...${c}` : c}</TableHeadingLetter>))}
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
          <span className="icon-label">{color.toUpperCase()}</span>
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
        <span className="icon-label">{continent}</span>
      </CategoryBadge>
    </OverlayTrigger>)
  }
  
  return false
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

export const RowHeading = styled.td`
  & > div {
    width: 150px;
    height: 150px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 10px;
  }
`

export const ColHeading = styled.th`
  & > div {
    width: 150px;
    height: 100px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 10px;
  }
`

const TableHeadingLetter = styled.span<{ $i: number, $mode: "first" | "last" }>`
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

  svg, .icon-stack {
    margin-right: 6px;
    font-size: 24px;
  }
  .icon-label {
    font-size: 80%;
  }
`

const IconStack = styled.span`
  display: grid;

  svg {
    grid-area: 1 / 1;
  }
`
