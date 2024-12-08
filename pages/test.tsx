import RemoteTimer from "@/components/Timer";
import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { PageProps } from "./_app";


const timeLimit = 5

const TestPage: React.FC<PageProps> = ({
  isClient,
  darkMode, toggleDarkMode,
  hasError, errorMessage, setErrorMessage,
  isLoading, setLoadingText
}) => {

  const [turnStartTimestamp, setTurnStartTimeStamp] = useState<number>(Date.now())
  useEffect(() => {
    setLoadingText(false)
  })
  return (
    <div className="d-flex gap-3">
      <h1>Test Page</h1>
      <div>
        <h3>Own <code>RemoteTimer</code></h3>
        <div>
          <RemoteTimer
            // ref={timerRef}
            initialTimestamp={turnStartTimestamp}
            initialTime={timeLimit * 1000}
            // remainingTime={game.}
            onElapsed={() => {
              console.log("Time elapsed")
            }}
          />
          <Button variant="primary" onClick={() => {
            setTurnStartTimeStamp(Date.now())
          }}>New turn</Button>
        </div>
      </div>
      <div>
        <h3><code>react-countdown</code></h3>
        <div>
          <Button variant="primary" onClick={() => {
            setTurnStartTimeStamp(Date.now())
          }}>Reset</Button>
        </div>
      </div>
    </div>
  );
}

export default TestPage;
