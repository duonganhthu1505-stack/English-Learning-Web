const STORAGE_KEY = "dailyEnglishProgressV2";
const LEGACY_STORAGE_KEY = "dailyEnglishProgressV1";
const SYNC_CONFIG_KEY = "dailyEnglishSyncConfigV1";
const QUESTIONS_PER_LESSON = 5;
const PAGE_SIZE = 24;

const COURSE_LEVELS = {
  TOEIC: [
    { label: "TOEIC 500", description: "Nền tảng" },
    { label: "TOEIC 600", description: "Cơ bản" },
    { label: "TOEIC 700", description: "Trung cấp" },
    { label: "TOEIC 800", description: "Khá" },
    { label: "TOEIC 900", description: "Nâng cao" }
  ],
  IELTS: [
    { label: "IELTS 4.0", description: "Nền tảng" },
    { label: "IELTS 5.0", description: "Cơ bản" },
    { label: "IELTS 6.0", description: "Trung cấp" },
    { label: "IELTS 7.0", description: "Khá" },
    { label: "IELTS 8.0", description: "Nâng cao" }
  ]
};

const STOP_WORDS = new Set((
  "a an the and or but if then than so because as at by for from in into of off on onto out over to under up with without " +
  "is am are was were be been being do does did have has had can could may might must shall should will would " +
  "i you he she it we they me him her us them my your his its our their this that these those some any each " +
  "all both few many much more most other another such no not very too also just only now here there away " +
  "who what when where why how which whose whom " +
  "about after before during through between within across against around " +
  "very really quite still already ever never always often usually sometimes again " +
  "to be have do " +
  "thing things person people someone something "
).split(/\s+/));

const WORD_FORMS = {
  "men": "man", "women": "woman", "children": "child", "people": "person",
  "baskets": "basket", "stacking": "stack", "stacked": "stack", "finished": "finished",
  "examining": "examine", "examined": "examine", "carried": "carry", "carrying": "carry",
  "weaving": "weave", "woven": "weave", "customers": "customer", "larger": "large",
  "making": "make", "made": "make", "doing": "do", "done": "do", "having": "have",
  "having": "have", "running": "run", "writing": "write", "written": "write",
  "taking": "take", "taken": "take", "giving": "give", "given": "give", "getting": "get",
  "gotten": "get", "going": "go", "went": "go", "coming": "come", "came": "come",
  "buying": "buy", "bought": "buy", "selling": "sell", "sold": "sell", "using": "use",
  "used": "use", "studying": "study", "studied": "study", "trying": "try", "tried": "try"
};

const BUILT_IN_GLOSSES = {
  "man": "người đàn ông",
  "stack": "xếp chồng",
  "finished": "đã hoàn thiện",
  "basket": "giỏ, chiếc giỏ",
  "customer": "khách hàng",
  "examine": "xem xét, kiểm tra",
  "large": "lớn",
  "carry": "mang, vận chuyển",
  "carry away": "mang đi, mang khỏi",
  "weave": "đan, dệt",
  "round": "tròn",
  "woman": "người phụ nữ",
  "child": "trẻ em",
  "employee": "nhân viên",
  "supplier": "nhà cung cấp",
  "invoice": "hóa đơn",
  "payment": "khoản thanh toán",
  "report": "báo cáo",
  "meeting": "cuộc họp",
  "schedule": "lịch trình, lên lịch",
  "review": "xem lại, đánh giá",
  "prepare": "chuẩn bị",
  "contact": "liên hệ",
  "document": "tài liệu",
  "request": "yêu cầu",
  "approve": "phê duyệt",
  "wait": "chờ đợi",
  "approval": "sự phê duyệt",
  "morning": "buổi sáng",
  "office": "văn phòng",
  "email": "thư điện tử",
  "phone": "điện thoại",
  "travel": "du lịch, đi lại",
  "airport": "sân bay",
  "hotel": "khách sạn",
  "restaurant": "nhà hàng",
  "family": "gia đình",
  "weather": "thời tiết",
  "health": "sức khỏe",
  "computer": "máy tính",
  "software": "phần mềm",
  "internet": "mạng Internet",
  "bank": "ngân hàng",
  "money": "tiền",
  "food": "thức ăn",
  "clothing": "quần áo",
  "color": "màu sắc",
  "shape": "hình dạng",
  "large": "lớn",
  "small": "nhỏ",
  "finished": "đã hoàn thiện"
};

const PHRASAL_VERBS = [
  { pattern: /\b(?:carry|carries|carried|carrying)\s+away\b/gi, term: "carry away", gloss: "mang đi, mang khỏi" },
  { pattern: /\b(?:look|looks|looked|looking)\s+forward\s+to\b/gi, term: "look forward to", gloss: "mong chờ" },
  { pattern: /\b(?:put|puts|putting)\s+off\b/gi, term: "put off", gloss: "trì hoãn" },
  { pattern: /\b(?:run|runs|ran|running)\s+out\s+of\b/gi, term: "run out of", gloss: "hết, cạn" },
  { pattern: /\b(?:take|takes|took|taking)\s+place\b/gi, term: "take place", gloss: "diễn ra" }
];

let state = loadState();
let rawLessons = [];
let lessons = [];
let lessonMap = new Map();
let currentLessonId = null;
let questionIndex = 0;
let answers = {};
let checked = false;
let voice = "US";
let activeTrack = "TOEIC";
let activeLevelIndex = 0;
let visibleCount = PAGE_SIZE;
let analysisDraft = null;
let syncInProgress = false;
let syncRequestedAgain = false;
let syncInitialized = false;
let syncTimer = null;
let lastSyncMessage = "Chưa cấu hình đồng bộ đám mây.";
let lastSyncType = "";
let dictionaryGlosses = new Map();

function emptyState() {
  return {
    done: [], scores: {}, lastDate: "", streak: 0, knownWords: [], customLessons: [],
    doneAt: {}, scoreAt: {}, knownAt: {}, streakAt: 0, resetAt: 0, updatedAt: 0
  };
}

function normalizeLessonId(value) {
  if (typeof value === "number" || /^\d+$/.test(String(value))) return `base-${Number(value) + 1}`;
  return String(value || "");
}

function normalizeTimestamp(value, fallback = 0) {
  const time = Number(value);
  return Number.isFinite(time) && time > 0 ? time : fallback;
}

function normalizeProgress(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const updatedAt = normalizeTimestamp(source.updatedAt, Date.now());
  const done = Array.isArray(source.done)
    ? [...new Set(source.done.map(normalizeLessonId).filter(Boolean))]
    : [];
  const scores = {};
  if (source.scores && typeof source.scores === "object") {
    for (const [oldId, rawScore] of Object.entries(source.scores)) {
      const id = normalizeLessonId(oldId);
      const score = Number(rawScore);
      if (id && Number.isFinite(score)) scores[id] = Math.max(0, Math.min(100, score));
    }
  }

  const doneAt = {};
  if (source.doneAt && typeof source.doneAt === "object") {
    for (const [oldId, time] of Object.entries(source.doneAt)) doneAt[normalizeLessonId(oldId)] = normalizeTimestamp(time, updatedAt);
  }
  done.forEach(id => { if (!doneAt[id]) doneAt[id] = updatedAt; });

  const scoreAt = {};
  if (source.scoreAt && typeof source.scoreAt === "object") {
    for (const [oldId, time] of Object.entries(source.scoreAt)) scoreAt[normalizeLessonId(oldId)] = normalizeTimestamp(time, updatedAt);
  }
  Object.keys(scores).forEach(id => { if (!scoreAt[id]) scoreAt[id] = updatedAt; });

  const knownWords = Array.isArray(source.knownWords)
    ? [...new Set(source.knownWords.map(word => String(word).trim()).filter(Boolean))]
    : [];
  const knownAt = {};
  if (source.knownAt && typeof source.knownAt === "object") {
    for (const [word, time] of Object.entries(source.knownAt)) knownAt[word] = normalizeTimestamp(time, updatedAt);
  }
  knownWords.forEach(word => { if (!knownAt[word]) knownAt[word] = updatedAt; });

  const customLessons = Array.isArray(source.customLessons)
    ? source.customLessons.filter(item => item && typeof item === "object").map((item, index) => ({
        ...item,
        id: String(item.id || `custom-${updatedAt}-${index}`),
        custom: true,
        updatedAt: normalizeTimestamp(item.updatedAt, updatedAt)
      }))
    : [];

  return {
    done, scores,
    lastDate: typeof source.lastDate === "string" ? source.lastDate : "",
    streak: Math.max(0, Number(source.streak) || 0),
    knownWords,
    customLessons,
    doneAt,
    scoreAt,
    knownAt,
    streakAt: normalizeTimestamp(source.streakAt, source.lastDate ? updatedAt : 0),
    resetAt: normalizeTimestamp(source.resetAt, 0),
    updatedAt
  };
}

function loadState() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return normalizeProgress(JSON.parse(current));
    const old = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (old) {
      const migrated = JSON.parse(old);
      // Legacy localStorage had no edit timestamps. Treat it as pre-sync data so a newer cloud reset wins.
      if (!migrated.updatedAt) migrated.updatedAt = 1;
      return normalizeProgress(migrated);
    }
  } catch (error) {
    console.warn("Could not read saved learning progress:", error);
  }
  return emptyState();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeEnglishToken(token) {
  const lower = String(token || "").toLowerCase().replace(/[’']/g, "");
  if (WORD_FORMS[lower]) return WORD_FORMS[lower];
  if (lower.length > 5 && lower.endsWith("ies")) return `${lower.slice(0, -3)}y`;
  if (lower.length > 5 && lower.endsWith("ing")) {
    let root = lower.slice(0, -3);
    if (root.length > 2 && root[root.length - 1] === root[root.length - 2]) root = root.slice(0, -1);
    if (["mak", "tak", "writ", "us", "giv", "hav", "com", "danc", "examin", "weav", "hop", "clos"].includes(root)) return `${root}e`;
    return root;
  }
  if (lower.length > 4 && lower.endsWith("ied")) return `${lower.slice(0, -3)}y`;
  if (lower.length > 4 && lower.endsWith("ed")) {
    let root = lower.slice(0, -2);
    if (root.endsWith("i")) return `${root.slice(0, -1)}y`;
    if (root.length > 2 && root[root.length - 1] === root[root.length - 2]) root = root.slice(0, -1);
    if (["us", "clos", "danc", "examin", "weav", "lov", "mov"].includes(root)) return `${root}e`;
    return root;
  }
  if (lower.length > 4 && lower.endsWith("s") && !lower.endsWith("ss")) return lower.slice(0, -1);
  return lower;
}

function getTermGloss(term) {
  const key = String(term || "").toLowerCase();
  if (BUILT_IN_GLOSSES[key]) return BUILT_IN_GLOSSES[key];
  const normalized = normalizeEnglishToken(key);
  if (BUILT_IN_GLOSSES[normalized]) return BUILT_IN_GLOSSES[normalized];
  return dictionaryGlosses.get(key) || dictionaryGlosses.get(normalized) || "";
}

function indexDictionary(raw) {
  dictionaryGlosses = new Map();
  for (const lesson of raw) {
    for (const word of Array.isArray(lesson.words) ? lesson.words : []) {
      if (!Array.isArray(word) || !word[0] || !word[1]) continue;
      const term = String(word[0]).trim().toLowerCase();
      const gloss = String(word[1]).trim();
      dictionaryGlosses.set(term, gloss);
      if (/^[a-z]+$/i.test(term)) dictionaryGlosses.set(normalizeEnglishToken(term), gloss);
    }
  }
}

function inferLessonLevel(lesson) {
  const text = `${lesson.title || ""} ${lesson.desc || ""} ${lesson.grammar || ""}`.toLowerCase();
  if (/academic|advanced vocabulary|research|science|history|literature|geography|politics|global issues|innovation|abstract/.test(text)) return 4;
  if (/phrasal verbs|idiom|conditionals|reported speech|passive voice|business cases|reading comprehension|argument|negotiation|complex grammar/.test(text)) return 3;
  if (/toeic|business|workplace|office|administration|finance|meeting|presentation|interview|email|report|supplier|contract|project management|professional|negotiation/.test(text)) return 2;
  if (/present perfect|past simple|future simple|modal verbs|prepositions|conjunctions|adjectives|adverbs|grammar|common mistakes|question forms/.test(text)) return 1;
  if (/basic|beginner|greeting|family|numbers|colors|food|weather|daily|routine|shopping|restaurant|directions|animals|body parts|clothing|everyday situations|quick phrases/.test(text)) return 0;
  return 1;
}

function normalizeQuestion(question) {
  if (!question || typeof question !== "object") return null;
  const opts = Array.isArray(question.opts) ? question.opts.map(option => String(option)) : [];
  const answer = Number(question.a);
  if (!question.q || opts.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= opts.length) return null;
  return { q: String(question.q), opts, a: answer, why: String(question.why || "") };
}

function normalizeLesson(source, id, isCustom = false) {
  const lesson = { ...source };
  lesson.id = String(source.id || id);
  lesson.custom = Boolean(isCustom || source.custom);
  lesson.title = String(source.title || "Bài học mới");
  lesson.desc = String(source.desc || "Bài học được tạo từ nội dung cá nhân.");
  lesson.grammar = String(source.grammar || "Cấu trúc câu");
  lesson.words = Array.isArray(source.words)
    ? source.words.filter(word => Array.isArray(word) && word.length >= 1).map(word => [
        String(word[0] || ""), String(word[1] || ""), String(word[2] || "")
      ]).filter(word => word[0])
    : [];
  lesson.qs = Array.isArray(source.qs) ? source.qs.map(normalizeQuestion).filter(Boolean) : [];
  const proposedLevel = Number(source.levelIndex);
  lesson.levelIndex = Number.isInteger(proposedLevel) && proposedLevel >= 0 && proposedLevel <= 4
    ? proposedLevel
    : inferLessonLevel(lesson);
  return lesson;
}

function allVocabularyBank() {
  const words = [];
  for (const lesson of [...rawLessons, ...state.customLessons]) {
    for (const word of Array.isArray(lesson.words) ? lesson.words : []) {
      if (Array.isArray(word) && word[0]) words.push(String(word[0]).trim());
    }
  }
  return [...new Set(words.filter(Boolean))];
}

function makeChoiceSet(answer, candidates, seed, fallbacks = []) {
  const normalizedAnswer = String(answer).toLowerCase();
  const distractors = [];
  const unique = [...new Set(candidates.map(value => String(value || "").trim()).filter(Boolean))];
  if (unique.length) {
    const start = seed % unique.length;
    for (let offset = 0; offset < unique.length && distractors.length < 3; offset++) {
      const candidate = unique[(start + offset) % unique.length];
      if (candidate.toLowerCase() !== normalizedAnswer && !distractors.some(item => item.toLowerCase() === candidate.toLowerCase())) distractors.push(candidate);
    }
  }
  for (const fallback of fallbacks) {
    if (distractors.length >= 3) break;
    if (fallback.toLowerCase() !== normalizedAnswer && !distractors.some(item => item.toLowerCase() === fallback.toLowerCase())) distractors.push(fallback);
  }
  const slot = seed % 4;
  const opts = [];
  let distractorIndex = 0;
  for (let index = 0; index < 4; index++) opts.push(index === slot ? answer : distractors[distractorIndex++]);
  return { opts, a: slot };
}

function vocabularyPattern(term) {
  if (term.toLowerCase() === "carry away") return /\b(?:carry|carries|carried|carrying)\s+away\b/i;
  const parts = term.toLowerCase().split(/\s+/).map(part => {
    const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const stem = escaped.endsWith("e") ? escaped.slice(0, -1) : escaped;
    return `(?:${escaped}|${stem}(?:e|s|es|ed|ing))`;
  });
  return new RegExp(`\\b${parts.join("\\s+")}\\b`, "i");
}

function vocabularyQuestion(lesson, word, wordIndex, bank, variant = 0) {
  const answer = String(word[0]).trim();
  const gloss = String(word[1] || "").trim();
  if (!answer || !gloss || /cần bổ sung|chưa có nghĩa|chưa rõ/i.test(gloss)) return null;
  const seed = hashString(`${lesson.id}|${wordIndex}|${variant}|${answer}`);
  const example = String(word[2] || "").trim();
  let correctAnswer = answer;
  let candidatePool = bank;
  let questionText = `Từ/cụm từ nào có nghĩa là “${gloss}”?`;
  const questionType = variant % 3;

  if (questionType === 1) {
    correctAnswer = gloss;
    candidatePool = bank.map(term => getTermGloss(term)).filter(Boolean);
    questionText = `“${answer}” có nghĩa tiếng Việt là gì?`;
  } else if (questionType === 2 && example) {
    const pattern = vocabularyPattern(answer);
    if (pattern.test(example)) {
      const blanked = example.replace(pattern, "_____");
      questionText = `Chọn từ/cụm từ phù hợp để hoàn thành câu: “${blanked}”`;
    } else {
      questionText = `Chọn từ tiếng Anh tương ứng với nghĩa “${gloss}”.`;
    }
  } else if (questionType === 2) {
    questionText = `Trong bài học, từ nào mang nghĩa “${gloss}”?`;
  }

  const fallbacks = questionType === 1
    ? ["kiểm tra", "chuẩn bị", "liên hệ", "cuộc họp"]
    : ["prepare reports", "review documents", "make a decision", "contact suppliers"];
  const choices = makeChoiceSet(correctAnswer, candidatePool, seed, fallbacks);
  return {
    q: questionText,
    opts: choices.opts,
    a: choices.a,
    why: `“${answer}” có nghĩa là “${gloss}”.${example ? ` Ví dụ: ${example}` : ""}`
  };
}

function fallbackVocabularyQuestion(lesson, word, wordIndex, bank, variant = 0) {
  const answer = String(word[0] || "").trim();
  if (!answer) return null;
  const seed = hashString(`${lesson.id}|fallback|${wordIndex}|${variant}`);
  const candidates = bank.filter(term => term.toLowerCase() !== answer.toLowerCase());
  const choices = makeChoiceSet(answer, candidates, seed, ["prepare reports", "review documents", "make a decision", "contact suppliers"]);
  const questionForms = [
    "Từ/cụm từ nào xuất hiện trong phần từ vựng của bài học?",
    "Chọn mục từ được trích từ nội dung bài này.",
    "Từ khóa nào có trong danh sách từ vựng của bài?",
    "Trong các lựa chọn, từ nào xuất hiện ở phần học từ vựng?",
    "Chọn từ/cụm từ đã được nhận diện trong bài học."
  ];
  return {
    q: questionForms[variant % questionForms.length],
    opts: choices.opts,
    a: choices.a,
    why: `“${answer}” nằm trong danh sách từ vựng của bài này.`
  };
}

function structureQuestion(lesson, variant) {
  const sentenceCount = parseSentences(lesson.sourceText || "").length;
  const wordCount = (lesson.sourceText || "").match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g)?.length || 0;
  const useWordCount = variant % 2 === 1;
  const answer = useWordCount ? wordCount : sentenceCount;
  const questionForms = useWordCount
    ? ["Có bao nhiêu từ tiếng Anh trong nội dung bạn đã nhập?", "Đếm số từ trong phần nội dung gốc.", "Tổng số từ tiếng Anh trong đoạn là bao nhiêu?", "Bạn đã nhập bao nhiêu từ?", "Hãy chọn số từ có trong văn bản gốc."]
    : ["Nội dung gốc có bao nhiêu câu?", "Đếm số câu đã được tách từ nội dung.", "Số câu trong đoạn bạn nhập là bao nhiêu?", "Bạn đã nhập tổng cộng bao nhiêu câu tiếng Anh?", "Hãy chọn số câu trong nội dung gốc."];
  const choices = [...new Set([answer, answer + 1, Math.max(0, answer - 1), answer + 2])].slice(0, 4);
  return {
    q: questionForms[Math.floor(variant / 2) % questionForms.length],
    opts: choices.map(String),
    a: choices.indexOf(answer),
    why: `Nội dung có ${sentenceCount} câu và ${wordCount} từ tiếng Anh.`
  };
}

function ensureQuestionCount(lesson, bank) {
  const result = [...lesson.qs];
  const seenQuestions = new Set(result.map(question => question.q.toLowerCase()));
  let sequence = 0;
  let safety = 0;
  while (result.length < QUESTIONS_PER_LESSON && lesson.words.length && safety < 60) {
    const wordIndex = sequence % lesson.words.length;
    const variant = sequence;
    const word = lesson.words[wordIndex];
    const question = vocabularyQuestion(lesson, word, wordIndex, bank, variant) || fallbackVocabularyQuestion(lesson, word, wordIndex, bank, variant);
    if (question && !seenQuestions.has(question.q.toLowerCase())) {
      result.push(question);
      seenQuestions.add(question.q.toLowerCase());
    }
    sequence++;
    safety++;
  }
  let structureVariant = 0;
  while (result.length < QUESTIONS_PER_LESSON && structureVariant < 20) {
    const question = structureQuestion(lesson, structureVariant++);
    if (!seenQuestions.has(question.q.toLowerCase())) {
      result.push(question);
      seenQuestions.add(question.q.toLowerCase());
    }
  }
  return result;
}

function buildLessons() {
  indexDictionary(rawLessons);
  const bank = allVocabularyBank();
  const base = rawLessons.map((lesson, index) => normalizeLesson(lesson, `base-${index + 1}`, false));
  const custom = state.customLessons.map(lesson => normalizeLesson(lesson, lesson.id, true));
  lessons = [...base, ...custom].map(lesson => ({ ...lesson, qs: ensureQuestionCount(lesson, bank) }));
  lessonMap = new Map(lessons.map(lesson => [lesson.id, lesson]));
}

function save(options = {}) {
  const { touch = true, sync = true, render = true } = options;
  if (touch) state.updatedAt = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Could not save learning progress:", error);
  }
  if (render) renderStats();
  if (sync) scheduleCloudSync();
}

function mergeStates(localRaw, remoteRaw) {
  const local = normalizeProgress(localRaw);
  const remote = normalizeProgress(remoteRaw);
  const resetAt = Math.max(local.resetAt, remote.resetAt);
  const done = [];
  const doneAt = {};
  const ids = new Set([...local.done, ...remote.done]);
  for (const id of ids) {
    const localTime = local.done.includes(id) ? normalizeTimestamp(local.doneAt[id], local.updatedAt) : 0;
    const remoteTime = remote.done.includes(id) ? normalizeTimestamp(remote.doneAt[id], remote.updatedAt) : 0;
    const time = Math.max(localTime, remoteTime);
    if (time >= resetAt && time > 0) {
      done.push(id);
      doneAt[id] = time;
    }
  }

  const scores = {};
  const scoreAt = {};
  const scoreIds = new Set([...Object.keys(local.scores), ...Object.keys(remote.scores)]);
  for (const id of scoreIds) {
    const localTime = Object.hasOwn(local.scores, id) ? normalizeTimestamp(local.scoreAt[id], local.updatedAt) : 0;
    const remoteTime = Object.hasOwn(remote.scores, id) ? normalizeTimestamp(remote.scoreAt[id], remote.updatedAt) : 0;
    const eligible = [];
    if (localTime >= resetAt && localTime > 0) eligible.push({ score: local.scores[id], time: localTime });
    if (remoteTime >= resetAt && remoteTime > 0) eligible.push({ score: remote.scores[id], time: remoteTime });
    if (eligible.length) {
      scores[id] = Math.max(...eligible.map(entry => entry.score));
      scoreAt[id] = Math.max(...eligible.map(entry => entry.time));
    }
  }

  const known = new Set([...local.knownWords, ...remote.knownWords]);
  const knownWords = [];
  const knownAt = {};
  for (const word of known) {
    const localTime = local.knownWords.includes(word) ? normalizeTimestamp(local.knownAt[word], local.updatedAt) : 0;
    const remoteTime = remote.knownWords.includes(word) ? normalizeTimestamp(remote.knownAt[word], remote.updatedAt) : 0;
    const time = Math.max(localTime, remoteTime);
    if (time >= resetAt && time > 0) {
      knownWords.push(word);
      knownAt[word] = time;
    }
  }

  const streakCandidates = [local, remote]
    .filter(candidate => candidate.streakAt >= resetAt && candidate.streakAt > 0)
    .sort((a, b) => b.streakAt - a.streakAt);
  const latestStreak = streakCandidates[0];
  const customById = new Map();
  for (const lesson of [...local.customLessons, ...remote.customLessons]) {
    const existing = customById.get(lesson.id);
    if (!existing || normalizeTimestamp(lesson.updatedAt, 0) > normalizeTimestamp(existing.updatedAt, 0)) customById.set(lesson.id, lesson);
  }

  return normalizeProgress({
    done, scores,
    lastDate: latestStreak ? latestStreak.lastDate : "",
    streak: latestStreak ? latestStreak.streak : 0,
    knownWords,
    customLessons: [...customById.values()],
    doneAt, scoreAt, knownAt,
    streakAt: latestStreak ? latestStreak.streakAt : 0,
    resetAt,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt)
  });
}

function getCourseLevel(track, levelIndex) {
  return COURSE_LEVELS[track][Math.max(0, Math.min(4, levelIndex))];
}

function renderStats() {
  const availableIds = new Set(lessons.map(lesson => lesson.id));
  const completed = state.done.filter(id => availableIds.has(id)).length;
  const total = lessons.length;
  const percent = total ? Math.round(completed / total * 100) : 0;
  document.getElementById("doneCount").textContent = `${completed} / ${total}`;
  document.getElementById("progressText").textContent = `${percent}% hoàn thành`;
  document.getElementById("progressFill").style.width = `${percent}%`;
  const scores = Object.entries(state.scores).filter(([id, score]) => availableIds.has(id) && Number.isFinite(Number(score))).map(([, score]) => Number(score));
  document.getElementById("scoreCount").textContent = scores.length ? `${Math.max(...scores)}%` : "—";
  document.getElementById("streakCount").textContent = `${state.streak || 0} 🔥`;
}

function renderTrackTabs() {
  for (const track of ["TOEIC", "IELTS"]) {
    const button = document.getElementById(track === "TOEIC" ? "trackTOEIC" : "trackIELTS");
    const active = track === activeTrack;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  }
}

function renderLevelFilters() {
  const container = document.getElementById("levelFilters");
  const levels = COURSE_LEVELS[activeTrack];
  container.innerHTML = levels.map((level, index) => {
    const group = lessons.filter(lesson => lesson.levelIndex === index);
    const complete = group.filter(lesson => state.done.includes(lesson.id)).length;
    return `<button class="level-card ${index === activeLevelIndex ? "active" : ""}" data-level-index="${index}" aria-pressed="${index === activeLevelIndex}">
      <span class="level-name">${escapeHtml(level.label)}</span>
      <span class="level-meta">${escapeHtml(level.description)} · ${complete}/${group.length}</span>
    </button>`;
  }).join("");
  container.querySelectorAll("[data-level-index]").forEach(button => {
    button.addEventListener("click", () => {
      activeLevelIndex = Number(button.dataset.levelIndex);
      visibleCount = PAGE_SIZE;
      renderLevelFilters();
      renderLessons();
      renderWord();
    });
  });
}

function renderLessons() {
  const query = document.getElementById("lessonSearch").value.trim().toLowerCase();
  const inLevel = lessons.filter(lesson => lesson.levelIndex === activeLevelIndex);
  const matches = inLevel.filter(lesson => !query || `${lesson.title} ${lesson.desc} ${lesson.grammar} ${lesson.words.map(word => word.join(" ")).join(" ")}`.toLowerCase().includes(query));
  const level = getCourseLevel(activeTrack, activeLevelIndex);
  const completedInLevel = inLevel.filter(lesson => state.done.includes(lesson.id)).length;
  document.getElementById("lessonCount").textContent = `${lessons.length} bài học · sắp xếp theo cấp độ ${activeTrack}`;
  document.getElementById("resultCount").textContent = `${matches.length} bài trong ${level.label} · ${completedInLevel} đã xong`;

  const container = document.getElementById("lessonList");
  if (!matches.length) {
    container.innerHTML = `<div class="empty">${query ? "Không tìm thấy bài học phù hợp trong cấp độ này." : "Cấp độ này chưa có bài học. Hãy thử cấp độ khác hoặc thêm nội dung của bạn."}</div>`;
    document.getElementById("loadMoreWrap").style.display = "none";
    return;
  }
  const shown = matches.slice(0, visibleCount);
  container.innerHTML = shown.map(lesson => {
    const done = state.done.includes(lesson.id);
    const dayTag = lesson.custom ? "NỘI DUNG CÁ NHÂN" : `BÀI ${String(Number(lesson.id.replace("base-", "")) || 0).padStart(3, "0")}`;
    const progressTag = done ? `<span class="done-tag">✓ Đã hoàn thành</span>` : lesson.custom ? `<span class="custom-tag">Bài của bạn</span>` : `<span class="duration">5 câu hỏi</span>`;
    return `<article class="lesson-card ${done ? "done" : ""}">
      <div class="lesson-top"><span class="day-tag">${dayTag}</span>${progressTag}</div>
      <h4>${escapeHtml(lesson.title)}</h4>
      <p>${escapeHtml(lesson.desc)}</p>
      <div class="card-bottom"><span class="duration">${escapeHtml(getCourseLevel(activeTrack, lesson.levelIndex).label)} · ${escapeHtml(lesson.grammar)}</span><button class="small-btn" data-lesson="${escapeHtml(lesson.id)}">${done ? "Ôn tập" : "Bắt đầu"} →</button></div>
    </article>`;
  }).join("");
  container.querySelectorAll("[data-lesson]").forEach(button => button.addEventListener("click", () => openLesson(button.dataset.lesson)));
  const moreWrap = document.getElementById("loadMoreWrap");
  moreWrap.style.display = matches.length > visibleCount ? "flex" : "none";
}

function renderWord() {
  const container = document.getElementById("wordToday");
  const candidates = lessons.filter(lesson => lesson.levelIndex === activeLevelIndex && lesson.words.length);
  const source = candidates.length ? candidates : lessons.filter(lesson => lesson.words.length);
  if (!source.length) {
    container.innerHTML = `<p class="side-note">Từ vựng sẽ xuất hiện khi có bài học.</p>`;
    return;
  }
  const today = new Date();
  const index = (today.getDate() - 1) % source.length;
  const word = source[index].words[0];
  container.innerHTML = `<div class="word-row"><div><strong>${escapeHtml(word[0])}</strong><small>${escapeHtml(word[1])}</small></div><button class="sound" data-speak="${escapeHtml(word[0])}" aria-label="Nghe phát âm">▶</button></div><p class="side-note">${escapeHtml(word[2])}</p>`;
  wireSpeak();
}

function renderAll() {
  renderTrackTabs();
  renderLevelFilters();
  renderLessons();
  renderStats();
  renderWord();
  wireSpeak();
  updateSyncBadge();
}

function wireSpeak() {
  document.querySelectorAll("[data-speak]").forEach(button => {
    button.onclick = () => speak(button.dataset.speak);
  });
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    alert("Trình duyệt này chưa hỗ trợ phát âm. Hãy thử Chrome hoặc Edge.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice === "US" ? "en-US" : "en-GB";
  utterance.rate = 0.88;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(candidate => candidate.lang === utterance.lang) || voices.find(candidate => candidate.lang.startsWith(utterance.lang));
  if (preferred) utterance.voice = preferred;
  window.speechSynthesis.speak(utterance);
}

function openLesson(id) {
  const lesson = lessonMap.get(id);
  if (!lesson) return;
  currentLessonId = id;
  questionIndex = 0;
  answers = {};
  checked = false;
  document.getElementById("modalToast").textContent = "Tiến độ sẽ được lưu tự động.";
  document.getElementById("lessonBackdrop").classList.add("open");
  renderQuestion();
}

function markKnown(word) {
  if (!state.knownWords.includes(word)) {
    const now = Date.now();
    state.knownWords.push(word);
    state.knownAt[word] = now;
    save();
  }
  renderQuestion();
}

function renderQuestion() {
  const lesson = lessonMap.get(currentLessonId);
  if (!lesson) return;
  const question = lesson.qs[questionIndex];
  if (!question) return;
  const trackTags = `${getCourseLevel("TOEIC", lesson.levelIndex).label} · ${getCourseLevel("IELTS", lesson.levelIndex).label}`;
  document.getElementById("modalEyebrow").textContent = `${trackTags} · ${lesson.grammar}`;
  document.getElementById("modalTitle").textContent = lesson.title;
  document.getElementById("modalSub").textContent = lesson.desc;

  const visibleWords = lesson.words.filter(word => !state.knownWords.includes(word[0]));
  const wordsBlock = `<div class="block"><h4>📚 Từ vựng</h4><p class="side-note">Bấm “Đã biết” để ẩn từ này trong các bài học trên thiết bị của bạn.</p>${visibleWords.length
    ? visibleWords.map(word => `<div class="word-row"><div><strong>${escapeHtml(word[0])}</strong><small>${escapeHtml(word[1])}</small><p class="side-note">${escapeHtml(word[2])}</p></div><div style="display:flex;gap:6px;align-items:center"><button class="sound" data-speak="${escapeHtml(word[2] || word[0])}" aria-label="Nghe câu mẫu">▶</button><button class="small-btn" data-known="${escapeHtml(word[0])}">Đã biết ✓</button></div></div>`).join("")
    : `<p class="side-note">Bạn đã đánh dấu biết hết từ vựng trong bài này rồi 🎉</p>`}</div>`;
  const options = question.opts.map((option, index) => `<button class="option ${answers[questionIndex] === index ? "selected" : ""}" data-opt="${index}" type="button">${String.fromCharCode(65 + index)}. ${escapeHtml(option)}</button>`).join("");
  const isCorrect = answers[questionIndex] === question.a;
  const feedback = checked
    ? `${isCorrect ? "✓ Chính xác! " : `✗ Chưa đúng. Đáp án: ${question.opts[question.a]}. `}${question.why}`
    : "Chọn một đáp án rồi bấm Kiểm tra.";
  const feedbackClass = checked ? (isCorrect ? "good" : "bad") : "";
  const questionBlock = `<div class="block"><div class="eyebrow">CÂU HỎI ${questionIndex + 1} / ${lesson.qs.length}</div><div class="exercise-question">${escapeHtml(question.q)}</div><div class="options">${options}</div><div class="feedback ${feedbackClass}" id="feedback">${escapeHtml(feedback)}</div></div>`;
  document.getElementById("modalContent").innerHTML = wordsBlock + questionBlock;

  document.querySelectorAll("[data-opt]").forEach(button => button.addEventListener("click", () => {
    if (checked) return;
    answers[questionIndex] = Number(button.dataset.opt);
    renderQuestion();
  }));
  document.querySelectorAll("[data-known]").forEach(button => button.addEventListener("click", () => markKnown(button.dataset.known)));
  wireSpeak();
  document.getElementById("prevQuestion").textContent = questionIndex === 0 ? "← Đóng bài" : "← Câu trước";
  document.getElementById("nextQuestion").textContent = checked
    ? (questionIndex === lesson.qs.length - 1 ? "Hoàn thành bài ✓" : "Câu tiếp theo →")
    : "Kiểm tra đáp án";
  document.getElementById("nextQuestion").onclick = nextAction;
  document.getElementById("prevQuestion").onclick = () => {
    if (questionIndex === 0) closeLesson();
    else {
      questionIndex--;
      checked = false;
      renderQuestion();
    }
  };
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextAction() {
  const lesson = lessonMap.get(currentLessonId);
  if (!lesson) return;
  const question = lesson.qs[questionIndex];
  if (!checked) {
    if (answers[questionIndex] === undefined) {
      const feedback = document.getElementById("feedback");
      feedback.textContent = "Chọn một đáp án trước nhé.";
      feedback.className = "feedback bad";
      return;
    }
    checked = true;
    renderQuestion();
    return;
  }
  if (questionIndex < lesson.qs.length - 1) {
    questionIndex++;
    checked = false;
    renderQuestion();
    return;
  }

  const correct = lesson.qs.reduce((total, item, index) => total + (answers[index] === item.a ? 1 : 0), 0);
  const score = Math.round(correct / lesson.qs.length * 100);
  const now = Date.now();
  state.scores[lesson.id] = Math.max(state.scores[lesson.id] || 0, score);
  state.scoreAt[lesson.id] = now;
  if (!state.done.includes(lesson.id)) state.done.push(lesson.id);
  state.doneAt[lesson.id] = now;
  const today = localDateString();
  if (state.lastDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    state.streak = state.lastDate === localDateString(yesterday) ? (state.streak || 0) + 1 : 1;
    state.lastDate = today;
    state.streakAt = now;
  }
  save();
  renderAll();
  document.getElementById("modalContent").innerHTML = `<div class="block" style="text-align:center;padding:30px"><div style="font-size:42px">${score === 100 ? "🎉" : "🌱"}</div><h3 style="font:28px Georgia,serif">Hoàn thành bài học!</h3><p>Bạn trả lời đúng ${correct}/${lesson.qs.length} câu.</p><div style="font:42px Georgia,serif;color:var(--brown)">${score}%</div><p class="side-note">Hãy đọc lại câu mẫu và thử nói thành tiếng nhé.</p></div>`;
  document.getElementById("prevQuestion").style.display = "none";
  document.getElementById("nextQuestion").textContent = "Đóng bài";
  document.getElementById("nextQuestion").onclick = closeLesson;
  document.getElementById("modalToast").textContent = getSyncConfig() ? "Đã lưu trên thiết bị này; sẽ tự đồng bộ lên cloud." : "Đã lưu tiến độ trên thiết bị này.";
}

function closeLesson() {
  document.getElementById("lessonBackdrop").classList.remove("open");
  document.getElementById("prevQuestion").style.display = "";
  currentLessonId = null;
  renderStats();
}

function continueLearning(random = false) {
  const group = lessons.filter(lesson => lesson.levelIndex === activeLevelIndex);
  const candidates = group.length ? group : lessons;
  if (!candidates.length) return;
  if (random) {
    const index = Math.floor(Math.random() * candidates.length);
    openLesson(candidates[index].id);
    return;
  }
  const next = candidates.find(lesson => !state.done.includes(lesson.id)) || candidates[0];
  openLesson(next.id);
}

function setTrack(track) {
  if (!COURSE_LEVELS[track]) return;
  activeTrack = track;
  renderTrackTabs();
  renderLevelFilters();
  renderLessons();
  renderWord();
}

function setupEventListeners() {
  document.getElementById("continueBtn").addEventListener("click", () => continueLearning(false));
  document.getElementById("quickQuiz").addEventListener("click", () => continueLearning(true));
  document.getElementById("lessonSearch").addEventListener("input", () => {
    visibleCount = PAGE_SIZE;
    renderLessons();
  });
  document.getElementById("loadMoreBtn").addEventListener("click", () => {
    visibleCount += PAGE_SIZE;
    renderLessons();
  });
  document.querySelectorAll("[data-track]").forEach(button => button.addEventListener("click", () => setTrack(button.dataset.track)));
  document.getElementById("voiceToggle").addEventListener("click", () => {
    voice = voice === "US" ? "UK" : "US";
    document.getElementById("voiceLabel").textContent = `${voice} voice`;
    speak(voice === "US" ? "Hello! Let's practice English." : "Hello! Let's practise English.");
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (!confirm("Xóa tiến độ, điểm, chuỗi ngày và từ đã biết trên thiết bị này? Nếu đã bật đồng bộ, thao tác này cũng sẽ xóa tiến độ cũ khỏi các thiết bị khác. Nội dung cá nhân vẫn được giữ lại.")) return;
    const now = Date.now();
    state.done = [];
    state.scores = {};
    state.lastDate = "";
    state.streak = 0;
    state.knownWords = [];
    state.doneAt = {};
    state.scoreAt = {};
    state.knownAt = {};
    state.streakAt = 0;
    state.resetAt = now;
    save();
    renderAll();
  });
  document.getElementById("closeLesson").addEventListener("click", closeLesson);
  document.getElementById("lessonBackdrop").addEventListener("click", event => {
    if (event.target.id === "lessonBackdrop") closeLesson();
  });

  document.getElementById("addContentBtn").addEventListener("click", openContentModal);
  document.getElementById("closeContent").addEventListener("click", closeContentModal);
  document.getElementById("cancelContent").addEventListener("click", closeContentModal);
  document.getElementById("contentBackdrop").addEventListener("click", event => {
    if (event.target.id === "contentBackdrop") closeContentModal();
  });
  document.getElementById("analyzeContentBtn").addEventListener("click", analyzeContent);
  document.getElementById("contentLevelOverride").addEventListener("change", renderAnalysisPreview);
  document.getElementById("saveCustomLesson").addEventListener("click", saveCustomLesson);

  document.getElementById("syncBtn").addEventListener("click", openSyncModal);
  document.getElementById("closeSync").addEventListener("click", closeSyncModal);
  document.getElementById("syncBackdrop").addEventListener("click", event => {
    if (event.target.id === "syncBackdrop") closeSyncModal();
  });
  document.getElementById("generateSyncCode").addEventListener("click", () => {
    document.getElementById("syncCode").value = createSyncCode();
  });
  document.getElementById("copySyncCode").addEventListener("click", async () => {
    const input = document.getElementById("syncCode");
    if (!input.value.trim()) input.value = createSyncCode();
    await copyText(input.value.trim(), "Đã sao chép mã đồng bộ.");
  });
  document.getElementById("copySyncSql").addEventListener("click", async () => {
    await copyText(document.getElementById("syncSql").textContent, "Đã sao chép SQL.");
  });
  document.getElementById("saveSyncConfig").addEventListener("click", saveSyncConfiguration);
  document.getElementById("syncNowBtn").addEventListener("click", () => syncNow(false));

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (document.getElementById("lessonBackdrop").classList.contains("open")) closeLesson();
    if (document.getElementById("contentBackdrop").classList.contains("open")) closeContentModal();
    if (document.getElementById("syncBackdrop").classList.contains("open")) closeSyncModal();
  });
  window.addEventListener("storage", event => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      state = mergeStates(state, JSON.parse(event.newValue));
      save({ touch: false, sync: false, render: false });
      buildLessons();
      renderAll();
    } catch (error) {
      console.warn("Could not merge progress from another browser tab:", error);
    }
  });
  window.addEventListener("focus", () => { if (getSyncConfig()) syncNow(true); });
  window.addEventListener("online", () => { if (getSyncConfig()) syncNow(true); });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && getSyncConfig()) syncNow(true);
  });
}

function parseSentences(text) {
  const cleaned = String(text || "")
    .replace(/\r/g, "\n")
    .replace(/\([A-H]\)\s*/gi, "\n")
    .replace(/(^|\n)\s*[A-H][.)]\s*/g, "$1")
    .replace(/[•●▪]/g, " ")
    .trim();
  const sentences = [];
  for (const line of cleaned.split(/\n+/)) {
    const trimmed = line.trim().replace(/^[-–—]\s*/, "");
    if (!trimmed) continue;
    const parts = trimmed.match(/[^.!?]+(?:[.!?]+|$)/g) || [trimmed];
    for (const part of parts) {
      const sentence = part.trim();
      if (sentence.length > 1 && !sentences.some(existing => existing.toLowerCase() === sentence.toLowerCase())) sentences.push(sentence);
    }
  }
  return sentences;
}

function findGrammarPatterns(sentences) {
  const combined = sentences.join(" ");
  const patterns = [];
  const passiveExample = sentences.find(sentence => /\b(am|is|are|was|were)\s+being\s+[a-z]+(?:ed|en|wn|ght|aught|ought)\b/i.test(sentence));
  if (passiveExample) patterns.push({
    id: "continuous-passive",
    label: "Bị động hiện tại tiếp diễn",
    rule: "am / is / are + being + quá khứ phân từ (V3)",
    example: passiveExample
  });
  const activeExample = sentences.find(sentence => /\b(am|is|are)\s+(?!being\b)[a-z]+ing\b/i.test(sentence));
  if (activeExample) patterns.push({
    id: "continuous-active",
    label: "Hiện tại tiếp diễn — chủ động",
    rule: "Chủ ngữ + am / is / are + V-ing",
    example: activeExample
  });
  if (/\b(can|could|may|might|must|shall|should|will|would)\b/i.test(combined)) patterns.push({
    id: "modal",
    label: "Động từ khuyết thiếu",
    rule: "Động từ khuyết thiếu + động từ nguyên mẫu",
    example: sentences.find(sentence => /\b(can|could|may|might|must|shall|should|will|would)\b/i.test(sentence)) || ""
  });
  if (/\b(if|unless)\b/i.test(combined) && /\b(will|would|can|could)\b/i.test(combined)) patterns.push({
    id: "conditional",
    label: "Câu điều kiện",
    rule: "Mệnh đề if + mệnh đề kết quả; chọn thì theo ý nghĩa câu",
    example: sentences.find(sentence => /\b(if|unless)\b/i.test(sentence)) || ""
  });
  if (/\b(more\s+\w+\s+than|\w+er\s+than|the most\s+\w+|the \w+est)\b/i.test(combined)) patterns.push({
    id: "comparison",
    label: "So sánh",
    rule: "So sánh hơn: -er / more + tính từ + than",
    example: sentences.find(sentence => /\b(more\s+\w+\s+than|\w+er\s+than|the most\s+\w+|the \w+est)\b/i.test(sentence)) || ""
  });
  if (!patterns.length) {
    const hasArticle = /\b(a|an|the|some|any)\b/i.test(combined);
    patterns.push({
      id: "sentence-structure",
      label: hasArticle ? "Mạo từ và cụm danh từ" : "Cấu trúc câu và từ vựng",
      rule: hasArticle ? "Chú ý mạo từ, từ chỉ lượng và danh từ đi sau." : "Quan sát chủ ngữ, động từ và cụm từ chính trong mỗi câu.",
      example: sentences[0] || ""
    });
  }
  return patterns;
}

function findVocabulary(sentences) {
  const found = new Map();
  const coveredByPhrase = [];
  let baseOffset = 0;
  for (const sentence of sentences) {
    for (const detector of PHRASAL_VERBS) {
      const regex = new RegExp(detector.pattern.source, "gi");
      for (const match of sentence.matchAll(regex)) {
        const term = detector.term;
        const offset = baseOffset + match.index;
        const existing = found.get(term);
        if (existing) existing.count++;
        else found.set(term, { term, gloss: detector.gloss || getTermGloss(term), example: sentence, count: 1, offset });
        coveredByPhrase.push({ start: baseOffset + match.index, end: baseOffset + match.index + match[0].length });
      }
    }
    const tokenPattern = /[A-Za-z]+(?:['’][A-Za-z]+)?/g;
    for (const match of sentence.matchAll(tokenPattern)) {
      const absoluteStart = baseOffset + match.index;
      if (coveredByPhrase.some(range => absoluteStart >= range.start && absoluteStart < range.end)) continue;
      const surface = match[0].toLowerCase().replace(/[’']/g, "");
      if (STOP_WORDS.has(surface) || surface.length < 3) continue;
      const term = normalizeEnglishToken(surface);
      if (STOP_WORDS.has(term) || term.length < 3) continue;
      if (/^\d+$/.test(term)) continue;
      const existing = found.get(term);
      if (existing) {
        existing.count++;
        continue;
      }
      found.set(term, { term, gloss: getTermGloss(term), example: sentence, count: 1, offset: absoluteStart });
    }
    baseOffset += sentence.length + 1;
  }
  return [...found.values()].sort((a, b) => a.offset - b.offset).slice(0, 14);
}

function estimateContentLevel(sentences, vocabulary, grammar) {
  const text = `${sentences.join(" ")} ${vocabulary.map(word => word.term).join(" ")}`.toLowerCase();
  let level = 0;
  if (grammar.some(pattern => pattern.id === "continuous-passive" || pattern.id === "conditional")) level += 1;
  if (/academic|sustainab|infrastructure|consequent|significant|regulation|implementation|approximately|nevertheless|moreover|therefore/.test(text)) level += 2;
  if (vocabulary.filter(word => word.term.length >= 9).length >= 3) level += 1;
  if (sentences.length >= 8 || sentences.some(sentence => sentence.split(/\s+/).length >= 20)) level += 1;
  return Math.max(0, Math.min(4, level));
}

function makeShuffledQuestion(questionText, correctAnswer, distractorAnswers, why, seedText) {
  const correct = String(correctAnswer);
  const choices = [...new Set([correct, ...distractorAnswers.map(String).filter(Boolean)])].slice(0, 4);
  const fallbacks = ["do the work", "is doing the work", "are doing the work", "did the work"];
  for (const fallback of fallbacks) {
    if (choices.length >= 4) break;
    if (!choices.some(item => item.toLowerCase() === fallback.toLowerCase())) choices.push(fallback);
  }
  const seed = hashString(seedText);
  const correctIndex = seed % choices.length;
  const rest = choices.filter((_, index) => index !== 0);
  const options = new Array(choices.length);
  options[correctIndex] = correct;
  let restIndex = 0;
  for (let index = 0; index < options.length; index++) if (index !== correctIndex) options[index] = rest[restIndex++];
  return { q: questionText, opts: options, a: correctIndex, why };
}

function grammarQuestions(sentences, grammar) {
  const questions = [];
  const passiveIndex = sentences.findIndex(sentence => /\b(am|is|are|was|were)\s+being\s+[a-z]+(?:ed|en|wn|ght|aught|ought)\b/i.test(sentence));
  if (passiveIndex >= 0) {
    let optionSentences = sentences.slice(0, 4);
    if (!optionSentences.includes(sentences[passiveIndex])) {
      optionSentences = [...optionSentences.slice(0, 3), sentences[passiveIndex]];
    }
    optionSentences = [...new Set(optionSentences)];
    if (optionSentences.length >= 2) {
      questions.push({
        q: "Câu nào sử dụng thể bị động hiện tại tiếp diễn?",
        opts: optionSentences,
        a: optionSentences.indexOf(sentences[passiveIndex]),
        why: "Bị động hiện tại tiếp diễn có cấu trúc am/is/are + being + V3."
      });
    }
  }

  const activeSentence = sentences.find(sentence => /^.+?\s+(am|is|are)\s+(?!being\b)[a-z]+ing\b/i.test(sentence));
  if (activeSentence) {
    const match = activeSentence.match(/^(.+?)\s+(am|is|are)\s+([a-z]+ing)\b(.*)$/i);
    if (match) {
      const [, subject, auxiliary, verb, tail] = match;
      const lowerAuxiliary = auxiliary.toLowerCase();
      const oppositeAuxiliary = lowerAuxiliary === "is" ? "are" : lowerAuxiliary === "are" ? "is" : "am";
      const baseVerb = normalizeEnglishToken(verb);
      const correct = `${lowerAuxiliary} ${verb.toLowerCase()}`;
      const question = `Hoàn thành câu: ${subject.trim()} ___${tail}`;
      const options = makeShuffledQuestion(
        question,
        correct,
        [`${oppositeAuxiliary} ${verb.toLowerCase()}`, `${lowerAuxiliary} ${baseVerb}`, `${baseVerb}s`],
        "Hiện tại tiếp diễn chủ động dùng am/is/are + V-ing; chủ ngữ số ít đi với is.",
        `active-${activeSentence}`
      );
      questions.push(options);
    }
  }

  return questions;
}

function openContentModal() {
  analysisDraft = null;
  document.getElementById("contentText").value = "";
  document.getElementById("customLessonTitle").value = "";
  document.getElementById("contentLevelOverride").value = "auto";
  document.getElementById("analysisPreview").innerHTML = "";
  document.getElementById("analysisPreview").classList.remove("visible");
  document.getElementById("saveCustomLesson").disabled = true;
  document.getElementById("contentBackdrop").classList.add("open");
  document.getElementById("contentText").focus();
}

function closeContentModal() {
  document.getElementById("contentBackdrop").classList.remove("open");
}

function analyzeContent() {
  const source = document.getElementById("contentText").value.trim();
  if (source.length < 8) {
    alert("Hãy dán ít nhất một câu hoặc cụm tiếng Anh để phân tích.");
    return;
  }
  const sentences = parseSentences(source);
  if (!sentences.length) {
    alert("Chưa tách được câu tiếng Anh. Hãy kiểm tra lại nội dung đã nhập.");
    return;
  }
  const grammar = findGrammarPatterns(sentences);
  const vocabulary = findVocabulary(sentences);
  const levelIndex = estimateContentLevel(sentences, vocabulary, grammar);
  analysisDraft = { source, sentences, grammar, vocabulary, levelIndex };
  if (!document.getElementById("customLessonTitle").value.trim()) {
    const examples = vocabulary.slice(0, 2).map(word => word.term);
    document.getElementById("customLessonTitle").value = examples.length ? `Nội dung cá nhân · ${examples.join(" & ")}` : "Nội dung cá nhân mới";
  }
  renderAnalysisPreview();
  document.getElementById("saveCustomLesson").disabled = false;
}

function renderAnalysisPreview() {
  if (!analysisDraft) return;
  const override = document.getElementById("contentLevelOverride").value;
  const levelIndex = override === "auto" ? analysisDraft.levelIndex : Number(override);
  const preview = document.getElementById("analysisPreview");
  const grammarHtml = analysisDraft.grammar.map(pattern => `<div class="grammar-note"><strong>${escapeHtml(pattern.label)} · ${escapeHtml(pattern.rule)}</strong>${pattern.example ? `<span class="side-note">Ví dụ: ${escapeHtml(pattern.example)}</span>` : ""}</div>`).join("");
  const vocabularyHtml = analysisDraft.vocabulary.length
    ? analysisDraft.vocabulary.map((word, index) => `<label class="vocab-edit-row"><span><strong>${escapeHtml(word.term)}</strong><small>${escapeHtml(word.example)}</small></span><input data-gloss-index="${index}" type="text" value="${escapeHtml(word.gloss)}" placeholder="Nhập nghĩa tiếng Việt nếu chưa có"></label>`).join("")
    : `<p class="side-note">Chưa trích xuất được từ khóa riêng. Bài học vẫn được tạo từ các câu bạn đã nhập.</p>`;
  preview.innerHTML = `<div class="block"><h4>🔎 Kết quả phân tích</h4>
    <div class="analysis-summary">
      <div class="summary-chip"><strong>${analysisDraft.sentences.length} câu</strong>Đã tách từ nội dung</div>
      <div class="summary-chip"><strong>${analysisDraft.vocabulary.length} từ/cụm từ</strong>Có thể chỉnh nghĩa bên dưới</div>
      <div class="summary-chip"><strong>${escapeHtml(getCourseLevel("TOEIC", levelIndex).label)} · ${escapeHtml(getCourseLevel("IELTS", levelIndex).label)}</strong>${override === "auto" ? "Mức tự động gợi ý" : "Mức bạn chọn"}</div>
    </div>
    <h4>Ngữ pháp nhận diện</h4>${grammarHtml}
    <h4 style="margin-top:16px">Từ vựng — nhấn vào ô nghĩa để chỉnh</h4><div class="vocab-editor">${vocabularyHtml}</div>
    <p class="side-note" style="margin-top:12px">Mức độ được ước lượng theo cấu trúc và độ khó từ vựng, không phải điểm thi chính thức. Từ chưa có nghĩa trong từ điển sẽ để trống để bạn tự bổ sung.</p>
  </div>`;
  preview.classList.add("visible");
}

function makeCustomId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return `custom-${window.crypto.randomUUID()}`;
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function saveCustomLesson() {
  if (!analysisDraft) return;
  const levelValue = document.getElementById("contentLevelOverride").value;
  const levelIndex = levelValue === "auto" ? analysisDraft.levelIndex : Number(levelValue);
  const translations = new Map();
  document.querySelectorAll("[data-gloss-index]").forEach(input => translations.set(Number(input.dataset.glossIndex), input.value.trim()));
  const words = analysisDraft.vocabulary.map((word, index) => [
    word.term,
    translations.get(index) || "Cần bổ sung nghĩa",
    word.example
  ]);
  const titleInput = document.getElementById("customLessonTitle").value.trim();
  const title = titleInput || "Nội dung cá nhân mới";
  const grammar = analysisDraft.grammar.map(pattern => pattern.label).join(" · ") || "Cấu trúc câu";
  const lesson = {
    id: makeCustomId(),
    custom: true,
    title,
    desc: `Tạo từ ${analysisDraft.sentences.length} câu bạn nhập · ${words.length} từ/cụm từ được trích xuất.`,
    grammar,
    words,
    qs: grammarQuestions(analysisDraft.sentences, analysisDraft.grammar),
    sourceText: analysisDraft.source,
    levelIndex,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.customLessons.push(lesson);
  save();
  buildLessons();
  activeLevelIndex = levelIndex;
  visibleCount = PAGE_SIZE;
  document.getElementById("lessonSearch").value = "";
  renderAll();
  closeContentModal();
  document.getElementById("lessonList").scrollIntoView({ behavior: "smooth", block: "start" });
}

function loadSyncConfig() {
  try {
    const saved = localStorage.getItem(SYNC_CONFIG_KEY);
    if (!saved) return null;
    const config = JSON.parse(saved);
    if (!config || !config.url || !config.anonKey || !config.syncCode) return null;
    return {
      url: String(config.url).replace(/\/+$/, ""),
      anonKey: String(config.anonKey),
      syncCode: String(config.syncCode).trim()
    };
  } catch {
    return null;
  }
}

function getSyncConfig() {
  return loadSyncConfig();
}

function updateSyncBadge() {
  const config = getSyncConfig();
  const label = document.getElementById("syncBadge");
  const footer = document.getElementById("footerSyncText");
  if (!config) {
    label.textContent = "Chỉ thiết bị này";
    footer.textContent = "Chưa bật đồng bộ";
    return;
  }
  if (lastSyncType === "error") {
    label.textContent = "Lỗi đồng bộ";
    footer.textContent = "Có lỗi đồng bộ — mở mục Đồng bộ để xem";
  } else if (syncInProgress) {
    label.textContent = "Đang đồng bộ…";
    footer.textContent = "Đang đồng bộ cloud";
  } else if (lastSyncType === "ok") {
    label.textContent = "Đã đồng bộ";
    footer.textContent = "Đồng bộ cloud đã bật";
  } else {
    label.textContent = "Cloud đã cấu hình";
    footer.textContent = "Cloud đã cấu hình — sẽ đồng bộ khi kết nối";
  }
}

function setSyncStatus(message, type = "") {
  lastSyncMessage = message;
  lastSyncType = type;
  const box = document.getElementById("syncStatus");
  if (box) {
    box.textContent = message;
    box.className = `sync-status ${type}`.trim();
  }
  updateSyncBadge();
}

function openSyncModal() {
  const config = getSyncConfig();
  if (config) {
    document.getElementById("syncProjectUrl").value = config.url;
    document.getElementById("syncAnonKey").value = config.anonKey;
    document.getElementById("syncCode").value = config.syncCode;
  }
  setSyncStatus(lastSyncMessage, lastSyncType);
  document.getElementById("syncBackdrop").classList.add("open");
}

function closeSyncModal() {
  document.getElementById("syncBackdrop").classList.remove("open");
}

function createSyncCode() {
  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(20);
    window.crypto.getRandomValues(bytes);
    return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

async function copyText(text, successMessage) {
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else {
      const input = document.createElement("textarea");
      input.value = text;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setSyncStatus(successMessage, "");
  } catch (error) {
    setSyncStatus("Không sao chép tự động được; hãy chọn và sao chép nội dung thủ công.", "error");
  }
}

function validateSyncConfig(config) {
  if (!config.url || !config.anonKey || !config.syncCode) return "Hãy nhập Project URL, public key và mã đồng bộ.";
  if (config.syncCode.length < 16) return "Mã đồng bộ nên có ít nhất 16 ký tự. Hãy tạo mã ngẫu nhiên để an toàn hơn.";
  try {
    const parsed = new URL(config.url);
    const localDevelopment = parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !localDevelopment) return "Project URL cần bắt đầu bằng https://.";
  } catch {
    return "Project URL chưa đúng định dạng, ví dụ https://your-project.supabase.co.";
  }
  return "";
}

async function saveSyncConfiguration() {
  const config = {
    url: document.getElementById("syncProjectUrl").value.trim().replace(/\/+$/, ""),
    anonKey: document.getElementById("syncAnonKey").value.trim(),
    syncCode: document.getElementById("syncCode").value.trim()
  };
  const validationError = validateSyncConfig(config);
  if (validationError) {
    setSyncStatus(validationError, "error");
    return;
  }
  try {
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
  } catch {
    setSyncStatus("Không lưu được cấu hình trong trình duyệt này.", "error");
    return;
  }
  syncInitialized = false;
  await syncNow(false);
}

function supabaseHeaders(config) {
  const headers = {
    apikey: config.anonKey,
    // x-client-info is a standard Supabase CORS header; use it to carry the private sync code.
    "x-client-info": config.syncCode
  };
  // Legacy anon keys are JWTs. New sb_publishable keys belong in apikey only.
  if (!config.anonKey.startsWith("sb_publishable_")) headers.Authorization = `Bearer ${config.anonKey}`;
  return headers;
}

async function fetchRemoteProgress(config) {
  const endpoint = `${config.url}/rest/v1/english_learning_progress?sync_id=eq.${encodeURIComponent(config.syncCode)}&select=payload`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { ...supabaseHeaders(config), Accept: "application/json" }
  });
  if (!response.ok) throw new Error(await response.text() || `Cloud returned ${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0].payload : null;
}

async function pushRemoteProgress(config, payload) {
  const endpoint = `${config.url}/rest/v1/english_learning_progress?on_conflict=sync_id`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...supabaseHeaders(config),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({
      sync_id: config.syncCode,
      payload,
      updated_at: new Date().toISOString()
    })
  });
  if (!response.ok) throw new Error(await response.text() || `Cloud returned ${response.status}`);
}

function briefError(error) {
  const message = String(error && error.message ? error.message : error);
  if (/failed to fetch|networkerror|load failed/i.test(message)) return "Không kết nối được Supabase. Kiểm tra mạng, Project URL và CORS/cấu hình project.";
  if (/permission|row-level security|42501|401|403/i.test(message)) return "Supabase từ chối quyền truy cập. Kiểm tra anon key, mã đồng bộ và chạy đúng SQL RLS trong phần thiết lập.";
  if (/404|relation|table/i.test(message)) return "Không tìm thấy bảng đồng bộ. Hãy chạy SQL tạo bảng ở phần thiết lập Supabase.";
  return `Đồng bộ thất bại: ${message.slice(0, 220)}`;
}

async function syncNow(quiet = false) {
  const config = getSyncConfig();
  if (!config) {
    setSyncStatus("Chưa cấu hình. Hãy điền Supabase URL, anon key và cùng một mã trên các thiết bị.", "");
    return;
  }
  const validationError = validateSyncConfig(config);
  if (validationError) {
    setSyncStatus(validationError, "error");
    return;
  }
  if (syncInProgress) {
    syncRequestedAgain = true;
    return;
  }
  syncInProgress = true;
  setSyncStatus("Đang lấy tiến độ mới nhất và gộp dữ liệu…", "");
  try {
    const remote = await fetchRemoteProgress(config);
    if (remote && typeof remote === "object") state = mergeStates(state, remote);
    save({ touch: false, sync: false, render: false });
    buildLessons();
    renderAll();
    const payloadToPush = JSON.parse(JSON.stringify(state));
    await pushRemoteProgress(config, payloadToPush);
    syncInitialized = true;
    const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    setSyncStatus(`Đồng bộ thành công lúc ${time}. Tiến độ và ${state.customLessons.length} bài cá nhân đã được cập nhật.`, "ok");
    if (JSON.stringify(state) !== JSON.stringify(payloadToPush)) syncRequestedAgain = true;
  } catch (error) {
    syncInitialized = false;
    setSyncStatus(briefError(error), "error");
    if (!quiet) console.error("Cloud sync failed:", error);
  } finally {
    syncInProgress = false;
    updateSyncBadge();
    if (syncRequestedAgain) {
      syncRequestedAgain = false;
      window.setTimeout(() => syncNow(true), 250);
    }
  }
}

function scheduleCloudSync() {
  if (!getSyncConfig() || !syncInitialized) return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => syncNow(true), 800);
}

function initialize() {
  setupEventListeners();
  updateSyncBadge();
  fetch("lessons.json")
    .then(response => {
      if (!response.ok) throw new Error(`Could not load lessons.json (${response.status})`);
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data)) throw new Error("lessons.json does not contain a lesson list");
      rawLessons = data;
      buildLessons();
      renderAll();
      if (getSyncConfig()) syncNow(true);
    })
    .catch(error => {
      console.error("Error loading lessons:", error);
      document.getElementById("lessonCount").textContent = "Không tải được dữ liệu bài học.";
      document.getElementById("lessonList").innerHTML = `<div class="empty">Không tải được <code>lessons.json</code>. Hãy chạy website qua máy chủ local hoặc mở bản đã triển khai, không mở trực tiếp file HTML.</div>`;
      renderStats();
    });
}

document.addEventListener("DOMContentLoaded", initialize);
