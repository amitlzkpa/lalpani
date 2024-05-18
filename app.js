require("dotenv").config();
const express = require("express");
// const axios = require("axios");
const IPGeolocationAPI = require("ip-geolocation-api-javascript-sdk");
const GeolocationParams = require("ip-geolocation-api-javascript-sdk/GeolocationParams.js");

const PORT = process.env.PORT || 3000;

// const apiKey = process.env.IP2_LOCATION_LITE_API_KEY;
const apiKey = process.env.IP_GEOLOCATION_API_KEY;
const ipgeolocationApi = new IPGeolocationAPI(apiKey);

const app = express();
app.set("trust proxy", true);

app.get("/", async function (req, res) {
  let ip = req.headers["x-forwarded-for"] || req.ip || req.socket.remoteAddress;

  if (ip.includes(",")) {
    ip = ip.split(",")[0];
  }

  console.log("-------------------");
  console.log(ip);
  console.log("-------------------");

  // const response = await axios.get(
  //   `https://lite.ip2location.com/?key=${apiKey}&ip=${ip}&format=json`
  // );
  // const country = response.data.country_name;
  // return res.json({ country });

  const geolocationParams = new GeolocationParams();
  geolocationParams.setIPAddress(ip);

  ipgeolocationApi.getGeolocation((geolocation) => {
    return res.json(geolocation);
  }, geolocationParams);
});

app.listen(PORT, function () {
  console.log(`Listening on port ${PORT}!`);
});
