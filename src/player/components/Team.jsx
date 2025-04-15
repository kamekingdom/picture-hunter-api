import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './Team.css'; // カスタムCSSをインポート
import { ColorContext } from '../../App';
import usePreventBackNavigation from './usePreventBackNavigation';

const Team = () => {
    usePreventBackNavigation();
    const leftTeam = 'Left';
    const rightTeam = 'Right';
    const navigate = useNavigate();
    const colorInfo = useContext(ColorContext); // ColorContextから色情報を取得

    const handleSelectTeam = (selectedTeamName, selectedTeam) => {
        localStorage.clear(); // Local Storageをteam選択時にリセット
        localStorage.setItem('team', selectedTeamName);
        localStorage.setItem('your_team', selectedTeam);
        localStorage.setItem('left_team', leftTeam);
        localStorage.setItem('right_team', rightTeam);
        navigate('/player/camera'); // Camera.js に遷移する
    };

    return (
        <div className="team-container">
            <h2 className="team-title">Select Your Team</h2>
            <div className="button-container">
                <button
                    className="team-button left-button"
                    style={{ backgroundColor: colorInfo.leftMonsterColor }}
                    onClick={() => handleSelectTeam(leftTeam, "left")}
                >
                    {leftTeam}
                </button>
                <button
                    className="team-button right-button"
                    style={{ backgroundColor: colorInfo.rightMonsterColor }}
                    onClick={() => handleSelectTeam(rightTeam, "right")}
                >
                    {rightTeam}
                </button>
            </div>
        </div>
    );
};

export default Team;
