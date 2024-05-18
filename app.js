require("dotenv").config();
const express = require("express");
const openai = require("openai");
const IPGeolocationAPI = require("ip-geolocation-api-javascript-sdk");
const GeolocationParams = require("ip-geolocation-api-javascript-sdk/GeolocationParams.js");

const PORT = process.env.PORT || 3000;

const apiKey = process.env.IP_GEOLOCATION_API_KEY;
const ipgeolocationApi = new IPGeolocationAPI(apiKey);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openAI = new openai.OpenAI({
  apiKey: OPENAI_API_KEY,
});

const app = express();
app.set("trust proxy", true);

async function askGPT(promptText) {
  const messages = [];

  messages.push({
    role: "user",
    content: promptText,
  });

  const completion = await openAI.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: messages,
  });

  return completion.choices[0].message.content;
}

async function generateHTML(country_name) {
  const p1 = `What is the most popular sport in ${country_name}. Answer in 1 word.`;
  const popular_sport = await askGPT(p1);
  return popular_sport;
}

app.get("/", async function (req, res) {
  let ip = req.headers["x-forwarded-for"] || req.ip || req.socket.remoteAddress;

  if (ip.includes(",")) {
    ip = ip.split(",")[0];
  }

  console.log("-------------------");
  console.log(ip);
  console.log("-------------------");

  const geolocationParams = new GeolocationParams();
  geolocationParams.setIPAddress(ip);

  ipgeolocationApi.getGeolocation(async (geolocation) => {
    const { country_name = "USA" } = geolocation;

    console.log(country_name);
    const popular_sport = await generateHTML(country_name);
    console.log(popular_sport);

    // A website to show the scores from the latest game in ${popular_sport}. Use popular team names and random scores and timelines. Display a neat scoreboard and timeline of events in the game. It should use ${COL_PICK} colours and be ${TONE_PICK}.
    const p2 = `
      Create an HTML page based on following description and return only the HTML:

      A website to show the scores from the latest game in ${popular_sport}. Use popular team names and random scores and timelines. Display a neat scoreboard and timeline of events in the game.
    `;

    const responseHTML = await askGPT(p2);

    return res.setHeader("Content-type", "text/html").send(responseHTML);
  }, geolocationParams);
});

app.listen(PORT, function () {
  console.log(`Listening on port ${PORT}!`);
});
