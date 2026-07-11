export const BASE_DOMAIN = "localhost"
export const PORT = process.env.PORT;
export const OLLAMA_PORT = "11434"

export const ADSB_PORT = 8080

export const BASE_URL = `http://${BASE_DOMAIN}:${PORT}/`
export const OLLAMA_URL = `http://${BASE_DOMAIN}:${OLLAMA_PORT}/`
export const ADSB_URL = `http://${BASE_DOMAIN}:${ADSB_PORT}/`
export const ADSB_FLIGHT_JSON_URL = `${ADSB_URL}data/aircraft.json`


