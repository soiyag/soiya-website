// 8ビットレトロゲームスタイルのJavaScript

// ゲームサウンド効果
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// 8ビットサウンドを生成する関数
function playRetroSound(type) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
        case 'select':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'click':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.05);
            break;
        case 'hover':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(330, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.03);
            break;
    }
}

// ナビゲーションメニューの処理
document.addEventListener('DOMContentLoaded', () => {
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.game-section');
    
    // メニュー項目のクリックイベント
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.getAttribute('data-section');
            
            // アクティブなメニュー項目を更新
            menuItems.forEach(menuItem => menuItem.classList.remove('active'));
            item.classList.add('active');
            
            // アクティブなセクションを更新
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');
            
            // サウンド効果を再生
            playRetroSound('select');
            
            // ピクセル化アニメーション効果
            document.querySelector('.game-screen').style.animation = 'pixelate 0.3s';
            setTimeout(() => {
                document.querySelector('.game-screen').style.animation = '';
            }, 300);
        });
        
        // ホバー効果
        item.addEventListener('mouseenter', () => {
            playRetroSound('hover');
        });
    });
    
    // コントロールボタンのホバー効果
    const controlBtns = document.querySelectorAll('.control-btn');
    controlBtns.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            playRetroSound('hover');
        });
        
        btn.addEventListener('click', () => {
            playRetroSound('click');
        });
    });
    
    // D-padとアクションボタンのホバー効果
    const gameBtns = document.querySelectorAll('.d-up, .d-right, .d-down, .d-left, .btn-a, .btn-b');
    gameBtns.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            playRetroSound('hover');
        });
        
        btn.addEventListener('click', () => {
            playRetroSound('click');
        });
    });
    
    // D-padでのナビゲーション
    const dPad = {
        up: document.querySelector('.d-up'),
        right: document.querySelector('.d-right'),
        down: document.querySelector('.d-down'),
        left: document.querySelector('.d-left')
    };
    
    let currentMenuIndex = 0;
    
    dPad.right.addEventListener('click', () => {
        if (currentMenuIndex < menuItems.length - 1) {
            currentMenuIndex++;
            menuItems[currentMenuIndex].click();
        }
    });
    
    dPad.left.addEventListener('click', () => {
        if (currentMenuIndex > 0) {
            currentMenuIndex--;
            menuItems[currentMenuIndex].click();
        }
    });
    
    // A/Bボタンの機能
    const btnA = document.querySelector('.btn-a');
    const btnB = document.querySelector('.btn-b');
    
    btnA.addEventListener('click', () => {
        menuItems[currentMenuIndex].click();
    });
    
    btnB.addEventListener('click', () => {
        // 前のセクションに戻る
        if (currentMenuIndex > 0) {
            currentMenuIndex--;
            menuItems[currentMenuIndex].click();
        }
    });
    
    // STARTボタンの機能
    const startBtn = document.querySelector('.control-btn:first-child');
    startBtn.addEventListener('click', () => {
        // ページをリロード
        location.reload();
    });
    
    // SELECTボタンの機能
    const selectBtn = document.querySelector('.control-btn:last-child');
    selectBtn.addEventListener('click', () => {
        // テーマカラーを切り替え
        toggleTheme();
    });
    
    // フォームの送信処理
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // フォーム送信アニメーション
            const submitBtn = contactForm.querySelector('.pixel-btn');
            submitBtn.textContent = '送信中...';
            
            // 送信成功のシミュレーション
            setTimeout(() => {
                submitBtn.textContent = '送信完了!';
                submitBtn.style.backgroundColor = 'var(--success-color)';
                playRetroSound('select');
                
                // フォームをリセット
                setTimeout(() => {
                    contactForm.reset();
                    submitBtn.textContent = '送信する';
                    submitBtn.style.backgroundColor = '';
                }, 2000);
            }, 1500);
        });
    }
    
    // ピクセルアバターのアニメーション
    const avatar = document.querySelector('.pixel-avatar');
    if (avatar) {
        avatar.addEventListener('click', () => {
            avatar.style.animation = 'pixelate 0.5s';
            playRetroSound('click');
            setTimeout(() => {
                avatar.style.animation = '';
            }, 500);
        });
    }
    
    // プロジェクト項目のクリックイベント
    const projectItems = document.querySelectorAll('.project-item');
    projectItems.forEach(item => {
        item.addEventListener('click', () => {
            playRetroSound('click');
            item.style.animation = 'pixelate 0.3s';
            setTimeout(() => {
                item.style.animation = '';
            }, 300);
        });
    });
});

// テーマカラーの切り替え
function toggleTheme() {
    const root = document.documentElement;
    const themes = [
        {
            primary: '#8b4513',
            secondary: '#ffd700',
            bg: '#000',
            text: '#fff',
            box: '#4a4a4a',
            highlight: '#ff6b6b'
        },
        {
            primary: '#4a508f',
            secondary: '#61dafb',
            bg: '#282c34',
            text: '#fff',
            box: '#3a3f4b',
            highlight: '#e84393'
        },
        {
            primary: '#2e7d32',
            secondary: '#ffeb3b',
            bg: '#1b1b1b',
            text: '#e0e0e0',
            box: '#333333',
            highlight: '#f44336'
        }
    ];
    
    // 現在のテーマを取得
    const currentPrimary = getComputedStyle(root).getPropertyValue('--primary-color').trim();
    
    // 次のテーマを見つける
    let nextThemeIndex = 0;
    for (let i = 0; i < themes.length; i++) {
        if (themes[i].primary === currentPrimary) {
            nextThemeIndex = (i + 1) % themes.length;
            break;
        }
    }
    
    // 新しいテーマを適用
    const newTheme = themes[nextThemeIndex];
    root.style.setProperty('--primary-color', newTheme.primary);
    root.style.setProperty('--secondary-color', newTheme.secondary);
    root.style.setProperty('--bg-color', newTheme.bg);
    root.style.setProperty('--text-color', newTheme.text);
    root.style.setProperty('--box-color', newTheme.box);
    root.style.setProperty('--highlight-color', newTheme.highlight);
    
    // ピクセル化アニメーション効果
    document.body.style.animation = 'pixelate 0.5s';
    setTimeout(() => {
        document.body.style.animation = '';
    }, 500);
    
    playRetroSound('select');
}

// タイプライター効果
function typeWriter(element, text, speed = 50, callback) {
    let i = 0;
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else if (callback) {
            callback();
        }
    }
    
    element.textContent = '';
    type();
}

// キーボードナビゲーション
document.addEventListener('keydown', (e) => {
    const menuItems = document.querySelectorAll('.menu-item');
    let currentIndex = Array.from(menuItems).findIndex(item => item.classList.contains('active'));
    
    switch(e.key) {
        case 'ArrowRight':
            if (currentIndex < menuItems.length - 1) {
                menuItems[currentIndex + 1].click();
            }
            break;
        case 'ArrowLeft':
            if (currentIndex > 0) {
                menuItems[currentIndex - 1].click();
            }
            break;
        case 'Enter':
            // 現在のセクションの何かをアクティブにする
            break;
    }
});

// ページ読み込み時のイントロアニメーション
window.addEventListener('load', () => {
    const header = document.querySelector('.pixel-text');
    const originalText = header.textContent;
    
    // ヘッダーテキストのタイピングアニメーション
    typeWriter(header, originalText, 100, () => {
        // タイピングが完了したら、メニューを表示
        document.querySelector('.game-menu').style.opacity = '1';
        document.querySelector('.game-screen').style.opacity = '1';
    });
    
    // 初期状態ではメニューと画面を非表示
    document.querySelector('.game-menu').style.opacity = '0';
    document.querySelector('.game-screen').style.opacity = '0';
    
    // フェードインアニメーション
    document.querySelector('.game-menu').style.transition = 'opacity 0.5s ease-in-out';
    document.querySelector('.game-screen').style.transition = 'opacity 0.5s ease-in-out';
}); 