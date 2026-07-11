const geoLocationTracker = require("../utils/geoLocationTracker");



const geoIpFilter = async (req,res,next) => {
    try{
        const ipAddress = req.ip;

        const locationDetails = await geoLocationTracker(ipAddress);

        console.log("[*] Location Details from GeoIpFilter Middleware ",locationDetails)

        if(locationDetails?.region === "GJ" && locationDetails?.regionName === "Gujarat"){
            console.log("[*] Access Granted.")
            next();
        }
        else{

             return res.status(401).json({
            status:false,
            message:"Service not accessable in your location"
        })

        }


    }
    catch(error){

        return res.status(500).json({
            status:false,
            message:"Internal Server Error"
        })
    }

}

module.exports = geoIpFilter