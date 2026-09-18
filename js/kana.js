/** @typedef {{ kana: string, romaji: string }} Glyph */
/** @typedef {{ id: string, script: 'hiragana' | 'katakana', section: 'gojuon' | 'dakuten' | 'youon', title: string, slots: (Glyph | null)[] }} Group */
/** @typedef {{ id: string, script: 'hiragana' | 'katakana', groupId: string, kana: string, romaji: string }} Card */

function group(id, script, section, title, pairs) {
  return {
    id,
    script,
    section,
    title,
    slots: pairs.map(([kana, romaji]) => (kana ? { kana, romaji } : null)),
  };
}

const HIRAGANA = [
  group("h-a", "hiragana", "gojuon", "a", [["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"]]),
  group("h-ka", "hiragana", "gojuon", "ka", [["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"]]),
  group("h-sa", "hiragana", "gojuon", "sa", [["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"]]),
  group("h-ta", "hiragana", "gojuon", "ta", [["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"]]),
  group("h-na", "hiragana", "gojuon", "na", [["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"]]),
  group("h-ha", "hiragana", "gojuon", "ha", [["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"]]),
  group("h-ma", "hiragana", "gojuon", "ma", [["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"]]),
  group("h-ya", "hiragana", "gojuon", "ya", [["や", "ya"], ["", ""], ["ゆ", "yu"], ["", ""], ["よ", "yo"]]),
  group("h-ra", "hiragana", "gojuon", "ra", [["ら", "ra"], ["り", "ri"], ["る", "ru"], ["れ", "re"], ["ろ", "ro"]]),
  group("h-wa", "hiragana", "gojuon", "wa", [["わ", "wa"], ["", ""], ["", ""], ["", ""], ["を", "wo"]]),
  group("h-n", "hiragana", "gojuon", "n", [["", ""], ["", ""], ["", ""], ["", ""], ["ん", "n"]]),
  group("h-ga", "hiragana", "dakuten", "ga", [["が", "ga"], ["ぎ", "gi"], ["ぐ", "gu"], ["げ", "ge"], ["ご", "go"]]),
  group("h-za", "hiragana", "dakuten", "za", [["ざ", "za"], ["じ", "ji"], ["ず", "zu"], ["ぜ", "ze"], ["ぞ", "zo"]]),
  group("h-da", "hiragana", "dakuten", "da", [["だ", "da"], ["ぢ", "di"], ["づ", "du"], ["で", "de"], ["ど", "do"]]),
  group("h-ba", "hiragana", "dakuten", "ba", [["ば", "ba"], ["び", "bi"], ["ぶ", "bu"], ["べ", "be"], ["ぼ", "bo"]]),
  group("h-pa", "hiragana", "dakuten", "pa", [["ぱ", "pa"], ["ぴ", "pi"], ["ぷ", "pu"], ["ぺ", "pe"], ["ぽ", "po"]]),
  group("h-kya", "hiragana", "youon", "kya", [["きゃ", "kya"], ["きゅ", "kyu"], ["きょ", "kyo"]]),
  group("h-sha", "hiragana", "youon", "sha", [["しゃ", "sha"], ["しゅ", "shu"], ["しょ", "sho"]]),
  group("h-cha", "hiragana", "youon", "cha", [["ちゃ", "cha"], ["ちゅ", "chu"], ["ちょ", "cho"]]),
  group("h-nya", "hiragana", "youon", "nya", [["にゃ", "nya"], ["にゅ", "nyu"], ["にょ", "nyo"]]),
  group("h-hya", "hiragana", "youon", "hya", [["ひゃ", "hya"], ["ひゅ", "hyu"], ["ひょ", "hyo"]]),
  group("h-mya", "hiragana", "youon", "mya", [["みゃ", "mya"], ["みゅ", "myu"], ["みょ", "myo"]]),
  group("h-rya", "hiragana", "youon", "rya", [["りゃ", "rya"], ["りゅ", "ryu"], ["りょ", "ryo"]]),
  group("h-gya", "hiragana", "youon", "gya", [["ぎゃ", "gya"], ["ぎゅ", "gyu"], ["ぎょ", "gyo"]]),
  group("h-ja", "hiragana", "youon", "ja", [["じゃ", "ja"], ["じゅ", "ju"], ["じょ", "jo"]]),
  group("h-bya", "hiragana", "youon", "bya", [["びゃ", "bya"], ["びゅ", "byu"], ["びょ", "byo"]]),
  group("h-pya", "hiragana", "youon", "pya", [["ぴゃ", "pya"], ["ぴゅ", "pyu"], ["ぴょ", "pyo"]]),
];

const KATAKANA = [
  group("k-a", "katakana", "gojuon", "a", [["ア", "a"], ["イ", "i"], ["ウ", "u"], ["エ", "e"], ["オ", "o"]]),
  group("k-ka", "katakana", "gojuon", "ka", [["カ", "ka"], ["キ", "ki"], ["ク", "ku"], ["ケ", "ke"], ["コ", "ko"]]),
  group("k-sa", "katakana", "gojuon", "sa", [["サ", "sa"], ["シ", "shi"], ["ス", "su"], ["セ", "se"], ["ソ", "so"]]),
  group("k-ta", "katakana", "gojuon", "ta", [["タ", "ta"], ["チ", "chi"], ["ツ", "tsu"], ["テ", "te"], ["ト", "to"]]),
  group("k-na", "katakana", "gojuon", "na", [["ナ", "na"], ["ニ", "ni"], ["ヌ", "nu"], ["ネ", "ne"], ["ノ", "no"]]),
  group("k-ha", "katakana", "gojuon", "ha", [["ハ", "ha"], ["ヒ", "hi"], ["フ", "fu"], ["ヘ", "he"], ["ホ", "ho"]]),
  group("k-ma", "katakana", "gojuon", "ma", [["マ", "ma"], ["ミ", "mi"], ["ム", "mu"], ["メ", "me"], ["モ", "mo"]]),
  group("k-ya", "katakana", "gojuon", "ya", [["ヤ", "ya"], ["", ""], ["ユ", "yu"], ["", ""], ["ヨ", "yo"]]),
  group("k-ra", "katakana", "gojuon", "ra", [["ラ", "ra"], ["リ", "ri"], ["ル", "ru"], ["レ", "re"], ["ロ", "ro"]]),
  group("k-wa", "katakana", "gojuon", "wa", [["ワ", "wa"], ["", ""], ["", ""], ["", ""], ["ヲ", "wo"]]),
  group("k-n", "katakana", "gojuon", "n", [["", ""], ["", ""], ["", ""], ["", ""], ["ン", "n"]]),
  group("k-ga", "katakana", "dakuten", "ga", [["ガ", "ga"], ["ギ", "gi"], ["グ", "gu"], ["ゲ", "ge"], ["ゴ", "go"]]),
  group("k-za", "katakana", "dakuten", "za", [["ザ", "za"], ["ジ", "ji"], ["ズ", "zu"], ["ゼ", "ze"], ["ゾ", "zo"]]),
  group("k-da", "katakana", "dakuten", "da", [["ダ", "da"], ["ヂ", "di"], ["ヅ", "du"], ["デ", "de"], ["ド", "do"]]),
  group("k-ba", "katakana", "dakuten", "ba", [["バ", "ba"], ["ビ", "bi"], ["ブ", "bu"], ["ベ", "be"], ["ボ", "bo"]]),
  group("k-pa", "katakana", "dakuten", "pa", [["パ", "pa"], ["ピ", "pi"], ["プ", "pu"], ["ペ", "pe"], ["ポ", "po"]]),
  group("k-kya", "katakana", "youon", "kya", [["キャ", "kya"], ["キュ", "kyu"], ["キョ", "kyo"]]),
  group("k-sha", "katakana", "youon", "sha", [["シャ", "sha"], ["シュ", "shu"], ["ショ", "sho"]]),
  group("k-cha", "katakana", "youon", "cha", [["チャ", "cha"], ["チュ", "chu"], ["チョ", "cho"]]),
  group("k-nya", "katakana", "youon", "nya", [["ニャ", "nya"], ["ニュ", "nyu"], ["ニョ", "nyo"]]),
  group("k-hya", "katakana", "youon", "hya", [["ヒャ", "hya"], ["ヒュ", "hyu"], ["ヒョ", "hyo"]]),
  group("k-mya", "katakana", "youon", "mya", [["ミャ", "mya"], ["ミュ", "myu"], ["ミョ", "myo"]]),
  group("k-rya", "katakana", "youon", "rya", [["リャ", "rya"], ["リュ", "ryu"], ["リョ", "ryo"]]),
  group("k-gya", "katakana", "youon", "gya", [["ギャ", "gya"], ["ギュ", "gyu"], ["ギョ", "gyo"]]),
  group("k-ja", "katakana", "youon", "ja", [["ジャ", "ja"], ["ジュ", "ju"], ["ジョ", "jo"]]),
  group("k-bya", "katakana", "youon", "bya", [["ビャ", "bya"], ["ビュ", "byu"], ["ビョ", "byo"]]),
  group("k-pya", "katakana", "youon", "pya", [["ピャ", "pya"], ["ピュ", "pyu"], ["ピョ", "pyo"]]),
];

export const GROUPS = { hiragana: HIRAGANA, katakana: KATAKANA };

export const SECTIONS = [
  { id: "gojuon", label: "Basic" },
  { id: "dakuten", label: "Voiced" },
  { id: "youon", label: "Combo" },
];

export function glyphsIn(group) {
  return group.slots.filter(Boolean);
}

export function cardsFor(script, groupIds) {
  const selected = new Set(groupIds);
  const cards = [];
  for (const group of GROUPS[script]) {
    if (!selected.has(group.id)) continue;
    for (const glyph of glyphsIn(group)) {
      cards.push({
        id: `${group.id}:${glyph.kana}`,
        script,
        groupId: group.id,
        kana: glyph.kana,
        romaji: glyph.romaji,
      });
    }
  }
  return cards;
}

export function defaultGroupIds(script) {
  return GROUPS[script].filter((g) => g.section === "gojuon").map((g) => g.id);
}
