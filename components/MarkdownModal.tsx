
import Modal from "react-bootstrap/Modal"
import Button from "react-bootstrap/Button"
import { CustomModal } from "@/components/styles"
import ReactMarkdown from "react-markdown"
import rehypeRaw from 'rehype-raw'
import { useTranslation } from "next-i18next"
import { PluggableList } from "react-markdown/lib/react-markdown"
import { addClassName } from "@/src/util"


export const MarkdownModal: React.FC<{
  show: boolean,
  setShow: (value: boolean) => void,
  children: string
}> = ({ show, setShow, children }) => {
  const { t } = useTranslation("common")

  return (<>
  
    {/* https://stackoverflow.com/questions/66941072/how-to-parse-embeddable-links-from-markdown-and-render-custom-react-components */}
    <CustomModal dialogClassName="modal-dialog-large" show={show} fullscreen="sm-down" onHide={() => setShow(false)}>
      <Modal.Header closeButton>
        <Modal.Title>{t("info.title")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ReactMarkdown rehypePlugins={[rehypeRaw] as PluggableList} components={{
          a: ({ className, href, node, ...props}) => {
              return (<a
                href={href}
                className={addClassName(className, "markdownCustomLink")}
                target={href?.startsWith("#") ? undefined : "_blank"}
                {...props}
              >
                {props.children}
              </a>)
          }
        }}>
          {children}
        </ReactMarkdown>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShow(false)}>{t("info.close")}</Button>
      </Modal.Footer>
    </CustomModal>

  </>)


}