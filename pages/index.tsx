
import Button from "react-bootstrap/Button";
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Alert from 'react-bootstrap/Alert';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { confirm } from 'react-bootstrap-confirmation';

import 'bootstrap/dist/css/bootstrap.min.css';
import styled from "styled-components";
import { useEffect, useRef, useState } from 'react';
import { useTranslation, Trans } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

// TODO import translated country data
import { Game, Country, RequestAction, Query, PlayingMode, GameState, Language, FrontendQuery, SessionWithoutGames, GameSession, autoRefreshInterval, getApiUrl } from "../src/game.types"
// import { countries } from "../src/game.types"
import { capitalize, useAutoRefresh, useDarkMode } from "@/src/util"
import _ from "lodash";

import styles from '@/pages/Game.module.css'
import Image from "next/image";
import Link from "next/link";
import { NextRouter, useRouter } from "next/router";
import { useSearchParams } from 'next/navigation';
import type { GetServerSideProps, GetStaticProps, InferGetStaticPropsType } from 'next'
import { PageProps } from "./_app";
import Modal from "react-bootstrap/Modal";
import ReactMarkdown from "react-markdown";
import path from "path";
import { SearchHeartFill } from "react-bootstrap-icons";
import { CustomModal, IconButton } from "@/components/styles";
import { FaCircleInfo, FaInfo } from "react-icons/fa6";
var fs = require('fs/promises');

enum PageState {
  Init = 0,
  WaitingForRandomOpponent = 1,
  WaitingForFriend = 2,
  EnterCode = 3,
}

export type IndexPageProps = {
  gameInformationMarkdown: string
}

export const getServerSideProps: GetServerSideProps<IndexPageProps> = (async () => {
  const markdown = await fs.readFile(path.join(process.cwd(), "README.md"), { encoding: "utf8" })
  // console.log(JSON.stringify(markdown))
  // console.log(`Read readme: ${markdown.substring(0, 50)} [...]`)

  return {
    props: {
      gameInformationMarkdown: markdown
    }
  }
})

const StartPage = ({ gameInformationMarkdown, isClient, userIdentifier, isCustomUserIdentifier, hasError, setErrorMessage, isLoading, setLoadingText }: PageProps & IndexPageProps) => {
  const { t } = useTranslation("common")
  const router = useRouter()
  const [state, setState] = useState<PageState>(PageState.Init)

  const [session, setSession] = useState<SessionWithoutGames | null>()
  const searchParams = useSearchParams()

  const [showGameInformation, setShowGameInformation] = useState<boolean>(false)

  const [isWaiting, setIsWaiting] = useState<boolean>(false)
  useEffect(() => {
    setLoadingText(isWaiting ? "Loading" : false)
  }, [isWaiting])

  useEffect(() => {
    setLoadingText(false)
    // if (userIdentifier) {
    //   // First client-side init
    //   console.log(`First client-side init (StartPage) - userIdentifier ${userIdentifier}`)
    // }
  }, [userIdentifier])
  useEffect(() => {
    const invitationCode = searchParams?.get("invitationCode") ?? null
    if (invitationCode && userIdentifier && !isWaiting) {
      console.log(`Trying to join session with invitation code ${invitationCode} ...`)
      submitEnterCode(invitationCode)
    }
  }, [userIdentifier, searchParams])

  const { scheduleAutoRefresh, clearAutoRefresh } = useAutoRefresh(() => {
    apiRequest(PlayingMode.Online, { action: RequestAction.RefreshSession }) },
    autoRefreshInterval
  )

  function apiRequest(playingMode: PlayingMode, params: FrontendQuery) {
    const action = params.action
    if (!userIdentifier) {
      return false
    }
    if (isWaiting) {
      return false
    }

    clearAutoRefresh()


    if (action != RequestAction.RefreshSession) {
      setIsWaiting(true)
    }
    const url = getApiUrl({
      userIdentifier: userIdentifier,
      playingMode: playingMode,
      ...params
    })
    console.log(`API request: ${url}`)

    fetch(url)
      .then(response => response.json())
      .then(data => {

        // const newGame = data.game ? Game.fromApi(data.game) : null
        const newSession = data.session ? data.session as SessionWithoutGames : null
        const error = data.error ? data.error as string : null

        setIsWaiting(false)
        setSession(newSession)

        if (error) {
          setErrorMessage(error)
          return false
        } else {
          setErrorMessage(false)
        }

        if (!newSession) {
          setErrorMessage("Error loading or creating the session.")
          return false
        }
        console.log("Session: " + JSON.stringify(newSession))

        // session is filled: forward to game page
        if (playingMode == PlayingMode.Offline || newSession.users.length == 2) {
          goToGame(router)
          return true
        }

        if (action == RequestAction.InitSessionRandom) {
          // session not filled yet, waiting for opponent
          setState(PageState.WaitingForRandomOpponent)
          scheduleAutoRefresh()
        }

        if (action == RequestAction.InitSessionFriend) {
          if (!newSession.invitationCode) {
            setErrorMessage("Error loading or creating the session.")
            return false
          }
          setState(PageState.WaitingForFriend)
          scheduleAutoRefresh()
        }
        
        if (action == RequestAction.RefreshSession) {
          scheduleAutoRefresh()
        }

        return true

      })
  }

  const invitationCodeInputRef = useRef<HTMLInputElement | null>(null)
  const [invitationCodeInputInitialized, setInvitationCodeInputInitialized] = useState(false)
  const [invitationCodeInputValue, setInvitationCodeInputValue] = useState<string>("")

  useEffect(() => {
    if (invitationCodeInputRef.current && !invitationCodeInputInitialized) {
      invitationCodeInputRef.current.focus()
      setInvitationCodeInputInitialized(true)
    }
  })

  const goToGame = (router: NextRouter) => {
    router.push(getGameUrl())
  }

  const getGameUrl = (absolute: boolean = false) => {
    let url = ""
    if (absolute) {
      url = isClient && window.location.origin ? window.location.origin : ""
    }
    return url + `/game/${isCustomUserIdentifier ? `?user=${userIdentifier}` : ""}`
  }

  const submitEnterCode = (invitationCode: string) => {
    if (isWaiting) {
      return false
    }
    if (invitationCode.length != 4) {
      return false
    }
    apiRequest(
      PlayingMode.Online, {
        action: RequestAction.JoinSession,
        invitationCode: invitationCode
      }
    )
    return true
  }

  return (<>
    
    <h1>Welcome!</h1>

    {isCustomUserIdentifier && (<p>User: {userIdentifier}</p>)}

    {state == PageState.Init && (<>
      <div style={{ display: "flex", flexDirection: "column", width: "250px", maxWidth: "90%", alignItems: "stretch" }}>
        <Button variant="danger" size="lg" className="mb-2" onClick={() => {
          apiRequest(PlayingMode.Online, { action: RequestAction.InitSessionRandom })
        }}>Search opponent</Button>
        <Button variant="warning" size="lg" className="mb-2" onClick={() => {
          apiRequest(PlayingMode.Online, { action: RequestAction.InitSessionFriend })
        }}>Invite a friend</Button>
        <Button variant="warning" size="lg" className="mb-2" onClick={() => {
          setState(PageState.EnterCode)
        }}>Enter code</Button>
        {/* <Button size="lg" className="mb-2">Online opponent</Button> */}
        <Button variant="primary" size="lg" className="mb-2" onClick={() => {
          apiRequest(PlayingMode.Offline, { action: RequestAction.InitSessionOffline })
        }}>Same screen</Button>
      </div>
    </>)}

    {state == PageState.WaitingForRandomOpponent && (<>
      <h3>Waiting for opponent...</h3>
    </>)}

    {state == PageState.WaitingForFriend && (<>
      <div style={{ width: "250px", maxWidth: "90%" }}>
        <p>Send this code or the link to your friend to invite them.</p>
        <Form>
          <InputGroup>
            <Button size="lg" id="btnGroupInvitationCode" variant="secondary" onClick={() => {
              navigator.clipboard.writeText(session?.invitationCode || "")
            }}>Copy</Button>
            <Form.Control size="lg" type="text" readOnly placeholder={session?.invitationCode} aria-describedby="btnGroupInvitationCode" />
          </InputGroup>
          <Button size="lg" variant="primary" onClick={() => {
            const origin = isClient && window.location.origin ? window.location.origin : ""
            const url = origin + `?invitationCode=${session?.invitationCode}`
            navigator.clipboard.writeText(url)
          }}>Copy link</Button>
          <Button size="lg" variant="secondary" onClick={() => {
            setState(PageState.Init)
          }}>Cancel</Button>
        </Form>
      </div>
    </>)}

    {state == PageState.EnterCode && (<>
      <div style={{ width: "250px", maxWidth: "90%" }}>
        <Form onSubmit={e => {
          e.preventDefault()
          submitEnterCode(invitationCodeInputValue)
          return false
        }}>
          <Form.Control type="text" placeholder="Code" ref={invitationCodeInputRef} value={invitationCodeInputValue} onChange={e => {
            const value = e.target.value.toUpperCase()
            setInvitationCodeInputValue(value)
            if (value.length == 4) {
              submitEnterCode(value)
            }
          }} />
          <ButtonToolbar>
            <Button size="lg" type="submit" variant="primary" disabled={isWaiting}>Join</Button>
            <Button size="lg" variant="secondary" onClick={() => {
              setState(PageState.Init)
            }}>Cancel</Button>
          </ButtonToolbar>
        </Form>
      </div>
    </>)}

    <p>
      <IconButton variant="secondary" onClick={() => setShowGameInformation(true)}>
        <FaCircleInfo />
        <span>Game information</span>
      </IconButton>
    </p>

    {/* https://stackoverflow.com/questions/66941072/how-to-parse-embeddable-links-from-markdown-and-render-custom-react-components */}
    <CustomModal dialogClassName="modal-dialog-large" show={showGameInformation} fullscreen="sm-down" onHide={() => setShowGameInformation(false)}>
      <Modal.Header closeButton>
        <Modal.Title>{t("info.title")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ReactMarkdown remarkPlugins={[]} components={{
          a: ({ className, ...props}) => {
              return (<a className={["markdownCustomLink", className].join(" ")} {...props}>{props.children}</a>)
          }
        }}>
          {gameInformationMarkdown}
        </ReactMarkdown>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowGameInformation(false)}>{t("info.close")}</Button>
      </Modal.Footer>
    </CustomModal>
    
    
  </>)

}

export default StartPage;
