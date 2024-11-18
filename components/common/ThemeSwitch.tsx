/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { FaCircleHalfStroke, FaMoon, FaSun } from "react-icons/fa6"
import classNames from "classnames"
import Button, { ButtonProps } from "react-bootstrap/Button"

const ThemeSwitch = ({
  className,
  ...props
  // }: Omit<React.HTMLProps<HTMLButtonElement>, "onClick" | "type">) => {
}: Omit<ButtonProps, "onClick">) => {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const modeOrder = ["system", "dark", "light"]

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Button
      className={classNames("btn", className)}
      onClick={() => setTheme(th => modeOrder[(modeOrder.indexOf(th) + 1) % modeOrder.length])}
      {...props}
    >
      {theme == "system" && <FaCircleHalfStroke />}
      {theme == "dark" && <FaMoon />}
      {theme == "light" && <FaSun />}
    </Button>
  )
}

export default ThemeSwitch