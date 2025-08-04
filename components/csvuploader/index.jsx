import { CloudArrowUpIcon } from '@heroicons/react/24/solid';
import { useDropzone } from 'react-dropzone';
import React, { useCallback, useContext } from 'react';
import { Context } from '../../context';
import Papa from 'papaparse';
import { useRouter } from 'next/router';
import Stepper from '../stepper';

const CsvUploader = ({ isStepperVisible, nextPageRoute }) => {
  const { dispatch } = useContext(Context);
  const router = useRouter();

  const onDrop = useCallback(
      (acceptedFiles) => {
        const file = acceptedFiles[0];
        dispatch({
          type: 'CURRENT_FILE',
          payload: file,
        });
        const uploadStepOne = ({ target }) => {
          Papa.parse(target, {
            worker: true,
            header: true,
            preview: 15,
            dynamicTyping: true,
            skipEmptyLines: true,
            chunk: function (result, parser) {
              let fileMetaData = result.meta;
              dispatch({
                type: 'CURRENT_FILE_HEADERS',
                payload: fileMetaData.fields,
              });
              dispatch({
                type: 'CURRENT_FILE_SAMPLE_ROWS',
                payload: {
                  sampleData: result.data,
                  fileHeaders: fileMetaData.fields,
                },
              });

              router.push({ pathname: nextPageRoute }, undefined, {
                shallow: true,
              });
            },
          });
        };
        uploadStepOne({ target: file });
      },
      [dispatch, router, nextPageRoute]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
    onDrop,
  });

  return (
      <div className="w-full">
        {isStepperVisible && (
            <div className="mb-8">
              <Stepper step={1} />
            </div>
        )}

        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-6 border-b border-gray-200 dark:border-gray-600">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  Upload your CSV
                </h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  The file should be in{' '}
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-semibold">
                  .csv
                </span>{' '}
                  format. First row should be the headers.
                </p>
              </div>
            </div>

            {/* Upload Section */}
            <div className="p-8">
              <div
                  {...getRootProps()}
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer ${
                      isDragActive
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
              >
                <input {...getInputProps()} />

                {/* Upload Icon */}
                <div className="mb-6">
                  <CloudArrowUpIcon
                      className={`w-20 h-20 mx-auto transition-all duration-300 ${
                          isDragActive
                              ? 'text-blue-500 scale-110'
                              : 'text-gray-400 dark:text-gray-500'
                      }`}
                  />
                </div>

                {/* Upload Text */}
                <div className="space-y-2">
                  {isDragActive ? (
                      <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        Drop the CSV file here...
                      </p>
                  ) : (
                      <p className="text-lg text-gray-600 dark:text-gray-300">
                        Drag & drop your CSV file here
                      </p>
                  )}

                  <div className="flex items-center justify-center space-x-4 my-6">
                    <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1"></div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    OR
                  </span>
                    <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1"></div>
                  </div>
                </div>

                {/* Hover Overlay */}
                {isDragActive && (
                    <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/10 rounded-xl pointer-events-none"></div>
                )}
              </div>

              {/* Browse Button */}
              <div className="mt-6 flex justify-center">
                <button
                    onClick={open}
                    className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/50 dark:focus:ring-blue-400/50"
                >
                  <span className="relative z-10">Choose a file</span>
                  <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>
              </div>

              {/* File Format Info */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Supported format:</span> CSV files only
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      <span className="font-medium">Requirements:</span> First row must contain column headers
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default CsvUploader;