
import Container from "react-bootstrap/Container";
import Head from 'next/head';
import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { useDarkMode } from "@/src/util";
var _ = require('lodash');


type LayoutProps = {
  darkMode: boolean;
  children: ReactNode;
}


function Layout({ darkMode, children }: LayoutProps) {
  return (<>
    <Head>
      <title>TicTacGlobe</title>
    </Head>
    <Container style={{ maxWidth: "720px" }}>
      <div className="my-3">
        <Image src={`tictacglobe-logo${darkMode ? "-white" : ""}.svg`} width={80} height={80} alt={"TicTacGlobe logo"} />
      </div>
      {children}
    </Container>
  </>)
}

export default Layout;
