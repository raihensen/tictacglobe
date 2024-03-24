
import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next'

import { Settings, defaultSettings, Game, Country, RequestAction, FrontendQuery, PlayingMode, GameState, Language, SessionWithoutGames, defaultLanguage, PlayerIndex, autoRefreshInterval, Query, settingsToQuery, settingsChanged, getApiUrl, ApiHandler } from "@/src/game.types"
import { capitalize, readReadme, useAutoRefresh } from "@/src/util"
import _ from "lodash";

import { FaBars, FaCircleInfo, FaEllipsis, FaGear, FaMoon, FaXmark } from "react-icons/fa6";
import { useRouter } from "next/router";
import { LanguageSelector, changeLanguage } from "@/components/Settings";
import { ButtonToolbar, IconButton, HeaderStyle } from "@/components/styles";
import Image from "next/image";
import Link from "next/link";
import ShareButton, { ShareButtonProps } from "@/components/Share";
import { useConfirmation } from './common/Confirmation';


const Header: React.FC<{
  isGame: boolean,
  game?: Game | null,
  darkMode: boolean,
  toggleDarkMode: () => void,
  triggerShowGameInformation: () => void,
  triggerShowSettings: () => void,
  shareButtonProps: ShareButtonProps,
  isSessionAdmin: boolean,
  apiRequest: ApiHandler,
}> = ({ isGame, game, darkMode, toggleDarkMode, triggerShowGameInformation, triggerShowSettings, shareButtonProps, isSessionAdmin, apiRequest }) => {
  const { t, i18n } = useTranslation("common")
  const router = useRouter()
  const confirm = useConfirmation()

  const [ expanded, setExpanded ] = useState<boolean>(false)

  return (
    <HeaderStyle>
      <Image
        className="logo"
        role="button"
        src={`/tictacglobe-logo${darkMode ? "-white" : ""}.svg`}
        width={80}
        height={80}
        alt={"TicTacGlobe logo"}
        onClick={async () => {
          if (!game || await confirm(t("leaveSession.confirm.question"), {
            title: t("leaveSession.confirm.title"),
            confirmText: t("leaveSession.action"),
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
            <LanguageSelector value={router.locale ?? defaultLanguage} disabled={!isSessionAdmin} onChange={async (oldLanguage, newLanguage) => {
              if (await confirm(t("changeLanguage.confirm.question"), {
                title: t("changeLanguage.confirm.title"),
                confirmText: t("newGame"),
                cancelText: t("cancel")
              })) {
                apiRequest({ action: "NewGame", language: newLanguage as Language })  // TODO if language change does not work, have to pass newLanguage here
                return true
              } else {
                // undo change
                changeLanguage(router, i18n, oldLanguage)
                return false
              }
            }} />
            <IconButton variant="secondary" disabled={!isSessionAdmin || !game} onClick={triggerShowSettings}><FaGear /></IconButton>

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

