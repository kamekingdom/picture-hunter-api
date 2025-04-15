import React, { useContext } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import './Preview.css'; // カスタムCSSをインポート
import { ColorContext } from '../../App';
import usePreventBackNavigation from './usePreventBackNavigation';

const Preview = () => {
  // usePreventBackNavigation();
  const location = useLocation();
  const { photo } = location.state || {};
  const navigate = useNavigate();
  const colorInfo = useContext(ColorContext);

  const handleOk = () => {
    navigate('/player/submit-add', { state: { photo } });
  };

  return (
    <div className="preview-container">
      <h1 className="preview-title">モンスターの種</h1>
      {photo ? (
        <img src={photo} alt="Captured" className="preview-photo" />
      ) : (
        <p>No photo available</p>
      )}
      <div className="button-container">
        <Link
          to="/player/camera"
          style={{ backgroundColor: colorInfo.leftMonsterColor }}
          className="preview-button">
          やり直し
        </Link>
        <button
          onClick={handleOk}
          style={{ backgroundColor: colorInfo.rightMonsterColor }}
          className="preview-button">
          生成
        </button>
      </div>
    </div>
  );
};

export default Preview;
