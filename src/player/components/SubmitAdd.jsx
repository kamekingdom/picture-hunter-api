import React, { useEffect, useState, useRef, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStorage, ref, uploadString, getDownloadURL, updateMetadata } from "firebase/storage";
import { db, auth } from './firebaseConfig';
import './Submit.css';
import './Stats.css';
import './ScanAnimation.css';
import { v4 as uuidv4 } from 'uuid';
import { ColorContext } from '../../App';
import { lighten } from 'polished';

const SubmitAdd = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { photo } = location.state || {};
  const [keywords, setKeywords] = useState({});
  const [similarity, setSimilarity] = useState(null);
  const [adjustedStats, setAdjustedStats] = useState(null);
  const [isReadyToSubmit, setIsReadyToSubmit] = useState(false); // 追加
  const uniqueFileName = useRef(`${Date.now()}-${Math.floor(1000000000 + Math.random() * 9000000000).toString()}`);
  const colorInfo = useContext(ColorContext);
  const lighterColor = lighten(0.5, colorInfo.leftMonsterColor);
  const [isAdjustScore, setIsAdjustScore] = useState(null);

  useEffect(() => {
    if (photo) {
      auth.signInAnonymously()
        .then(() => {
          const storage = getStorage();
          const imagePath = `images/${uniqueFileName.current}.png`;
          const storageRef = ref(storage, imagePath);

          uploadString(storageRef, photo, 'data_url')
            .then(snapshot => getDownloadURL(snapshot.ref))
            .then(url => {
              return fetch('https://us-central1-picture-hunter-api.cloudfunctions.net/image_to_status', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image_url: url })
              });
            })
            .then(response => {
              if (!response.ok) {
                throw new Error('Network response was not ok');
              }
              return response.json();
            })
            .then(data => {
              setKeywords({
                keyword1: data.keyword1 || '',
                keyword2: data.keyword2 || '',
                keyword3: data.keyword3 || '',
                keyword4: data.keyword4 || '',
                keyword5: data.keyword5 || '',
              });
              setIsReadyToSubmit(true); // データ取得後にボタンを表示可能にする
            })
            .catch(error => {
              console.error('Error:', error);
              setIsReadyToSubmit(true); // エラー発生時でもボタンを表示可能にする
            });
        })
        .catch(error => {
          console.error('Firebase Authentication error:', error);
          setIsReadyToSubmit(true); // 認証エラーが発生してもボタンを表示可能にする
        });
    }
  }, [photo]);

  // keywordsの処理を管理し、ボタンが適切に表示されるように調整
  useEffect(() => {
    if (Object.keys(keywords).length > 0) {
      const storedData = JSON.parse(localStorage.getItem('monsterData'));
      const storedKeywords = storedData ? storedData.Keywords : {};

      const keywords1 = Object.values(keywords).join(' ');
      const keywords2 = Object.values(storedKeywords).join(' ');

      if (keywords1 && keywords2) {
        fetch('https://us-central1-picture-hunter-api.cloudfunctions.net/caliculate_similarity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            word1: keywords1,
            word2: keywords2,
          })
        })
          .then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            return response.text();
          })
          .then(similarityScore => {
            setSimilarity(parseFloat(similarityScore));

            const x = parseFloat(similarityScore);
            const gaussianDerivative = (Math.pow(x, 0.8) * Math.pow(1 - x, 2) * Math.exp(-3 * Math.pow(x, 2)));
            const yMax = 0.43;
            const adjustScore = Math.max(gaussianDerivative / yMax * 4, 0.1);

            setIsAdjustScore(adjustScore);

            const adjusted = {
              vitality: storedData.HP * parseFloat(adjustScore),
              attack: storedData.Attack * parseFloat(adjustScore),
              defense: storedData.Defense * parseFloat(adjustScore),
              speed: storedData.Speed * parseFloat(adjustScore),
            };
            setAdjustedStats(adjusted);
            setIsReadyToSubmit(true); // データが準備できたらボタンを表示する
          })
          .catch(error => {
            console.error('Error:', error);
            setIsReadyToSubmit(true); // エラー発生時でもボタンを表示可能にする
          });
      }
    }
  }, [keywords]);

  const handleSubmit = () => {
    const storedData = JSON.parse(localStorage.getItem('monsterData')); // ここでstoredDataを再取得
    const team = localStorage.getItem('team');
    const leftTeam = localStorage.getItem('left_team');
    const collection = team === leftTeam ? 'left' : 'right';
    const docId = storedData.docId;

    // 既存のデータを引き継ぎつつ、ステータスのみを更新
    const updatedMonsterData = {
      ...storedData, // 既存データを展開
      HP: adjustedStats.vitality, // 更新するステータス
      Attack: adjustedStats.attack, // 更新するステータス
      Defense: adjustedStats.defense, // 更新するステータス
      Speed: adjustedStats.speed, // 更新するステータス
      AddImagePath: `images/${uniqueFileName.current}.png`, // 画像パスを追加
      AddPhoto: photo,
      Goal: false,
    };

    const monsterData = updatedMonsterData;

    // LocalStorageに保存
    localStorage.setItem('monsterData', JSON.stringify(monsterData));

    delete monsterData.AddPhoto;
    delete monsterData.Photo;

    db.collection(collection).doc(docId).set(monsterData)
      .then(() => {
        console.log('Document successfully written!');
        navigate('/player/complete');
      })
      .catch(error => {
        console.error('Error writing document: ', error);
      });

    // 保存後にCompleteページへ遷移
    navigate('/player/complete');
  };

  return (
    <div className="preview-container">
      <h1 className="preview-title">合体後のステータス</h1>
      <div className="photo-container">
        {photo && <img src={photo} alt="Captured" className="preview-photo" />}
        {!isReadyToSubmit && <div className="scan-line"></div>}  {/* 応答待ちの間だけ表示 */}
      </div>

      {/* <div className="keywords-container">
        {Object.values(keywords).map((keyword, index) => (
          <p key={index} className="keyword-item" style={{ backgroundColor: lighterColor }}>
            {keyword}
          </p>
        ))}
      </div> */}
      {isAdjustScore && (
        <div className="similarity-score">
          <h2>×{isAdjustScore.toFixed(3)}</h2>
        </div>
      )}

      {adjustedStats && (
        <div className="stats-container">
          <div className="box27 border-green">
            <div className="box-title bg-green">生命力</div>
            <p>{(adjustedStats.vitality / 5).toFixed(0)}</p>
          </div>
          <div className="box27 border-red">
            <div className="box-title bg-red">攻撃力</div>
            <p>{adjustedStats.attack.toFixed(0)}</p>
          </div>
          <div className="box27 border-blue">
            <div className="box-title bg-blue">防御力</div>
            <p>{adjustedStats.defense.toFixed(0)}</p>
          </div>
          <div className="box27 border-purple">
            <div className="box-title bg-purple">攻撃速度</div>
            <p>{(adjustedStats.speed * 1000).toFixed(0)}</p>
          </div>
        </div>
      )}
      {adjustedStats && isReadyToSubmit && (
        <button
          onClick={handleSubmit}
          className="preview-button"
          style={{ backgroundColor: colorInfo.rightMonsterColor }}
        >
          投入する
        </button>
      )}
    </div>
  );
};

export default SubmitAdd;
