
import { useRouter } from "next/router"
import { useIsClient } from "@/src/util"
import { forwardRef, useEffect, useRef, useState, useId } from "react";
import { useTranslation } from "next-i18next";
import { FaArrowUpFromBracket, FaShare } from "react-icons/fa6"
import { IconButton } from "./styles"
import { Button, Overlay, OverlayTrigger, Tooltip } from "react-bootstrap";

const IconButtonWithRef = forwardRef<HTMLButtonElement, React.ComponentProps<typeof IconButton>>(({ children, ...props }, ref) => (
  <IconButton ref={ref} {...props}>
    {children}
  </IconButton>
))
// : React.FC<React.ComponentProps<typeof IconButton> & { ref: any }>

export const ShareButton: React.FC<ShareData> = (props) => {
  // const router = useRouter()
  const { t } = useTranslation("common")

  const [showClipboardInfo, setShowClipboardInfo] = useState<boolean>(false)
  const [showClipboardInfoTimeout, setShowClipboardInfoTimeout] = useState<NodeJS.Timeout>()
  const target = useRef(null)
  const tooltipId = useId()

  const [data, setData] = useState<ShareData>({...props})

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
  }

  const share = () => {

    if (!navigator.share) {
      return shareViaClipboard()
    }
    navigator.share(data)
      .then(() => console.log('Successful share'))
      .catch(error => {
        console.log('Error sharing:', error)
        shareViaClipboard()
      });
  }

  return (<>
    <OverlayTrigger delay={250} trigger={[]} show={showClipboardInfo} placement="top" overlay={
      <Tooltip id={tooltipId}>
        Information copied to clipboard!
      </Tooltip>
    }>
      <div style={{ display: "flex" }}>
        <IconButton
          label="Share"
          labelProps={{ className: "d-none d-sm-block"}}
          onClick={() => { share() }}
          onBlur={() => { setShowClipboardInfo(false) }}
        >
          <FaArrowUpFromBracket />
        </IconButton>
      </div>
    </OverlayTrigger>
  </>)

}

export default ShareButton;
