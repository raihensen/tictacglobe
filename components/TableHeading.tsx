
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

const getTableHeadingContents = ({ category, value, badgeProps }: CategoryValue & { badgeProps: any }): {
  description?: string,
  badge?: JSX.Element
} => {
  const { t, i18n } = useTranslation('common')
  
  if (category == "landlocked") {
    return {
      description: t("category.landlocked.tooltip"),
      badge: (
        <CategoryBadge {...badgeProps}>
          <IconStack>
            <FaWater color="white" />
            <FaSlash color="white" />
          </IconStack>
          <span className="icon-label">{t("category.landlocked.label")}</span>
        </CategoryBadge>
      )
    }
  }
  if (category == "island") {
    return {
      description: t("category.island.tooltip"),
      badge: (
        <CategoryBadge {...badgeProps}>
          <FaCircle />
          <span>{t("category.island.label")}</span>
        </CategoryBadge>
      )
    }
    
  }

  const isStartsWith = category == "starting_letter" || category == "capital_starting_letter"
  const isEndsWith = category == "ending_letter" || category == "capital_ending_letter"
  if (isStartsWith || isEndsWith) {
    const isCapital = category.startsWith("capital")
    const letter = (value as string).toUpperCase()
    
    return {
      description: t(`category.${_.camelCase(category)}.tooltip`, { letter }),
      badge: (
        <CategoryBadge {...badgeProps}>
          {isCapital && <FaBuildingColumns className={styles.categoryIcon} />}
          {isStartsWith ? [letter, "a", "b", "c"].map((c, i) => (
            <TableHeadingLetter key={i} $i={i} $mode="first">{i == 3 ? `${c}...` : c}</TableHeadingLetter>
          )) : ["a", "b", "c", letter].map((c, i) => (
            <TableHeadingLetter key={i} $i={3 - i} $mode="last">{i == 0 ? `...${c}` : c}</TableHeadingLetter>
          ))}
        </CategoryBadge>
      )
    }
  }

  if (category == "flag_colors") {
    const color = value as string
    const colorClass = _.get(colorMap, color, styles.flagColorBlack)
    const i18Key = "category.flagColor.values." + _.get({ "Yellow/Gold": "YellowOrGold" }, color, color)
    
    return {
      description: t("category.flagColor.tooltip", { color: t(i18Key) }),
      badge: (
        <CategoryBadge className={`flagColorBadge ${colorClass}`} {...badgeProps}>
          <FaFlag className={styles.categoryIcon} />
          <span className="icon-label">{t(i18Key).toUpperCase()}</span>
        </CategoryBadge>
      )
    }
  }

  if (category == "continent") {
    const continent = value as string
    const ContinentIcon = _.get(continentIconMap, continent, FaEarthAfrica)
    return {
      description: t("category.continent.tooltip", { continent: t(`category.continent.values.${continent}`) }),
      badge: (
        <CategoryBadge {...badgeProps}>
          <ContinentIcon className={styles.categoryIcon} />
          <span className="icon-label">{t(`category.continent.values.${continent}`)}</span>
        </CategoryBadge>
      )
    }
  }
  
  return {}
}

export const TableHeading = ({ category, value, orient, active, setActive }: CategoryValue & {
  orient: "row" | "col",
  active: boolean,
  setActive: (active: boolean) => void
}) => {

  const { description, badge } = getTableHeadingContents({ category: category, value: value, badgeProps: {
    onMouseEnter: () => { setActive(true) },
    onMouseLeave: () => { setActive(false) }
  }})

  const tooltipId = useId()
  const tooltip = description ? (<Tooltip id={`categoryTooltip-${tooltipId}`}>{description}</Tooltip>) : undefined

  return (
    <div className={`${orient}Heading${active ? " active" : ""}`}>
      {badge && (<div className="tableHeadingBackground">
        {tooltip && (
          <OverlayTrigger placement="top" overlay={tooltip}>
            {badge}
          </OverlayTrigger>
        )}
        {!tooltip && badge}
      </div>)}
    </div>
  )
}

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
