
import Container from "react-bootstrap/Container";
import Head from 'next/head';
import Button from "react-bootstrap/Button";
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Alert from 'react-bootstrap/Alert';
import Form from 'react-bootstrap/Form';
import Dropdown from 'react-bootstrap/Dropdown';
import Modal from 'react-bootstrap/Modal';
import { confirm } from 'react-bootstrap-confirmation';

import 'bootstrap/dist/css/bootstrap.min.css';
import styled from "styled-components";
import { useEffect, useRef, useState } from 'react';
import { useTranslation, Trans } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

// TODO import translated country data
import { Game, Country, RequestAction, Query, PlayingMode, GameState, Language } from "../src/game.types"
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


const StartPage = ({ darkMode, ...props }: PageProps) => {

  return (<>
    
    <h1>Hi</h1>
    
  </>)

}

export default StartPage;
