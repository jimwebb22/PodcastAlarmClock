import React, { useState, useEffect } from 'react';
import { alarm } from '../api';

function ControlPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      const res = await alarm.getLogs(5);
      setLogs(res.data.logs || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading logs:', err);
      setLoading(false);
    }
  };

  const handleTestAlarm = async () => {
    setTesting(true);
    setMessage('');

    try {
      await alarm.test();
      setMessage('Test alarm triggered successfully!');
      setTimeout(() => {
        setMessage('');
        loadLogs(); // Refresh logs after test
      }, 3000);
    } catch (err) {
      console.error('Error triggering test alarm:', err);
      setMessage('Error triggering test alarm');
    } finally {
      setTesting(false);
    }
  };

  const handleStopPlayback = async () => {
    setStopping(true);
    setMessage('');

    try {
      await alarm.stop();
      setMessage('Playback stopped successfully!');
      setTimeout(() => {
        setMessage('');
        loadLogs(); // Refresh logs after stop
      }, 3000);
    } catch (err) {
      console.error('Error stopping playback:', err);
      setMessage('Error stopping playback');
    } finally {
      setStopping(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Control Panel</h2>

      <div className="space-y-6">
        {/* Control Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleTestAlarm}
            disabled={testing}
            className={`flex-1 px-6 py-3 rounded-lg text-white font-semibold transition ${
              testing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {testing ? 'Testing...' : 'Test Alarm Now'}
          </button>

          <button
            onClick={handleStopPlayback}
            disabled={stopping}
            className={`flex-1 px-6 py-3 rounded-lg text-white font-semibold transition ${
              stopping
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {stopping ? 'Stopping...' : 'Stop Playback'}
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <p
            className={`text-center text-sm ${
              message.includes('Error') ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {message}
          </p>
        )}

        {/* Recent Logs */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent Alarm Logs</h3>

          {loading ? (
            <p className="text-gray-600">Loading logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-600">No alarm logs yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div
                  key={log.id || index}
                  className={`p-3 rounded-lg border ${
                    log.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">
                      {log.success ? 'Success' : 'Failed'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatDate(log.triggered_at)}
                    </span>
                  </div>

                  {log.error_message && (
                    <p className="text-sm text-red-600 mt-1">{log.error_message}</p>
                  )}

                  {log.episodes_played && log.episodes_played.length > 0 && (
                    <div className="text-sm text-gray-600 mt-1">
                      Episodes played: {log.episodes_played.length}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ControlPanel;
