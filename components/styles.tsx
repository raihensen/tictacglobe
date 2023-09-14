
import Button from "react-bootstrap/Button";
import Dropdown from "react-bootstrap/Dropdown";
import Tooltip from "react-bootstrap/Tooltip";
import styled from "styled-components";

const breakpointsMin = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400
}
const breakpointsMax = {
  xs: 576,
  sm: 768,
  md: 992,
  lg: 1200,
  xl: 1400,
  xxl: null
}

type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "xxl"

const breakMinWidth = (bp: Breakpoint) => {
  return breakpointsMin[bp] ? `(min-width: ${breakpointsMin[bp]}px)` : ""
}
const breakMaxWidth = (bp: Breakpoint) => {
  return breakpointsMax[bp] ? `(max-width: ${breakpointsMax[bp]}px)` : ""
}
const breakWidth = (bpMin: Breakpoint, bpMax: Breakpoint) => {
  return [breakMinWidth(bpMin), breakMaxWidth(bpMax)].filter(x => x.length).join(" and ")
}


// .badge-player
export const PlayerBadge = styled.span<{ $playerColor: string }>`
  padding: .25rem;
  border-radius: 5px;
  color: white;
  background-color: ${({ $playerColor }) => `var(--bs-${$playerColor})`};
  opacity: .75;
`

export const GameTable = styled.div`

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;

  max-width: 100%;

  .tableRow {

    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;

    &.header .topLeft, &.header .colHeading, .rowHeading, .tableCell {
      padding: 0;
      width: 120px;
      max-width: 25%;

      @media only screen and (min-width: 768px) {
        width: 150px;
      }
    }

    .colHeading, .rowHeading {
      display: flex;
      align-items: center;
      justify-content: flex-end;

      &.colHeading {
        font-weight: normal;
        height: 80px;
        flex-direction: column;
        padding-bottom: 10px;
      }
      &.rowHeading {
          padding-right: 10px;
          display: flex;
      }
      & > div > span {
        position: relative;
      }
      &.active > div > span {
        z-index: 10;
        box-shadow: .25rem .25rem .5rem rgba(0, 0, 0, .5);
      }
      &:not(.active) > div > span {
        opacity: .5;
      }
      & > .tableHeadingBackground {
        background: var(--bs-body-bg);
        border-radius: var(--bs-border-radius);
        position: relative;
      }
    }
    .tableCell {
      border: 1px solid var(--bs-border-color-translucent);
      &:not(:last-child) {
        border-right-width: 0;
      }
    }
    &:not(:last-child) .tableCell {
      border-bottom-width: 0;
    }


  }
`

export const TableCellInner = styled.div`
  padding-bottom: 100%;  /* aspect-ratio: 1 / 1; */
  position: relative;
  top: 0;
  left: 0;

  .field-flex {
    padding: 5px;
    width: 100%;
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    > span {
      display: block;
      width: 100%;
      margin-top: 5px;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      &.label {
        .iso {
          color: var(--bs-secondary);
        }
      }
      &.capital {
        color: var(--bs-secondary);
        font-size: 75%;
      }
    }
  }
  .field-abs-top-left {
    position: absolute;
    top: 5px;
    left: 5px;
  }
  .field-center-50 {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 50px;
    height: 50px;
    margin-top: -25px;
    margin-left: -25px;
  }
  .field-bottom {
    position: absolute;
    left: 0; bottom: 0;
    width: 100%; height: 50px;
  }
`

export const MarkingBackground = styled.div<{ $player: number, $isWinning: boolean }>`
  background: var(${props => props.$player === 0 ? "--bs-blue" : (props => props.$player === 1 ? "--bs-red" : "--bs-gray")});
  display: block;
  opacity: ${props => props.$isWinning ? ".5" : ".25"};
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: -10;
`

const IconButtonStyle = styled(Button)`
  display: flex;
  align-items: center;
  justify-content: center;
  & > :not(:last-child) {
    margin-right: .25em;
  }
`
export const IconButton = ({ children, label, ...props }: any) => (
  <IconButtonStyle {...props}>
    {children}
    {label && <span>{label}</span>}
  </IconButtonStyle>
)

export const MultiLineTooltip = styled(Tooltip)`
  text-align: left;
  & > p:last-child {
    margin-bottom: 0;
  }
`

export const LanguageSelectorToggle = styled(Dropdown.Toggle)`
  height: 100%;
  display: flex;
  align-items: center;
`;
export const LanguageSelectorItem = styled(Dropdown.Item)`
  display: flex;
  align-items: center;
  img {
    margin-right: 0.5rem;
  }
`;




