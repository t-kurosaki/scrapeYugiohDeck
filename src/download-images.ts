import { ImageDownloader } from './image-downloader';
import { readFileSync } from 'fs';
import { join } from 'path';
import { YugiohDeck } from './types';

/**
 * 画像ダウンロードのメイン実行関数
 */
async function downloadImages() {
  try {
    // コマンドライン引数からデッキIDを取得
    const deckId = process.argv[2];
    
    if (!deckId) {
      console.error('❌ エラー: デッキIDを指定してください');
      console.log('使用方法: npm run download <デッキID>');
      console.log('例: npm run download 16');
      process.exit(1);
    }
    
    // スクレイピング結果を読み込み
    const resultFile = join(__dirname, '..', 'output', `deck_${deckId}.json`);
    
    console.log('スクレイピング結果を読み込み中...');
    const result = JSON.parse(readFileSync(resultFile, 'utf-8'));
    
    if (!result.success || !result.deck) {
      console.error('❌ 有効なデッキデータが見つかりません');
      return;
    }

    const deck: YugiohDeck = result.deck;
    console.log(`デッキ名: ${deck.name}`);
    console.log(`デッキID: ${deck.deckId}`);

    // すべてのカードを収集
    const allCards = [
      ...deck.mainDeck,
      ...deck.extraDeck,
      ...deck.sideDeck
    ];

    if (allCards.length === 0) {
      console.log('❌ ダウンロード対象のカードがありません');
      return;
    }

    console.log(`\n対象カード数: ${allCards.length}枚`);
    console.log(`- メインデッキ: ${deck.mainDeck.length}枚`);
    console.log(`- エクストラデッキ: ${deck.extraDeck.length}枚`);
    console.log(`- サイドデッキ: ${deck.sideDeck.length}枚`);

    // 画像ダウンローダーを初期化
    const downloader = new ImageDownloader('downloads/cards');

    // 画像をダウンロード
    const downloadResult = await downloader.downloadCardImages(allCards, 3);

    // 結果を表示
    console.log('\n=== ダウンロード結果 ===');
    console.log(`✅ 成功: ${downloadResult.success}枚`);
    console.log(`❌ 失敗: ${downloadResult.failed}枚`);

    // 失敗したカードの詳細を表示
    const failedCards = downloadResult.results.filter(r => !r.result.success);
    if (failedCards.length > 0) {
      console.log('\n=== 失敗したカード ===');
      failedCards.forEach(({ card, result }) => {
        console.log(`- ${card.name}: ${result.error}`);
      });
    }

    // 成功したカードの例を表示
    const successCards = downloadResult.results.filter(r => r.result.success);
    if (successCards.length > 0) {
      console.log('\n=== ダウンロード成功例 ===');
      successCards.slice(0, 5).forEach(({ card, result }) => {
        console.log(`✅ ${card.name} -> ${result.filePath}`);
      });
      
      if (successCards.length > 5) {
        console.log(`... 他 ${successCards.length - 5}枚`);
      }
    }

  } catch (error) {
    console.error('❌ 画像ダウンロード中にエラーが発生しました:', error);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  downloadImages().catch(console.error);
}

export { downloadImages };
