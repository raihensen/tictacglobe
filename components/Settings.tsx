
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import { useEffect, useRef, useState } from 'react';
import { capitalize } from '@/src/util';
import { Button } from 'react-bootstrap';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useTranslation } from 'next-i18next';

import { NextRouter, useRouter } from "next/router";
import { Language, defaultLanguage } from "@/src/game.types";
import { Dropdown } from "react-bootstrap";
import { CircleFlag } from "react-circle-flags";
import styles from '@/pages/Game.module.css'
import styled from "styled-components";
var _ = require('lodash');


export type Settings = {
  difficulty: "easy" | "medium" | "hard";
  showIso: boolean;
  showNumSolutions: boolean;
  showNumSolutionsHint: boolean;
  timeLimit: number | false;
}
type BooleanSettingsKeys = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];


export function useSettings(defaultSettings: Settings): [Settings, (value: Settings) => void] {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  return [settings, setSettings]
}

// TODO Two settings objects/states: Active + Apply for next game
// const [nextGameSettings, setNextGameSettings] = useState<Settings>(defaultSettings)

type SettingsValues = { id: "settingsTimeLimit", value: number | false }
// | { id: "settingsLanguage", value: Language }


export type SettingsModalProps = {
  settings: Settings;
  setSettings: (value: Settings) => void;
  showSettings: boolean;
  setShowSettings: (value: boolean) => void;
}

export const SettingsModal = ({ settings, setSettings, showSettings, setShowSettings }: SettingsModalProps) => {
  const { t, i18n } = useTranslation()

  // const showSettings = () => setShowSettings(true)

  const updateSettings = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: SettingsValues}) => {
    
    const newSettings = assignSettings(settings, e)
    console.log(`New settings: ${JSON.stringify(newSettings)}`)
    setSettings(newSettings)
  }

  const [timeLimitSliderValue, setTimeLimitSliderValue] = useState(settings.timeLimit !== false ? settings.timeLimit : timeLimitDummyValue)

  return (
    <Modal show={showSettings} onHide={() => setShowSettings(false)}>
      <Modal.Header closeButton>
        <Modal.Title>{t("settings.settings")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Select onChange={updateSettings} defaultValue={settings.difficulty} id="settingsDifficulty" className="mb-3">
          {["easy", "medium", "hard"].map((level, i) => (
            <option value={level} key={i}>{t(`settings.difficultyLevel.${level}`)}</option>
          ))}
        </Form.Select>
        <Form.Check type="switch" onChange={updateSettings} checked={settings.showIso} id="settingsShowIso" label={t("settings.showIso")} />
        <Form.Check type="switch" onChange={updateSettings} checked={settings.showNumSolutions} id="settingsShowNumSolutions" label={t("settings.showNumSolutions")} />
        <Form.Check type="switch" onChange={updateSettings} checked={settings.showNumSolutionsHint} disabled={!settings.showNumSolutions} id="settingsShowNumSolutionsHint" label={t("settings.showNumSolutionsHint")} />
        <Form.Label className="mt-3">{t("settings.timeLimit", { timeLimit: settings.timeLimit !== false ? formatTimeLimit(settings.timeLimit) : t("settings.noLimit") })}</Form.Label>
        <div className="px-3">
          <Slider
            marks={Object.fromEntries([...timeLimitValues.map(t => [t, formatTimeLimit(t)]), [timeLimitDummyValue, t("settings.noLimit")]])}
            step={null}
            onChange={(v: number | number[]) => {
              const t = v as number
              setTimeLimitSliderValue(t)
              updateSettings({ target: { id: "settingsTimeLimit", value: t < timeLimitDummyValue ? t : false }})
            }}
            min={Math.min(...timeLimitValues)}
            max={timeLimitDummyValue}
            value={timeLimitSliderValue}
            railStyle={{ backgroundColor: 'var(--bs-gray-100)' }} // Customize the rail color
            trackStyle={{ backgroundColor: 'var(--bs-primary)' }} // Customize the track color
            handleStyle={{ backgroundColor: 'var(--bs-primary)', border: "none", opacity: 1 }} // Customize the handle color
            dotStyle={{ backgroundColor: 'var(--bs-gray-100)', border: "none", width: "12px", height: "12px", bottom: "-4px" }} // Customize the handle color
            activeDotStyle={{ border: "2px solid var(--bs-primary)" }} // Customize the handle color
            className="mb-5"
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowSettings(false)}>{t("settings.close")}</Button>
      </Modal.Footer>
    </Modal>
  )
}


const timeLimitValues = [10, 20, 30, 45, 60, 90, 120]
const timeLimitDummyValue = 150

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


function assignSettings(settings: Settings, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: SettingsValues}): Settings {
    
  const newSettings = {...settings} as Settings
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

export function changeLanguage(router: NextRouter, i18n: any, language: string | null) {
  language = language?.toString() || defaultLanguage
  i18n.changeLanguage(language)
  router.push(router.asPath, undefined, { locale: language })
}

type LanguageSelectorProps = {
  onChange: (oldLanguage: string | Language, language: string | Language) => Promise<boolean>;
}

export const LanguageSelector = ({ onChange }: LanguageSelectorProps) => {
  const { t, i18n } = useTranslation()
  const router = useRouter()

  const languageToCountry = (languageCode: string) => {
    return _.get({
      "en": "gb"
    }, languageCode, languageCode) as string
  }

  return (
    <Dropdown onSelect={async (language) => {
      if (language == router.locale || language === null) {
        return
      }
      const oldLanguage = (router.locale ?? defaultLanguage)
      changeLanguage(router, i18n, language)
      onChange(oldLanguage, language)
    }}>
      <Dropdown.Toggle variant="secondary" className={styles.languageSelector}>
        <CircleFlag countryCode={languageToCountry(router.locale ?? defaultLanguage)} height={18} />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {Object.values(Language).map((language, i) => (
          <Dropdown.Item key={i} eventKey={language} className={styles.languageSelectorItem}>
            <CircleFlag countryCode={languageToCountry(language)} height={18} />
            <span>{language.toString().toUpperCase()}</span>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  )
}

