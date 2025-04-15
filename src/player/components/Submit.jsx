import React, { useEffect, useState, useRef, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStorage, ref, uploadString, getDownloadURL, getBlob } from "firebase/storage";
import { db, auth } from './firebaseConfig'; // Firestoreと認証をインポート
import './Submit.css'; // カスタムCSSをインポート
import './Stats.css'; // 新しいカスタムCSSをインポート
import './ScanAnimation.css'; // スキャンアニメーション用のCSSをインポート
import { v4 as uuidv4 } from 'uuid'; // UUIDを生成するライブラリをインポート
import { ColorContext } from '../../App';
import { lighten } from 'polished';

const Submit = () => {
  // usePreventBackNavigation();
  const location = useLocation();
  const navigate = useNavigate(); // useNavigateフックを使用
  const { photo } = location.state || {};
  const [keywords, setKeywords] = useState({});
  const [special, setSpecial] = useState({});
  const [sortedStatus, setSortedStatus] = useState('');
  const [stats, setStats] = useState({ vitality: 0, attack: 0, defense: 0, speed: 0 });
  const [isReadyToSubmit, setIsReadyToSubmit] = useState(false);
  const [isScanning, setIsScanning] = useState(true);

  const getFormattedDateTime = () => {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${year}${month}${day}-${hours}${minutes}`;
  };

  const uniqueFileName = useRef(`${getFormattedDateTime()}-${Math.floor(1000000000 + Math.random() * 9000000000).toString()}`);
  const [finalImagePath, setFinalImagePath] = useState('');
  const colorInfo = useContext(ColorContext);
  const lighterColor = lighten(0.5, colorInfo.leftMonsterColor);
  // ここからアニメーション用
  const divisionNumber = 5;
  const [incrementedStats, setIncrementedStats] = useState({ vitality: 0, attack: 0, defense: 0, speed: 0 });
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0);
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [defeatQuote, setDefeatQuote] = useState('こんなところで負けない');

  useEffect(() => {
    const statIncrement = {
      vitality: stats.vitality / 100,  // 増加量をより細かくする
      attack: stats.attack / 100,
      defense: stats.defense / 100,
      speed: stats.speed / 100,
    };

    if (Object.keys(keywords).length > 0 && currentKeywordIndex < divisionNumber) {
      setCurrentKeyword(Object.values(keywords)[currentKeywordIndex]);

      const duration = 500; // 1秒間でステータスを更新
      const frameDuration = 5; // 10msごとに更新
      const totalFrames = duration / frameDuration; // 更新回数を計算
      let frameCount = 0;

      function animateUpdate() {
        if (frameCount < totalFrames) {
          setIncrementedStats(prevStats => ({
            vitality: prevStats.vitality + statIncrement.vitality / 5 / 5,
            attack: prevStats.attack + statIncrement.attack / 5,
            defense: prevStats.defense + statIncrement.defense / 5,
            speed: prevStats.speed + statIncrement.speed * 1000 / 5,
          }));
          frameCount++;
          setTimeout(animateUpdate, frameDuration); // 10msごとに再度実行
        } else {
          setTimeout(() => {
            setCurrentKeywordIndex(prevIndex => prevIndex + 1);
          }, 1000); // 1秒待機
        }
      }
      animateUpdate();
    }
  }, [currentKeywordIndex, keywords]);

  useEffect(() => {
    if (photo) {
      auth.signInAnonymously()
        .then(() => {
          const storage = getStorage();
          let imagePath = `images/${uniqueFileName.current}.png`;
          const storageRef = ref(storage, imagePath);

          const checkImageExists = async () => {
            try {
              await getBlob(storageRef);
              uniqueFileName.current = Math.floor(1000000000 + Math.random() * 9000000000).toString();
              imagePath = `images/${uniqueFileName.current}.png`;
            } catch (error) {
              if (error.code === 'storage/object-not-found') {
                return imagePath;
              }
              throw error;
            }
          };

          checkImageExists().then((newImagePath) => {
            const newStorageRef = ref(storage, newImagePath);
            setFinalImagePath(newImagePath);
            uploadString(newStorageRef, photo, 'data_url')
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
                setStats({
                  vitality: data.vitality,
                  attack: data.attack,
                  defense: data.defense,
                  speed: data.speed,
                });
                setKeywords({
                  keyword1: data.keyword1,
                  keyword2: data.keyword2,
                  keyword3: data.keyword3,
                  keyword4: data.keyword4,
                  keyword5: data.keyword5,
                });
                setSpecial({
                  name: data.special_move,
                  effect: data.special_move_effect,
                });
                setDefeatQuote(data.defeat_quote);
                setSortedStatus(data.sorted_status);
                setIsReadyToSubmit(true);
              })
              .catch(error => console.error('Error:', error))
              .finally(() => setIsScanning(false)); // Ensure scanning is set to false regardless of success
          });
        })
        .catch(error => {
          console.error('Firebase Authentication error:', error);
          setIsScanning(false); // Ensure scanning is set to false on error
        });
    }
  }, [photo]);

  const handleSubmit = () => {
    const team = localStorage.getItem('team');
    const leftTeam = localStorage.getItem('left_team');
    const collection = team === leftTeam ? 'left' : 'right';
    const docId = uuidv4();

    const monsterData = {
      docId: docId,
      ImagePath: finalImagePath,
      HP: stats.vitality,
      Attack: stats.attack,
      Defense: stats.defense,
      Speed: stats.speed,
      Keywords: keywords,
      Special: special.name ? special.name : "",
      SpecialType: special.effect ? special.effect : "",
      IsSpecialUsed: false,
      IsAlive: true,
      Item: "",
      Photo: photo,
      DefeatQuote: defeatQuote,
      Goal: false,
    };

    // LocalStorageに保存
    localStorage.setItem('monsterData', JSON.stringify(monsterData));

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

  const handleMerge = () => {
    const docId = uuidv4();

    const monsterData = {
      docId: docId,
      ImagePath: finalImagePath,
      HP: stats.vitality,
      Attack: stats.attack,
      Defense: stats.defense,
      Speed: stats.speed,
      Keywords: keywords,
      Special: special.name ? special.name : "",
      SpecialType: special.effect ? special.effect : "",
      IsSpecialUsed: false,
      IsAlive: true,
      Item: "",
      Photo: photo,
      DefeatQuote: defeatQuote,
      Goal: false,
    };

    // LocalStorageに保存
    localStorage.setItem('monsterData', JSON.stringify(monsterData));

    navigate('/player/camera-add');
  }


  return (
    <div className="preview-container">
      {sortedStatus ?
        <h1 className="preview-title">モンスターのステータス</h1>
        :
        <h1 className="preview-title">画像読み込み中...</h1>
      }
      <div className="photo-container">
        {photo ? (
          <>
            <div className="photo-wrapper">
              <img src={photo} alt="Captured" className="preview-photo" />
              {isScanning && <div className="scan-line"></div>}
            </div>
          </>
        ) : (
          <p>写真が選択されていません</p>
        )}
      </div>
      {sortedStatus && (
        <>
          <div className="stats-container">
            <div className="box27 border-green">
              <div className="box-title bg-green">生命力</div>
              <p>{incrementedStats.vitality.toFixed(0)}</p>
            </div>
            <div className="box27 border-red">
              <div className="box-title bg-red">攻撃力</div>
              <p>{incrementedStats.attack.toFixed(0)}</p>
            </div>
            <div className="box27 border-blue">
              <div className="box-title bg-blue">防御力</div>
              <p>{incrementedStats.defense.toFixed(0)}</p>
            </div>
            <div className="box27 border-purple">
              <div className="box-title bg-purple">素早さ
              </div>
              <p>{incrementedStats.speed.toFixed(0)}</p>
            </div>
          </div>
          <div
            className="box30"
            style={{ backgroundColor: colorInfo.leftMonsterColor }}
          >
            <div className="box-title">キーワード</div>
            <p
              className="current-keyword"
              style={{ backgroundColor: lighterColor }}>
              {currentKeyword}
            </p>
          </div>
        </>
      )}
      <div className="spacing" />
      {
        isReadyToSubmit && (
          <>
            <button
              onClick={handleSubmit}
              className="preview-button"
              style={{ backgroundColor: colorInfo.rightMonsterColor }}
            >
              投入する
            </button>
            <button
              onClick={handleMerge}
              className="preview-button"
              style={{ backgroundColor: colorInfo.leftMonsterColor }}
            >
              合体させる
            </button>
          </>
        )
      }


    </div >
  );
};

export default Submit;
