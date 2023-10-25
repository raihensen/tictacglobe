
import { FaBuildingColumns, FaFlag, FaEarthAmericas, FaEarthAfrica, FaEarthAsia, FaEarthEurope, FaEarthOceania, FaWater, FaSlash, FaCircle, FaPeopleGroup, FaMinimize, FaMaximize, FaUsersSlash, FaUsers, FaMountain } from "react-icons/fa6";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import styled from "styled-components";
import { forwardRef, useId } from "react";
import { CategoryValue } from "@/src/game.types";
import { TFunction, useTranslation } from "next-i18next";

import _ from "lodash";
import { addClassName } from "@/src/util";

const continentIcons = {
  AS: FaEarthAsia,
  NA: FaEarthAmericas,
  SA: FaEarthAmericas,
  EU: FaEarthEurope,
  AF: FaEarthAfrica,
  OC: FaEarthOceania
}
const flagColorStyles = {
  "White": { background: "#eeeeee", color: "var(--bs-dark)"},
  "Black": { background: "#333333", color: "var(--bs-light)"},
  "Red": { background: "#d80027", color: "var(--bs-light)"},
  "Orange": { background: "#ff9811", color: "var(--bs-dark)"},
  "Yellow/Gold": { background: "#ffda44", color: "var(--bs-dark)"},
  "Green": { background: "#6da544", color: "var(--bs-light)"},
  "Blue": { background: "#0052b4", color: "var(--bs-light)"}
}

const CategoryBadgeSimple = ({ label, labelFormatter, icon, ...props }: React.ComponentProps<typeof CategoryBadge> & {
  label: string,
  labelFormatter?: (s: string) => string,
  icon: JSX.Element
}) => {
  const { t } = useTranslation('common')
  return (
    <CategoryBadge {...props}>
      {icon}
      <span className="icon-label">{labelFormatter ? labelFormatter(t(label)) : t(label)}</span>
    </CategoryBadge>
  )
}

const CategoryLetter = styled.span<{ $i: number, $mode: "first" | "last" }>`
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
const CategoryBadgeLetters = ({ letter, isCapital, isStartsWith, isEndsWith, ...props }: React.ComponentProps<typeof CategoryBadge> & {
  letter: string,
  isCapital: boolean,
  isStartsWith: boolean,
  isEndsWith: boolean
}) => {
  const { t } = useTranslation('common')
  return (
    <CategoryBadge {...props}>
      {isCapital && <FaBuildingColumns />}
      {isStartsWith ? [letter, "a", "b", "c"].map((c, i) => (
        <CategoryLetter key={i} $i={i} $mode="first">{i == 3 ? `${c}...` : c}</CategoryLetter>
      )) : ["a", "b", "c", letter].map((c, i) => (
        <CategoryLetter key={i} $i={3 - i} $mode="last">{i == 0 ? `...${c}` : c}</CategoryLetter>
      ))}
    </CategoryBadge>
  )
}

type TranslationArgsType = [string, { [x: string]: string }]

export const getCategoryInfo = ({ category, value, badge = true, ...props }: CategoryValue & { badge?: boolean } & React.ComponentProps<typeof CategoryBadge>): {
  description?: string | TranslationArgsType,
  badge?: JSX.Element
} => {
  
  // TODO convert this to simpler code, just need to define the icons in a dict
  if (category == "landlocked") {
    return {
      description: "category.landlocked.tooltip",
      badge: badge ? (<CategoryBadgeSimple icon={(<span className="icon-stack"><FaWater color="white" /><FaSlash color="white" /></span>)} label="category.landlocked.label" {...props} />) : undefined
    }
  }
  if (category == "island") {
    return {
      description: "category.island.tooltip",
      badge: badge ? (<CategoryBadgeSimple icon={<FaCircle />} label="category.island.label" {...props} />) : undefined
    }
  }
  if (category == "top_20_population") {
    return {
      description: "category.top_20_population.tooltip",
      badge: badge ? (<CategoryBadgeSimple icon={(<FaUsers color="white" />)} label="category.top_20_population.label" {...props} />) : undefined
    }
  }
  if (category == "bottom_20_population") {
    return {
      description: "category.bottom_20_population.tooltip",
      badge: badge ? (<CategoryBadgeSimple icon={(<FaUsersSlash color="white" />)} label="category.bottom_20_population.label" {...props} />) : undefined
    }
  }
  if (category == "top_20_area") {
    return {
      description: "category.top_20_area.tooltip",
      badge: badge ? (<CategoryBadgeSimple icon={(<FaMaximize color="white" />)} label="category.top_20_area.label" {...props} />) : undefined
    }
  }
  if (category == "bottom_20_area") {
    return {
      description: "category.bottom_20_area.tooltip",
      badge: badge ? (<CategoryBadgeSimple icon={(<FaMinimize color="white" />)} label="category.bottom_20_area.label" {...props} />) : undefined
    }
  }
  if (category == "elevation_sup5k") {
    return {
      description: "category.elevation_sup5k.tooltip",
      badge: badge ? (<CategoryBadgeSimple icon={(<FaMountain color="white" />)} label="category.elevation_sup5k.label" {...props} />) : undefined
    }
  }
  if (category == "elevation_sub1k") {
    return {
      description: "category.elevation_sub1k.tooltip",
      badge: badge ? (<CategoryBadgeSimple icon={(<span className="icon-stack"><FaMountain color="white" style={{ fontSize: "20px" }} /><FaSlash color="white" /></span>)} label="category.elevation_sub1k.label" {...props} />) : undefined
    }
  }

  const isStartsWith = category == "starting_letter" || category == "capital_starting_letter"
  const isEndsWith = category == "ending_letter" || category == "capital_ending_letter"
  if (isStartsWith || isEndsWith) {
    const isCapital = category.startsWith("capital")
    const letter = (value as string).toUpperCase()
    return {
      description: [`category.${_.camelCase(category)}.tooltip`, { letter }],
      badge: badge ? (<CategoryBadgeLetters letter={letter} isCapital={isCapital} isStartsWith={isStartsWith} isEndsWith={isEndsWith} {...props} />) : undefined
    }
  }

  if (category == "flag_colors") {
    const colorName = value as string
    const style = _.get(flagColorStyles, colorName, flagColorStyles.White)
    const i18Key = "category.flagColor.values." + _.get({ "Yellow/Gold": "YellowOrGold" }, colorName, colorName)
    return {
      description: ["category.flagColor.tooltip", { color: i18Key }],
      badge: badge ? (<CategoryBadgeSimple className="flagColorBadge" style={style} icon={<FaFlag />} label={i18Key} {...props} labelFormatter={s => s.toUpperCase()} />) : undefined
    }
  }

  if (category == "continent") {
    const continent = value as string
    const ContinentIcon = _.get(continentIcons, continent, FaEarthAfrica)
    return {
      description: ["category.continent.tooltip", { continent: `category.continent.values.${continent}` }],
      badge: badge ?(<CategoryBadgeSimple icon={<ContinentIcon />} label={`category.continent.values.${continent}`} {...props} />) : undefined
    }
  }
  
  return {}
}

export function translateCategory(description: string | TranslationArgsType | undefined, t: TFunction): TranslationArgsType | undefined {
  if (!description) {
    return undefined
  }
  // translate translation parameters [ t("colorInfo", { color: "colorRed" }) ]
  if (_.isArray(description)) {
    if (description.length == 2) {
      description[1] = Object.fromEntries(Object.entries(description[1]).map(([k, v]: [string, string]) => [k, t(v)]))
    } else {
      console.log(`Warning: TableHeading expected translation parameters to have length 2.`)
    }
    return description
  }
  return [description, {}]
}

export const TableHeading = ({ category, value, orient, active, setActive }: CategoryValue & {
  orient: "row" | "col",
  active: boolean,
  setActive: (active: boolean) => void
}) => {

  const { t } = useTranslation('common')
  let { description, badge } = getCategoryInfo({
    category: category,
    value: value,
    onMouseEnter: () => { setActive(true) },
    onMouseLeave: () => { setActive(false) }
  })
  description = translateCategory(description, t)

  const tooltipId = useId()
  const tooltip = description ? (<Tooltip id={`categoryTooltip-${tooltipId}`}>{t(...description)}</Tooltip>) : undefined

  return (
    <div className={`${orient}Heading${active ? " active" : ""}`}>
      {badge && (<div className="tableHeadingBackground">
        {tooltip && (
          <OverlayTrigger placement="top" overlay={tooltip}>
            <div>
              {badge}
            </div>
          </OverlayTrigger>
        )}
        {!tooltip && badge}
      </div>)}
    </div>
  )
}

// 
// i=0:
// transform: scale(1.2);

const CategoryBadgeInner = styled.span`
  display: flex;
  align-items: center;
  background: var(--bs-secondary);
  color: white;
  padding: .5rem;
  border-radius: var(--bs-border-radius);

  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10 and IE 11 */
  user-select: none; /* Standard syntax */

  svg, .icon-stack { /* icon, IconStack */
    vertical-align: inherit;
    margin-right: 6px;
    font-size: 24px;
  }
  .icon-label {
    font-size: 80%;
  }
  .icon-stack {
    /* display: grid; */
    display: block;
    width: 24px;
    height: 24px;
    transform: scale(1);
    
    svg {
      /* grid-area: 1 / 1; */
      position: absolute;
      top: 50%;
      left: 50%;
      margin-top: -50%;
      margin-left: -50%;
    }

  }
`
const CategoryBadge = forwardRef<HTMLSpanElement, React.HTMLProps<HTMLSpanElement>>(({ className, ...props }, ref) => (
  <CategoryBadgeInner ref={ref} className={addClassName(className, "categoryBadge")} {...props} />
))

