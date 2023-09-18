
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import styled from "styled-components"


type BaseTimerProps = {
  onElapsed: () => any,
  className?: string,
  initialTime: number,
}
type RunningStateProps = {
  running: boolean,
  setRunning: (running: boolean) => any
}
type LocalTimerProps = BaseTimerProps & RunningStateProps
type RemoteTimerProps = BaseTimerProps & {
  initialTimestamp: number
} & Partial<RunningStateProps>
type TimerProps = BaseTimerProps & Partial<LocalTimerProps & RemoteTimerProps>

// {!timerRunning && (<IconButton variant="secondary" onClick={() => { setTimerRunning(true) }}><FaPlay /></IconButton>)}
// {timerRunning && (<IconButton variant="secondary" onClick={() => { setTimerRunning(false) }}><FaPause /></IconButton>)}

const TimerComponent = forwardRef(({
  initialTime,
  running,
  setRunning,
  initialTimestamp,
  onElapsed,
  className
}: TimerProps, ref) => {
  const [time, setTime] = useState<number>(initialTime)
  const [intervalHandle, setIntervalHandle] = useState<NodeJS.Timeout | null>(null)
  const timeStep = 200
  const dangerThreshold = 5000
  const isRemote = initialTimestamp !== undefined
  const updateTimer = isRemote
    ? () => initialTime - (Date.now() - initialTimestamp)
    : (t: number) => t - timeStep

  if (running === undefined || setRunning === undefined) {
    // if the running state is not provided from outside, initialize it internally (remote mode, running always true)
    [running, setRunning] = useState<boolean>(true)
  }

  // Methods offered to parent component
  useImperativeHandle(ref, () => ({
    reset() {
      reset()
    },
    start() {
      start()
    }
  }))
  
  const reset = () => {
    console.log("Timer: reset")
    if (isRemote) {
      // an actual reset can only be performed by changing the initial timestamp
      // in the remote setting, reset just sets running := false.
      // setTime(t => {
      //   const t1 = updateTimer(t)
      //   console.log(`Reset timer to t = ${t1}`)
      //   return t1
      // })
    } else {
      setTime(initialTime)
    }
    if (setRunning) {
      setRunning(false)
    }
  }

  const clear = () => {
    if (intervalHandle) {
      // console.log("Timer: clearInterval");
      clearInterval(intervalHandle)
    }
  }
  
  useEffect(() => {
    if ((running || running === undefined) && time <= 0) {
      clear()
      if (setRunning) {
        setRunning(false)
      }
      onElapsed()
    }
  }, [time])

  const start = () => {
    if (intervalHandle) {
      clear()
    }
    // console.log("Timer: init")
    setIntervalHandle(setInterval(() => {
      setTime(t => updateTimer(t))
    }, timeStep))
  }

  useEffect(() => {
    console.log(`Timer: set ${running ? "" : "not "}running`);
    if (running) {
      start()
    } else {
      clear()
    }
    return () => {
      // console.log("Timer: finalize useEffect");
      clear()
    }
  }, [running])

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

const Timer = styled(TimerComponent)`
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

Timer.displayName = "Timer"
export default Timer;
