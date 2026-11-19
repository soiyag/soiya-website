// 8ビット風 音声入力アプリ
// ブラウザ標準の Web Speech API（SpeechRecognition）で音声を文字にする

(() => {
    'use strict';

    const STORAGE_KEYS = {
        text: 'soiya-voice-memo:text',
        lang: 'soiya-voice-memo:lang',
        commands: 'soiya-voice-memo:commands'
    };

    // 音声コマンド（言葉 → 記号）
    // 前後の空白は「改行以外」だけ取る（\s だと改行コマンドで入れた改行まで消えてしまう）
    const COMMANDS = {
        ja: [
            { re: /[ \t　]*(改行|かいぎょう)[ \t　]*/g, to: '\n' },
            { re: /[ \t　]*(句点|くてん)[ \t　]*/g, to: '。' },
            { re: /[ \t　]*(読点|とうてん)[ \t　]*/g, to: '、' },
            { re: /[ \t　]*(疑問符|ぎもんふ)[ \t　]*/g, to: '？' },
            { re: /[ \t　]*(感嘆符|かんたんふ)[ \t　]*/g, to: '！' }
        ],
        en: [
            { re: /[ \t]*\bnew ?line\b[ \t]*/gi, to: '\n' },
            { re: /[ \t]*\b(period|full stop)\b/gi, to: '.' },
            { re: /[ \t]*\bcomma\b/gi, to: ',' },
            { re: /[ \t]*\bquestion mark\b/gi, to: '?' },
            { re: /[ \t]*\bexclamation (mark|point)\b/gi, to: '!' }
        ]
    };

    // 単語の間にスペースを入れない言語
    const NO_SPACE_LANGS = /^(ja|zh)/;

    // Android の Chrome は continuous モードで結果が重複するので、1回ずつ区切って自動で再開する
    const IS_ANDROID = /Android/i.test(navigator.userAgent);

    const ERROR_MESSAGES = {
        'not-allowed': 'マイクの使用が許可されていません。ブラウザの設定でマイクを許可してください。',
        'service-not-allowed': 'このページでは音声認識が使えません。https のページで開いてください。',
        'audio-capture': 'マイクが見つかりません。接続を確認してください。',
        'network': 'ネットワークエラーです。インターネット接続を確認してください。',
        'language-not-supported': 'この言語には対応していません。別の言語を選んでください。',
        'too-many-restarts': '音声認識がすぐに止まってしまいます。少し待ってからもう一度試してください。'
    };

    // ---------- 要素 ----------
    const $ = (id) => document.getElementById(id);
    const micBtn = $('micBtn');
    const micLabel = $('micLabel');
    const statusBadge = $('statusBadge');
    const statusText = $('statusText');
    const visualizer = $('visualizer');
    const langSelect = $('langSelect');
    const cmdToggle = $('cmdToggle');
    const transcript = $('transcript');
    const interimEl = $('interim');
    const charCount = $('charCount');
    const saveState = $('saveState');
    const copyBtn = $('copyBtn');
    const downloadBtn = $('downloadBtn');
    const undoBtn = $('undoBtn');
    const clearBtn = $('clearBtn');
    const toast = $('toast');

    // ---------- 保存まわり（使えない環境でも動くように） ----------
    const storage = {
        get(key) {
            try { return localStorage.getItem(key); } catch (e) { return null; }
        },
        set(key, value) {
            try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
        }
    };

    // ---------- 8ビット効果音 ----------
    let audioCtx = null;
    function beep(notes) {
        try {
            audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            let t = audioCtx.currentTime;
            notes.forEach(([freq, dur]) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.06, t);
                gain.gain.setValueAtTime(0, t + dur);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(t);
                osc.stop(t + dur);
                t += dur;
            });
        } catch (e) {
            // 音が出せなくてもアプリは動かす
        }
    }
    const SOUNDS = {
        start: [[523, 0.06], [784, 0.08]],
        stop: [[784, 0.06], [523, 0.08]],
        ok: [[988, 0.05], [1319, 0.08]],
        error: [[220, 0.12], [165, 0.18]]
    };

    // ---------- トースト ----------
    let toastTimer = null;
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('is-show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('is-show'), 1800);
    }

    // ---------- テキスト ----------
    const undoStack = [];
    const UNDO_LIMIT = 50;

    function pushUndo() {
        undoStack.push({
            value: transcript.value,
            start: transcript.selectionStart,
            end: transcript.selectionEnd
        });
        if (undoStack.length > UNDO_LIMIT) undoStack.shift();
        undoBtn.disabled = false;
    }

    function undo() {
        const prev = undoStack.pop();
        if (!prev) return;
        transcript.value = prev.value;
        transcript.setSelectionRange(prev.start, prev.end);
        undoBtn.disabled = undoStack.length === 0;
        onTextChanged();
        beep(SOUNDS.stop);
    }

    let saveTimer = null;
    function onTextChanged() {
        charCount.textContent = [...transcript.value.replace(/\s/g, '')].length;
        saveState.textContent = '';
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            if (storage.set(STORAGE_KEYS.text, transcript.value)) {
                saveState.textContent = 'SAVED';
            }
        }, 400);
    }

    function applyCommands(text) {
        if (!cmdToggle.checked) return text;
        const family = langSelect.value.slice(0, 2);
        const rules = COMMANDS[family];
        if (!rules) return text;
        return rules.reduce((acc, rule) => acc.replace(rule.re, rule.to), text);
    }

    // 確定した文字をカーソル位置に入れる
    function insertText(raw) {
        let text = applyCommands(raw);
        // 空白だけなら何もしない（改行コマンドは通す）
        if (!text || (!text.trim() && !text.includes('\n'))) return;

        const value = transcript.value;
        const start = transcript.selectionStart;
        const end = transcript.selectionEnd;
        const before = value.slice(0, start);
        const after = value.slice(end);

        // 先頭の空白（改行以外）は取る
        text = text.replace(/^[ \t　]+/, '');

        if (!NO_SPACE_LANGS.test(langSelect.value)) {
            // 英語などは単語の間にスペースを入れる
            const needsSpace = before.length > 0 && !/\s$/.test(before) && !/^[\s.,!?;:]/.test(text);
            // 文の始まりなら大文字に
            if (/(^|[.!?。！？\n])\s*$/.test(before)) {
                text = text.replace(/^([a-z])/, (ch) => ch.toUpperCase());
            }
            if (needsSpace) text = ' ' + text;
        }

        pushUndo();
        transcript.value = before + text + after;
        const caret = before.length + text.length;
        transcript.setSelectionRange(caret, caret);
        // カーソル位置が見えるようにスクロール
        if (caret >= transcript.value.length - 1) {
            transcript.scrollTop = transcript.scrollHeight;
        }
        onTextChanged();
    }

    // ---------- 音声認識 ----------
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    let recognition = null;
    let wantListening = false; // ユーザーが録音中にしたいかどうか
    let isRunning = false;     // 認識エンジンが動いているかどうか
    let lastStartAt = 0;
    let quickEnds = 0;
    let fatalError = null;
    let restartTimer = null;

    function setUI(state, message) {
        micBtn.classList.toggle('is-rec', state === 'rec');
        micBtn.setAttribute('aria-pressed', String(state === 'rec'));
        micLabel.textContent = state === 'rec' ? 'STOP' : 'START';

        statusBadge.classList.toggle('is-rec', state === 'rec');
        statusBadge.classList.toggle('is-error', state === 'error');
        statusBadge.textContent = state === 'rec' ? 'REC' : state === 'error' ? 'ERROR' : 'READY';

        statusText.classList.toggle('is-error', state === 'error');
        if (message !== undefined) statusText.textContent = message;

        visualizer.classList.toggle('is-listening', state === 'rec');
        if (state !== 'rec') visualizer.classList.remove('is-speaking');
    }

    function showInterim(text) {
        interimEl.textContent = text;
    }

    function setupRecognition() {
        const r = new SpeechRecognition();
        r.continuous = !IS_ANDROID;
        r.interimResults = true;
        r.maxAlternatives = 1;

        r.onstart = () => {
            isRunning = true;
            lastStartAt = Date.now();
        };

        r.onspeechstart = () => visualizer.classList.add('is-speaking');
        r.onspeechend = () => visualizer.classList.remove('is-speaking');

        r.onresult = (event) => {
            quickEnds = 0;
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const text = result[0].transcript;
                if (result.isFinal) {
                    insertText(text);
                } else {
                    interim += text;
                }
            }
            showInterim(interim);
        };

        r.onerror = (event) => {
            // 無音・中断はよくあることなので、そのまま再開させる
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            fatalError = event.error;
        };

        r.onend = () => {
            isRunning = false;
            showInterim('');
            visualizer.classList.remove('is-speaking');

            if (fatalError) {
                const message = ERROR_MESSAGES[fatalError] || `エラーが起きました（${fatalError}）`;
                fatalError = null;
                wantListening = false;
                setUI('error', message);
                beep(SOUNDS.error);
                return;
            }

            if (!wantListening) {
                setUI('idle', '停止しました');
                return;
            }

            // すぐに終わってしまうのが続くなら、無限ループを避けて止める
            if (Date.now() - lastStartAt < 1000) {
                quickEnds++;
            } else {
                quickEnds = 0;
            }
            if (quickEnds >= 5) {
                quickEnds = 0;
                wantListening = false;
                setUI('error', ERROR_MESSAGES['too-many-restarts']);
                beep(SOUNDS.error);
                return;
            }

            clearTimeout(restartTimer);
            restartTimer = setTimeout(startEngine, 150);
        };

        return r;
    }

    function startEngine() {
        if (!wantListening || isRunning) return;
        recognition.lang = langSelect.value;
        try {
            recognition.start();
        } catch (e) {
            // すでに開始している場合など
        }
    }

    function startListening() {
        if (!recognition) return;
        wantListening = true;
        fatalError = null;
        quickEnds = 0;
        setUI('rec', 'きいています…話しかけてください');
        beep(SOUNDS.start);
        startEngine();
    }

    function stopListening() {
        wantListening = false;
        clearTimeout(restartTimer);
        beep(SOUNDS.stop);
        if (isRunning) {
            // stop() は話している途中の言葉も確定してから止まる（終わると onend が呼ばれる）
            setUI('idle', '停止しています…');
            recognition.stop();
        } else {
            setUI('idle', '停止しました');
        }
    }

    function toggleListening() {
        if (wantListening) stopListening();
        else startListening();
    }

    // ---------- ボタンなど ----------
    async function copyText() {
        const text = transcript.value;
        if (!text) {
            showToast('コピーする文字がありません');
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
        } catch (e) {
            // 古いブラウザ向け
            const start = transcript.selectionStart;
            const end = transcript.selectionEnd;
            transcript.select();
            const ok = document.execCommand && document.execCommand('copy');
            transcript.setSelectionRange(start, end);
            if (!ok) {
                showToast('コピーできませんでした');
                return;
            }
        }
        beep(SOUNDS.ok);
        showToast('コピーしました！');
    }

    function downloadText() {
        const text = transcript.value;
        if (!text) {
            showToast('保存する文字がありません');
            return;
        }
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const name = `voice-memo-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.txt`;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        beep(SOUNDS.ok);
        showToast('ファイルを保存しました');
    }

    function clearText() {
        if (!transcript.value) return;
        if (!window.confirm('テキストを全部消しますか？\n（「元に戻す」で復活できます）')) return;
        pushUndo();
        transcript.value = '';
        onTextChanged();
        beep(SOUNDS.stop);
        showToast('クリアしました');
    }

    // ---------- 初期化 ----------
    function init() {
        // 保存していた内容を復元
        const savedText = storage.get(STORAGE_KEYS.text);
        if (savedText) {
            transcript.value = savedText;
            transcript.setSelectionRange(savedText.length, savedText.length);
        }
        const savedLang = storage.get(STORAGE_KEYS.lang);
        if (savedLang && [...langSelect.options].some((o) => o.value === savedLang)) {
            langSelect.value = savedLang;
        } else {
            // ブラウザの言語に近いものを選ぶ
            const browserLang = (navigator.language || 'ja-JP').toLowerCase();
            const match = [...langSelect.options].find((o) => o.value.toLowerCase() === browserLang)
                || [...langSelect.options].find((o) => o.value.slice(0, 2) === browserLang.slice(0, 2));
            if (match) langSelect.value = match.value;
        }
        const savedCmd = storage.get(STORAGE_KEYS.commands);
        if (savedCmd !== null) cmdToggle.checked = savedCmd === '1';
        charCount.textContent = [...transcript.value.replace(/\s/g, '')].length;

        transcript.addEventListener('input', () => {
            // 手で編集したら、音声入力の「元に戻す」履歴はリセット（手入力は Ctrl+Z で戻せる）
            undoStack.length = 0;
            undoBtn.disabled = true;
            onTextChanged();
        });

        langSelect.addEventListener('change', () => {
            storage.set(STORAGE_KEYS.lang, langSelect.value);
            beep(SOUNDS.ok);
            // 録音中なら新しい言語で再開する
            if (wantListening && isRunning) recognition.abort();
        });

        cmdToggle.addEventListener('change', () => {
            storage.set(STORAGE_KEYS.commands, cmdToggle.checked ? '1' : '0');
        });

        copyBtn.addEventListener('click', copyText);
        downloadBtn.addEventListener('click', downloadText);
        undoBtn.addEventListener('click', undo);
        clearBtn.addEventListener('click', clearText);

        if (!SpeechRecognition) {
            $('unsupported').hidden = false;
            micBtn.disabled = true;
            setUI('error', '音声認識が使えません（手入力はできます）');
            return;
        }

        recognition = setupRecognition();
        micBtn.addEventListener('click', toggleListening);

        // スペースキーで開始／停止、Esc で停止
        document.addEventListener('keydown', (e) => {
            const tag = (e.target.tagName || '').toLowerCase();
            const typing = ['textarea', 'input', 'select', 'button', 'a'].includes(tag);
            if (e.code === 'Space' && !typing && !e.repeat) {
                e.preventDefault();
                toggleListening();
            } else if (e.key === 'Escape' && wantListening) {
                stopListening();
            }
        });

        // タブを離れたら止める（マイクを使いっぱなしにしない）
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && wantListening) stopListening();
        });
    }

    init();
})();
