
import Button from "react-bootstrap/Button";
import Dropdown from "react-bootstrap/Dropdown";
import Tooltip from "react-bootstrap/Tooltip";
import styled from "styled-components";

// .badge-player
export const PlayerBadge = styled.span<{ $playerColor: string }>`
  padding: .25rem;
  border-radius: 5px;
  color: white;
  background-color: ${({ $playerColor }) => `var(--bs-${$playerColor})`};
  opacity: .75;
`

export const TableCell = styled.td`
  border: 1px solid rgba(0,0,0,.25);
  padding: 0;
`
export const TableCellInner = styled.div`
  position: relative;
  top: 0;
  left: 0;
  width: 150px;
  height: 150px;
  .field-flex {
    padding: 5px;
    display: flex;
    flex-direction: column;
    justify-content: center;
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

export const AutoCompleteItem = styled.div<{ $highlighted: boolean }>`
  cursor: pointer;
  background: ${({ $highlighted }) => $highlighted ? 'lightgray' : 'white' };
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




