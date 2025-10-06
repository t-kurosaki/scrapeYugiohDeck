import { config } from 'dotenv';
import { YugiohDeckScraper } from './scraper';
import { ImageDownloader } from './image-downloader';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { 
  isMonsterCard, 
  isMonsterCardXyz, 
  isMonsterCardLink, 
  isSpellCard, 
  isTrapCard,
  YugiohCard,
  isValidCardType,
  isValidAttribute,
  isValidRace,
  isValidMonsterType,
  isValidSpellType,
  isValidTrapType,
  CARD_TYPES
} from './types';

// 環境変数を読み込み
config();

/**
 * カードのバリデーション結果
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * カードのバリデーションチェック
 */
function validateCard(card: YugiohCard): ValidationResult {
  const errors: string[] = [];
  
  // 基本情報のチェック
  if (!card.name || card.name.trim() === '') {
    errors.push('カード名が空です');
  }
  
  if (!card.imageUrl || card.imageUrl.trim() === '') {
    errors.push('画像URLが空です');
  }
  
  if (!card.type || !isValidCardType(card.type)) {
    errors.push('カードタイプが無効です');
  }
  
  if (card.quantity <= 0) {
    errors.push('枚数が0以下です');
  }
  
  // モンスターカードのチェック
  if (isMonsterCard(card)) {
    if (!card.attribute || !isValidAttribute(card.attribute)) {
      errors.push('属性が無効です');
    }
    if (!card.race || !isValidRace(card.race)) {
      errors.push('種族が無効です');
    }
    if (card.level <= 0) errors.push('レベルが0以下です');
    if (card.attack < 0) errors.push('攻撃力が負の値です');
    if (card.defense < 0) errors.push('守備力が負の値です');
    
    // モンスタータイプのチェック
    const invalidTypes = card.monsterTypes.filter(type => !isValidMonsterType(type));
    if (invalidTypes.length > 0) {
      errors.push(`無効なモンスタータイプ: ${invalidTypes.join(', ')}`);
    }
  } else if (isMonsterCardXyz(card)) {
    if (!card.attribute || !isValidAttribute(card.attribute)) {
      errors.push('属性が無効です');
    }
    if (!card.race || !isValidRace(card.race)) {
      errors.push('種族が無効です');
    }
    if (card.rank <= 0) errors.push('ランクが0以下です');
    if (card.attack < 0) errors.push('攻撃力が負の値です');
    if (card.defense < 0) errors.push('守備力が負の値です');
    
    // モンスタータイプのチェック
    const invalidTypes = card.monsterTypes.filter(type => !isValidMonsterType(type));
    if (invalidTypes.length > 0) {
      errors.push(`無効なモンスタータイプ: ${invalidTypes.join(', ')}`);
    }
  } else if (isMonsterCardLink(card)) {
    if (!card.attribute || !isValidAttribute(card.attribute)) {
      errors.push('属性が無効です');
    }
    if (!card.race || !isValidRace(card.race)) {
      errors.push('種族が無効です');
    }
    if (card.link <= 0) errors.push('リンクが0以下です');
    if (card.attack < 0) errors.push('攻撃力が負の値です');
    
    // モンスタータイプのチェック
    const invalidTypes = card.monsterTypes.filter(type => !isValidMonsterType(type));
    if (invalidTypes.length > 0) {
      errors.push(`無効なモンスタータイプ: ${invalidTypes.join(', ')}`);
    }
  } else if (isSpellCard(card)) {
    if (!card.spellType || !isValidSpellType(card.spellType)) {
      errors.push('魔法タイプが無効です');
    }
  } else if (isTrapCard(card)) {
    if (!card.trapType || !isValidTrapType(card.trapType)) {
      errors.push('罠タイプが無効です');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * デッキ全体のバリデーション結果
 */
interface DeckValidationResult {
  totalCards: number;
  validCards: number;
  invalidCards: number;
  invalidCardDetails: Array<{
    cardName: string;
    errors: string[];
  }>;
}

/**
 * デッキ全体のバリデーションチェック
 */
function validateDeck(deck: { mainDeck: YugiohCard[]; extraDeck: YugiohCard[]; sideDeck: YugiohCard[] }): DeckValidationResult {
  const allCards = [...deck.mainDeck, ...deck.extraDeck, ...deck.sideDeck];
  const invalidCardDetails: Array<{ cardName: string; errors: string[] }> = [];
  
  let validCards = 0;
  let invalidCards = 0;
  
  allCards.forEach(card => {
    const validation = validateCard(card);
    if (validation.isValid) {
      validCards++;
    } else {
      invalidCards++;
      invalidCardDetails.push({
        cardName: card.name || 'Unknown',
        errors: validation.errors
      });
    }
  });
  
  return {
    totalCards: allCards.length,
    validCards,
    invalidCards,
    invalidCardDetails
  };
}

/**
 * メイン実行関数
 */
async function main() {
  const scraper = new YugiohDeckScraper();
  
  try {
    // コマンドライン引数からURLを取得
    const targetUrl = process.argv[2] ?? process.env.DEFAULT_URL;
    const downloadImages = process.argv[3] !== '--no-download'; // デフォルトで画像ダウンロード有効
    
    if (!targetUrl) {
      console.error('❌ エラー: デッキURLを指定してください');
      console.log('使用方法: npm run dev <デッキURL> [--no-download]');
      console.log('例: npm run dev "https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=..."');
      console.log('画像ダウンロードをスキップする場合: npm run dev <デッキURL> --no-download');
      process.exit(1);
    }
    
    console.log('遊戯王デッキレシピのスクレイピングを開始します...');
    console.log(`対象URL: ${targetUrl}`);
    console.log(`画像ダウンロード: ${downloadImages ? '有効' : '無効'}`);
    
    // スクレイピング実行
    const result = await scraper.scrapeDeck(targetUrl);
    
    if (result.success && result.deck) {
        console.log('✅ スクレイピングが成功しました！');
        console.log(`デッキ名: ${result.deck.name}`);
        console.log(`デッキID: ${result.deck.deckId}`);
        console.log(`メインデッキ: ${result.deck.mainDeck.length}枚`);
        console.log(`エクストラデッキ: ${result.deck.extraDeck.length}枚`);
        console.log(`サイドデッキ: ${result.deck.sideDeck.length}枚`);
        
        // 結果をJSONファイルに保存
        const outputPath = join(__dirname, '..', 'output', `deck_${result.deck.deckId}.json`);
        writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
        console.log(`結果を保存しました: ${outputPath}`);
      
        // 画像ダウンロード実行
        if (downloadImages) {
          const imageDownloader = new ImageDownloader(join(__dirname, '..', 'downloads', 'cards'));
          const downloadResult = await imageDownloader.downloadDeckImages(result.deck);
          
          if (downloadResult.totalFailed === 0) {
            console.log('✅ すべての画像のダウンロードが完了しました！');
          } else {
            console.log(`⚠️ 画像ダウンロードが完了しました（失敗: ${downloadResult.totalFailed}枚）`);
          }
        }
      
        // バリデーションチェック実行
        console.log('\n=== データバリデーション ===');
        const validationResult = validateDeck(result.deck);
        
        console.log(`総カード数: ${validationResult.totalCards}枚`);
        console.log(`有効なカード: ${validationResult.validCards}枚`);
        console.log(`不正なカード: ${validationResult.invalidCards}枚`);
        
        if (validationResult.invalidCards > 0) {
          console.log('\n❌ 不正なデータが見つかりました:');
          validationResult.invalidCardDetails.forEach((invalidCard, index) => {
            console.log(`${index + 1}. ${invalidCard.cardName}`);
            invalidCard.errors.forEach(error => {
              console.log(`   - ${error}`);
            });
          });
        } else {
          console.log('\n✅ すべてのカードデータが正常です！');
        }
      
    } else {
      console.error('❌ スクレイピングが失敗しました');
      console.error(`エラー: ${result.error}`);
    }
    
  } catch (error) {
    console.error('予期しないエラーが発生しました:', error);
  } finally {
    await scraper.close();
  }
}

// スクリプトが直接実行された場合のみmain関数を実行
if (require.main === module) {
  main().catch(console.error);
}

export { main };
