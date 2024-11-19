"use client"

import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useSearchParams } from 'next/navigation';
import { NextRouter, useRouter } from "next/router";
import { useEffect, useRef, useState } from 'react';

import { PlayerColor, playerColors, RequestAction, autoRefreshInterval, defaultLanguage } from "@/src/game.types";
import { readReadme, setLocalStorage, useAutoRefresh } from "@/src/util";
import type { GetServerSideProps } from 'next';
import { PageProps } from "./_app";
var fs = require('fs').promises;

import { MarkdownModal } from "@/components/MarkdownModal";
import ShareButton, { DonationModal, ShareButtonProps } from "@/components/Share";
import { ButtonToolbar, IconButton } from "@/components/styles";
import { Session } from "@/src/db.types";
import { useTtgStore } from "@/src/zustand";
import { PlayingMode, User } from "@prisma/client";
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from "react-bootstrap/Button";
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { FaCircleInfo } from "react-icons/fa6";
import { randomChoice } from '@/src/util';

export type ApiResponse = {
  session: Session
  user?: User
} | {
  error: string
}

enum PageState {
  Init = 0,
  WaitingForRandomOpponent = 1,
  WaitingForFriend = 2,
  EnterCode = 3,
}

const IndexPage: React.FC<PageProps & IndexPageProps> = ({
  gameInformationMarkdown, isClient,
  hasError, setErrorMessage, isLoading, setLoadingText
}) => {
  const { t } = useTranslation("common")
  const router = useRouter()
  const searchParams = useSearchParams()

  const { user, setUser } = useTtgStore.useState.user()
  const { session, setSession } = useTtgStore.useState.session()

  const [state, setState] = useState<PageState>(PageState.Init)
  const [userColor, setUserColor] = useState<PlayerColor>(randomChoice(playerColors) as PlayerColor)

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
    // First client-side init
    setLoadingText(false)
  }, [])
  useEffect(() => {
    const invitationCode = searchParams?.get("invitationCode") ?? null
    if (invitationCode && !isWaiting) {
      console.log(`Trying to join session with invitation code ${invitationCode} ...`)
      submitEnterCode(invitationCode)
    }
  }, [searchParams])

  const { scheduleAutoRefresh, clearAutoRefresh } = useAutoRefresh((sessionId: number | null) => {
    apiRequest(async () => {
      if (!sessionId) return false
      return fetch(`/api/session/${sessionId}/refresh`, {
        method: "POST"
      })
    }, "RefreshSession")
  },
    autoRefreshInterval
  )

  async function apiRequest(
    exec: () => Promise<any>,
    action: RequestAction
  ) {
    if (isWaiting) {
      return false
    }

    clearAutoRefresh()

    if (action != "RefreshSession") {
      setIsWaiting(true)
    }

    const response = await exec()
    if (response === false) {
      return false
    }
    const data = await response.json() as ApiResponse

    // const newGame = data.game ? Game.fromApi(data.game) : null
    if ("error" in data) {
      setErrorMessage(data.error)
      return false
    }

    setErrorMessage(false)
    setIsWaiting(false)
    setSession(data.session)
    if (data.user) {
      setUser(data.user)
      setLocalStorage("tictacglobe:userId", data.user.id)
    }

    console.log("Session: " + JSON.stringify(data.session))

    // session is filled: forward to game page
    if (data.session.playingMode == PlayingMode.Offline || data.session.isFull) {
      goToGame(router)
      return true
    }

    if (action == "InitSessionRandom") {
      // session not filled yet, waiting for opponent
      setState(PageState.WaitingForRandomOpponent)
      scheduleAutoRefresh(data.session.id)
    }

    if (action == "InitSessionFriend") {
      if (!data.session.invitationCode) {
        setErrorMessage("Error loading or creating the session.")
        return false
      }
      setState(PageState.WaitingForFriend)
      scheduleAutoRefresh(data.session.id)
    }

    if (action == "RefreshSession") {
      scheduleAutoRefresh(data.session.id)
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
    router.push("/game")
  }

  const submitEnterCode = (invitationCode: string) => {
    if (isWaiting) {
      return false
    }
    if (!invitationCode.match(/^[^A-Z0-9]{4}$/)) {
      console.error(`Invalid invitation code format (${invitationCode})`)
      return false
    }
    apiRequest(
      () => {
        const formData = new FormData()
        formData.set("action", "JoinSession".toString())
        formData.set("color", userColor)
        return fetch(`/api/code/${invitationCode}/join`, {
          body: formData,
          method: "POST"
        })
        // TODO update frontend language after joining
      },
      "JoinSession"
    )
    return true
  }

  return (<>

    <h1>
      {!user && <>Welcome!</>}
      {!!user?.name && <>Welcome, {user.name}!</>}
      {(user && !user.name) && <>Welcome, <span className="text-muted small">{user.id}</span>!</>}
    </h1>

    {/* {isCustomUserIdentifier && (<p>User: {userIdentifier}</p>)} */}

    {state == PageState.Init && (<>
      <div style={{ display: "flex", flexDirection: "column", width: "250px", maxWidth: "90%", alignItems: "stretch" }}>
        <Button variant="danger" size="lg" className="mb-2" onClick={() => {
          apiRequest(
            () => {
              const formData = new FormData()
              formData.set("action", "InitSessionRandom".toString())
              formData.set("language", router.locale ?? defaultLanguage)
              formData.set("color", userColor)
              return fetch(`/api/session/create`, {
                body: formData,
                method: "POST"
              })
            },
            "InitSessionRandom"
          )
        }}>Search opponent</Button>
        <Button variant="warning" size="lg" className="mb-2" onClick={() => {
          apiRequest(
            () => {
              const formData = new FormData()
              formData.set("action", "InitSessionFriend".toString())
              formData.set("language", router.locale ?? defaultLanguage)
              formData.set("color", userColor)
              return fetch(`/api/session/create`, {
                body: formData,
                method: "POST"
              })
            },
            "InitSessionFriend"
          )
        }}>Invite a friend</Button>
        <Button variant="warning" size="lg" className="mb-2" onClick={() => {
          setState(PageState.EnterCode)
        }}>Enter code</Button>
        {/* <Button size="lg" className="mb-2">Online opponent</Button> */}
        <Button variant="primary" size="lg" className="mb-2" onClick={() => {
          apiRequest(
            () => {
              const formData = new FormData()
              formData.set("action", "InitSessionOffline".toString())
              formData.set("language", router.locale ?? defaultLanguage)
              formData.set("color", userColor)
              return fetch(`/api/session/create`, {
                body: formData,
                method: "POST"
              })
            },
            "InitSessionOffline"
          )
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
            <Form.Control size="lg" type="text" readOnly placeholder={session?.invitationCode ?? undefined} aria-describedby="btnGroupInvitationCode" />
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
