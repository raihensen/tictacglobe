/** @type {import('next-i18next').UserConfig} */

import * as path from "path";

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de'],
  },
  localePath: path.resolve('./public/locales')
}
