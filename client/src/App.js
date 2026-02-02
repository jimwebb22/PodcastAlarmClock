import React from 'react';
import './index.css';
import AlarmStatus from './components/AlarmStatus';
import AlarmConfig from './components/AlarmConfig';
import SpeakerSelection from './components/SpeakerSelection';
import PodcastSelection from './components/PodcastSelection';
import ControlPanel from './components/ControlPanel';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Podcast Alarm Clock
        </h1>

        <div className="max-w-4xl mx-auto space-y-6">
          <AlarmStatus />
          <AlarmConfig />
          <SpeakerSelection />
          <PodcastSelection />
          <ControlPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
