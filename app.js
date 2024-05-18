require("dotenv").config();
const express = require("express");
const IPGeolocationAPI = require("ip-geolocation-api-javascript-sdk");
const GeolocationParams = require("ip-geolocation-api-javascript-sdk/GeolocationParams.js");

const PORT = process.env.PORT || 3000;

const apiKey = process.env.IP_GEOLOCATION_API_KEY;
const ipgeolocationApi = new IPGeolocationAPI(apiKey);

const app = express();
app.set("trust proxy", true);

app.get("/", function (req, res) {
  const ip =
    req.headers["x-forwarded-for"] || req.ip || req.socket.remoteAddress;

  console.log("-------------------");
  console.log(ip);
  console.log("-------------------");

  const geolocationParams = new GeolocationParams();
  geolocationParams.setIPAddress(ip);

  ipgeolocationApi.getGeolocation((geolocation) => {
    return res.json(geolocation);
  }, geolocationParams);
});

app.listen(PORT, function () {
  console.log(`Listening on port ${PORT}!`);
});
