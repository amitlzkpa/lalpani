import "dotenv/config";
import express from "express";
import ip6 from "ip6";
import openai from "openai";
import IPGeolocationAPI from "ip-geolocation-api-javascript-sdk";
import GeolocationParams from "ip-geolocation-api-javascript-sdk/GeolocationParams.js";

const PORT = process.env.PORT || 3000;

const apiKey = process.env.IP_GEOLOCATION_API_KEY;
const ipgeolocationApi = new IPGeolocationAPI(apiKey);

function isBogonIp(ip) {
  const ipToNumber = (ip) => {
    if (ip.includes(":")) {
      // IPv6
      return BigInt("0x" + ip6.normalize(ip).replace(/:/g, ""));
    } else {
      // IPv4
      return ip
        .split(".")
        .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
    }
  };

  const bogonRangesIPv4 = [
    { start: "0.0.0.0", end: "0.255.255.255" },
    { start: "10.0.0.0", end: "10.255.255.255" },
    { start: "100.64.0.0", end: "100.127.255.255" },
    { start: "127.0.0.0", end: "127.255.255.255" },
    { start: "169.254.0.0", end: "169.254.255.255" },
    { start: "172.16.0.0", end: "172.31.255.255" },
    { start: "192.0.0.0", end: "192.0.0.7" },
    { start: "192.0.2.0", end: "192.0.2.255" },
    { start: "192.88.99.0", end: "192.88.99.255" },
    { start: "192.168.0.0", end: "192.168.255.255" },
    { start: "198.18.0.0", end: "198.19.255.255" },
    { start: "198.51.100.0", end: "198.51.100.255" },
    { start: "203.0.113.0", end: "203.0.113.255" },
    { start: "224.0.0.0", end: "239.255.255.255" },
    { start: "240.0.0.0", end: "255.255.255.255" },
  ];

  const bogonRangesIPv6 = [
    { start: "::", end: "::" },
    { start: "::1", end: "::1" },
    { start: "::ffff:0:0", end: "::ffff:ffff:ffff" },
    { start: "64:ff9b::", end: "64:ff9b::ffff:ffff" },
    { start: "100::", end: "100::ffff:ffff:ffff:ffff" },
    { start: "2001:db8::", end: "2001:db8:ffff:ffff:ffff:ffff:ffff:ffff" },
    { start: "fc00::", end: "fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff" },
    { start: "fe80::", end: "febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff" },
    { start: "ff00::", end: "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff" },
  ];

  const ipNum = ipToNumber(ip);

  const checkBogonRanges = (ranges) => {
    for (let range of ranges) {
      const startNum = ipToNumber(range.start);
      const endNum = ipToNumber(range.end);

      if (ipNum >= startNum && ipNum <= endNum) {
        return true;
      }
    }
    return false;
  };

  if (ip.includes(":")) {
    return checkBogonRanges(bogonRangesIPv6);
  } else {
    return checkBogonRanges(bogonRangesIPv4);
  }
}

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

function getRandomIdx(arrayLength) {
  const randomIndex = Math.floor(Math.random() * arrayLength);
  return randomIndex;
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

async function generateHTMLPage(country_name, primary_color, design_theme) {
  const p1 = `What is the most popular sport in ${country_name}. Answer in 1 word.`;
  const popular_sport = await askGPT(p1);

  const p2 = `
    Create an HTML page based on following description and return only the HTML:
    A website to show the scores from the latest game in ${popular_sport}. Use real team names and random scores. Display a neat scoreboard and timeline of events in the game. It should use ${primary_color} as the primary colour and have a ${design_theme} theme for the design.
  `;
  const response_html = await askGPT(p2);

  return response_html;
}

app.get("/", async function (req, res) {
  let ip = req.headers["x-forwarded-for"] || req.ip || req.socket.remoteAddress;
  // let ip = req.ip || req.socket.remoteAddress;

  if (ip.includes(",")) {
    ip = ip.split(",")[0];
  }
  // ip = "35.230.28.204";
  // ip = "110.226.180.64";

  if (isBogonIp(ip)) {
    return res.send(`Unsupported IP address: ${ip}`);
  }

  const geolocation = await getGeolocation(ip);

  const { country_name } = geolocation ?? { country_name: "India" };

  const colors = ["red", "blue", "green", "yellow", "purple", "orange"];
  const themes = ["futuristic", "retro", "minimalist", "grunge", "neon"];

  const idx_1 = getRandomIdx(colors.length);
  const idx_2 = getRandomIdx(themes.length);

  const ridx_1 = Math.abs(parseInt(req.query.idx, 10)) % colors.length;
  const ridx_2 = Math.abs(parseInt(req.query.idx, 10)) % themes.length;

  const primary_color = colors[ridx_1 ?? idx_1];
  const design_theme = themes[ridx_2 ?? idx_2];

  const scores_page_html = await generateHTMLPage(
    country_name,
    primary_color,
    design_theme
  );

  return res.setHeader("Content-type", "text/html").send(scores_page_html);
});

app.listen(PORT, function () {
  console.log(`Listening on port ${PORT}!`);
});
