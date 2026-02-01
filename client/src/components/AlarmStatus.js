import React, { useState, useEffect } from 'react';
import { alarm } from '../api';

function AlarmStatus() {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [configRes, statusRes] = await Promise.all([
        alarm.getConfig(),
        alarm.getStatus()
      ]);
      setConfig(configRes.data.config);
      setStatus(statusRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading alarm data:', err);
    }
  };

  const toggleEnabled = async () => {
    setErrorMessage('');
    try {
      const newConfig = { ...config, enabled: !config.enabled };
      await alarm.updateConfig(newConfig);
      setConfig(newConfig);
    } catch (err) {
      console.error('Error toggling alarm:', err);
      // Show user-friendly error message
      const errorMsg = err.response?.data?.error || 'Failed to update alarm. Please ensure you have configured the schedule, speakers, and Spotify connection.';
      setErrorMessage(errorMsg);
      // Clear error after 5 seconds
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const getNextAlarm = () => {
    if (!config || !config.enabled) return null;

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();

    for (let i = 0; i <= 7; i++) {
      const dayIndex = (today + i) % 7;
      const dayName = days[dayIndex];

      if (config[dayName]) {
        const fullDayName = dayNames[dayIndex];
        return `${fullDayName} at ${config.time}`;
      }
    }

    return 'Not scheduled';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const nextAlarm = getNextAlarm();
  const statusText = status?.isPlaying ? 'Playing Now' :
                     config?.enabled ? 'Alarm Ready' : 'Not Configured';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Alarm Status</h2>
        <button
          onClick={toggleEnabled}
          className={`px-8 py-3 rounded-lg text-white text-lg font-semibold transition ${
            config?.enabled
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-gray-400 hover:bg-gray-500'
          }`}
        >
          {config?.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-600">Status</p>
          <p className="text-xl font-semibold">{statusText}</p>
        </div>

        {config?.enabled && (
          <div>
            <p className="text-sm text-gray-600">Next Alarm</p>
            <p className="text-xl font-semibold">{nextAlarm}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AlarmStatus;
