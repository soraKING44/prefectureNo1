<script>
// 読み込まれたデータファイルの年度を保存
let loadedDataTitle = null;

// ディレクトリ一覧を取得してランダム選択
async function loadRandomDataFile() {
    try {
        const response = await fetch('datas/data_list.json');
        const data = await response.json();
        const randomIndex = Math.floor(Math.random() * data.files.length);
        const selectedFileData = data.files[randomIndex];
        const selectedFile = `datas/${selectedFileData.filename}`;            
        // loadedDataTitle = selectedFileData.title;
        loadedDataTitle = `${selectedFileData.title}（${selectedFileData.year}年）`;
        
        const script = document.createElement('script');
        script.src = selectedFile;
        script.onload = () => {
            console.log(`Loaded data file: ${selectedFile}`);
        };
        script.onerror = () => {
            console.error(`Failed to load: ${selectedFile}`);
            // フォールバック: 最初のファイルを試す
            const fallbackScript = document.createElement('script');
            fallbackScript.src = `datas/${data.files[0].filename}`;
            loadedDataTitle = data.files[0].title;
            document.head.appendChild(fallbackScript);
        };
        document.head.appendChild(script);
    } catch (error) {
        console.error('Failed to load file list:', error);
        // フォールバック: デフォルトファイルを読み込み
        const script = document.createElement('script');
        script.src = 'datas/population2020.js';
        loadedDataTitle = '人口';
        document.head.appendChild(script);
    }
}
// データファイルを読み込み
loadRandomDataFile();
</script>

<!-- バージョン情報の読み込み -->
<script>
fetch('version.json')
  .then(r => r.json())
  .then(data => {
    document.getElementById('version-text').textContent = `version ${data.version} © soraKING44`;
  })
  .catch(()=>{
    document.getElementById('version-text').textContent = `version (取得失敗) © soraKING44`;
  });
</script>

<script>
    // 都道府県コードマッピング（data-code属性用）
    const prefectureCodeMap = {
        1: "北海道", 2: "青森県", 3: "岩手県", 4: "宮城県", 5: "秋田県", 6: "山形県", 7: "福島県",
        8: "茨城県", 9: "栃木県", 10: "群馬県", 11: "埼玉県", 12: "千葉県", 13: "東京都", 14: "神奈川県",
        15: "新潟県", 16: "富山県", 17: "石川県", 18: "福井県", 19: "山梨県", 20: "長野県",
        21: "岐阜県", 22: "静岡県", 23: "愛知県", 24: "三重県",
        25: "滋賀県", 26: "京都府", 27: "大阪府", 28: "兵庫県", 29: "奈良県", 30: "和歌山県",
        31: "鳥取県", 32: "島根県", 33: "岡山県", 34: "広島県", 35: "山口県",
        36: "徳島県", 37: "香川県", 38: "愛媛県", 39: "高知県",
        40: "福岡県", 41: "佐賀県", 42: "長崎県", 43: "熊本県", 44: "大分県", 45: "宮崎県", 46: "鹿児島県",
        47: "沖縄県"
    };

    // ゲーム状態
    let gameState = {
        answerCount: 0,
        revealedRanks: new Set(),
        answeredPrefectures: new Set(),
        gameOver: false,
        initialHint: null,
        latestAnsweredPrefecture: null
    };

    // 人口データが読み込まれるまで待機
    function waitForRankingData() {
        return new Promise((resolve) => {
            const checkData = () => {
                if (window.rankingData) {
                    resolve();
                } else {
                    setTimeout(checkData, 10);
                }
            };
            checkData();
        });
    }

    // 外部SVGファイルを読み込む関数
    async function loadJapanMap() {
        try {
            const response = await fetch('japan_map_svg.html');
            const svgText = await response.text();
            document.getElementById('japan-map-container').innerHTML = svgText;
            updateMap();
        } catch (error) {
            console.error('日本地図SVGファイルの読み込みに失敗しました:', error);
            // フォールバック表示
            document.getElementById('japan-map-container').innerHTML = `
                <svg class="japan-map" viewBox="0 0 1000 1000">
                    <text x="500" y="450" text-anchor="middle" fill="#666" font-size="24">
                        日本地図SVGファイルが
                    </text>
                    <text x="500" y="480" text-anchor="middle" fill="#666" font-size="24">
                        見つかりません
                    </text>
                    <text x="500" y="520" text-anchor="middle" fill="#666" font-size="16">
                        japan_map_svg.htmlファイルを
                    </text>
                    <text x="500" y="540" text-anchor="middle" fill="#666" font-size="16">
                        同じフォルダに配置してください
                    </text>
                </svg>
            `;
        }
    }

    // 地図の更新
    function updateMap() {
        const svgMap = document.querySelector('#japan-map-container svg');
        if (!svgMap) return;
        const prefectureGroups = svgMap.querySelectorAll('.prefectures g[data-code]');
        prefectureGroups.forEach(group => {
            const code = parseInt(group.getAttribute('data-code'));
            const prefectureName = prefectureCodeMap[code];
            group.classList.remove('answered', 'correct', 'hint');
            if (prefectureName) {
                if (gameState.gameOver) {
                    const prefectureData = window.rankingData.find(item => item.name === prefectureName);
                    if (prefectureData && prefectureData.rank === 1) {
                        group.classList.add('correct');
                    } else if (gameState.answeredPrefectures.has(prefectureName)) {
                        group.classList.add('answered');
                    } else if (gameState.initialHintPrefecture === prefectureName) {
                        group.classList.add('hint');
                    }
                }
                else if (gameState.answeredPrefectures.has(prefectureName)) {
                    group.classList.add('answered');
                } else if (gameState.initialHintPrefecture === prefectureName) {
                    group.classList.add('hint');
                }
            }
            group.style.cursor = 'pointer';
            group.onclick = () => {
                if (prefectureName && !gameState.answeredPrefectures.has(prefectureName)) {
                    const prefectureData = window.rankingData.find(item => item.name === prefectureName);
                    if (prefectureData && !(gameState.initialHintPrefecture === prefectureName)) {
                        answerPrefecture(prefectureName, prefectureData.rank);
                    }
                }
            };
        });
    }

    // 初期化
    async function initGame() {
        await waitForRankingData();
        loadJapanMap();
        // 1位以外の県をすべて取得
        const nonFirstPlacePrefectures = window.rankingData.filter(item => item.rank !== 1);

        // 各順位の出現回数をカウント
        const rankCounts = nonFirstPlacePrefectures.reduce((acc, item) => {
            acc[item.rank] = (acc[item.rank] || 0) + 1;
            return acc;
        }, {});

        // 優先候補として、順位がユニークな県（出現回数が1回）を抽出
        let hintCandidates = nonFirstPlacePrefectures.filter(item => rankCounts[item.rank] === 1);

        // もしユニークな順位の県がなければ、全候補（1位以外）から選ぶ
        if (hintCandidates.length === 0) {
            hintCandidates = nonFirstPlacePrefectures;
        }

        // 候補の中からランダムに1つ選択
        const randomIndex = Math.floor(Math.random() * hintCandidates.length);
        const selectedPrefecture = hintCandidates[randomIndex];
        
        gameState.initialHint = selectedPrefecture.rank;
        gameState.initialHintPrefecture = selectedPrefecture.name;
        gameState.revealedRanks.add(selectedPrefecture.rank);
        renderRankingTable();
        renderPrefectureButtons();
        updateGameStats();
        updateMessage(`ヒント: ${selectedPrefecture.name}は${selectedPrefecture.rank}位です`);
    }

    // ランキング表の描画
    function renderRankingTable() {
        const table = document.getElementById('ranking-table');
        let html = '';
        window.rankingData.forEach(item => {
            // 回答済みの県、または初期ヒントの県のみ表示
            const isInitialHintPrefecture = gameState.initialHintPrefecture === item.name;
            if (gameState.answeredPrefectures.has(item.name) || isInitialHintPrefecture) {
                const isLatest = gameState.latestAnsweredPrefecture === item.name;
                html += `<div class="ranking-row revealed${item.rank === 1 && gameState.gameOver ? ' winner' : ''}${isLatest ? ' latest' : ''}">
                    <span class="rank-number">${item.rank}位</span>
                    <span class="prefecture-name">${item.name}</span>
                </div>`;
            }
        });
        table.innerHTML = html;
    }

    // 都道府県ボタンの描画
    function renderPrefectureButtons() {
        const container = document.getElementById('prefecture-buttons');
        container.innerHTML = '';
        const geographicalOrder = [
            "北海道",
            "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
            "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
            "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
            "岐阜県", "静岡県", "愛知県", "三重県",
            "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
            "鳥取県", "島根県", "岡山県", "広島県", "山口県",
            "徳島県", "香川県", "愛媛県", "高知県",
            "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県",
            "沖縄県"
        ];
        const sortedData = geographicalOrder.map(name => 
            window.rankingData.find(item => item.name === name)
        ).filter(item => item !== undefined);
        sortedData.forEach(item => {
            const button = document.createElement('button');
            button.className = 'prefecture-btn';
            button.textContent = item.name;
            const isAnswered = gameState.answeredPrefectures.has(item.name);
            const isInitialHint = gameState.initialHintPrefecture === item.name;
            button.disabled = isAnswered || isInitialHint;
            button.addEventListener('click', () => {
                answerPrefecture(item.name, item.rank);
            });
            container.appendChild(button);
        });
    }

    // 回答処理
    function answerPrefecture(prefectureName, rank) {
        // 1. 共通のデータ更新処理
        gameState.answeredPrefectures.add(prefectureName);
        gameState.latestAnsweredPrefecture = prefectureName;
        gameState.revealedRanks.add(rank);

        // 2. ゲーム中か、ゲームクリア後かで処理を分岐
        if (!gameState.gameOver) {
            // --- ゲーム中の処理 ---
            gameState.answerCount++;
            if (rank === 1) {
                gameState.gameOver = true;
                updateMessage(`🎉 おめでとうございます！1位は${prefectureName}でした！`);
                showGameOver(prefectureName);
            } else {
                updateMessage(`残念！${prefectureName}は${rank}位でした`);
            }
        } else {
            // --- ゲームクリア後の処理 ---
            const additionalInfo = document.getElementById('additional-info');
            if (additionalInfo) {
                additionalInfo.textContent = `${prefectureName}は${rank}位でした`;
            }
        }
        
        // 3. 共通の画面更新処理
        renderRankingTable();
        renderPrefectureButtons();
        updateGameStats();
        updateMap();
    }

    // ゲーム統計の更新
    function updateGameStats() {
        const totalPrefectures = Object.keys(prefectureCodeMap).length;
        document.getElementById('answer-count').textContent = gameState.answerCount;
        const remainingChoices = totalPrefectures - gameState.answeredPrefectures.size - 1;
        document.getElementById('remaining-count').textContent = Math.max(0, remainingChoices); // 残り選択肢がマイナスにならないように配慮
    }

    // メッセージの更新
    function updateMessage(message) {
        document.getElementById('message-area').textContent = message;
    }

    // ゲーム終了画面（game-info-panelに表示）
    function showGameOver(winnerName) {
        const messageArea = document.getElementById('message-area');
        const yearText = loadedDataTitle ? `${loadedDataTitle}のデータでした！` : '';
        messageArea.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 1rem;">🎉 ゲームクリア！ 🎉</div>
                <div style="margin-bottom: 0.5rem;">1位は <strong>${winnerName}</strong> でした！</div>
                <div style="margin-bottom: 0.5rem;">回答回数: <strong>${gameState.answerCount}回</strong></div>
                ${yearText ? `<div style="margin-bottom: 0.5rem; font-size: 0.9rem; opacity: 0.9;">${yearText}</div>` : ''}
                <div id="additional-info" style="margin-top: 1rem; margin-bottom: 1rem; font-size: 0.9rem; opacity: 0.8; min-height: 1.2em;">ゲームクリア後も、気になる県をクリックして順位を確認できます。</div>
                <button onclick="location.reload()" style="background: #4caf50; color: white; border: none; padding: 10px 20px; border-radius: 25px; font-weight: bold; cursor: pointer;">もう一度遊ぶ</button>
            </div>
        `;
        messageArea.style.background = 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)';
        messageArea.style.color = 'white';
        messageArea.style.border = '2px solid #2e7d32';
    }

    // ゲーム開始
    initGame();
</script>
