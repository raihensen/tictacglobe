/** @type {import('next').NextConfig} */

const { i18n } = require('./next-i18next.config')

module.exports = {
  i18n,
  compiler: {
    // Enables the styled-components SWC transform
    styledComponents: true
  }
}
