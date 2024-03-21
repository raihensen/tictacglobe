

import { NextRouter, useRouter } from "next/router";
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { RequestAction, PlayingMode, FrontendQuery, SessionWithoutGames, autoRefreshInterval, getApiUrl, defaultLanguage } from "@/src/game.types"
import { readReadme, useAutoRefresh } from "@/src/util"
import type { GetServerSideProps } from 'next'
import { PageProps } from "./_app";
import _ from "lodash";
var fs = require('fs').promises;

import 'bootstrap/dist/css/bootstrap.min.css';
import styled from "styled-components";
import { FaCircleInfo } from "react-icons/fa6";
import { MarkdownModal } from "@/components/MarkdownModal";
import Button from "react-bootstrap/Button";
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { ButtonToolbar, IconButton } from "@/components/styles";
import ShareButton, { DonationModal, ShareButtonProps } from "@/components/Share";

enum PageState {
  Init = 0,
  WaitingForRandomOpponent = 1,
  WaitingForFriend = 2,
  EnterCode = 3,
}

const IndexPage: React.FC<PageProps & IndexPageProps> = ({ gameInformationMarkdown, isClient, userIdentifier, isCustomUserIdentifier, hasError, setErrorMessage, isLoading, setLoadingText }) => {
  const { t } = useTranslation("common")
  const router = useRouter()
  const [state, setState] = useState<PageState>(PageState.Init)

  const [session, setSession] = useState<SessionWithoutGames | null>()
  const searchParams = useSearchParams()

  const [showGameInformation, setShowGameInformation] = useState<boolean>(false)
  const [showDonationModal, setShowDonationModal] = useState<boolean>(false)
  const shareButtonProps: ShareButtonProps = {
    title: "TicTacGlobe",
    text: "Play TicTacGlobe, it's awesome!",
    onShare: () => setShowDonationModal(true)
  }

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
      // TODO db route
      apiRequest(PlayingMode.Online, { action: RequestAction.RefreshSession })
    },
    autoRefreshInterval
  )

  async function apiRequest(playingMode: PlayingMode, params: FrontendQuery) {
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

    const data = await fetch(url).then(response => response.json())

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
    invitationCode = invitationCode.replaceAll(/[^A-Z0-9]/g, "")
    if (invitationCode.length != 4) {
      return false
    }
    apiRequest(
      PlayingMode.Online, {
        action: RequestAction.JoinSession,
        invitationCode: invitationCode
      }
    )
    const formData = new FormData()
    formData.set("action", RequestAction.JoinSession.toString())
    fetch(`api/code/${invitationCode}/join`, {
      body: formData,
      method: "POST"
    })
    return true
  }

  return (<>
    
    <h1>Welcome!</h1>

    {isCustomUserIdentifier && (<p>User: {userIdentifier}</p>)}

    {state == PageState.Init && (<>
      <div style={{ display: "flex", flexDirection: "column", width: "250px", maxWidth: "90%", alignItems: "stretch" }}>
        <Button variant="danger" size="lg" className="mb-2" onClick={() => {
          apiRequest(PlayingMode.Online, { action: RequestAction.InitSessionRandom })
          // TODO
          const formData = new FormData()
          formData.set("action", RequestAction.InitSessionRandom.toString())
          fetch(`api/session/create`, {
            body: formData,
            method: "POST"
          })
        }}>Search opponent</Button>
        <Button variant="warning" size="lg" className="mb-2" onClick={() => {
          apiRequest(PlayingMode.Online, { action: RequestAction.InitSessionFriend })
          const formData = new FormData()
          formData.set("action", RequestAction.InitSessionFriend.toString())
          fetch(`api/session/create`, {
            body: formData,
            method: "POST"
          })
        }}>Invite a friend</Button>
        <Button variant="warning" size="lg" className="mb-2" onClick={() => {
          setState(PageState.EnterCode)
        }}>Enter code</Button>
        {/* <Button size="lg" className="mb-2">Online opponent</Button> */}
        <Button variant="primary" size="lg" className="mb-2" onClick={() => {
          apiRequest(PlayingMode.Offline, { action: RequestAction.InitSessionOffline })
          const formData = new FormData()
          formData.set("action", RequestAction.InitSessionOffline.toString())
          fetch(`api/session/create`, {
            body: formData,
            method: "POST"
          })
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

    <ButtonToolbar>
      <IconButton variant="secondary" label="Game information" labelProps={{ className: "d-none d-sm-block" }} onClick={() => setShowGameInformation(true)}>
        <FaCircleInfo />
      </IconButton>
      <ShareButton {...shareButtonProps} tooltipPlacement="top" />
    </ButtonToolbar>
    <MarkdownModal show={showGameInformation} setShow={setShowGameInformation}>
      {gameInformationMarkdown}
    </MarkdownModal>
    
    <DonationModal show={showDonationModal} setShow={setShowDonationModal} href={process.env.NEXT_PUBLIC_PAYPAL_DONATE_LINK as string} />

    
  </>)

}

export default IndexPage;

export type IndexPageProps = {
  gameInformationMarkdown: string
}

export const getServerSideProps: GetServerSideProps<IndexPageProps> = (async ({ locale }) => {
  return {
    props: {
      gameInformationMarkdown: await readReadme(locale, file => fs.readFile(file, { encoding: "utf8" })),
      ...(await serverSideTranslations(locale ?? defaultLanguage, ['common']))
    }
  }
})
