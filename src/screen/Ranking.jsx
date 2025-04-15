// Ranking.js の変更部分
import React, { useEffect, useState } from 'react';
import { storage } from '../firebaseConfig';
import { ref, getDownloadURL } from 'firebase/storage';
import './Ranking.css';
import useAllMonsters from './useAllMonsters';

// QRコード画像のインポート
import QRCodeImage from './images/QR.png'; // 画像のパスが正しいか確認してください

const Ranking = () => {
    const { leftMonsters, rightMonsters } = useAllMonsters();
    const [imageUrls, setImageUrls] = useState({});

    useEffect(() => {
        const fetchImages = async () => {
            const allMonsters = [...leftMonsters, ...rightMonsters];
            const newImageUrls = {};

            await Promise.all(
                allMonsters.map(async (monster) => {
                    if (monster.ImagePath && !imageUrls[monster.id]) {
                        try {
                            const url = await getDownloadURL(ref(storage, monster.ImagePath));
                            newImageUrls[monster.id] = url;
                        } catch (error) {
                            console.error('Error fetching image:', error);
                        }
                    }
                })
            );

            setImageUrls((prev) => ({ ...prev, ...newImageUrls }));
        };

        fetchImages();
    }, [leftMonsters, rightMonsters]);

    // 単語の先頭文字を大文字にする関数
    const capitalizeFirstLetter = (str) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    // すべてのモンスターを結合し、totalStatsを計算
    const allMonsters = [...leftMonsters, ...rightMonsters].map((monster) => {
        const attack = monster.Attack || 0;
        const defense = monster.Defense || 0;
        const hp = monster.HP || 0;
        const speed = monster.Speed || 0;
        const totalStats = attack + defense + hp / 5 + speed * 1000;

        // キーワードを配列として取得
        const keywords = [
            monster.Keywords?.keyword1 || '',
            monster.Keywords?.keyword2 || '',
            monster.Keywords?.keyword3 || '',
            monster.Keywords?.keyword4 || '',
            monster.Keywords?.keyword5 || '',
        ].filter(Boolean).map(capitalizeFirstLetter).join(', '); // 空文字列を除いて連結

        return { ...monster, totalStats, keywords };
    });

    // totalStatsの降順にソートして上位3体を取得
    const sortedMonsters = allMonsters
        .sort((a, b) => b.totalStats - a.totalStats)
        .slice(0, 3);

    // 4位以降のモンスターを取得
    const lowerRankedMonsters = allMonsters
        .sort((a, b) => b.totalStats - a.totalStats)
        .slice(3);  // 3位までを除いたモンスターを取得


    // 1位から3位までのドキュメントIDをコンソールに表示
    useEffect(() => {
        console.log('Top 3 Document IDs:', sortedMonsters.map((monster, index) => `${index + 1}位: ${monster.id}`));
    }, [sortedMonsters]);

    return (
        <div className="ranking-container">
            {/* QRコードを上部に表示 */}
            {/* <div className="qr-code-container">
                <img src={QRCodeImage} alt="QR Code" className="qr-code-large" />
            </div>
            <div className="box5">
                <p>デモ番号：2-7-14</p>
            </div> */}
            {/* 上位3位のモンスターを表示 */}
            <div className="ranking-items-container">
                {sortedMonsters.map((monster, index) => (
                    <div key={monster.id} className={`ranking-item rank-${index + 1}`}>
                        <div className="ranking-position">{index + 1}</div>
                        {imageUrls[monster.id] ? (
                            <img
                                src={imageUrls[monster.id]}
                                alt={monster.id}  // idを代わりに表示する
                                className="monster-image"
                            />
                        ) : (
                            <div className="loading-placeholder">Loading...</div>
                        )}
                        <div className="ranking-name">{monster.keywords || 'Unknown Keywords'}</div>
                        <div className="ranking-total-stats">
                            {monster.totalStats.toFixed(0)} Point
                        </div>
                        <div className="monster-stats">
                            <div>
                                <span>生命力</span> {(monster.HP / 5).toFixed(0) || 0}
                            </div>
                            <div>
                                <span>攻撃力</span> {(monster.Attack).toFixed(0) || 0}
                            </div>
                            <div>
                                <span>防御力</span> {(monster.Defense).toFixed(0) || 0}
                            </div>
                            <div>
                                <span>素早さ</span> {(monster.Speed * 1000).toFixed(0) || 0}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 4位以降のモンスターを表示 */}
            <div className="lower-ranking-items-container">
                {lowerRankedMonsters.map((monster, index) => (
                    <div key={monster.id} className="lower-ranking-item">
                        <div className="lower-ranking-position">{index + 4}位</div>
                        {imageUrls[monster.id] ? (
                            <img
                                src={imageUrls[monster.id]}
                                alt={monster.id}
                                className="lower-monster-image"
                            />
                        ) : (
                            <div className="loading-placeholder">Loading...</div>
                        )}
                        <div className="lower-ranking-name">{monster.keywords || 'Unknown Keywords'}</div>
                        <div className="lower-ranking-total-stats">
                            {monster.totalStats.toFixed(0)} Point
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

};

export default Ranking;
