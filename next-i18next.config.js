/** @type {import('next-i18next').UserConfig} */

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de'],
  },
  localePath: path.resolve('./public/locales')
}
