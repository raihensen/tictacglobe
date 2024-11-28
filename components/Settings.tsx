
import { capitalize } from '@/src/util';
import { useTranslation } from 'next-i18next';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useState } from 'react';
import { Button } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';

import { LanguageSelectorItem, LanguageSelectorToggle } from "@/components/styles";
import { ApiHandler, Game, Language, Settings, defaultLanguage } from "@/src/game.types";
import _ from "lodash";
import { NextRouter, useRouter } from "next/router";
import { Dropdown } from "react-bootstrap";
import { CircleFlag } from "react-circle-flags";
import { useTtgStore } from '@/src/zustand';


export function useSettings(defaultSettings: Settings): [Settings, (value: Settings) => void] {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  return [settings, setSettings]
}

// TODO Two settings objects/states: Active + Apply for next game
// const [nextGameSettings, setNextGameSettings] = useState<Settings>(defaultSettings)

type SettingsValues = { id: "settingsTimeLimit", value: number | false }
// | { id: "settingsLanguage", value: Language }

export const SettingsModal: React.FC<{
  settings: Settings
  setSettings: (value: Settings) => void
  show: boolean
  setShow: (value: boolean) => void
  apiRequest: ApiHandler
}> = ({ settings, setSettings, show, setShow, apiRequest }) => {
  const { t, i18n } = useTranslation()
  const session = useTtgStore.use.session()
  const user = useTtgStore.use.user()

  // const showSettings = () => setShowSettings(true)

  const updateSettings = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: SettingsValues }) => {
    if (!session || !user) return false
    const newSettings = assignSettings(settings, e)
    console.log(`New settings: ${newSettings}`)
    fetch(`/api/session/${session.id}/updateSettings`, {
      method: "POST",
      body: JSON.stringify({
        settings: newSettings,
        user: user.id,
      }),
    })
    // apiRequest(`/api/session/${session.id}/updateSettings`, { action: "UpdateSettings", settings: newSettings })
    // apiRequest(`api/session/${session.id}/updateSettings`, {
    //   action: "RefreshSession",
    //   settings: newSettings
    //   // ...settingsToQuery(newSettings)
    // })

    setSettings(newSettings)
  }

  const [timeLimitSliderValue, setTimeLimitSliderValue] = useState(settings.timeLimit !== false ? settings.timeLimit : defaultTimeLimitSliderValue)
  const [showTimeLimitSlider, setShowTimeLimitSlider] = useState<boolean>(settings.timeLimit !== false)

  return (
    <Modal show={show} onHide={() => setShow(false)}>
      <Modal.Header closeButton>
        <Modal.Title>{t("settings.settings")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Select onChange={updateSettings} defaultValue={settings.difficulty} id="settingsDifficulty" className="mb-3">
          {["easy", "medium", "hard"].map((level, i) => (
            <option value={level} key={i}>{t(`settings.difficultyLevel.${level}`)}</option>
          ))}
        </Form.Select>
        <Form.Check type="switch" onChange={updateSettings} checked={settings.showNumSolutions} id="settingsShowNumSolutions" label={t("settings.showNumSolutions")} />
        <Form.Check type="switch" onChange={updateSettings} checked={settings.showNumSolutionsHint} disabled={!settings.showNumSolutions} id="settingsShowNumSolutionsHint" label={t("settings.showNumSolutionsHint")} />

        <Form.Check type="switch" onChange={(e) => {
          updateSettings({ target: { id: "settingsTimeLimit", value: e.target.checked ? timeLimitSliderValue : false } })
          setShowTimeLimitSlider(e.target.checked)
        }} checked={settings.timeLimit !== false} id="settingsEnableTimeLimit" label={t("settings.enableTimeLimit")} />

        {(showTimeLimitSlider && settings.timeLimit !== false) && (<>
          <Form.Label className="mt-3">{t("settings.timeLimitValue", { timeLimit: formatTimeLimit(settings.timeLimit) })}</Form.Label>
          <div className="px-3">
            <Slider
              marks={Object.fromEntries(timeLimitValues.map(limit => [limit, formatTimeLimit(limit)]))}
              step={null}
              onChange={(v: number | number[]) => {
                const t = v as number
                setTimeLimitSliderValue(t)
                updateSettings({ target: { id: "settingsTimeLimit", value: t } })
              }}
              min={Math.min(...timeLimitValues)}
              max={Math.max(...timeLimitValues)}
              value={timeLimitSliderValue}
              railStyle={{ backgroundColor: 'var(--bs-gray-100)' }} // Customize the rail color
              trackStyle={{ backgroundColor: 'var(--bs-primary)' }} // Customize the track color
              handleStyle={{ backgroundColor: 'var(--bs-primary)', border: "none", opacity: 1 }} // Customize the handle color
              dotStyle={{ backgroundColor: 'var(--bs-gray-100)', border: "none", width: "12px", height: "12px", bottom: "-4px" }} // Customize the handle color
              activeDotStyle={{ border: "2px solid var(--bs-primary)" }} // Customize the handle color
              className="mb-5"
            />
          </div>
        </>)}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShow(false)}>{t("settings.close")}</Button>
      </Modal.Footer>
    </Modal>
  )
}


const timeLimitValues = [10, 20, 30, 45, 60, 90, 120]
const defaultTimeLimitSliderValue = 60

const formatTimeLimit = (t: number): string => {

  if (t <= 90) {
    return `${t} s`
  }
  const mins = Math.floor(t / 60)
  const secs = Math.floor(t % 60)
  if (secs == 0) {
    return `${mins} min`
  }
  return `${mins}:${secs}`
}


function assignSettings(settings: Settings, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: SettingsValues }): Settings {

  const newSettings = { ...settings } as Settings
  Object.entries(settings).forEach(([prop, value]) => {
    if (e.target.id == `settings${capitalize(prop)}`) {
      if (prop == "timeLimit") {
        newSettings.timeLimit = e.target.value as number | false
        return
      }
      if (prop == "difficulty") {
        newSettings.difficulty = e.target.value as "easy" | "medium" | "hard"
      }

      // boolean
      if ("checked" in e.target) {
        (newSettings as any)[prop as keyof Settings] = e.target.checked
      }
    }
  })

  if (!newSettings.showNumSolutions) {
    newSettings.showNumSolutionsHint = false
  }
  return newSettings

}

// --- Language Selector -----------------------------------------------

export function changeLanguage(router: NextRouter, i18n: any, language: Language | string | null) {
  language = language?.toString() || defaultLanguage
  console.log(`change language from ${router.locale} to ${language}`)
  i18n.changeLanguage(language)
  router.push(router.asPath, undefined, { locale: language })
}

type LanguageSelectorProps = {
  onChange: (oldLanguage: string | Language, language: string | Language) => Promise<boolean>;
  value?: Language | string;
  disabled?: boolean;
}

export const LanguageSelector = ({ onChange, value, disabled }: LanguageSelectorProps) => {
  const { t, i18n } = useTranslation()
  const router = useRouter()

  const languageToCountry = (languageCode: string) => {
    return _.get({
      "en": "gb"
    }, languageCode, languageCode) as string
  }
  value = value ?? (router.locale ?? defaultLanguage)

  return (
    <Dropdown onSelect={async (language) => {
      if (language == router.locale || language === null) {
        return
      }
      const oldLanguage = (router.locale ?? defaultLanguage)
      changeLanguage(router, i18n, language)
      onChange(oldLanguage, language)
    }}>
      <LanguageSelectorToggle variant="secondary" disabled={disabled}>
        <CircleFlag countryCode={languageToCountry(value)} height={18} title="" />
      </LanguageSelectorToggle>
      <Dropdown.Menu>
        {Object.values(Language).map((language, i) => (
          <LanguageSelectorItem key={i} eventKey={language}>
            <CircleFlag countryCode={languageToCountry(language)} height={18} title="" />
            <span>{language.toString().toUpperCase()}</span>
          </LanguageSelectorItem>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  )
}

