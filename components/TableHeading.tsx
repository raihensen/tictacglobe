
import { FaBuildingColumns, FaFlag, FaEarthAmericas, FaEarthAfrica, FaEarthAsia, FaEarthEurope, FaEarthOceania, FaWater, FaSlash, FaCircle } from "react-icons/fa6";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import Badge from 'react-bootstrap/Badge';
import styled from "styled-components";
import { forwardRef, useId } from "react";
import { CategoryValue } from "@/src/game.types";
import { useTranslation } from "next-i18next";
// import CountryAutoComplete from "@/components/Autocomplete";
import _ from "lodash";

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

const getCategoryInfo = ({ category, value, ...props }: CategoryValue & React.ComponentProps<typeof CategoryBadge>): {
  description?: string | TranslationArgsType,
  badge?: JSX.Element
} => {
  
  if (category == "landlocked") {
    return {
      description: "category.landlocked.tooltip",
      badge: (<CategoryBadgeSimple icon={(<IconStack><FaWater color="white" /><FaSlash color="white" /></IconStack>)} label="category.landlocked.label" {...props} />)
    }
  }
  if (category == "island") {
    return {
      description: "category.island.tooltip",
      badge: (<CategoryBadgeSimple icon={<FaCircle />} label="category.island.label" {...props} />)
    }
  }

  const isStartsWith = category == "starting_letter" || category == "capital_starting_letter"
  const isEndsWith = category == "ending_letter" || category == "capital_ending_letter"
  if (isStartsWith || isEndsWith) {
    const isCapital = category.startsWith("capital")
    const letter = (value as string).toUpperCase()
    return {
      description: [`category.${_.camelCase(category)}.tooltip`, { letter }],
      badge: (<CategoryBadgeLetters letter={letter} isCapital={isCapital} isStartsWith={isStartsWith} isEndsWith={isEndsWith} {...props} />)
    }
  }

  if (category == "flag_colors") {
    const colorName = value as string
    const style = _.get(flagColorStyles, colorName, flagColorStyles.White)
    const i18Key = "category.flagColor.values." + _.get({ "Yellow/Gold": "YellowOrGold" }, colorName, colorName)
    return {
      description: ["category.flagColor.tooltip", { color: i18Key }],
      badge: (<CategoryBadgeSimple className="flagColorBadge" style={style} icon={<FaFlag />} label={i18Key} {...props} labelFormatter={s => s.toUpperCase()} />)
    }
  }

  if (category == "continent") {
    const continent = value as string
    const ContinentIcon = _.get(continentIcons, continent, FaEarthAfrica)
    return {
      description: ["category.continent.tooltip", { continent: `category.continent.values.${continent}` }],
      badge: (<CategoryBadgeSimple icon={<ContinentIcon />} label={`category.continent.values.${continent}`} {...props} />)
    }
  }
  
  return {}
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
  if (description) {
    // translate translation parameters [ t("colorInfo", { color: "colorRed" }) ]
    if (_.isArray(description)) {
      description = description as TranslationArgsType
      if (description.length == 2) {
        description[1] = Object.fromEntries(Object.entries(description[1]).map(([k, v]: [string, string]) => [k, t(v)]))
      } else {
        console.log(`Warning: TableHeading expected translation parameters to have length 2.`)
      }
    } else {
      description = [description, {}]
    }
  }
  description = description as TranslationArgsType

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

  svg, .icon-stack {
    vertical-align: inherit;
    margin-right: 6px;
    font-size: 24px;
  }
  .icon-label {
    font-size: 80%;
  }
`
const CategoryBadge = forwardRef<HTMLSpanElement, React.HTMLProps<HTMLSpanElement>>(({ className, ...props }, ref) => (
  <CategoryBadgeInner ref={ref} className={["categoryBadge", className].join(" ")} {...props} />
))

const IconStack = styled.span`
  display: grid;

  svg {
    grid-area: 1 / 1;
  }
`
