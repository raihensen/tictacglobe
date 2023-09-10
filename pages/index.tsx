
import Container from "react-bootstrap/Container";
import Head from 'next/head';
import Button from "react-bootstrap/Button";
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Alert from 'react-bootstrap/Alert';
import Form from 'react-bootstrap/Form';
import Dropdown from 'react-bootstrap/Dropdown';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import { confirm } from 'react-bootstrap-confirmation';

import 'bootstrap/dist/css/bootstrap.min.css';
import styled from "styled-components";
import { useEffect, useRef, useState } from 'react';
import { useTranslation, Trans } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

// TODO import translated country data
import { Game, Country, RequestAction, Query, PlayingMode, GameState, Language, FrontendQuery, SessionWithoutGames, GameSession } from "../src/game.types"
// import { countries } from "../src/game.types"
import { capitalize, useDarkMode } from "@/src/util"
var _ = require('lodash');

import styles from '@/pages/Game.module.css'
import Timer from "@/components/Timer";
import { Field } from "@/components/Field";
import { TableHeading, RowHeading, ColHeading } from '@/components/TableHeading';
import { FaArrowsRotate, FaEllipsis, FaGear, FaMoon, FaPause, FaPersonCircleXmark, FaPlay } from "react-icons/fa6";
import Image from "next/image";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import Link from "next/link";
import { useRouter } from "next/router";
import type { GetStaticProps, InferGetStaticPropsType } from 'next'
import { DropdownButton } from "react-bootstrap";
import { CircleFlag } from 'react-circle-flags';
import Layout from "@/components/Layout";
import { PageProps } from "./_app";

enum PageState {
  Init = 0,
  WaitingForFriend = 1,
  EnterCode = 2,
}

const StartPage = ({ darkMode, userIdentifier, errorMessage, setErrorMessage }: PageProps) => {

  const [state, setState] = useState<PageState>(PageState.Init)
  const [isClient, setIsClient] = useState<boolean>(false)

  const [session, setSession] = useState<SessionWithoutGames | null>()

  useEffect(() => {
    setIsClient(true)
    if (userIdentifier) {
      // First client-side init
      console.log(`First client-side init (StartPage) - userIdentifier ${userIdentifier}`)
    }
  }, [userIdentifier])

  function apiRequest(playingMode: PlayingMode, params: FrontendQuery) {
    if (!userIdentifier) {
      return false
    }

    // Fetch the game data from the server
    const query = {
      userIdentifier: userIdentifier,
      playingMode: playingMode,
      ...params
    }
    const action = params.action

    const search = Object.entries(query).filter(([key, val]) => val != undefined).map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join("&")
    const url = "/api/game?" + search
    console.log(`API request: ${url}`);

    fetch(url)
      .then(response => response.json())
      .then(data => {
        // const newGame = data.game ? Game.fromApi(data.game) : null
        const newSession = data.session ? data.session as SessionWithoutGames : null
        const error = data.error ? data.error as string : null

        if (error) {
          setErrorMessage(error)
          return false
        } else {
          setErrorMessage(false)
        }

        setSession(newSession)

        if (!newSession) {
          setErrorMessage("Error loading or creating the session.")
          return false
        }
        console.log("Session: " + JSON.stringify(newSession))

        if ((action == RequestAction.InitSessionFriend)) {
          if (!newSession.invitationCode) {
            setErrorMessage("Error loading or creating the session.")
            return false
          }
          setState(PageState.WaitingForFriend)
        }

        return true

      })
  }

  const invitationCodeInputRef = useRef<HTMLInputElement | null>(null)

  return (<>
    
    <h1>Welcome!</h1>

    {state == PageState.Init && (<>
      <div style={{ display: "flex", flexDirection: "column", width: "250px", maxWidth: "90%", alignItems: "stretch" }}>
        <Button size="lg" className="mb-2" onClick={() => {
          apiRequest(PlayingMode.Online, { action: RequestAction.InitSessionFriend })
        }}>Invite a friend</Button>
        <Button size="lg" className="mb-2" onClick={() => {
          setState(PageState.EnterCode)
        }}>Enter code</Button>
        {/* <Button size="lg" className="mb-2">Online opponent</Button> */}
        <Button size="lg" className="mb-2" variant="secondary">Same screen</Button>
      </div>
    </>)}

    {state == PageState.WaitingForFriend && (<>
      <div style={{ width: "250px", maxWidth: "90%" }}>
        <Form>
          <InputGroup>
            <Button size="lg" id="btnGroupInvitationCode" variant="secondary">Copy</Button>
            <Form.Control size="lg" type="text" readOnly placeholder={session?.invitationCode} aria-describedby="btnGroupInvitationCode" />
          </InputGroup>
          <Button size="lg" variant="primary">Copy link</Button>
          <Button size="lg" variant="secondary" onClick={() => {
            setState(PageState.Init)
          }}>Cancel</Button>
        </Form>
      </div>
    </>)}

    {state == PageState.EnterCode && (<>
      <div style={{ width: "250px", maxWidth: "90%" }}>
        <Form onSubmit={() => {
          apiRequest(
            PlayingMode.Online, {
              action: RequestAction.JoinSession,
              invitationCode: invitationCodeInputRef.current?.value || undefined
            }
          )
        }}>
          <Form.Control type="text" placeholder="Code" ref={invitationCodeInputRef} />
          <ButtonToolbar>
            <Button size="lg" type="submit" variant="primary">Join</Button>
            <Button size="lg" variant="secondary" onClick={() => {
              setState(PageState.Init)
            }}>Cancel</Button>
          </ButtonToolbar>
        </Form>
      </div>
    </>)}
    
  </>)

}

export default StartPage;
