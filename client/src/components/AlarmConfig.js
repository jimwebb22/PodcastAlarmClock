import React, { useState, useEffect } from 'react';
import { alarm } from '../api';

function AlarmConfig() {
  const [config, setConfig] = useState(null);
  const [localConfig, setLocalConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await alarm.getConfig();
      setConfig(res.data);
      setLocalConfig(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading config:', err);
      setLoading(false);
    }
  };

  const handleTimeChange = (e) => {
    setLocalConfig({ ...localConfig, time: e.target.value });
  };

  const handleWeekdayToggle = (day) => {
    setLocalConfig({ ...localConfig, [day]: !localConfig[day] });
  };

  const handleVolumeChange = (e) => {
    setLocalConfig({ ...localConfig, volume: parseInt(e.target.value) });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');

    try {
      await alarm.updateConfig(localConfig);
      setConfig(localConfig);
      setSaveMessage('Configuration saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error('Error saving config:', err);
      setSaveMessage(err.response?.data?.error || 'Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (!config || !localConfig) return false;
    return JSON.stringify(config) !== JSON.stringify(localConfig);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const weekdays = [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Alarm Configuration</h2>

      <div className="space-y-6">
        {/* Time Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alarm Time
          </label>
          <input
            type="time"
            value={localConfig?.time || '07:00'}
            onChange={handleTimeChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
          />
        </div>

        {/* Weekday Checkboxes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Days of Week
          </label>
          <div className="flex flex-wrap gap-2">
            {weekdays.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleWeekdayToggle(key)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  localConfig?.[key]
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Volume Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Volume: {localConfig?.volume || 0}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={localConfig?.volume || 0}
            onChange={handleVolumeChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={!hasChanges() || saving}
            className={`w-full px-6 py-3 rounded-lg text-white font-semibold transition ${
              hasChanges() && !saving
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>

          {saveMessage && (
            <p
              className={`mt-2 text-center text-sm ${
                saveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {saveMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AlarmConfig;
