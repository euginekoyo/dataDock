import { Upload } from 'lucide-react';
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
      <div className="">
        <div className="p-6 max-w-5xl mx-auto">
          {isStepperVisible && (
              <div className="mb-4">
                <Stepper step={1} />
              </div>
          )}

          <div className="bg-white rounded-xl shadow-md border border-blue-100">
            {/* Header Section */}
            <div className="p-4 border-b border-blue-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 rounded-lg">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                    Upload your CSV
                  </h2>
                  <p className="text-sm text-gray-600">
                    The file should be in{' '}
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 text-xs font-semibold">
                      .csv
                    </span>{' '}
                    format. First row must be headers.
                  </p>
                </div>
              </div>
            </div>

            {/* Upload Section */}
            <div className="p-6">
              <div
                  {...getRootProps()}
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${
                      isDragActive
                          ? 'border-blue-500 bg-blue-50 scale-105'
                          : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                  }`}
              >
                <input {...getInputProps()} />

                {/* Upload Icon */}
                <div className="mb-4">
                  <Upload
                      className={`w-12 h-12 mx-auto transition-all duration-200 ${
                          isDragActive ? 'text-blue-500 scale-110' : 'text-gray-400'
                      }`}
                  />
                </div>

                {/* Upload Text */}
                <div className="space-y-1.5">
                  {isDragActive ? (
                      <p className="text-base font-semibold text-blue-600">
                        Drop the CSV file here...
                      </p>
                  ) : (
                      <p className="text-base text-gray-600">
                        Drag & drop your CSV file here
                      </p>
                  )}

                  <div className="flex items-center justify-center gap-3 my-4">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span className="text-xs text-gray-500 font-medium">OR</span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>
                </div>

                {/* Hover Overlay */}
                {isDragActive && (
                    <div className="absolute inset-0 bg-blue-500/10 rounded-lg pointer-events-none"></div>
                )}
              </div>

              {/* Browse Button */}
              <div className="mt-4 flex justify-center">
                <button
                    onClick={open}
                    className="relative px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-xs rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  Choose a file
                </button>
              </div>

              {/* File Format Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Supported format:</span> CSV files only
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
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