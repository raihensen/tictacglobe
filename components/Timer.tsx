
import { useAutoRefresh } from '@/src/util';
import _ from 'lodash';
import React from "react";
import styled from "styled-components";


type BaseTimerProps = {
  onElapsed: () => any,
  className?: string,
  initialTime: number,
  tickDuration?: number
  dangerThreshold?: number
}
type RemoteTimerProps = BaseTimerProps & {
  initialTimestamp: number
}

const RemoteTimerComponent = React.memo(React.forwardRef(({
  initialTime,
  initialTimestamp,
  onElapsed,
  tickDuration = 200,
  dangerThreshold = 5000,
  className,
}: RemoteTimerProps, ref) => {

  const [time, setTime] = React.useState<number>(initialTime)
  const [running, setRunning] = React.useState<boolean>(true)

  // Methods offered to parent component
  React.useImperativeHandle(ref, () => ({
    restart() {
      // should be called to re-start the timer after updating initialTimestamp
      setRunning(true)
    },
    stop() {
      // stops timer updates, preventing elapsing
      setRunning(false)
    }
  }))

  const refresh = React.useCallback(() => {
    if (running) {
      setTime(initialTime - (Date.now() - initialTimestamp))
      scheduleAutoRefresh()
    } else {
      clearAutoRefresh()
    }
  }, [running, initialTime, initialTimestamp])

  const { scheduleAutoRefresh, clearAutoRefresh } = useAutoRefresh(() => {
    refresh()
  }, tickDuration)

  React.useEffect(() => {
    // console.log(`Timer: running or initialTimestamp changed. running = ${running}, initialTimestamp = ${initialTimestamp}`)
    refresh()
    return () => {
      clearAutoRefresh()
    }
  }, [initialTimestamp, initialTime, running])

  React.useEffect(() => {
    if (time <= 0) {

      clearAutoRefresh()  // probably not needed
      setRunning(false)
      onElapsed()

    }
  }, [time])

  const highlightDanger = () => {
    return time <= dangerThreshold
  }
  const padZeros = (t: number) => t.toString().padStart(2, "0")

  return (<>
    <div className={["timer", className, highlightDanger() ? "danger" : undefined].join(" ")}>
      <span className="minutes">{padZeros(Math.max(0, Math.floor(time / 60000)))}</span>
      <span className="colon">:</span>
      <span className="seconds">{padZeros(Math.max(0, Math.ceil((time % 60000) / 1000)))}</span>
    </div>
  </>)
}), (prevProps, nextProps) => {
  // TODO: is memo applicable here?
  const { onElapsed, ...prevRest } = prevProps
  const { onElapsed: _onElapsed, ...nextRest } = nextProps
  return _.isEqual(prevRest, nextRest)
})

const RemoteTimer = styled(RemoteTimerComponent)`
  font-family: "Roboto Slab", Arial;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: .25rem;

  & > span {
    &.minutes { text-align: right; }
    &.colon { text-align: center; padding: 2px; }
    &.seconds { text-align: left; }
  }
  &.danger {
    background: var(--bs-danger);
    color: #fff;
  }
`

RemoteTimer.displayName = "Timer"
export default RemoteTimer;
