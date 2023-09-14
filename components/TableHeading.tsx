
import { FaBuildingColumns, FaFlag, FaEarthAmericas, FaEarthAfrica, FaEarthAsia, FaEarthEurope, FaEarthOceania, FaWater, FaSlash, FaCircle } from "react-icons/fa6";
import styles from './TableHeading.module.css'
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import Badge from 'react-bootstrap/Badge';
import styled from "styled-components";
import { useId } from "react";
import { CategoryValue } from "@/src/game.types";
import { useTranslation } from "next-i18next";
// import CountryAutoComplete from "@/components/Autocomplete";
import _ from "lodash";

const continentIconMap = {
  AS: FaEarthAsia,
  NA: FaEarthAmericas,
  SA: FaEarthAmericas,
  EU: FaEarthEurope,
  AF: FaEarthAfrica,
  OC: FaEarthOceania
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

const TableHeadingInner = ({ category, value }: CategoryValue) => {
  const { t, i18n } = useTranslation('common')

  const tooltipId = useId()
  
  if (category == "landlocked") {
    const tooltipCategoryInfo = (<Tooltip id={`tooltipCategoryInfo-${tooltipId}`}>{t("category.landlocked.tooltip")}</Tooltip>)
    return (
      <OverlayTrigger placement="top" overlay={tooltipCategoryInfo}>
        <CategoryBadge>
          <IconStack>
            <FaWater color="white" />
            <FaSlash color="white" />
          </IconStack>
          <span className="icon-label">{t("category.landlocked.label")}</span>
        </CategoryBadge>
      </OverlayTrigger>
    )
    
  }
  if (category == "island") {
    const tooltipCategoryInfo = (<Tooltip id={`tooltipCategoryInfo-${tooltipId}`}>{t("category.island.tooltip")}</Tooltip>)
    return (
      <OverlayTrigger placement="top" overlay={tooltipCategoryInfo}>
        <CategoryBadge>
          <FaCircle />
          <span>{t("category.island.label")}</span>
        </CategoryBadge>
      </OverlayTrigger>
    )
    
  }

  const isStartsWith = category == "starting_letter" || category == "capital_starting_letter"
  const isEndsWith = category == "ending_letter" || category == "capital_ending_letter"
  if (isStartsWith || isEndsWith) {
    const isCapital = category.startsWith("capital")
    const letter = (value as string).toUpperCase()
    const tooltipCategoryInfo = (<Tooltip id={`tooltipCategoryInfo-${tooltipId}`}>{t(`category.${_.camelCase(category)}.tooltip`, { letter })}</Tooltip>)
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
    const i18Key = "category.flagColor.values." + _.get({ "Yellow/Gold": "YellowOrGold" }, color, color)
    const tooltipCategoryInfo = (<Tooltip id={`tooltipCategoryInfo-${tooltipId}`}>{t("category.flagColor.tooltip", { color: t(i18Key) })}</Tooltip>)
    return (
      <OverlayTrigger placement="top" overlay={tooltipCategoryInfo}>
        <CategoryBadge className={`flagColorBadge ${colorClass}`}>
          <FaFlag className={styles.categoryIcon} />
          <span className="icon-label">{t(i18Key).toUpperCase()}</span>
        </CategoryBadge>
      </OverlayTrigger>
    )
  }

  if (category == "continent") {
    const continent = value as string
    const ContinentIcon = _.get(continentIconMap, continent, FaEarthAfrica)
    const tooltipCategoryInfo = (<Tooltip id={`tooltipCategoryInfo-${tooltipId}`}>{t("category.continent.tooltip", { continent: t(`category.continent.values.${continent}`) })}</Tooltip>)
    return (<OverlayTrigger placement="top" overlay={tooltipCategoryInfo}>
      <CategoryBadge>
        <ContinentIcon className={styles.categoryIcon} />
        <span className="icon-label">{t(`category.continent.values.${continent}`)}</span>
      </CategoryBadge>
    </OverlayTrigger>)
  }
  
  return false
}

export const TableHeading = ({ category, value, orient, active, setActive }: CategoryValue & {
  orient: "row" | "col",
  active: boolean,
  setActive: () => void
}) => (
  <div className={`${orient}Heading${active ? " active" : ""}`}>
    <div className="tableHeadingBackground">
      <TableHeadingInner category={category} value={value} setActive={setActive} />
    </div>
  </div>
)

const TableHeadingLetter = styled.span<{ $i: number, $mode: "first" | "last" }>`
  font-weight: bold;
  align-self: ${props => props.$mode} baseline;
  ${props => props.$i == 0 ? `
  font-size: 1.25em;
  margin-top: -.25em;
  margin-bottom: -.25em;
  margin-${props.$mode == "first" ? "right" : "left"}: 1px;` : ""}
  ${props => props.$i != 0 ? `
  text-shadow: 0 0 .25rem white;
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
  border-radius: var(--bs-border-radius);

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
