require("dotenv").config();
const express = require("express");
const openai = require("openai");
const IPGeolocationAPI = require("ip-geolocation-api-javascript-sdk");
const GeolocationParams = require("ip-geolocation-api-javascript-sdk/GeolocationParams.js");

const PORT = process.env.PORT || 3000;

const apiKey = process.env.IP_GEOLOCATION_API_KEY;
const ipgeolocationApi = new IPGeolocationAPI(apiKey);

function getGeolocationAsync(geolocationParams) {
  return new Promise((resolve, reject) => {
    ipgeolocationApi.getGeolocation((response) => {
      if (response && !response.message) {
        resolve(response);
      } else {
        reject(new Error(response ? response.message : "Unknown error"));
      }
    }, geolocationParams);
  });
}

async function getGeolocation(ip) {
  const geolocationParams = new GeolocationParams();
  geolocationParams.setIPAddress(ip);
  geolocationParams.setFields("country_name");

  try {
    const geolocation = await getGeolocationAsync(geolocationParams);
    return geolocation;
  } catch (error) {
    console.error("Error fetching geolocation:", error);
    throw error;
  }
}

function getRandomItem(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

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

async function generateHTMLPage(country_name) {
  const p1 = `What is the most popular sport in ${country_name}. Answer in 1 word.`;
  const popular_sport = await askGPT(p1);

  const colors = ["red", "blue", "green", "yellow", "purple", "orange"];
  const themes = ["futuristic", "retro", "minimalist", "grunge", "neon"];

  // A website to show the scores from the latest game in ${popular_sport}. Use popular team names and random scores and timelines. Display a neat scoreboard and timeline of events in the game.
  const primary_color = getRandomItem(colors);
  const design_theme = getRandomItem(themes);
  const p2 = `
    Create an HTML page based on following description and return only the HTML:
    A website to show the scores from the latest game in ${popular_sport}. Use real team names and random scores. Display a neat scoreboard and timeline of events in the game. It should use ${primary_color} as the primary colour and have a ${design_theme} theme for the design.
  `;
  const response_html = await askGPT(p2);

  return response_html;
}

app.get("/", async function (req, res) {
  // let ip = req.headers["x-forwarded-for"] || req.ip || req.socket.remoteAddress;
  let ip = req.ip || req.socket.remoteAddress;

  if (ip.includes(",")) {
    ip = ip.split(",")[0];
  }
  // ip = "35.230.28.204";
  // ip = "110.226.180.64";

  const geolocation = await getGeolocation(ip);

  const { country_name } = geolocation ?? { country_name: "India" };

  const scores_page_html = await generateHTMLPage(country_name);

  return res.setHeader("Content-type", "text/html").send(scores_page_html);
});

app.listen(PORT, function () {
  console.log(`Listening on port ${PORT}!`);
});
