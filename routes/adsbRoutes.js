const express = require("express"); // NodeJs Framework
const router = express.Router(); // Express Router
const redisClient = require("../redis/redisClient"); // Caching
const authMiddleware = require("../middlewares/authMiddleware"); // Auth Middleware
const axios = require("axios"); // HTTP Request Maker
const {ADSB_FLIGHT_JSON_URL} = require("../utils/globals")

const fetchAircrafts = async () =>{

    const response = await axios.get(ADSB_FLIGHT_JSON_URL);

    // Fetching ADSB Aircraft Data from RTL SDR 
      console.log(response.data.aircraft);
      return response.data.aircraft;
} 

// Aircraft ADSB Data for HTTP Polling
router.get("/aircrafts", authMiddleware, async function (req,res) {
    try{
        console.log("[*] ADSB Aircrafts JSON Route Hit");
        const adsbAircraftsJson = await fetchAircrafts();
        
        if(adsbAircraftsJson){
            console.log("[*] Adsb Aircrafts Json available");

            return res.json({
                status:true,
                aircraftData:adsbAircraftsJson
            })
        }
        else{
            console.log("[*] Adsb Aircrafts data not found ",adsbAircraftsJson);

            return res.json({
                status:false,
                message:"Unable to fetch aircrafts data"
            })
        }
    }
    catch(error){

    return res.json({
        status:false,
        message:"Internal Server Error"
    })
}
    
});

// Web Socket ADSB Data


module.exports = router;