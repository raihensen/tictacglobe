
import { FaBuildingColumns, FaFlag, FaEarthAmericas, FaEarthAfrica, FaEarthAsia, FaEarthEurope, FaEarthOceania, FaWater, FaSlash, FaCircle } from "react-icons/fa6";
import styles from './TableHeading.module.css'
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import Badge from 'react-bootstrap/Badge';
import styled from "styled-components";
import { useId } from "react";
import { CategoryValue } from "@/src/game.types";
var _ = require('lodash');

const continentIconMap = {
  AS: FaEarthAsia,
  NA: FaEarthAmericas,
  SA: FaEarthAmericas,
  EU: FaEarthEurope,
  AF: FaEarthAfrica,
  OC: FaEarthOceania
}
const continentNameMap = {
  AS: "Asia",
  NA: "North America",
  SA: "South America",
  EU: "Europe",
  AF: "Africa",
  OC: "Oceania"
}

const colorMap = {
  "Red": styles.flagColorRed,
  "Yellow/Gold": styles.flagColorYellow,
  "Orange": styles.flagColorOrange,
  "Green": styles.flagColorGreen,
  "Blue": styles.flagColorBlue,
  "White": styles.flagColorWhite,
  "Black": styles.flagColorBlack
}

export const TableHeading = ({ category, value }: CategoryValue) => {
  if (category == "landlocked") {
    const tooltipCategoryInfo = (<Tooltip id={`tooltipCategoryInfo-${useId()}`}>Landlocked countries (without direct ocean access)</Tooltip>)
    return (
      <OverlayTrigger placement="top" overlay={tooltipCategoryInfo}>
        <CategoryBadge>
          <IconStack>
            <FaWater color="white" />
            <FaSlash color="white" />
          </IconStack>
          <span className="icon-label">Landlocked</span>
        </CategoryBadge>
      </OverlayTrigger>
    )
    
  }
  if (category == "island") {
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

  const isStartsWith = category == "starting_letter" || category == "capital_starting_letter"
  const isEndsWith = category == "ending_letter" || category == "capital_ending_letter"
  if (isStartsWith || isEndsWith) {
    const isCapital = category.startsWith("capital")
    const letter = (value as string).toUpperCase()
    const tooltipCategoryInfo = (<Tooltip id={`tooltipCategoryInfo-${useId()}`}>{isCapital ? "Capital" : "Country name"} {isStartsWith ? "starts" : "ends"} with {"AEFHILMNORSX".includes(letter) ? "an" : "a"} {letter}</Tooltip>)
    return (
      <OverlayTrigger placement="top" overlay={tooltipCategoryInfo}>
        <CategoryBadge>
          {isCapital && <FaBuildingColumns className={styles.categoryIcon} />}
          {isStartsWith ? [letter, "a", "b", "c"].map((c, i) => (
            <TableHeadingLetter key={i} $i={i} $mode="first">{i == 3 ? `${c}...` : c}</TableHeadingLetter>
          )) : ["a", "b", "c", letter].map((c, i) => (
            <TableHeadingLetter key={i} $i={3 - i} $mode="last">{i == 0 ? `...${c}` : c}</TableHeadingLetter>
          ))}
        </CategoryBadge>
      </OverlayTrigger>
    )
  }

  if (category == "flag_colors") {
    const color = value as string
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

  if (category == "continent") {
    const continent = value as string
    const continentName = _.get(continentNameMap, continent, continent)
    const ContinentIcon = _.get(continentIconMap, continent, FaEarthAfrica)
    const tooltipCategoryInfo = (<Tooltip id={`tooltipCategoryInfo-${useId()}`}>Continent: {continentName}</Tooltip>)
    return (<OverlayTrigger placement="top" overlay={tooltipCategoryInfo}>
      <CategoryBadge>
        <ContinentIcon className={styles.categoryIcon} />
        <span className="icon-label">{continentName}</span>
      </CategoryBadge>
    </OverlayTrigger>)
  }
  
  return false
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
  font-weight: normal;
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
  align-self: ${props => props.$mode} baseline;
  ${props => props.$i == 0 ? `
  font-size: 1.25em;
  margin-top: -.25em;
  margin-bottom: -.25em;
  margin-${props.$mode == "first" ? "right" : "left"}: 1px;` : ""}
  ${props => props.$i != 0 ? `
  text-shadow: 0 0 2px white;
  opacity: .75;
  color: transparent;
  font-size: ${(1 - .5 * (props.$i - 1) / 3) * 100}%;
  ` : ""}
`
// 
// i=0:
// transform: scale(1.2);

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
