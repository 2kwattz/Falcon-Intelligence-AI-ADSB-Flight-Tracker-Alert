const BASE_DOMAIN = "localhost"
const PORT = process.env.PORT;
const OLLAMA_PORT = "11434"

const ADSB_PORT = 80

const BASE_URL = `http://${BASE_DOMAIN}:${PORT}/`
const OLLAMA_URL = `http://${BASE_DOMAIN}:${OLLAMA_PORT}/`
const ADSB_URL = `http://${BASE_DOMAIN}:${ADSB_PORT}/`
// const ADSB_FLIGHT_JSON_URL = `${ADSB_URL}/VirtualRadar/AircraftList.json`


const ADSB_FLIGHT_JSON_URL = `http://localhost/VirtualRadar/AircraftList.json`

module.exports = {
    BASE_DOMAIN,
    PORT,
    OLLAMA_PORT,
    ADSB_PORT,
    BASE_URL,
    OLLAMA_URL,
    ADSB_URL,
    ADSB_FLIGHT_JSON_URL
}
