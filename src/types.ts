/**
 * 遊戯王カード情報の型定義
 */

// 定数アサーションを使用した型安全な定数定義
export const CARD_TYPES = {
  MONSTER: 'モンスター',
  SPELL: '魔法',
  TRAP: '罠'
} as const;

export const ATTRIBUTES = {
  LIGHT: '光',
  DARK: '闇',
  FIRE: '炎',
  WATER: '水',
  EARTH: '地',
  WIND: '風',
  DIVINE: '神'
} as const;

export const RACES = {
  SPELLCASTER: '魔法使い族',
  DRAGON: 'ドラゴン族',
  ZOMBIE: 'アンデット族',
  WARRIOR: '戦士族',
  BEAST_WARRIOR: '獣戦士族',
  BEAST: '獣族',
  WINGED_BEAST: '鳥獣族',
  FIEND: '悪魔族',
  FAIRY: '天使族',
  INSECT: '昆虫族',
  DINOSAUR: '恐竜族',
  REPTILE: '爬虫類族',
  FISH: '魚族',
  SEA_SERPENT: '海竜族',
  AQUA: '水族',
  PYRO: '炎族',
  THUNDER: '雷族',
  ROCK: '岩石族',
  PLANT: '植物族',
  MACHINE: '機械族',
  PSYCHIC: 'サイキック族',
  DIVINE_BEAST: '幻神獣族',
  CREATOR_GOD: '創造神族',
  WYRM: '幻竜族',
  CYBERSE: 'サイバース族',
  ILLUSION: '幻想魔族'
} as const;

export const MONSTER_TYPES = {
  NORMAL: '通常',
  EFFECT: '効果',
  FUSION: '融合',
  SYNCHRO: 'シンクロ',
  XYZ: 'エクシーズ',
  LINK: 'リンク',
  RITUAL: '儀式',
  TOON: 'トゥーン',
  SPIRIT: 'スピリット',
  UNION: 'ユニオン',
  GEMINI: 'デュアル',
  TUNER: 'チューナー',
  FLIP: 'リバース',
  PENDULUM: 'ペンデュラム',
  SPECIAL: '特殊召喚'
} as const;

export const SPELL_TYPES = {
  NORMAL: '通常魔法',
  PERMANENT: '永続魔法',
  QUICK: '速攻魔法',
  FIELD: 'フィールド魔法',
  EQUIP: '装備魔法',
  RITUAL: '儀式魔法'
} as const;

export const TRAP_TYPES = {
  NORMAL: '通常罠',
  PERMANENT: '永続罠',
  COUNTER: 'カウンター罠'
} as const;

// リテラル型の定義
export type CardType = typeof CARD_TYPES[keyof typeof CARD_TYPES];
export type Attribute = typeof ATTRIBUTES[keyof typeof ATTRIBUTES];
export type Race = typeof RACES[keyof typeof RACES];
export type MonsterType = typeof MONSTER_TYPES[keyof typeof MONSTER_TYPES];
export type SpellType = typeof SPELL_TYPES[keyof typeof SPELL_TYPES];
export type TrapType = typeof TRAP_TYPES[keyof typeof TRAP_TYPES];

// 判別共用体を使用した型安全なカード定義
export type BaseCard = {
  /** カード名 */
  name: string;
  /** カード画像URL */
  imageUrl: string;
  /** カードID */
  cardId?: string;
  /** カードテキスト */
  cardText?: string;
  /** 枚数 */
  quantity: number;
};

// レベルを持つモンスター（通常・効果・融合・シンクロ）
export type MonsterCard = BaseCard & {
  type: typeof CARD_TYPES.MONSTER;
  /** 項目 */
  monsterTypes: MonsterType[];
  /** 属性 */
  attribute: Attribute;
  /** 種族 */
  race: Race;
  /** レベル */
  level: number;
  /** 攻撃力 */
  attack: number;
  /** 守備力 */
  defense: number;
};

// エクシーズモンスター
export type MonsterCardXyz = BaseCard & {
  type: typeof CARD_TYPES.MONSTER;
  /** 項目 */
  monsterTypes: MonsterType[];
  /** 属性 */
  attribute: Attribute;
  /** 種族 */
  race: Race;
  /** ランク */
  rank: number;
  /** 攻撃力 */
  attack: number;
  /** 守備力 */
  defense: number;
};

// リンクモンスター
export type MonsterCardLink = BaseCard & {
  type: typeof CARD_TYPES.MONSTER;
  /** 項目 */
  monsterTypes: MonsterType[];
  /** 属性 */
  attribute: Attribute;
  /** 種族 */
  race: Race;
  /** リンク */
  link: number;
  /** 攻撃力 */
  attack: number;
};

export type SpellCard = BaseCard & {
  type: typeof CARD_TYPES.SPELL;
  /** 魔法の種類 */
  spellType: SpellType;
};

export type TrapCard = BaseCard & {
  type: typeof CARD_TYPES.TRAP;
  /** 罠の種類 */
  trapType: TrapType;
};

// 判別共用体としてのYugiohCard
export type YugiohCard = MonsterCard | MonsterCardXyz | MonsterCardLink | SpellCard | TrapCard;

/**
 * デッキ情報の型定義
 */
export type YugiohDeck = {
  /** デッキ名 */
  name: string;
  /** デッキID */
  deckId: string;
  /** メインデッキのカード一覧 */
  mainDeck: YugiohCard[];
  /** エクストラデッキのカード一覧 */
  extraDeck: YugiohCard[];
  /** サイドデッキのカード一覧 */
  sideDeck: YugiohCard[];
  /** デッキの説明 */
  description?: string;
  /** 作成者 */
  author?: string;
  /** 作成日 */
  createdAt?: string;
};

/**
 * スクレイピング結果の型定義
 */
export type ScrapingResult = {
  /** スクレイピング成功フラグ */
  success: boolean;
  /** デッキ情報 */
  deck?: YugiohDeck;
  /** エラーメッセージ */
  error?: string;
  /** スクレイピング実行時刻 */
  timestamp: string;
};

/**
 * 型ガード関数
 */
export const isMonsterCard = (card: YugiohCard): card is MonsterCard => {
  return card.type === CARD_TYPES.MONSTER && "level" in card;
};

export const isMonsterCardXyz = (card: YugiohCard): card is MonsterCardXyz => {
  return card.type === CARD_TYPES.MONSTER && "rank" in card;
};

export const isMonsterCardLink = (card: YugiohCard): card is MonsterCardLink => {
  return card.type === CARD_TYPES.MONSTER && "link" in card;
};

export const isAnyMonsterCard = (card: YugiohCard): card is MonsterCard | MonsterCardXyz | MonsterCardLink => {
  return card.type === CARD_TYPES.MONSTER;
};

export const isSpellCard = (card: YugiohCard): card is SpellCard => {
  return card.type === CARD_TYPES.SPELL;
};

export const isTrapCard = (card: YugiohCard): card is TrapCard => {
  return card.type === CARD_TYPES.TRAP;
};

export const isValidCardType = (type: string): type is CardType => {
  return Object.values(CARD_TYPES).includes(type as CardType);
};

export const isValidAttribute = (attribute: string): attribute is Attribute => {
  return Object.values(ATTRIBUTES).includes(attribute as Attribute);
};

export const isValidRace = (race: string): race is Race => {
  return Object.values(RACES).includes(race as Race);
};

export const isValidMonsterType = (monsterType: string): monsterType is MonsterType => {
  return Object.values(MONSTER_TYPES).includes(monsterType as MonsterType);
};

export const isValidSpellType = (spellType: string): spellType is SpellType => {
  return Object.values(SPELL_TYPES).includes(spellType as SpellType);
};

export const isValidTrapType = (trapType: string): trapType is TrapType => {
  return Object.values(TRAP_TYPES).includes(trapType as TrapType);
};

/**
 * ユーティリティ型
 */
export type RequiredCardFields = Required<Pick<YugiohCard, 'name' | 'imageUrl' | 'quantity'>>;
export type OptionalCardFields = Partial<Omit<YugiohCard, 'name' | 'imageUrl' | 'quantity'>>;

export type DeckCardCount = {
  mainDeck: number;
  extraDeck: number;
  sideDeck: number;
  total: number;
};

export type CardSearchCriteria = {
  name?: string;
  type?: CardType;
  attribute?: Attribute;
  race?: Race;
  monsterType?: MonsterType;
  spellType?: SpellType;
  trapType?: TrapType;
  level?: number;
  rank?: number;
  linkRating?: number;
  attack?: number;
  defense?: number;
};

/**
 * デッキ統計情報の型定義
 */
export type DeckStatistics = {
  /** カード枚数統計 */
  cardCount: DeckCardCount;
  /** カードタイプ別統計 */
  typeDistribution: Record<CardType, number>;
  /** 属性別統計（モンスターのみ） */
  attributeDistribution: Record<Attribute, number>;
  /** 種族別統計（モンスターのみ） */
  raceDistribution: Record<Race, number>;
  /** レベル別統計（モンスターのみ） */
  levelDistribution: Record<number, number>;
  /** ランク別統計（エクシーズモンスターのみ） */
  rankDistribution: Record<number, number>;
  /** リンクレート別統計（リンクモンスターのみ） */
  linkRatingDistribution: Record<number, number>;
  /** 攻撃力別統計（モンスターのみ） */
  attackDistribution: Record<number, number>;
};
