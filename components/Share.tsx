
import { useTranslation } from "next-i18next";
import { Dispatch, SetStateAction, forwardRef, useEffect, useId, useRef, useState } from "react";
import { Modal, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Placement } from "react-bootstrap/types";
import { FaArrowUpFromBracket, FaPaypal } from "react-icons/fa6";
import styled from "styled-components";
import donationModalHeroBackgroundImage from "../public/world-map-hero-bg.jpg";
import { IconButton } from "./styles";

const IconButtonWithRef = forwardRef<HTMLButtonElement, React.ComponentProps<typeof IconButton>>(({ children, ...props }, ref) => (
  <IconButton ref={ref} {...props}>
    {children}
  </IconButton>
))
// : React.FC<React.ComponentProps<typeof IconButton> & { ref: any }>

export type ShareButtonProps = ShareData & {
  onShare?: () => void,
  tooltipPlacement?: Placement
}

export const ShareButton: React.FC<ShareButtonProps> = ({ onShare, tooltipPlacement, ...props }) => {
  // const router = useRouter()
  const { t } = useTranslation("common")

  const [showClipboardInfo, setShowClipboardInfo] = useState<boolean>(false)
  const [showClipboardInfoTimeout, setShowClipboardInfoTimeout] = useState<NodeJS.Timeout>()
  const target = useRef(null)
  const tooltipId = useId()

  const [data, setData] = useState<ShareData>({...props})

  tooltipPlacement ??= "top"

  useEffect(() => {
    // client-side only
    console.log(`Window changed, ${window.location.href}`)
    if (!data.url) {
      setData(({url, ...rest}) => ({ url: window.location.href, ...rest }))
    }
  }, [])

  const shareViaClipboard = () => {

    navigator.clipboard.writeText(t("info.shareText", { url: data.url}))

    if (showClipboardInfoTimeout) {
      clearTimeout(showClipboardInfoTimeout)
    }
    setShowClipboardInfo(true)
    setShowClipboardInfoTimeout(setTimeout(() => {
      setShowClipboardInfo(false)
    }, 5000))
    return true

  }

  const share = async () => {
    if (!navigator.share) {
      return shareViaClipboard()
    }
    try {
      await navigator.share(data)
      console.log('Successful share')
      return true
    } catch (error) {
      console.log('Error sharing:', error)
    }
    return shareViaClipboard()
  }

  return (<>
    <OverlayTrigger delay={250} trigger={[]} show={showClipboardInfo} placement={tooltipPlacement} overlay={
      <Tooltip id={tooltipId}>
        Information copied to clipboard!
      </Tooltip>
    }>
      <div style={{ display: "flex" }}>
        <IconButton
          label="Share"
          labelProps={{ className: "d-none d-sm-block"}}
          onClick={async () => {
            const success = await share()
            if (success && onShare) {
              onShare()
            }
          }}
          onBlur={() => { setShowClipboardInfo(false) }}
        >
          <FaArrowUpFromBracket />
        </IconButton>
      </div>
    </OverlayTrigger>
  </>)

}

export default ShareButton;

export const DonationModal: React.FC<{
  show: boolean,
  setShow: Dispatch<SetStateAction<boolean>>,
  href: string
}> = ({ show, setShow, href, ...props }) => {
  const { t } = useTranslation("common")

  return (
    <Modal show={show} onHide={() => setShow(false)}>
      <DonationModalHeader closeButton />
      <Modal.Body>
        <p>{t("donate.text1")}</p>
        <p>{t("donate.text2")}</p>
        <p style={{ display: "flex", justifyContent: "center" }}>
          <IconButton label={t("donate.buttonText")} size="lg" href={href} labelProps={{ style: { padding: "3px 0 5px" } }}>
            <FaPaypal />
          </IconButton>
        </p>
      </Modal.Body>
    </Modal>
  )
}

const DonationModalHeader = styled(Modal.Header)`
  background-image: url(${donationModalHeroBackgroundImage.src});  height: 100px;
  background-size: cover;
  background-position: center 50%;
  color: white;
  height: 120px;
  border-bottom: none !important;
  .btn-close {
    filter: var(--bs-btn-close-white-filter);
  }
`
