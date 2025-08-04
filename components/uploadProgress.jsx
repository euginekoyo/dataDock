import React from 'react';

const UploadProgress = ({ progress }) => {
  return (
      <div className="max-w-7xl mx-auto px-6 py-4 w-100">
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-900 dark:text-gray-200">
              Uploading...
            </span>
              <span className="font-medium text-gray-900 dark:text-gray-200">
              {progress}%
            </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 ease-in-out"
                  style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default UploadProgress;