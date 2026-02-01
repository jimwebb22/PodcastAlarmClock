import React from 'react';
import './index.css';
import AlarmStatus from './components/AlarmStatus';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Sonos Alarm Clock
        </h1>

        <div className="max-w-4xl mx-auto space-y-6">
          <AlarmStatus />
        </div>
      </div>
    </div>
  );
}

export default App;
