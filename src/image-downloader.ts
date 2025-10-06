import axios from 'axios';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join, basename, extname } from 'path';
import { pipeline } from 'stream/promises';
import { YugiohCard } from './types';

/**
 * カード画像ダウンローダー
 */
export class ImageDownloader {
  private downloadDir: string;
  private downloadedCount: number = 0;
  private failedCount: number = 0;

  constructor(downloadDir: string = 'downloads') {
    this.downloadDir = downloadDir;
    this.ensureDownloadDir();
  }

  /**
   * ダウンロードディレクトリを作成
   */
  private ensureDownloadDir(): void {
    if (!existsSync(this.downloadDir)) {
      mkdirSync(this.downloadDir, { recursive: true });
      console.log(`ダウンロードディレクトリを作成しました: ${this.downloadDir}`);
    }
  }

  /**
   * 単一のカード画像をダウンロード
   * @param card カード情報
   * @returns ダウンロード結果
   */
  async downloadCardImage(card: YugiohCard): Promise<{
    success: boolean;
    filePath?: string;
    error?: string;
  }> {
    try {
      if (!card.imageUrl) {
        return { success: false, error: '画像URLがありません' };
      }

      // ファイル名を生成
      const fileName = this.generateFileName(card);
      const filePath = join(this.downloadDir, fileName);

      // 既にファイルが存在する場合はスキップ
      if (existsSync(filePath)) {
        console.log(`スキップ: ${fileName} (既に存在)`);
        return { success: true, filePath };
      }

      console.log(`ダウンロード中: ${card.name} -> ${fileName}`);

      // 画像をダウンロード
      const response = await axios({
        method: 'GET',
        url: card.imageUrl,
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.db.yugioh-card.com/',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'same-origin'
        }
      });

      // レスポンスステータスをチェック
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // ファイルに保存
      const writer = createWriteStream(filePath);
      await pipeline(response.data, writer);

      console.log(`✅ ダウンロード完了: ${fileName}`);
      this.downloadedCount++;
      return { success: true, filePath };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ダウンロード失敗: ${card.name} - ${errorMessage}`);
      this.failedCount++;
      return { success: false, error: errorMessage };
    }
  }

  /**
   * デッキ全体の画像をダウンロード
   * @param deck デッキ情報
   * @param maxConcurrent 同時ダウンロード数
   * @returns ダウンロード結果
   */
  async downloadDeckImages(
    deck: { mainDeck: YugiohCard[]; extraDeck: YugiohCard[]; sideDeck: YugiohCard[] },
    maxConcurrent: number = 5
  ): Promise<{
    totalSuccess: number;
    totalFailed: number;
    mainDeck: { success: number; failed: number };
    extraDeck: { success: number; failed: number };
    sideDeck: { success: number; failed: number };
  }> {
    console.log(`\n=== デッキ画像ダウンロード開始 ===`);
    console.log(`デッキ名: ${(deck as any).name || 'Unknown'}`);
    console.log(`メインデッキ: ${deck.mainDeck.length}枚`);
    console.log(`エクストラデッキ: ${deck.extraDeck.length}枚`);
    console.log(`サイドデッキ: ${deck.sideDeck.length}枚`);
    console.log(`同時ダウンロード数: ${maxConcurrent}枚`);
    console.log(`保存先: ${this.downloadDir}\n`);

    // 各デッキの画像をダウンロード
    const mainResult = await this.downloadCardImages(deck.mainDeck, maxConcurrent);
    const extraResult = await this.downloadCardImages(deck.extraDeck, maxConcurrent);
    const sideResult = await this.downloadCardImages(deck.sideDeck, maxConcurrent);

    const totalSuccess = mainResult.success + extraResult.success + sideResult.success;
    const totalFailed = mainResult.failed + extraResult.failed + sideResult.failed;

    console.log(`\n=== ダウンロード完了 ===`);
    console.log(`総合計: 成功 ${totalSuccess}枚 / 失敗 ${totalFailed}枚`);
    console.log(`メインデッキ: 成功 ${mainResult.success}枚 / 失敗 ${mainResult.failed}枚`);
    console.log(`エクストラデッキ: 成功 ${extraResult.success}枚 / 失敗 ${extraResult.failed}枚`);
    console.log(`サイドデッキ: 成功 ${sideResult.success}枚 / 失敗 ${sideResult.failed}枚`);

    return {
      totalSuccess,
      totalFailed,
      mainDeck: { success: mainResult.success, failed: mainResult.failed },
      extraDeck: { success: extraResult.success, failed: extraResult.failed },
      sideDeck: { success: sideResult.success, failed: sideResult.failed }
    };
  }

  /**
   * 複数のカード画像を一括ダウンロード
   * @param cards カード一覧
   * @param maxConcurrent 同時ダウンロード数
   * @returns ダウンロード結果
   */
  async downloadCardImages(
    cards: YugiohCard[], 
    maxConcurrent: number = 5
  ): Promise<{
    success: number;
    failed: number;
    results: Array<{ card: YugiohCard; result: any }>;
  }> {
    console.log(`\n=== カード画像ダウンロード開始 ===`);
    console.log(`対象カード数: ${cards.length}枚`);
    console.log(`同時ダウンロード数: ${maxConcurrent}枚`);
    console.log(`保存先: ${this.downloadDir}\n`);

    const results: Array<{ card: YugiohCard; result: any }> = [];
    
    // 統計をリセット
    this.resetStats();

    // 同時ダウンロード数を制限してバッチ処理
    for (let i = 0; i < cards.length; i += maxConcurrent) {
      const batch = cards.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (card) => {
        const result = await this.downloadCardImage(card);
        return { card, result };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // バッチ間で少し待機（サーバーへの負荷軽減）
      if (i + maxConcurrent < cards.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n=== ダウンロード完了 ===`);
    console.log(`成功: ${this.downloadedCount}枚`);
    console.log(`失敗: ${this.failedCount}枚`);
    console.log(`合計: ${cards.length}枚`);

    return {
      success: this.downloadedCount,
      failed: this.failedCount,
      results
    };
  }

  /**
   * ファイル名を生成
   * @param card カード情報
   * @returns ファイル名
   */
  private generateFileName(card: YugiohCard): string {
    // カード名から安全なファイル名を生成
    const safeName = card.name
      .replace(/[<>:"/\\|?*]/g, '_') // 無効な文字を置換
      .replace(/\s+/g, '_') // スペースをアンダースコアに
      .substring(0, 50); // 長さを制限

    // 遊戯王のカード画像は通常JPG形式なので、デフォルトで.jpgを使用
    const extension = '.jpg';

    return `${safeName}${extension}`;
  }

  /**
   * ダウンロード統計を取得
   */
  getStats(): { downloaded: number; failed: number } {
    return {
      downloaded: this.downloadedCount,
      failed: this.failedCount
    };
  }

  /**
   * 統計をリセット
   */
  resetStats(): void {
    this.downloadedCount = 0;
    this.failedCount = 0;
  }
}
