const i18n = {
    en: {
        title: '3D Snake Game',
        welcome: {
            title: '3D Snake Game',
            description: 'Welcome to this challenging 3D world!',
            controls: 'Use <span class="highlight">↑←↓→</span> or <span class="highlight">WASD</span> to control direction',
            hint: 'Each time you eat food, the scene will rotate, bringing new challenges!',
            startButton: 'Start Game'
        },
        gameOver: {
            title: 'Game Over',
            finalScore: 'Final Score: ',
            globalRank: 'Global Rank: ',
            calculating: 'Calculating...',
            rankNote: 'Global ranking system coming soon',
            restartButton: 'Play Again'
        },
        score: 'Score: ',
        language: 'Language: '
    },
    zh: {
        title: '3D贪吃蛇游戏',
        welcome: {
            title: '3D贪吃蛇',
            description: '欢迎来到这个充满挑战的 3D 世界！',
            controls: '使用 <span class="highlight">↑←↓→</span> 或 <span class="highlight">WASD</span> 控制方向',
            hint: '每吃到一个食物，场景会旋转，带来全新挑战！',
            startButton: '开始游戏'
        },
        gameOver: {
            title: '游戏结束',
            finalScore: '最终得分: ',
            globalRank: '全球排名: ',
            calculating: '计算中...',
            rankNote: '全球排名系统即将上线',
            restartButton: '再玩一次'
        },
        score: '分数: ',
        language: '语言: '
    }
};

// 当前语言
let currentLang = 'en';

// 获取当前语言的文本
function getText(key) {
    const keys = key.split('.');
    let text = i18n[currentLang];
    for (const k of keys) {
        text = text[k];
    }
    return text;
}

// 切换语言
function switchLanguage() {
    currentLang = currentLang === 'en' ? 'zh' : 'en';
    updateAllText();
}

// 更新所有文本
function updateAllText() {
    // 更新标题
    document.title = getText('title');
    
    // 更新欢迎界面
    document.querySelector('#welcome h1').innerHTML = getText('welcome.title');
    document.querySelector('#welcome p:first-of-type').innerHTML = getText('welcome.description');
    document.querySelector('#welcome .controls').innerHTML = getText('welcome.controls');
    document.querySelector('#welcome p:last-of-type').innerHTML = getText('welcome.hint');
    document.querySelector('#welcome button').innerHTML = getText('welcome.startButton');
    
    // 更新游戏结束界面
    document.querySelector('#game-over h2').innerHTML = getText('gameOver.title');
    document.querySelector('#final-score-label').innerHTML = getText('gameOver.finalScore');
    document.querySelector('#final-rank-label').innerHTML = getText('gameOver.globalRank');
    if (document.querySelector('#final-rank').textContent === '计算中...' || document.querySelector('#final-rank').textContent === 'Calculating...') {
        document.querySelector('#final-rank').textContent = getText('gameOver.calculating');
    }
    document.querySelector('.rank-note').textContent = getText('gameOver.rankNote');
    document.querySelector('#game-over button').innerHTML = getText('gameOver.restartButton');
    
    // 更新分数显示
    const scoreElement = document.querySelector('#score');
    const currentScore = scoreElement.textContent.split(': ')[1];
    scoreElement.textContent = getText('score') + currentScore;
    
    // 更新语言切换按钮
    document.querySelector('#language-btn').textContent = getText('language') + (currentLang === 'en' ? '中文' : 'English');
}