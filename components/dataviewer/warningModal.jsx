import React from 'react';
import { XMarkIcon, CloudArrowDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function WarningModal({
                                       isVisible,
                                       setIsVisible,
                                       submit,
                                       metaData,
                                       type,
                                     }) {
  if (!isVisible || !metaData) return null;

  const errorCount = metaData.totalRecords - metaData.validRecords;

  // Customize message and behavior based on type
  const getModalContent = () => {
    switch (type.toLowerCase()) {
      case 'download all':
        return {
          title: `${errorCount} rows with unresolved format issues!`,
          leftOption: 'Review and fix format issues before downloading all rows.',
          rightOption: `Download all ${metaData.totalRecords} rows, including ${errorCount} with issues.`,
          rightButtonText: 'Download All',
        };
      case 'download errors':
        if (errorCount === 0) {
          return {
            title: 'No rows with errors found!',
            leftOption: 'Go back to review the data.',
            rightOption: 'No error rows available to download.',
            rightButtonText: 'Download Errors',
            disableRightButton: true,
          };
        }
        return {
          title: `Downloading ${errorCount} rows with errors`,
          leftOption: 'Review and fix format issues.',
          rightOption: `Download only the ${errorCount} rows with errors, marked with ⚠️ and detailed error messages.`,
          rightButtonText: 'Download Errors',
          disableRightButton: false,
        };
      case 'download valid':
        return {
          title: `Downloading ${metaData.validRecords} valid rows`,
          leftOption: 'Review rows with errors before downloading valid rows.',
          rightOption: `Download only the ${metaData.validRecords} valid rows.`,
          rightButtonText: 'Download Valid',
        };
      case 'submit':
        return {
          title: `${errorCount} rows with unresolved format issues!`,
          leftOption: 'Review and fix format issues before submitting.',
          rightOption: `Discard ${errorCount} rows with issues and submit ${metaData.validRecords} valid rows.`,
          rightButtonText: 'Submit',
        };
      default:
        return {
          title: 'Unresolved format issues detected!',
          leftOption: 'Review and fix format issues.',
          rightOption: 'Proceed with the action.',
          rightButtonText: type,
        };
    }
  };

  const { title, leftOption, rightOption, rightButtonText } = getModalContent();

  return (
      <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ${
              isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
      >
        <div className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <button
                onClick={() => setIsVisible(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 text-center">
              <p className="text-sm text-gray-600 mb-4">{leftOption}</p>
              <button
                  onClick={() => setIsVisible(false)}
                  className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all duration-200"
              >
                Go Back
              </button>
            </div>
            <div className="hidden sm:block w-px bg-gray-200"></div>
            <div className="flex-1 text-center">
              <p className="text-sm text-gray-600 mb-4">{rightOption}</p>
              <button
                  onClick={() => submit(true)}
                  className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      type.toLowerCase() === 'download errors'
                          ? 'text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300'
                          : type.toLowerCase() === 'download valid'
                              ? 'text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                              : type.toLowerCase() === 'download all'
                                  ? 'text-green-600 bg-green-50 border border-green-200 hover:bg-green-100 hover:border-green-300'
                                  : 'text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  {type.toLowerCase().includes('download') && (
                      <CloudArrowDownIcon className="w-4 h-4" />
                  )}
                  <span>{rightButtonText}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}