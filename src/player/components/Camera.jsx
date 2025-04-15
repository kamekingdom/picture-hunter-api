import React, { useRef, useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCamera } from 'react-icons/fa'; // カメラのアイコンをインポート
import './Camera.css'; // カスタムCSSをインポート
import { ColorContext } from '../../App';
import usePreventBackNavigation from './usePreventBackNavigation';
import { AiFillPicture } from "react-icons/ai";

const Camera = () => {
  usePreventBackNavigation();
  const videoRef = useRef(null);
  const photoRef = useRef(null);
  const fileInputRef = useRef(null); // ファイル入力のためのrefを追加
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const colorInfo = useContext(ColorContext); // ColorContextから色情報を取得

  useEffect(() => {
    async function getDevices() {
      try {
        const deviceInfos = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = deviceInfos.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Error enumerating devices: ", err);
      }
    }

    getDevices();
  }, []);

  useEffect(() => {
    async function getVideo() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { facingMode: "environment" }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing the camera: ", err);
      }
    }

    getVideo();
  }, [selectedDeviceId]);

  const handleDeviceChange = (event) => {
    setSelectedDeviceId(event.target.value);
  };

  const takePhoto = () => {
    const width = videoRef.current.videoWidth;
    const height = videoRef.current.videoHeight;

    const context = photoRef.current.getContext('2d');
    photoRef.current.width = width;
    photoRef.current.height = height;
    context.drawImage(videoRef.current, 0, 0, width, height);

    const photo = photoRef.current.toDataURL('image/png');
    navigate('/player/preview', { state: { photo } });
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          // 画質を落とすためにリサイズする
          const maxWidth = 512; // 最大幅を指定（必要に応じて変更）
          const maxHeight = 512; // 最大高さを指定（必要に応じて変更）
          let width = img.width;
          let height = img.height;

          // 縦横比を保ちながら最大サイズを超えないようにする
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          const context = photoRef.current.getContext('2d');
          photoRef.current.width = width;
          photoRef.current.height = height;
          context.drawImage(img, 0, 0, width, height);

          // 圧縮率を指定して画質を落とす
          const quality = 0.7; // 圧縮率（0.0 - 1.0）
          const photo = photoRef.current.toDataURL('image/jpeg', quality);
          navigate('/player/preview', { state: { photo } });
        };
        img.onerror = (e) => {
          console.error('Image load failed:', e);
        };
        img.src = reader.result;
      };
      reader.onerror = (e) => {
        console.error('File reading failed:', e);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="camera-container">
      <div className="camera-header">
        <label htmlFor="videoSource" className="camera-label">モンスターを選択</label><br />
        <select id="videoSource" className="camera-select" onChange={handleDeviceChange}>
          {devices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId}`}
            </option>
          ))}
        </select>
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="camera-video"
      />
      <div className="crosshair"></div>
      <div className="camera-button-container">
        <button
          onClick={takePhoto}
          style={{ backgroundColor: colorInfo.leftMonsterColor }} // 左ボタンに色を設定
          className="camera-button"
        >
          <FaCamera style={{ marginRight: '8px' }} />&nbsp;
          Capture
        </button>
        &nbsp;&nbsp;&nbsp;
        <button
          onClick={() => fileInputRef.current.click()} // ボタンがクリックされたときにファイル入力をトリガー
          style={{ backgroundColor: colorInfo.leftMonsterColor }} // 左ボタンに色を設定
          className="camera-button"
        >
          <AiFillPicture style={{ marginRight: '8px' }} />&nbsp;
          Folder
        </button>
        <input
          type="file"
          ref={fileInputRef} // ファイル入力のためのrefを設定
          style={{ display: 'none' }} // ボタンは表示しない
          accept="image/*"
          onChange={handleFileSelect}
        />
      </div>
      <canvas
        ref={photoRef}
        className="hidden"
      ></canvas>
    </div>
  );
};

export default Camera;
