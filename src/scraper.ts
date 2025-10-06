import puppeteer, { Browser, Page } from 'puppeteer';
import { YugiohDeck, YugiohCard, ScrapingResult, Attribute, CardType, MonsterCard, MonsterCardXyz, MonsterCardLink, MonsterType, SpellCard, TrapCard, Race, CARD_TYPES, SPELL_TYPES, TRAP_TYPES, MONSTER_TYPES, isValidCardType, isValidAttribute, isValidRace, isValidMonsterType, SpellType, BaseCard, TrapType } from './types';

type Section = {
  id: string;
  type: string;
};

/**
 * 遊戯王デッキレシピスクレイピングクラス
 */
export class YugiohDeckScraper {
  private browser: Browser | null = null;

  /**
   * ブラウザを初期化
   */
  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
  }

  /**
   * ブラウザを終了
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * デッキレシピをスクレイピング
   * @param url デッキレシピのURL
   * @returns スクレイピング結果
   */
  async scrapeDeck(url: string): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      success: false,
      timestamp: new Date().toISOString()
    };

    try {
      if (!this.browser) {
        await this.initialize();
      }

      const page = await this.browser!.newPage();
      
      // ユーザーエージェントを設定
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // ページを読み込み
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000 // ミリ秒
      });

      // 画像表示に切り替え（画像URLを取得するため）
      await page.evaluate(() => {
        // Puppeteerのpageオブジェクトはブラウザ側では使えないので、documentを使う
        const deckImage = document.getElementById('deck_image');
        const deckDetailText = document.getElementById('deck_detailtext');
        const deckText = document.getElementById('deck_text');
        if (deckImage) deckImage.style.display = 'none';
        if (deckDetailText) deckDetailText.style.display = 'block';
        if (deckText) deckText.style.display = 'none';
        // const selectElement = document.querySelector('select[name="deck_display"]');
        // if (selectElement && selectElement instanceof HTMLSelectElement) {
        //   (selectElement as HTMLSelectElement).value = '2';
        //   // changeイベントを発火してページの更新を促す
        //   selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        // } else {
        //   console.log('select要素が見つかりません:', selectElement);
        //   throw new Error('画像表示切り替え要素が見つかりません');
        // }
      });

      // ページの完全な読み込みを待機
      // Puppeteerでは waitForLoadState は使用できないため、代わりに waitForFunction を使用
      await page.waitForFunction(() => document.readyState === 'complete');
      
      // 特定の要素が読み込まれるまで待機
      try {
        await page.waitForSelector('#detailtext_main, #detailtext_ext, #detailtext_side', { timeout: 10000 });
      } catch (error) {
        console.log('特定の要素の待機がタイムアウトしました。ページの構造を確認します。');
      }
      
      // 追加の待機時間（動的コンテンツの読み込みを考慮）
      await new Promise(resolve => setTimeout(resolve, 2000));

      // デッキ情報を取得
      const deck = await this.extractDeckInfo(page, url);
      
      result.success = true;
      result.deck = deck;
      
      await page.close();
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('スクレイピングエラー:', error);
    }

    return result;
  }

  /**
   * ページからデッキ情報を抽出
   * @param page Puppeteerのページオブジェクト
   * @param url 元のURL
   * @returns デッキ情報
   */
  private async extractDeckInfo(page: Page, url: string): Promise<YugiohDeck> {
    console.log(`デッキurl: ${url}`);

    // デッキIDをURLから抽出
    const deckId = this.extractDeckId(url);
    console.log(`デッキID: ${deckId}`);
    
    // デッキ名を取得
    const deckName = await this.extractDeckName(page);
    console.log(`デッキ名: ${deckName}`);

    // カード情報を取得
    const sections: Section[] = [
      { id: 'detailtext_main', type: 'main' },
      { id: 'detailtext_ext', type: 'extra' },
      { id: 'detailtext_side', type: 'side' }
    ];
    
    const results: { type: string; cards: YugiohCard[] }[] = await Promise.all(
      sections.map(async (section) => {
        try {
          console.log(`${section.type}デッキの取得開始`);
          const cards = await this.extractCardInfo(page, section);
          console.log(`${section.type}デッキの取得完了 ${cards.length}枚`);
          return { type: section.type, cards };
        } catch (error) {
          console.warn(`${section.type}デッキの取得に失敗:`, error);
          return { type: section.type, cards: [] };
        }
      })
    );

    const mainDeck = results.find(r => r.type === 'main')?.cards || [];
    const extraDeck = results.find(r => r.type === 'extra')?.cards || [];
    const sideDeck = results.find(r => r.type === 'side')?.cards || [];

    return {
      name: deckName,
      deckId,
      mainDeck,
      extraDeck,
      sideDeck
    };
  }

  /**
   * URLからデッキIDを抽出
   * @param url デッキURL
   * @returns デッキID
   */
  private extractDeckId(url: string): string {
    const match = url.match(/dno=(\d+)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * ページからデッキ名を抽出
   * @param page Puppeteerのページオブジェクト
   * @returns デッキ名
   */
    private async extractDeckName(page: Page): Promise<string> {
      return await page.evaluate(() => {
        // ページ内のすべてのh1要素を調査
        const h1Elements = document.querySelectorAll('h1');
        
        for (const h1 of Array.from(h1Elements)) {
          const text = h1.textContent?.trim() || '';
          if (text && !text.includes('遊戯王ニューロン') && !text.includes('オフィシャルカードゲーム') && !text.includes('カードデータベース')) {
            // 不要な部分を除去
            return text
              .replace(/【\s*公開中\s*】\s*/, '') // 【公開中】を除去
              .replace(/\[ CARD GAME ID : \d+ \]/, '') // CARD GAME IDを除去
              .trim();
          }
        }
        
        return 'Unknown Deck';
      });
    }

  /**
   * ページからカード情報を抽出
   * @param page Puppeteerのページオブジェクト
   * @returns カード情報の配列
   */
  private async extractCardInfo(page: Page, section: Section): Promise<YugiohCard[]> {
    // カード情報を取得
    const cardList = await page.evaluate((sectionId: string): { result: boolean; msg?: string; data: any[] } => {
      // section要素(メインデッキ、エクストラデッキ、サイドデッキ)を取得
      const sectionElement: HTMLElement | null = document.querySelector(`#${sectionId}`);
      if (!sectionElement) {
        return { result: false, msg: `section要素が見つかりません ${sectionId}`, data: [] };
      }
      
      // row要素を取得
      const rowElements: NodeListOf<Element> = sectionElement.querySelectorAll('.t_row.c_normal');
      if (!rowElements || rowElements.length === 0) {
        return { result: false, msg: `row要素が見つかりません ${sectionId}`, data: [] };
      }

      // カードの情報を取得
      const cardData = Array.from(rowElements).map((row) => {
        // 安全な要素取得のためのヘルパー関数
        const getElementText = (selector: string): string => {
          const element = row.querySelector(selector);
          return element?.textContent?.trim() || '';
        };

        const getInputValue = (selector: string): string => {
          const element = row.querySelector(selector) as HTMLInputElement;
          return element?.value || '';
        };

        const getImageSrc = (selector: string): string => {
          const element = row.querySelector(selector) as HTMLImageElement;
          return element?.src || '';
        };

        const getNumberValue = (selector: string, defaultValue: string = '0'): number => {
          const element = row.querySelector(selector);
          const text = element?.textContent?.trim() || defaultValue;
          const parsed = parseInt(text);
          return isNaN(parsed) ? parseInt(defaultValue) : parsed;
        };

        return {
          name: getElementText('.card_name'),
          imageUrl: getImageSrc('img[id^="card_image"]'),
          cardId: getInputValue('input.cid'),
          cardText: getElementText('.box_card_text'),
          quantity: getNumberValue('.cards_num_set span', '1'),
          attack: getElementText('.atk_power span'),
          defense: getElementText('.def_power span'),
          // 属性または魔法・罠タイプ
          attributeOrType: getElementText('.box_card_attribute span:last-child'),
          // 魔法・罠のタイプ
          spellTypeOrTrapType: getElementText('.box_card_effect span:last-child'),
          // 【Race／MonsterOtherType[]／MonsterType】の形式
          specsText: getElementText('.card_info_species_and_other_item span'),
          // レベル、ランク
          levelOrRank: getElementText('.box_card_level_rank span'),
          // リンク
          link: getElementText('.box_card_linkmarker span'),
        };
      });
      
      return {
        result: true,
        data: cardData
      };
    }, section.id);
    
    if(!cardList.result){
      console.warn(cardList.msg);
      return [];
    }
    
    // カード情報を作成
    const resultcardList:YugiohCard[] = cardList.data.map((card) => {
      // カードの基本情報を作成
      const baseData: BaseCard = {
        name: card.name,
        imageUrl: card.imageUrl,
        cardId: card.cardId,
        cardText: card.cardText,
        quantity: card.quantity,
      }
      
      // カードの種類に応じてカードを作成
      if(card.attributeOrType === CARD_TYPES.SPELL){
        return this.createSpellCard(baseData, card.spellTypeOrTrapType);
      } else if(card.attributeOrType === CARD_TYPES.TRAP){
        return this.createTrapCard(baseData, card.spellTypeOrTrapType);
      } else {
        return this.createMonsterCard(baseData, card);
      }
    }).filter(card => card !== null);

    return resultcardList;
  }

  /**
   * 数値に変換
   * @param number 数値の文字列
   * @returns 
   */
  private formatNumber(number: string): number {
    return parseInt(number.replace(/[^\d]/g, ''), 10);
  }
  
  /**
   * 魔法カード作成
   */
  private createSpellCard(baseData: BaseCard, spellTypeStr: string): SpellCard {
    const spellType: SpellType = spellTypeStr 
      ? (SPELL_TYPES[`${spellTypeStr}魔法` as keyof typeof SPELL_TYPES] ?? SPELL_TYPES.NORMAL) 
      : SPELL_TYPES.NORMAL;
    return {
      ...baseData,
      type: CARD_TYPES.SPELL,
      spellType: spellType
    };
  }

  /**
   * 罠カード作成
   */
  private createTrapCard(baseData: BaseCard, trapTypeStr: TrapType): TrapCard {
    const trapType: TrapType = trapTypeStr 
      ? (TRAP_TYPES[`${trapTypeStr}罠` as keyof typeof TRAP_TYPES] ?? TRAP_TYPES.NORMAL) 
      : TRAP_TYPES.NORMAL;
    return {
      ...baseData,
      type: CARD_TYPES.TRAP,
      trapType: trapType
    };
  }

  /**
   * モンスターカード作成
   */
  private createMonsterCard(baseData: BaseCard, card: any): YugiohCard {
    const attribute = card.attributeOrType.replace(/属性/g, '');
    const cleanText = card.specsText.replace(/【|】/g, '').trim();
    const parts = cleanText.split('／').map((part: string) => part.trim()).filter((part: string) => part.length > 0);
    const race = parts[0] || '';
    const monsterTypes = parts.length > 1 ? parts.slice(1).filter((type: string) => isValidMonsterType(type)) : [];
    
    const attack = this.formatNumber(card.attack);
    const defense = this.formatNumber(card.defense);
    const levelOrRank = this.formatNumber(card.levelOrRank);
    const link = this.formatNumber(card.link);

    const common = { ...baseData, type: CARD_TYPES.MONSTER, monsterTypes, attribute, race, attack };

    if (monsterTypes.includes(MONSTER_TYPES.XYZ)) {
      return <MonsterCardXyz>{ ...common, rank: levelOrRank, defense };
    } else if (monsterTypes.includes(MONSTER_TYPES.LINK)) {
      return <MonsterCardLink>{ ...common, link };
    } else {
      return <MonsterCard>{ ...common, level: levelOrRank, defense };
    }
  }
}
