import React, { useState, useEffect } from 'react';
import { speakers } from '../api';

function SpeakerSelection() {
  const [availableSpeakers, setAvailableSpeakers] = useState([]);
  const [selectedSpeakers, setSelectedSpeakers] = useState([]);
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    loadSelectedSpeakers();
  }, []);

  const loadSelectedSpeakers = async () => {
    try {
      const res = await speakers.getSelected();
      setSelectedSpeakers(res.data.speakers || []);
    } catch (err) {
      console.error('Error loading selected speakers:', err);
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    setSaveMessage('');

    try {
      const res = await speakers.discover();
      setAvailableSpeakers(res.data.speakers || []);
    } catch (err) {
      console.error('Error discovering speakers:', err);
      setSaveMessage('Error discovering speakers');
    } finally {
      setDiscovering(false);
    }
  };

  const toggleSpeaker = (speaker) => {
    const isSelected = selectedSpeakers.some(s => s.uuid === speaker.uuid);

    if (isSelected) {
      setSelectedSpeakers(selectedSpeakers.filter(s => s.uuid !== speaker.uuid));
    } else {
      setSelectedSpeakers([...selectedSpeakers, speaker]);
    }
  };

  const isSpeakerSelected = (speaker) => {
    return selectedSpeakers.some(s => s.uuid === speaker.uuid);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');

    try {
      await speakers.setSelected(selectedSpeakers);
      setSaveMessage('Speaker selection saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error('Error saving speaker selection:', err);
      setSaveMessage('Error saving speaker selection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Sonos Speakers</h2>

      <div className="space-y-6">
        {/* Discover Button */}
        <div>
          <button
            onClick={handleDiscover}
            disabled={discovering}
            className={`px-6 py-3 rounded-lg text-white font-semibold transition ${
              discovering
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {discovering ? 'Discovering...' : 'Discover Speakers'}
          </button>
        </div>

        {/* Available Speakers List */}
        {availableSpeakers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Speakers
            </label>
            <div className="space-y-2">
              {availableSpeakers.map(speaker => (
                <div
                  key={speaker.uuid}
                  className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    id={`speaker-${speaker.uuid}`}
                    checked={isSpeakerSelected(speaker)}
                    onChange={() => toggleSpeaker(speaker)}
                    className="w-5 h-5 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor={`speaker-${speaker.uuid}`}
                    className="ml-3 flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{speaker.name}</div>
                    <div className="text-sm text-gray-500">{speaker.model}</div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Currently Selected Speakers */}
        {selectedSpeakers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currently Selected ({selectedSpeakers.length})
            </label>
            <div className="bg-gray-50 rounded-lg p-3">
              <ul className="space-y-1">
                {selectedSpeakers.map(speaker => (
                  <li key={speaker.uuid} className="text-sm">
                    {speaker.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Save Button */}
        {availableSpeakers.length > 0 && (
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full px-6 py-3 rounded-lg text-white font-semibold transition ${
                saving
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {saving ? 'Saving...' : 'Save Speaker Selection'}
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
        )}
      </div>
    </div>
  );
}

export default SpeakerSelection;
