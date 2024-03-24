
import _ from "lodash";
import { ReactNode } from "react";
import Container from "react-bootstrap/Container";
import { HeaderStyle, IconButton } from "@/components/styles"
import Alert from "react-bootstrap/Alert";
import Head from 'next/head';
import { Ripple, Spinner } from "@/components/common/Loading";
import styled from "styled-components";


type LayoutProps = {
  pageName: string;
  darkMode: boolean;
  hasError: boolean;
  errorMessage: string | false;
  isLoading: boolean;
  loadingText: string | false;
  children: ReactNode;
}

function Layout({ pageName, darkMode, hasError, errorMessage, isLoading, loadingText, children }: LayoutProps) {
  const isGame = pageName == "Game"

  return (<>
    <Head>
      <title>TicTacGlobe</title>
    </Head>
    <Container style={{ maxWidth: "720px" }}>
      {children}
    </Container>
    {(isLoading && loadingText) && (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Ripple size={150} duration={1.2} />
        <p style={{ fontSize: "200%", marginTop: "1rem", color: "#fff", transform: "scale(1)" }}>
          <span>{loadingText}</span>
          {!loadingText.endsWith("...") && <span className="ps-1 position-absolute">...</span>}
        </p>
      </div>
    )}
  </>)
}

export default Layout;