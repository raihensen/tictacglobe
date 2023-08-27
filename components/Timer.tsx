
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import styled from "styled-components"


type TimerProps = {
  initialTime: number,
  running: boolean,
  setRunning: (running: boolean) => any,
  onElapsed: () => any,
  className?: string | undefined,
}

const TimerComponent = forwardRef(({
  initialTime,
  running,
  setRunning,
  onElapsed,
  className
}: TimerProps, ref) => {
  const [time, setTime] = useState(initialTime)
  const [intervalHandle, setIntervalHandle] = useState<NodeJS.Timeout | null>(null)
  const timeStep = 200
  const dangerThreshold = 5000

  // Methods offered to parent component
  useImperativeHandle(ref, () => ({
    reset() {
      // console.log("Timer: reset")
      setTime(initialTime)
      setRunning(false)
    }
  }))

  const clear = () => {
    if (intervalHandle) {
      // console.log("Timer: clearInterval");
      clearInterval(intervalHandle)
    }
  }
  
  useEffect(() => {
    if (time <= 0) {
      clear()
      setRunning(false)
      onElapsed()
    }
  }, [time])

  const start = () => {
    if (intervalHandle) {
      clear()
    }
    // console.log("Timer: init")
    setIntervalHandle(setInterval(() => {
      setTime((t) => t - timeStep)
    }, timeStep))
  }

  useEffect(() => {
    // console.log(`Timer: set ${running ? "" : "not "}running`);
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

  const padZeros = (t: number) => t.toString().padStart(2, "0")
  return (<>
    <div className={`timer${time <= dangerThreshold ? " danger" : ""} ${className ? className : ""}`}>
      <span className="minutes">{padZeros(Math.max(0, Math.floor(time / 60000)))}</span>
      <span className="colon">:</span>
      <span className="seconds">{padZeros(Math.max(0, Math.ceil((time % 60000) / 1000)))}</span>
    </div>
  </>)
})

export const Timer = styled(TimerComponent)`
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

}`

