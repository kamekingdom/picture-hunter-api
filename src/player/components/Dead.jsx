import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dead.css'; // カスタムCSSをインポート
import { ColorContext } from '../../App';
import usePreventBackNavigation from './usePreventBackNavigation';

const Dead = () => {
    usePreventBackNavigation();
    const [monsterData, setMonsterData] = useState(null);
    const [itemData, setItemData] = useState(null);
    const [seconds, setSeconds] = useState(null);
    const [showButton, setShowButton] = useState(false);
    const colorInfo = useContext(ColorContext);
    const navigate = useNavigate();

    useEffect(() => {
        const savedMonsterData = localStorage.getItem('monsterData');
        const savedItemData = localStorage.getItem('itemData');

        if (savedMonsterData) {
            let monster = JSON.parse(savedMonsterData);
            setMonsterData(monster);

            // モンスターの属性合計を用いて秒数を計算
            const totalStats = Math.floor((monster.HP + monster.Attack + monster.Defense + monster.Speed) / 1000);
            setSeconds(totalStats);

            if (savedItemData) {
                let itemArray = JSON.parse(savedItemData);
                let item = itemArray[0];
                setItemData(item);
            }
        }
    }, []);

    useEffect(() => {
        // カウントダウンロジック
        if (seconds > 0) {
            const timerId = setTimeout(() => setSeconds(seconds - 1), 1000);
            return () => clearTimeout(timerId);
        } else if (seconds === 0) {
            setShowButton(true);
        }
    }, [seconds]);

    const handleSubmit = () => {
        localStorage.removeItem('monsterData');
        localStorage.removeItem('itemData');
        navigate('/player/camera');
    }

    return (
        <div className="complete-container">
            <h1 className="complete-title">倒れてしまった</h1>
            {monsterData ? (
                <div className="monster-container">
                    <div className="photo-wrapper">
                        <img
                            src={monsterData.Photo}
                            alt="Captured"
                            className="preview-photo"
                            style={{ filter: 'grayscale(100%)' }}
                        />
                    </div>
                    <h1 className="complete-title" style={{ textAlign: 'center' }}>{monsterData.DefeatQuote}</h1>
                </div>
            ) : (
                <p>モンスターのデータを読み込んでいます...</p>
            )
            }
            {
                seconds !== null && !showButton && (
                    <h1 className="complete-title">再生成まで：{Math.floor(seconds / 60)}分{seconds % 60}秒</h1>
                )
            }
            {
                showButton && (
                    <button
                        className="preview-button"
                        style={{ backgroundColor: colorInfo.rightMonsterColor }}
                        onClick={handleSubmit}
                    >
                        新たなモンスター作成
                    </button>
                )
            }
        </div >
    );
};

export default Dead;
