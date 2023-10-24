
import { confirm } from 'react-bootstrap-confirmation';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next'

import { Settings, defaultSettings, Game, Country, RequestAction, FrontendQuery, PlayingMode, GameState, Language, SessionWithoutGames, defaultLanguage, PlayerIndex, autoRefreshInterval, Query, settingsToQuery, settingsChanged, getApiUrl } from "@/src/game.types"
import { capitalize, readReadme, useAutoRefresh } from "@/src/util"
import _ from "lodash";

import { FaBars, FaCircleInfo, FaEllipsis, FaGear, FaMoon, FaXmark } from "react-icons/fa6";
import { useRouter } from "next/router";
import { LanguageSelector, changeLanguage } from "@/components/Settings";
import { ButtonToolbar, IconButton, HeaderStyle } from "@/components/styles";
import Image from "next/image";
import Link from "next/link";
import ShareButton, { ShareButtonProps } from "@/components/Share";


const Header: React.FC<{
  isGame: boolean,
  game?: Game | null,
  darkMode: boolean,
  toggleDarkMode: () => void,
  triggerShowGameInformation: () => void,
  triggerShowSettings: () => void,
  shareButtonProps: ShareButtonProps,
  hasTurn: boolean,
  apiRequest: (query: FrontendQuery) => any,
}> = ({ isGame, game, darkMode, toggleDarkMode, triggerShowGameInformation, triggerShowSettings, shareButtonProps, hasTurn, apiRequest }) => {
  const { t, i18n } = useTranslation("common")
  const router = useRouter()

  const [ expanded, setExpanded ] = useState<boolean>(false)

  return (
    <HeaderStyle>
      <Image
        className="logo cursor-pointer"
        src={`/tictacglobe-logo${darkMode ? "-white" : ""}.svg`}
        width={80}
        height={80}
        alt={"TicTacGlobe logo"}
        onClick={async () => {
          if (!game || await confirm(t("leaveSession.confirm.question"), {
            title: t("leaveSession.confirm.title"),
            okText: t("leaveSession.action"),
            cancelText: t("cancel")
          })) {
            router.push("/")
          }
        }}
      />
      {isGame && (<>
        <ButtonToolbar>
          <ButtonToolbar className={expanded ? "d-flex" : "d-none d-md-flex"}>
            <ShareButton {...shareButtonProps} tooltipPlacement='bottom' />
            <IconButton variant="secondary" onClick={triggerShowGameInformation}><FaCircleInfo /></IconButton>
            <IconButton variant="secondary" onClick={toggleDarkMode}><FaMoon /></IconButton>
            <LanguageSelector value={router.locale ?? defaultLanguage} disabled={!hasTurn} onChange={async (oldLanguage, newLanguage) => {
              if (await confirm(t("changeLanguage.confirm.question"), {
                title: t("changeLanguage.confirm.title"),
                okText: t("newGame"),
                cancelText: t("cancel")
              })) {
                apiRequest({ action: RequestAction.NewGame, language: newLanguage as Language })  // TODO if language change does not work, have to pass newLanguage here
                return true
              } else {
                // undo change
                changeLanguage(router, i18n, oldLanguage)
                return false
              }
            }} />
            <IconButton variant="secondary" disabled={!hasTurn || !game} onClick={triggerShowSettings}><FaGear /></IconButton>

          </ButtonToolbar>
          <IconButton className="d-md-none" variant={expanded ? "secondary" : "outline-secondary"}>
            {!expanded && <FaBars onClick={() => setExpanded(expanded => !expanded)} />}
            {expanded && <FaXmark onClick={() => setExpanded(expanded => !expanded)} />}
          </IconButton>
        </ButtonToolbar>
      </>)}
    </HeaderStyle>
  )
}

export default Header;

