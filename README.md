# 數學探險隊

用 [Phaser 3](https://phaser.io/) 製作的國小數學闖關遊戲。操作小隊長移動到正確答案，一路挑戰 5 個關卡。

🎮 線上試玩：https://sean9112.github.io/math-adventure-phaser/

## 遊戲規則

- 答對 **+10 分**並獲得 1 枚金幣，答錯 **−5 分**，滿分 150 分。
- 共 5 關，每關 3 題，總計 15 題。

| 關卡 | 名稱 | 學習內容 |
| --- | --- | --- |
| 1 | 加法森林 | 20 以內加法 |
| 2 | 減法山谷 | 20 以內減法 |
| 3 | 乘法城堡 | 九九乘法 |
| 4 | 除法海灣 | 整數除法 |
| 5 | 混合挑戰 | 加減乘除混合 |

## 操作方式

- 電腦：方向鍵或 `WASD` 移動
- 手機：畫面下方的方向按鈕

## 專案結構

```
index.html                        頁面與方向按鈕
js/main.js                        遊戲邏輯
assets/                           角色圖片（explorer.png 為遊戲使用的縮圖）
vendor/phaser.min.js              Phaser 3.80.1（本機版）
build-single.py                   打包成單一 html
dist/math_adventure_phaser.html   單一檔案版本（無外部依賴）
```

## 本機執行

直接用瀏覽器開啟 `index.html` 或 `dist/math_adventure_phaser.html` 即可，不需要伺服器或網路。

## 打包成單一 html

修改 `js/main.js` 或圖片後，重新輸出單一檔案：

```bash
python3 build-single.py
```

輸出位置為 `dist/math_adventure_phaser.html`，Phaser 與角色圖片都已內嵌，可單獨分享或繳交。
