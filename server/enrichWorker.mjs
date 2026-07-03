import { pipeline, env } from '@xenova/transformers'
import { workerData, parentPort } from 'worker_threads'
import { homedir } from 'os'
import { join } from 'path'

env.cacheDir = join(homedir(), '.cache', 'gamepass-search')

const CLASSIFIER_MODEL = 'Xenova/nli-deberta-v3-small'
const EMBEDDER_MODEL   = 'Xenova/all-MiniLM-L6-v2'

// ── Full taxonomy (Steam-style) ────────────────────────────────────────────────
// Keys are the tag names stored in DB and shown in UI.
// Values are descriptive sentences for NLI zero-shot — more specific = more accurate.
export const TAGS = {
  // ─ Genre ─
  Action:       'action game with fast-paced combat, fighting enemies, melee or intense battles',
  Adventure:    'adventure game focused on exploration, story-driven narrative, and discovering new places',
  RPG:          'role-playing game with character progression, leveling up, stats, skill trees, and quests',
  Shooter:      'shooting game where the player uses guns or ranged weapons to shoot enemies',
  Strategy:     'strategy game with resource management, base building, economic planning, or turn-based tactics and troop management',
  Sports:       'sports game simulating real-world sports like football, basketball, soccer, golf, or tennis',
  Racing:       'racing game with cars, motorcycles, vehicles, speed competitions, or driving on tracks',
  Horror:       'horror game designed to scare players with monsters, jump scares, survival terror, or psychological fear',
  Survival:     'survival game where players must gather resources, craft tools, and survive dangerous environments or hunger',
  Simulation:   'simulation game that realistically models activities such as city building, farming, flight, or business management',
  Platformer:   'platform game where the player jumps between platforms, navigates obstacle courses, and traverses levels',
  Fighting:     'fighting game where two or more characters battle in one-on-one or arena hand-to-hand combat',
  Puzzle:       'puzzle game that challenges the player to solve logic puzzles, brain teasers, or spatial problems',
  Indie:        'independently developed game with unique or experimental art style, mechanics, or storytelling',
  Casual:       'casual easy-to-pick-up game suitable for all ages, with simple controls and relaxed gameplay',

  // ─ Theme / Setting ─
  'Sci-fi':           'game set in a science fiction universe with futuristic technology, spaceships, robots, or artificial intelligence',
  Fantasy:            'game set in a fantasy world with magic, wizards, dragons, elves, mythical creatures, or sword and sorcery',
  Cyberpunk:          'game set in a dark dystopian cyberpunk city with hackers, neon lights, mega-corporations, and cyber implants',
  Medieval:           'game set in a medieval period with knights, castles, kingdoms, swords, and historical warfare',
  Anime:              'game with anime-inspired art style, Japanese animation aesthetics, or manga-style character designs',
  'Post-apocalyptic': 'game set in a post-apocalyptic wasteland after civilization has collapsed, often with scarce resources',
  Space:              'game set in outer space, on other planets, space stations, or involving space travel and exploration',
  Historical:         'game set in a real historical period or based on historical events and real-world locations',

  // ─ Features / Mechanics ─
  'Open World':     'open world game with a large freely explorable map where the player can go anywhere without loading screens',
  Roguelike:        'roguelike or roguelite game with procedurally generated levels, permadeath, and random runs',
  Metroidvania:     'metroidvania game with interconnected maps, ability gating, backtracking, and exploration-based progression',
  Stealth:          'stealth game where avoiding detection, sneaking, and silent takedowns are core mechanics',
  Crafting:         'crafting game where players gather materials and craft tools, weapons, structures, or items',
  Sandbox:          'sandbox game with open-ended freeform gameplay where players build, create, and set their own goals',
  'Tower Defense':  'tower defense game where players place defensive structures to stop waves of incoming enemies',
  'Battle Royale':  'battle royale game where many players compete on a shrinking map until one survivor or team remains',

  // ─ Mood / Tone ─
  'Story Rich': 'story-rich game with deep narrative, memorable characters, meaningful choices, and an engaging plot',
  Relaxing:     'relaxing calm game with no combat pressure, slow-paced enjoyable gameplay, suitable for unwinding',
  Dark:         'game with a dark gritty mature tone, disturbing themes, dark atmosphere, or morally ambiguous story',
  Atmospheric:  'game with strong immersive atmosphere, environmental storytelling, and a powerful sense of place and mood',
  Funny:        'comedy game with humor, jokes, absurdist situations, or lighthearted funny gameplay',
}

const MODE_LABELS = {
  Solo:                 'single player game designed to be played alone',
  'Co-op':              'cooperative multiplayer game played together with friends locally or online co-op',
  'Online Multiplayer': 'competitive online multiplayer game played against other players over the internet',
}

function post(type, data = {}) {
  parentPort.postMessage({ type, ...data })
}

function progressCallback(info) {
  post('progress', {
    downloadFile: info.name || info.file || '',
    downloadPct:  info.total ? Math.round((info.loaded || 0) / info.total * 100) : 0,
  })
}

// ── Load models ───────────────────────────────────────────────────────────────
let classifier, embedder
try {
  classifier = await pipeline('zero-shot-classification', CLASSIFIER_MODEL, { progress_callback: progressCallback })
  embedder   = await pipeline('feature-extraction',       EMBEDDER_MODEL,   { progress_callback: progressCallback })
} catch (err) {
  post('error', { error: `Model load failed: ${err.message}` })
  process.exit(1)
}

post('models_ready')

// ── Precompute ordered lists (keys / descriptions in matching order) ───────────
const tagKeys  = Object.keys(TAGS)
const tagDescs = Object.values(TAGS)
const modeKeys  = Object.keys(MODE_LABELS)
const modeDescs = Object.values(MODE_LABELS)

const { games } = workerData

for (const game of games) {
  try {
    const text = `Video game. Title: "${game.title}". ${(game.description || '').slice(0, 380)}`

    // All tags in one multi-label pass
    const tResult = await classifier(text, tagDescs, { multi_label: true })
    const tags = tResult.labels
      .map((desc, i) => ({ name: tagKeys[tagDescs.indexOf(desc)], score: tResult.scores[i] }))
      .filter(({ score }) => score > 0.35)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)       // keep up to 6 tags total
      .map(({ name }) => name)
      .filter(Boolean)

    // Multiplayer modes
    const mResult = await classifier(text, modeDescs, { multi_label: true })
    const modes = mResult.labels
      .map((desc, i) => ({ name: modeKeys[modeDescs.indexOf(desc)], score: mResult.scores[i] }))
      .filter(({ score }) => score > 0.4)
      .map(({ name }) => name)
      .filter(Boolean)

    // Sentence embedding
    const out       = await embedder(text, { pooling: 'mean', normalize: true })
    const embedding = JSON.stringify(Array.from(out.data).map(v => parseFloat(v.toFixed(5))))

    post('result', { id: game.id, genres: tags, modes, embedding })
  } catch (err) {
    post('skip', { id: game.id, error: err.message })
  }
}

post('done')
