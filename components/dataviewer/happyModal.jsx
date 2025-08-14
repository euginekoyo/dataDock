import React from 'react';

export default function SuccessModal({ isVisible, setIsVisible }) {
  return (
      <>
        {isVisible && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="relative w-full max-w-md p-6 mx-4 bg-white rounded-lg shadow-xl">
                <div className="flex flex-col items-center gap-4">
                  <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      className="w-12 h-12 text-green-600"
                      aria-hidden="true"
                  >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Success!
                  </h2>
                  <p className="text-sm text-center text-gray-600">
                    All errors have been resolved successfully. You may now proceed to submit the CSV file.
                  </p>
                  <button
                      onClick={() => setIsVisible(false)}
                      className="px-4 py-2 mt-4 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                      aria-label="Close success modal"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
        )}
      </>
  );
}