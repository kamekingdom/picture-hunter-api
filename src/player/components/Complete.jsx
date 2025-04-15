import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import './Complete.css'; // カスタムCSSをインポート
import './Stats.css';
import { ColorContext } from '../../App';

import { LuSwords } from "react-icons/lu";
import usePreventBackNavigation from './usePreventBackNavigation';

const Complete = () => {
    usePreventBackNavigation();
    const [IsSpecialUsed, setIsSpecialUsed] = useState(false);
    const [monsterData, setMonsterData] = useState(null);
    const [itemData, setItemData] = useState(null);
    const colorInfo = useContext(ColorContext);
    const navigate = useNavigate();
    const [isItemExist, setIsItemExist] = useState(false);
    const db = getFirestore();
    const yourTeam = localStorage.getItem('your_team');

    useEffect(() => {
        const savedMonsterData = localStorage.getItem('monsterData');
        const savedItemData = localStorage.getItem('itemData');

        if (savedMonsterData) {
            let monster = JSON.parse(savedMonsterData);
            setMonsterData(monster);

            if (savedItemData) {
                setIsItemExist(true);
                let itemArray = JSON.parse(savedItemData);
                let item = itemArray[0];
                setItemData(item);
            }

            // Firestoreのドキュメントを監視
            const unsubscribe = onSnapshot(doc(db, yourTeam, monster.docId), (doc) => {
                if (doc.exists()) {
                    console.log("Document data:", doc.data());
                    if (doc.data().IsAlive === false) {
                        console.log("Monster is dead, navigating to /player/dead");
                        navigate('/player/dead');
                    }
                    if (doc.data().Goal === true) {
                        console.log("Monster goaled, navigating to /player/camera");
                        navigate('/player/camera');
                    }
                }
            });

            // クリーンアップ関数でFirestoreリスナーを解除
            return () => unsubscribe();
        }
    }, [db, navigate]);


    const updateFirestoreStat = async (stat, newValue) => {
        const docRef = doc(db, yourTeam, monsterData.docId);
        await updateDoc(docRef, {
            [stat]: newValue
        });
    };

    const applySpecialEffect = () => {
        setIsSpecialUsed(true);
        if (!monsterData) return;

        switch (monsterData.SpecialType) {
            case 'vitality increase':
                animateStatIncrease('HP', (monsterData.HP || 0) * 1.5);
                break;
            case 'attack increase':
                animateStatIncrease('Attack', (monsterData.Attack || 0) * 1.5);
                break;
            case 'defense increase':
                animateStatIncrease('Defense', (monsterData.Defense || 0) * 1.5);
                break;
            case 'speed increase':
                animateStatIncrease('Speed', (monsterData.Speed || 0) * 1.5);
                break;
            default:
                break;
        }
    };

    const animateStatIncrease = (stat, targetValue, duration = 1000) => {
        const startValue = monsterData[stat] || 0;
        const increment = (targetValue - startValue) / (duration / 50); // 50msごとに更新

        let currentValue = startValue;
        const intervalId = setInterval(async () => {
            currentValue += increment;

            if ((increment > 0 && currentValue >= targetValue) || (increment < 0 && currentValue <= targetValue)) {
                currentValue = targetValue;
                clearInterval(intervalId);

                // 増加が終了したらクラスを元に戻し、Firestoreに新しい値を保存
                setMonsterData(prevData => ({
                    ...prevData,
                    [`${stat}Increasing`]: false,
                    [stat]: currentValue,
                }));

                await updateFirestoreStat(stat, currentValue);
            } else {
                // 増加中はクラスを適用
                setMonsterData(prevData => ({
                    ...prevData,
                    [`${stat}Increasing`]: true,
                    [stat]: currentValue,
                }));
            }
        }, 50); // 50msごとに更新
    };



    return (
        <div className="complete-container">
            <h1 className="complete-title">⚔モンスター戦闘中⚔</h1>
            {monsterData ? (
                <div className="monster-container">
                    <div className="photo-wrapper">
                        <img src={monsterData.Photo} alt="Captured" className="preview-photo" />
                        {monsterData.AddPhoto && (
                            <img src={monsterData.AddPhoto} alt="Additional" className="small-image" />
                        )}
                    </div>
                    <div className="stats-container">
                        <div className="box27 border-green">
                            <div className="box-title bg-green">生命力</div>
                            <p className={monsterData?.HPIncreasing ? 'stat-increasing' : ''}>
                                {isItemExist ? ((monsterData.HP / 5 || 0) + (itemData.ItemHP || 0)).toFixed(0) : (monsterData.HP / 5 || 0).toFixed(0)}
                            </p>
                        </div>
                        <div className="box27 border-red">
                            <div className="box-title bg-red">攻撃力</div>
                            <p className={monsterData?.AttackIncreasing ? 'stat-increasing' : ''}>
                                {isItemExist ? ((monsterData.Attack || 0) + (itemData.ItemAttack || 0)).toFixed(0) : (monsterData.Attack || 0).toFixed(0)}
                            </p>
                        </div>
                        <div className="box27 border-blue">
                            <div className="box-title bg-blue">防御力</div>
                            <p className={monsterData?.DefenseIncreasing ? 'stat-increasing' : ''}>
                                {isItemExist ? ((monsterData.Defense || 0) + (itemData.ItemDefense || 0)).toFixed(0) : (monsterData.Defense || 0).toFixed(0)}
                            </p>
                        </div>
                        <div className="box27 border-purple">
                            <div className="box-title bg-purple">素早さ</div>
                            <p className={monsterData?.SpeedIncreasing ? 'stat-increasing' : ''}>
                                {isItemExist ? ((monsterData.Speed * 1000 || 0) + (itemData.ItemSpeed || 0)).toFixed(1) : (monsterData.Speed !== undefined ? (monsterData.Speed * 1000).toFixed(0) : 'N/A')}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <p>モンスターのデータを読み込んでいます...</p>
            )}
        </div>
    );
};

export default Complete;
