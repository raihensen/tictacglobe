
import { useAutoRefresh } from '@/src/util'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import styled from "styled-components"


type BaseTimerProps = {
  onElapsed: () => any,
  className?: string,
  initialTime: number,
}
type RemoteTimerProps = BaseTimerProps & {
  initialTimestamp: number
}

const RemoteTimerComponent = forwardRef(({
  initialTime,
  initialTimestamp,
  onElapsed,
  className
}: RemoteTimerProps, ref) => {
  
  const [time, setTime] = useState<number>(initialTime)
  const [running, setRunning] = useState<boolean>(true)
  
  const timeStep = 200
  const dangerThreshold = 5000

  // Methods offered to parent component
  useImperativeHandle(ref, () => ({
    restart() {
      // should be called to re-start the timer after updating initialTimestamp
      setRunning(true)
    },
    stop() {
      // stops timer updates, preventing elapsing
      setRunning(false)
    }
  }))

  const refresh = () => {
    if (running) {
      setTime(initialTime - (Date.now() - initialTimestamp))
      scheduleAutoRefresh()
    } else {
      clearAutoRefresh()
    }
  }

  const { scheduleAutoRefresh, clearAutoRefresh } = useAutoRefresh(() => {
    refresh()
  }, timeStep)

  useEffect(() => {
    // console.log(`Timer: running or initialTimestamp changed. running = ${running}, initialTimestamp = ${initialTimestamp}`)
    refresh()
    return () => {
      clearAutoRefresh()
    }
  }, [initialTimestamp, running])
  
  useEffect(() => {
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


/*

NS_ERROR_FILE_NOT_FOUND: 
Timer: set running Timer.tsx:110:12
Timer elapsed --- hasTurn = false game.tsx:320:30
API request: /api/game?userIdentifier=debug&action=5 game.tsx:90:12
Timer: set not running Timer.tsx:110:12
turnStartTimestamp changed by a difference of 0 game.tsx:110:18
Timer: set running Timer.tsx:110:12
Timer elapsed --- hasTurn = false game.tsx:320:30
API request: /api/game?userIdentifier=debug&action=5 game.tsx:90:12
Timer: set not running Timer.tsx:110:12
turnStartTimestamp changed by a difference of 0 game.tsx:110:18
Timer: set running Timer.tsx:110:12
Timer elapsed --- hasTurn = false game.tsx:320:30
API request: /api/game?userIdentifier=debug&action=5 game.tsx:90:12
Timer: set not running Timer.tsx:110:12
turnStartTimestamp changed by a difference of 0 game.tsx:110:18
Timer: set running Timer.tsx:110:12
Timer elapsed --- hasTurn = false game.tsx:320:30
API request: /api/game?userIdentifier=debug&action=5 game.tsx:90:12
Timer: set not running Timer.tsx:110:12
turnStartTimestamp changed by a difference of 0 game.tsx:110:18
Timer: set running Timer.tsx:110:12
Timer elapsed --- hasTurn = false game.tsx:320:30
API request: /api/game?userIdentifier=debug&action=5 game.tsx:90:12
Timer: set not running Timer.tsx:110:12
turnStartTimestamp changed by a difference of 0 game.tsx:110:18
Timer: set running Timer.tsx:110:12
Timer elapsed --- hasTurn = false game.tsx:320:30
API request: /api/game?userIdentifier=debug&action=5 game.tsx:90:12
Timer: set not running Timer.tsx:110:12
turnStartTimestamp changed by a difference of 0 game.tsx:110:18
Timer: set running Timer.tsx:110:12
Timer elapsed --- hasTurn = false game.tsx:320:30
API request: /api/game?userIdentifier=debug&action=5 game.tsx:90:12
Timer: set not running Timer.tsx:110:12
turnStartTimestamp changed by a difference of 0 game.tsx:110:18
Timer: set running Timer.tsx:110:12
Timer elapsed --- hasTurn = false game.tsx:320:30
API request: /api/game?userIdentifier=debug&action=5 game.tsx:90:12
Timer: set not running Timer.tsx:110:12
turnStartTimestamp changed by a difference of 0 game.tsx:110:18
Timer: set running Timer.tsx:110:12
Timer elapsed --- hasTurn = false game.tsx:320:30
API request: /api/game?userIdentifier=debug&action=5 game.tsx:90:12
Timer: set not running Timer.tsx:110:12
turnStartTimestamp changed by a difference of 0 game.tsx:110:18
Timer: set running Timer.tsx:110:12
Timer elapsed --- hasTurn = false game.tsx:320:30
API request: /api/game?userIdentifier=debug&action=5 game.tsx:90:12
Timer: set not running Timer.tsx:110:12
turnStartTimestamp changed by a difference of 0 game.tsx:110:18
Timer: set running Timer.tsx:110:12
Timer elapsed --- hasTurn = false game.tsx:320:30
API request: /api/game?userIdentifier=debug&action=5 game.tsx:90:12
Timer: set not running Timer.tsx:110:12
turnStartTimestamp changed by a difference of 0 game.tsx:110:18
Timer: set running Timer.tsx:110:12
Timer elapsed --- hasTurn = false game.tsx:320:30
API request: /api/game?userIdentifier=debug&action=5 game.tsx:90:12

Timer: set not running Timer.tsx:110:12
turnStartTimestamp changed by a difference of 0 game.tsx:110:18
Timer: set running Timer.tsx:110:12
Timer elapsed --- hasTurn = false game.tsx:320:30
API request: /api/game?userIdentifier=debug&action=5 game.tsx:90:12


*/
