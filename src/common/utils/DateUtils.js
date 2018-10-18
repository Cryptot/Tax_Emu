function mtsToLocaleTimeString(mts, locale) {
    const d = new Date(mts);
    return d.toLocaleTimeString(locale)
}