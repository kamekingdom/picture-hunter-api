import React, { useContext, useEffect, useRef, useState } from 'react';
import { storage, db } from '../firebaseConfig'; // Firebase関連
import '../App.css'; // CSS関連
import useMonsters from './useMonsters'; // Monster fetch Hooks
import { ColorContext } from '../App';
import { doc, updateDoc } from 'firebase/firestore'; // Firestoreの更新用関数をインポート
import bgmSrc from "./sounds/bgm.mp3";
import { ref, getDownloadURL } from "firebase/storage";
import enterTerritorySoundSrc from "./sounds/goal.mp3"; // 効果音のパスを指定
import battleSoundSrc from "./sounds/battle.mp3"; // 効果音のパスを指定

// Icon系統
import { MdMusicNote, MdMusicOff } from "react-icons/md";
import { rgb } from 'polished';

const BattleField = () => {
    const { leftMonsters, rightMonsters } = useMonsters();

    // useRef系統
    const canvasRef = useRef(null);
    const imageCache = useRef({});
    const positions = useRef({});
    const stopMovement = useRef({}); // モンスターの移動を停止するためのフラグ
    const monsterHP = useRef({}); // 各モンスターのHP
    const removedMonsters = useRef(new Set()); // 削除済みモンスターのIDを追跡
    const collisionPairs = useRef(new Set()); // 衝突したモンスターのペアを記録
    const originalSpeed = useRef({}); // モンスターの元のスピードを保存
    const groundImage = useRef(null); // 地面の画像を保持
    const previousProgress = useRef({ left: 0, right: 0 }); // 前回の進行状況を保存
    const obstacles = useRef([]); // 障害物の位置とHPを管理する
    const ongoingBattles = useRef([]); // 進行中のバトルを管理する配列
    const ongoingSouls = useRef([]); // 進行中の魂のアニメーションを管理する配列
    const backgroundImage = useRef(null); // 背景画像を保持するためのuseRef
    const attackMotion = useRef({}); // 各モンスターの攻撃モーションの状態を管理する
    const bgmRef = useRef(null); // BGM用のuseRef
    const enterTerritorySoundRef = useRef(null); // 効果音用の useRef
    const battleSoundRef = useRef(null); // 効果音用の useRef
    const towerHP = useRef(500); // 塔の初期HP

    // useState系統
    const [isPlaying, setIsPlaying] = useState(false); // BGMの再生状態を管理するuseState
    const [leftPoints, setLeftPoints] = useState(0); // 左陣地のポイント
    const [rightPoints, setRightPoints] = useState(0); // 右陣地のポイント

    // useContextをコンポーネント本体で呼び出す
    const colorInfo = useContext(ColorContext);
    const BLUE = colorInfo.leftMonsterColor;
    const ORANGE = colorInfo.rightMonsterColor;

    // 調整用変数
    const monsterSpeedControl = 0.5 // モンスターの速度の比率
    const attackAmplitude = 3; // 攻撃モーションの振幅を設定
    const baseSize = 25;

    useEffect(() => {
        const bgm = bgmRef.current;
        if (bgm && isPlaying) {
            bgm.play(); // BGMを再生
        }

        return () => {
            if (bgm) {
                bgm.pause(); // BGMを停止
                bgm.currentTime = 0; // 再生位置をリセット
            }
        };
    }, [isPlaying]); // isPlayingが変わるたびに実行

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let lastFrameTime = 0;
        let frameRate = 30; // 初期フレームレートを設定（例えば30fps）
        let interval = 1000 / frameRate; // フレーム間の時間を計算

        const loadImages = async () => {
            const allMonsters = [...leftMonsters, ...rightMonsters];
            await Promise.all(allMonsters.map(async (monster) => {
                if (!imageCache.current[monster.id]) {
                    const url = await getDownloadURL(ref(storage, monster.ImagePath));
                    const img = new Image();
                    img.src = url;
                    await new Promise((resolve) => {
                        img.onload = resolve;
                    });
                    imageCache.current[monster.id] = img;
                }
            }));

            // 地面の画像をロード
            const groundImg = new Image();
            groundImg.src = '/images/ground.png';
            await new Promise((resolve) => {
                groundImg.onload = resolve;
            });
            groundImage.current = groundImg;

            // 背景画像をロード
            const bgImg = new Image();
            bgImg.src = '/images/bgImage.jpg'; // 背景画像のパスを指定
            await new Promise((resolve) => {
                bgImg.onload = resolve;
            });
            backgroundImage.current = bgImg;

            // 左側の魂の画像をロード
            const leftSoulImg = new Image();
            leftSoulImg.src = '/images/leftSoul.png';
            await new Promise((resolve) => {
                leftSoulImg.onload = resolve;
            });
            imageCache.current['leftSoul'] = leftSoulImg;

            // 右側の魂の画像をロード
            const rightSoulImg = new Image();
            rightSoulImg.src = '/images/rightSoul.png';
            await new Promise((resolve) => {
                rightSoulImg.onload = resolve;
            });
            imageCache.current['rightSoul'] = rightSoulImg;

            // leftMonsters用の目の画像をロード
            const leftEyeImg = new Image();
            leftEyeImg.src = '/images/leftEyeImage.png'; // leftMonsters用の目の画像パスを指定
            await new Promise((resolve) => {
                leftEyeImg.onload = resolve;
            });
            imageCache.current['leftEyes'] = leftEyeImg;

            // rightMonsters用の目の画像をロード
            const rightEyeImg = new Image();
            rightEyeImg.src = '/images/rightEyeImage.png'; // rightMonsters用の目の画像パスを指定
            await new Promise((resolve) => {
                rightEyeImg.onload = resolve;
            });
            imageCache.current['rightEyes'] = rightEyeImg;

            const footImg = new Image();
            footImg.src = '/images/footImage.png'; // 足の画像のパスを指定
            await new Promise((resolve) => {
                footImg.onload = resolve;
            });
            imageCache.current['feet'] = footImg;
        };


        const drawStage = () => {
            if (groundImage.current) {
                const groundHeight = 120; // 地面の高さ
                const groundWidth = 200; // 地面の幅
                const repeatCount = Math.ceil(canvas.width / groundWidth);

                // 足場を画面中央の一定位置に描画
                const groundYPosition = canvas.height - groundHeight; // 画面下からの固定位置
                for (let i = 0; i < repeatCount; i++) {
                    ctx.drawImage(groundImage.current, i * groundWidth, groundYPosition, groundWidth, groundHeight);
                }
            }
        };

        const animateSoul = (monsterId, startPosition, isLeftMonster) => {
            ongoingSouls.current.push({
                monsterId,
                left: startPosition.left,
                top: startPosition.top,
                isLeftMonster
            });
        };

        const drawObstacles = () => {
            ctx.fillStyle = 'gray';
            obstacles.current.forEach(obstacle => {
                ctx.fillRect(obstacle.left, obstacle.top, obstacle.width, obstacle.height);
                drawHP(ctx, obstacle.hp, obstacle.left + 10, obstacle.top - 10); // HPを表示
            });
        };

        const drawBackground = () => {
            if (backgroundImage.current) {
                // 背景画像をキャンバス全体に描画
                ctx.globalAlpha = 0.1; // 透明度を設定 (0.0 - 1.0の範囲で指定)
                ctx.drawImage(backgroundImage.current, 0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = 1.0; // 透明度をリセット
            }
        };

        const initializePositions = (newMonsters, color) => {
            newMonsters.forEach(monster => {
                if (!positions.current[monster.id] && !removedMonsters.current.has(monster.id)) {
                    positions.current[monster.id] = {
                        left: monster.side === 'left' ? 0 : canvas.width - 200,
                        top: canvas.height - 340
                    };
                    originalSpeed.current[monster.id] = monster.Speed * monsterSpeedControl;
                    stopMovement.current[monster.id] = false;
                    monsterHP.current[monster.id] = monster.HP;
                    drawMonster(ctx, monster, color);

                    // モンスターの辞書全体を表示
                    console.log('新しく追加されたモンスターの情報:', monster);
                }
            });
        };

        const drawMonster = (ctx, monster, borderColor) => {
            const pos = positions.current[monster.id];
            if (!pos) return;

            const sizeMultiplier = monster.Attack / 500; // サイズの倍率を調整（例: 1000 -> 500）
            const imageHeight = baseSize * sizeMultiplier;
            const imageWidth = baseSize * sizeMultiplier;

            const groundYPosition = canvas.height - 130; // 地面の位置（高さ）
            pos.top = groundYPosition - imageHeight; // 地面からの距離を計算して位置を設定

            ctx.drawImage(imageCache.current[monster.id], pos.left, pos.top, imageWidth, imageHeight);
            ctx.strokeStyle = borderColor; // 枠線の色を設定
            ctx.lineWidth = 5; // 枠線の太さを設定
            ctx.strokeRect(pos.left, pos.top, imageWidth, imageHeight); // 枠線を描画

            const isLeftMonster = leftMonsters.some(m => m.id === monster.id);
            drawEyes(ctx, pos.left, pos.top, imageWidth, imageHeight, isLeftMonster);
        };

        // 目を描画する関数（leftMonstersとrightMonstersで異なる目の画像を使用）
        const drawEyes = (ctx, left, top, width, height, isLeftMonster) => {
            const eyeImage = isLeftMonster ? imageCache.current['leftEyes'] : imageCache.current['rightEyes'];

            const ratio = 0.8

            // 目のサイズもモンスターのサイズに応じて調整
            const eyeWidth = width * ratio;// モンスターの幅に基づく目の幅（例として0.5倍）
            const eyeHeight = height * ratio; // モンスターの高さに基づく目の高さ（例として0.5倍）

            // 目の位置をモンスターの位置に合わせて調整
            const eyeXOffset = width * ratio / 8; // モンスターの幅に基づく目のX方向オフセット
            const eyeYOffset = -height * ratio; // モンスターの高さに基づく目のY方向オフセット

            ctx.drawImage(eyeImage, left + width - eyeXOffset - eyeWidth, top + eyeYOffset, eyeWidth, eyeHeight); // 目を描画
        };

        const drawProgressBars = (leftX = 120, leftY = 100, rightX = 30, rightY = 100) => {
            const progressBarWidth = canvas.width - leftX - rightX - 50; // 進捗バーの幅を計算
            const dotSize = 20;
            const dotSpacing = dotSize * 2;
            const numDots = Math.floor(progressBarWidth / dotSpacing); // 進捗バーに配置するドットの数

            const leftMostMonster = leftMonsters.length > 0 ? leftMonsters.reduce((prev, curr) => {
                return (positions.current[curr.id]?.left ?? 0) > (positions.current[prev.id]?.left ?? 0) ? curr : prev;
            }, leftMonsters[0]) : null;

            const rightMostMonster = rightMonsters.length > 0 ? rightMonsters.reduce((prev, curr) => {
                return (positions.current[curr.id]?.left ?? canvas.width) < (positions.current[prev.id]?.left ?? canvas.width) ? curr : prev;
            }, rightMonsters[0]) : null;

            const leftProgress = leftMostMonster ? (positions.current[leftMostMonster.id]?.left ?? 0) / (progressBarWidth) : 0;
            const rightProgress = rightMostMonster ? 1 - (positions.current[rightMostMonster.id]?.left ?? canvas.width) / (progressBarWidth) : 0;

            // 進捗バーの状態を格納する配列を作成
            let progressBarArray = Array(numDots).fill(rgb(180, 180, 180)); // 初期状態は全て黒点

            // 左側の進捗バーの状態を更新
            for (let i = 0; i < Math.floor(leftProgress * numDots); i++) {
                progressBarArray[i] = BLUE;
            }

            // 右側の進捗バーの状態を更新
            for (let i = numDots - 1; i >= Math.floor(numDots - rightProgress * numDots); i--) {
                progressBarArray[i] = ORANGE;
            }

            // 配列に基づいて進捗バーを描画
            for (let i = 0; i < numDots; i++) {
                ctx.fillStyle = progressBarArray[i];
                ctx.fillRect(leftX + i * dotSpacing, leftY, dotSize, 15); // 進捗バーの高さを15に設定
            }

            // 左端と右端のアイコン
            const boxHeight = 60, boxWidth = 60;
            const cornerRadius = 10; // 角の丸みの半径

            // 左のアイコン
            ctx.fillStyle = BLUE;
            ctx.beginPath();
            ctx.moveTo(leftX - 80 + cornerRadius, leftY - 10); // 左上の始点
            ctx.arcTo(leftX - 80 + boxWidth, leftY - 10, leftX - 80 + boxWidth, leftY - 10 + boxHeight, cornerRadius); // 右上
            ctx.arcTo(leftX - 80 + boxWidth, leftY - 10 + boxHeight, leftX - 80, leftY - 10 + boxHeight, cornerRadius); // 右下
            ctx.arcTo(leftX - 80, leftY - 10 + boxHeight, leftX - 80, leftY - 10, cornerRadius); // 左下
            ctx.arcTo(leftX - 80, leftY - 10, leftX - 80 + boxWidth, leftY - 10, cornerRadius); // 左上へ戻る
            ctx.closePath();
            ctx.fill();

            // 右のアイコン
            ctx.fillStyle = ORANGE;
            ctx.beginPath();
            ctx.moveTo(canvas.width - rightX - 60 + cornerRadius, rightY - 10); // 左上の始点
            ctx.arcTo(canvas.width - rightX - 60 + boxWidth, rightY - 10, canvas.width - rightX - 60 + boxWidth, rightY - 10 + boxHeight, cornerRadius); // 右上
            ctx.arcTo(canvas.width - rightX - 60 + boxWidth, rightY - 10 + boxHeight, canvas.width - rightX - 60, rightY - 10 + boxHeight, cornerRadius); // 右下
            ctx.arcTo(canvas.width - rightX - 60, rightY - 10 + boxHeight, canvas.width - rightX - 60, rightY - 10, cornerRadius); // 左下
            ctx.arcTo(canvas.width - rightX - 60, rightY - 10, canvas.width - rightX - 60 + boxWidth, rightY - 10, cornerRadius); // 左上へ戻る
            ctx.closePath();
            ctx.fill();

            // 進行状況を保存
            previousProgress.current.left = leftProgress;
            previousProgress.current.right = rightProgress;
        };

        const checkMonsterInEnemyTerritory = () => {
            leftMonsters.forEach(async monster => {
                const pos = positions.current[monster.id];
                if (pos && pos.left >= canvas.width - 100) {
                    setLeftPoints(prev => prev + 1);
                    positions.current[monster.id].left = 0;
                    stopMovement.current[monster.id] = false;

                    // 効果音を再生
                    if (enterTerritorySoundRef.current) {
                        enterTerritorySoundRef.current.play();
                    }

                    const monsterRef = doc(db, monster.firestorePath);
                    try {
                        await updateDoc(monsterRef, { Goal: true });
                    } catch (error) {
                        console.error('Error updating document: ', error);
                    }
                }
            });

            rightMonsters.forEach(async monster => {
                const pos = positions.current[monster.id];
                if (pos && pos.left <= 0) {
                    setRightPoints(prev => prev + 1);
                    positions.current[monster.id].left = canvas.width - 200;
                    stopMovement.current[monster.id] = false;

                    // 効果音を再生
                    if (enterTerritorySoundRef.current) {
                        enterTerritorySoundRef.current.play();
                    }

                    const monsterRef = doc(db, monster.firestorePath);
                    try {
                        await updateDoc(monsterRef, { Goal: true });
                    } catch (error) {
                        console.error('Error updating document: ', error);
                    }
                }
            });
        };

        const checkCollisions = () => {
            leftMonsters.forEach(leftMonster => {
                const leftPos = positions.current[leftMonster.id];
                if (!leftPos) return; // 位置情報が存在しない場合は処理をスキップ

                const leftSizeMultiplier = leftMonster.Attack / 500; // サイズ倍率
                const leftImageWidth = baseSize * leftSizeMultiplier; // モンスターの横幅
                const leftImageHeight = baseSize * leftSizeMultiplier; // モンスターの高さ

                rightMonsters.forEach(rightMonster => {
                    const rightPos = positions.current[rightMonster.id];
                    if (!rightPos) return; // 位置情報が存在しない場合は処理をスキップ

                    const rightSizeMultiplier = rightMonster.Attack / 500; // サイズ倍率
                    const rightImageWidth = baseSize * rightSizeMultiplier; // モンスターの横幅
                    const rightImageHeight = baseSize * rightSizeMultiplier; // モンスターの高さ

                    // モンスターの四辺の位置を計算
                    const leftMonsterRect = {
                        left: leftPos.left,
                        right: leftPos.left + leftImageWidth,
                        top: leftPos.top,
                        bottom: leftPos.top + leftImageHeight,
                    };

                    const rightMonsterRect = {
                        left: rightPos.left,
                        right: rightPos.left + rightImageWidth,
                        top: rightPos.top,
                        bottom: rightPos.top + rightImageHeight,
                    };

                    // 当たり判定の条件を明確にする
                    if (
                        leftMonsterRect.right >= rightMonsterRect.left &&
                        leftMonsterRect.left <= rightMonsterRect.right &&
                        leftMonsterRect.bottom >= rightMonsterRect.top &&
                        leftMonsterRect.top <= rightMonsterRect.bottom
                    ) {
                        stopMovement.current[leftMonster.id] = true;
                        stopMovement.current[rightMonster.id] = true;

                        const pairKey = `${leftMonster.id}-${rightMonster.id}`;
                        if (!collisionPairs.current.has(pairKey)) {
                            collisionPairs.current.add(pairKey);
                            startBattle(leftMonster, rightMonster);
                        }
                    }
                });
            });
        };


        const drawHP = (ctx, hp, x, y) => {
            ctx.font = '20px Arial';
            ctx.fillStyle = 'black';
            ctx.fillText(`HP: ${hp}`, x, y);
        };

        const updateMonsterPositions = () => {
            leftMonsters.forEach(monster => {
                const pos = positions.current[monster.id];
                if (pos && !stopMovement.current[monster.id]) {
                    pos.left += originalSpeed.current[monster.id];
                    drawMonster(ctx, monster, BLUE);
                }
            });

            rightMonsters.forEach(monster => {
                const pos = positions.current[monster.id];
                if (pos && !stopMovement.current[monster.id]) {
                    pos.left -= originalSpeed.current[monster.id];
                    drawMonster(ctx, monster, ORANGE);
                }
            });

            drawProgressBars(); // プログレスバーを更新
        };

        const startBattle = (leftMonster, rightMonster) => {
            // バトル開始時に進行中のバトルリストに追加
            ongoingBattles.current.push({ leftMonster, rightMonster });

            // 攻撃モーションを初期化
            attackMotion.current[leftMonster.id] = { active: true, progress: 0 };
            attackMotion.current[rightMonster.id] = { active: true, progress: 0 };
        };

        const removeMonster = async (defeatedMonster, victorMonster) => {
            const pos = positions.current[defeatedMonster.id];
            if (pos) {
                removedMonsters.current.add(defeatedMonster.id); // モンスターを削除済みとして登録
                const isLeftMonster = leftMonsters.some(m => m.id === defeatedMonster.id);
                animateSoul(defeatedMonster.id, pos, isLeftMonster);
            }

            const monsterRef = doc(db, defeatedMonster.firestorePath);
            try {
                await updateDoc(monsterRef, { IsAlive: false });
            } catch (error) {
                console.error('Error updating document: ', error);
            }

            delete positions.current[defeatedMonster.id];
            delete stopMovement.current[defeatedMonster.id];
            delete monsterHP.current[defeatedMonster.id];
            stopMovement.current[victorMonster.id] = false;
        };

        const gameLoop = (time) => {
            if (time - lastFrameTime >= interval) {
                lastFrameTime = time;

                // キャンバス全体をクリア
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // キャンバス全体をクリアする前に背景画像を描画
                drawBackground();
                drawStage(); // 地面を描画

                updateMonsterPositions(); // モンスターの位置更新と再描画
                drawObstacles(); // 障害物の描画
                drawProgressBars(); // プログレスバーを再描画
                checkMonsterInEnemyTerritory(); // 陣地突入のチェック

                // 進行中のバトルを処理
                ongoingBattles.current.forEach(({ leftMonster, rightMonster }, index) => {
                    if (monsterHP.current[leftMonster.id] > 0 && monsterHP.current[rightMonster.id] > 0) {
                        // 攻撃モーションの処理
                        if (attackMotion.current[leftMonster.id]?.active) {
                            const motion = attackMotion.current[leftMonster.id];
                            const originalPosition = positions.current[leftMonster.id].left;

                            // 攻撃モーションのアニメーション (例: 前後に揺れる)
                            positions.current[leftMonster.id].left = originalPosition + Math.sin(motion.progress) * attackAmplitude;
                            motion.progress += 0.2; // モーションの進行度を更新

                            if (motion.progress >= 2 * Math.PI) {
                                // 一周期（揺れの完了）が終わったらモーションの進行度をリセット
                                motion.progress = 0;
                            }
                        }

                        if (attackMotion.current[rightMonster.id]?.active) {
                            const motion = attackMotion.current[rightMonster.id];
                            const originalPosition = positions.current[rightMonster.id].left;

                            // 攻撃モーションのアニメーション (例: 前後に揺れる)
                            positions.current[rightMonster.id].left = originalPosition + Math.sin(motion.progress) * attackAmplitude;
                            motion.progress += 0.2; // モーションの進行度を更新

                            if (motion.progress >= 2 * Math.PI) {
                                // 一周期（揺れの完了）が終わったらモーションの進行度をリセット
                                motion.progress = 0;
                            }
                        }

                        // HPの減少
                        monsterHP.current[leftMonster.id] -= rightMonster.Attack / frameRate;
                        monsterHP.current[rightMonster.id] -= leftMonster.Attack / frameRate;

                        // モンスターの再描画
                        drawMonster(ctx, leftMonster, BLUE); // 青色の枠線で再描画
                        drawMonster(ctx, rightMonster, ORANGE); // 赤色の枠線で再描画

                        // 攻撃中の効果音を再生
                        if (battleSoundRef.current && battleSoundRef.current.paused) {
                            battleSoundRef.current.play();
                        }

                        // モンスターが倒れた場合の処理
                        if (monsterHP.current[leftMonster.id] <= 0 || monsterHP.current[rightMonster.id] <= 0) {
                            if (monsterHP.current[leftMonster.id] <= 0) {
                                removeMonster(leftMonster, rightMonster);
                            }
                            if (monsterHP.current[rightMonster.id] <= 0) {
                                removeMonster(rightMonster, leftMonster);
                            }

                            // バトルが終了したらリストから削除
                            ongoingBattles.current.splice(index, 1);

                            // バトルが終了したら効果音を停止
                            if (battleSoundRef.current) {
                                battleSoundRef.current.pause();
                                battleSoundRef.current.currentTime = 0;
                            }
                        }
                    }
                });

                // 進行中の魂のアニメーションを処理
                ongoingSouls.current.forEach((soul, index) => {
                    const soulImg = soul.isLeftMonster ? imageCache.current['leftSoul'] : imageCache.current['rightSoul'];
                    const soulHeight = 100;
                    const soulWidth = 100;

                    // 魂を上に移動
                    soul.top -= 2;

                    // 魂が画面外に出たらリストから削除
                    if (soul.top > -soulHeight) {
                        ctx.drawImage(soulImg, soul.left, soul.top, soulWidth, soulHeight);
                    } else {
                        ongoingSouls.current.splice(index, 1);
                    }
                });

                // 衝突判定を行う
                checkCollisions();
            }

            // 次のフレームをリクエスト
            requestAnimationFrame(gameLoop);
        };

        const loadAndStartGame = async () => {
            await loadImages();
            initializePositions(leftMonsters.filter(monster => !positions.current[monster.id]), BLUE);
            initializePositions(rightMonsters.filter(monster => !positions.current[monster.id]), ORANGE);
            requestAnimationFrame(gameLoop);
        };

        loadAndStartGame();
    }, [leftMonsters, rightMonsters, BLUE, ORANGE]);

    // BGM再生/停止ボタンのクリックハンドラー
    const toggleBGM = () => {
        setIsPlaying(prev => !prev); // 再生状態をトグル
        const bgm = bgmRef.current;
        if (bgm) {
            if (isPlaying) {
                bgm.pause();
            } else {
                bgm.play();
            }
        }
    };

    return (
        <>
            <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="battlefield-canvas">
            </canvas>
            <audio ref={bgmRef} src={bgmSrc} loop></audio> {/* BGMをループ再生する */}
            <audio ref={enterTerritorySoundRef} src={enterTerritorySoundSrc} preload="auto"></audio>
            <audio ref={battleSoundRef} src={battleSoundSrc} preload="auto"></audio>

            <button
                onClick={toggleBGM}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    padding: '10px 10px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}>
                {isPlaying ? <MdMusicNote /> : <MdMusicOff />}
            </button>
            <div style={{
                position: 'absolute',
                top: '96px',
                left: '20px',
                color: 'white',
                fontSize: '30px',
                width: '100px', // 固定幅を設定
                textAlign: 'center', // 中央揃えにする
            }}>
                {leftPoints}
            </div>
            <div style={{
                position: 'absolute',
                top: '96px',
                right: '10px',
                color: 'white',
                fontSize: '30px',
                width: '100px', // 固定幅を設定
                textAlign: 'center', // 中央揃えにする
            }}>
                {rightPoints}
            </div>


        </>
    );
};

export default BattleField;
