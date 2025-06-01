const { Client, Events, GatewayIntentBits } = require("discord.js");
const TOKEN = require("./config.json").token;
const wn = require("./assets/wn.json");
const nlp = require("compromise");

const words = wn.words;
const synsets = wn.synsets;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

async function getAntonyms(word) {
  let synsetNames = words[word];

  if (!synsetNames) {
    console.log(`This word: ${word} doesn't exist, checking synsets...`);
    synsetNames = [word];
  }

  const result = [];

  for (let synsetName of synsetNames) {
    let synset = synsets[synsetName];

    if (!synset) {
      console.log(`This synset: ${synsetName} doesn't exist!`);
      continue;
    }

    if (synset["antonyms"]) {
      result.push(...synset["antonyms"]);
    }
  }

  return result;
}

async function replaceWithAntonyms(text) {
  let doc = nlp(text);
  const verbs = doc.verbs().out("array");
  const adjectives = doc.adjectives().out("array");
  const nouns = doc.nouns().out("array");

  let newText = text;

  // replace adjectives
  for (const adj of adjectives) {
    const antonyms = await getAntonyms(adj);
    const anti = antonyms[getRandomInt(0, antonyms.length)]; // use a random one
    if (anti) newText = newText.replace(new RegExp(`\\b${adj}\\b`, "gi"), anti);
  }

  // replace verbs
  for (const verb of verbs) {
    const antonyms = await getAntonyms(verb);
    const anti = antonyms[getRandomInt(0, antonyms.length)]; // use a random one
    if (anti)
      newText = newText.replace(new RegExp(`\\b${verb}\\b`, "gi"), anti);
  }

  // replace nouns
  for (const noun of nouns) {
    const antonyms = await getAntonyms(noun);
    const anti = antonyms[getRandomInt(0, antonyms.length)]; // use a random one
    if (anti)
      newText = newText.replace(new RegExp(`\\b${noun}\\b`, "gi"), anti);
  }

  // fallback negation
  if (newText === text) {
    console.log("Fallback negation")
    doc.verbs().toNegative();
    newText = doc.text();
  }

  return newText;
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  replaceWithAntonyms(message.content).then((opp) => {
    message.reply({
      content: opp,
    });
  });
});

client.once(Events.ClientReady, (readyclient) => {
  console.log(`Ready! Logged in as ${readyclient.user.tag}`);
});

client.login(TOKEN);
