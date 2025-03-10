# 8ビットレトロゲームスタイル ポートフォリオサイト

このプロジェクトは、8ビットレトロゲームの美学を取り入れたデザイナー向けポートフォリオサイトです。ピクセルアートとレトロゲームのUIを模倣したデザインで、訪問者に懐かしさと独自性を提供します。

## 特徴

- **8ビットデザイン**: ピクセル化されたUI要素とレトロゲームの美学
- **ゲームコントローラーナビゲーション**: D-padとA/Bボタンを使用したナビゲーション
- **レトロサウンド効果**: Web Audio APIを使用した8ビットサウンド
- **テーマ切り替え**: SELECTボタンでテーマカラーを変更可能
- **レスポンシブデザイン**: モバイルデバイスにも対応
- **アニメーション効果**: タイピング効果やピクセル化アニメーション

## 技術スタック

- HTML5
- CSS3
- JavaScript (Vanilla)
- Web Audio API
- Google Fonts (Press Start 2P)

## 使用方法

1. リポジトリをクローンまたはダウンロードします
2. `index.html`をブラウザで開きます
3. ナビゲーションメニューまたはゲームコントローラーを使用してサイトを閲覧します

## カスタマイズ

### テーマカラーの変更

`styles.css`ファイルの`:root`セクションでカラー変数を編集することで、サイト全体のテーマカラーを変更できます：

```css
:root {
    --primary-color: #8b4513;
    --secondary-color: #ffd700;
    --bg-color: #000;
    --text-color: #fff;
    --box-color: #4a4a4a;
    --highlight-color: #ff6b6b;
    --border-color: #ffd700;
    --success-color: #32cd32;
    --pixel-size: 4px;
}
```

### コンテンツの編集

`index.html`ファイル内のテキストとリンクを編集して、あなた自身のポートフォリオ情報に置き換えてください。

### プロジェクトの追加

作品集セクションに新しいプロジェクトを追加するには、以下のHTMLテンプレートを使用します：

```html
<div class="project-item">
    <div class="project-image" style="background-color: #YOUR_COLOR;"></div>
    <h3>プロジェクト名</h3>
    <p>プロジェクトの説明</p>
</div>
```

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## クレジット

- フォント: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by Google Fonts
- インスピレーション: 8ビット時代のレトロゲーム (ファミコン、ゲームボーイなど) 