
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { CheckCircle } from 'lucide-react';
import { useState, useCallback } from 'react';
import axios from 'axios';
import { debounce } from 'lodash';

const InputBox = ({ columnName, val }) => {
  const [value, setValue] = useState(val || '');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onChange = (event) => {
    setValue(event.target.value);
    setFeedback(null);
    setError(null);
  };

  const getFeedback = useCallback(debounce(async () => {
    if (!value.trim()) {
      setError('Please enter a value');
      return;
    }
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const feedbackUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api/datadock-ai/feedback`;
      console.log('Fetching feedback from:', feedbackUrl, { columnName, value });
      const response = await axios.get(`${feedbackUrl}?columnName=${encodeURIComponent(columnName)}&columnValue=${encodeURIComponent(value)}`, {
        timeout: 10000, // 10s timeout
      });
      console.log('Feedback response:', response.data);
      if (response.data.status === 200) {
        setFeedback(response.data.data);
      } else {
        setError(`Unexpected response status: ${response.data.status}`);
      }
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError(err.response?.data?.error || 'Failed to fetch feedback. Please check your network or API configuration.');
    } finally {
      setLoading(false);
    }
  }, 300), [columnName, value]);

  return (
      <div className="flex flex-col gap-2">
        <div className="flex relative items-center text-gray-600 focus-within:text-gray-400 w-52">
          <input
              value={value}
              onChange={onChange}
              className="px-3 font-semibold placeholder-slate-500 text-black rounded-md py-2 border-none ring-2 ring-gray-300 focus:ring-gray-500 focus:ring-2 focus:outline-none focus:bg-white focus:text-gray-900"
              placeholder="Enter value..."
              disabled={loading}
          />
          <button
              type="button"
              className="absolute focus:outline-none focus:shadow-outline inset-y-0 right-0"
              onClick={getFeedback}
              disabled={loading || !value.trim()}
          >
            <ExclamationTriangleIcon
                className={`w-9 h-9 ${loading || !value.trim() ? 'text-gray-400' : 'text-red-300 hover:text-red-500'} transition-colors`}
            />
          </button>
        </div>
        {loading && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md border border-gray-200 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading feedback...
            </div>
        )}
        {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
              {error}
            </div>
        )}
        {feedback && !error && (
            <div className="text-sm bg-gradient-to-r from-gray-50 to-blue-50 p-2 rounded-md border border-blue-200 flex items-center gap-2">
              {feedback[columnName] ? (
                  <>
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                    <span className="text-red-600">{feedback[columnName]}</span>
                  </>
              ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">No issues found</span>
                  </>
              )}
            </div>
        )}
      </div>
  );
};

export default InputBox;
