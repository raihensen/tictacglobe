
import Container from "react-bootstrap/Container";
import Head from 'next/head';
import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import Alert from "react-bootstrap/Alert";
import Spinner from "@/components/Loading";
import _ from "lodash";


type LayoutProps = {
  darkMode: boolean;
  hasError: boolean;
  errorMessage: string | false;
  isLoading: boolean;
  loadingText: string | false;
  children: ReactNode;
}


function Layout({ darkMode, hasError, errorMessage, isLoading, loadingText, children }: LayoutProps) {
  return (<>
    <Head>
      <title>TicTacGlobe</title>
    </Head>
    <Container style={{ maxWidth: "720px" }}>
      <div className="my-3">
        <Image src={`/tictacglobe-logo${darkMode ? "-white" : ""}.svg`} width={80} height={80} alt={"TicTacGlobe logo"} />
      </div>
      {errorMessage && <Alert variant="danger">Error: {errorMessage}</Alert>}
      {children}
    </Container>
    {(isLoading && loadingText) && (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Spinner variant="ripple" size={150} duration={1.2} style={{ marginBottom: "2rem" }} />
        <p style={{ fontSize: "200%", color: "#fff" }}>{loadingText + (loadingText.endsWith("...") ? "" : " ...")}</p>
      </div>
    )}
  </>)
}

export default Layout;

