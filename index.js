const { Client, Events, GatewayIntentBits } = require("discord.js");
const TOKEN = require("./config.json").token;
const nlp = require("compromise");

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

function getWordContext(text, target) {
  const words = text.split(/\s+/);
  const context = [];

  for (let i = 0; i < words.length; i++) {
    const stripped = words[i].replace(/[^\w]/g, "").toLowerCase();
    if (stripped === target.toLowerCase()) {
      const left = words[i - 1] || null;
      const right = words[i + 1] || null;
      context.push({ left, right });
    }
  }

  return context;
}

async function getAntonyms(word, lc, rc) {
  const res = await fetch(
    `https://api.datamuse.com/words?rel_ant=${word}&lc=${lc}&${rc}`
  );
  const data = await res.json();
  return data.map((entry) => entry.word);
}

async function replaceWithAntonyms(text) {
  let doc = nlp(text);
  const verbs = doc.verbs().out("array");
  const adjectives = doc.adjectives().out("array");

  let newText = text;

  // replace adjectives
  for (const adj of adjectives) {
    const context = getWordContext(text, adj);
    const antonyms = await getAntonyms(adj, context.left, context.right);
    const anti = antonyms[getRandomInt(0, antonyms.length + 1)]; // use a random one
    if (anti) newText = newText.replace(new RegExp(`\\b${adj}\\b`, "gi"), anti);
  }

  // replace verbs
  for (const verb of verbs) {
    const context = getWordContext(text, verb);
    const antonyms = await getAntonyms(verb, context.left, context.right);
    const anti = antonyms[getRandomInt(0, antonyms.length + 1)]; // use a random one
    if (anti)
      newText = newText.replace(new RegExp(`\\b${verb}\\b`, "gi"), anti);
  }

  // fallback negation
  if (newText === text) {
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
