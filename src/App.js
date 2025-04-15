import React, { createContext } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Camera from './player/components/Camera';
import Preview from './player/components/Preview';
import Team from './player/components/Team';
import Submit from './player/components/Submit';
import Complete from './player/components/Complete';
import CameraAdd from './player/components/CameraAdd';
import PreviewAdd from './player/components/PreviewAdd';
import SubmitAdd from './player/components/SubmitAdd';
import BattleField from './screen/BattleField';
import Dead from './player/components/Dead';
import Ranking from './screen/Ranking';
import './index.css';

const colorInfo = {
  // leftMonsterColor: "#849fbb",
  leftMonsterColor: "#3f6887",
  // rightMonsterColor: "#f2c893",
  rightMonsterColor: "#cd543f"
};
const ColorContext = createContext(colorInfo);

function App() {
  return (
    <ColorContext.Provider value={colorInfo}>
      <Router>
        <Routes>
          <Route path="/" element={<BattleField />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/player/team" element={<Team />} />
          <Route path="/player/camera" element={<Camera />} />
          <Route path="/player/preview" element={<Preview />} />
          <Route path="/player/submit" element={<Submit />} />
          <Route path="/player/complete" element={<Complete />} />
          <Route path="/player/camera-add" element={<CameraAdd />} />
          <Route path="/player/preview-add" element={<PreviewAdd />} />
          <Route path="/player/submit-add" element={<SubmitAdd />} />
          <Route path="/player/dead" element={<Dead />} />
        </Routes>
      </Router>
    </ColorContext.Provider>
  );
}

export default App;
export { ColorContext };
