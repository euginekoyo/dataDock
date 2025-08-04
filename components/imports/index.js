import React, { useState, useEffect, useCallback } from 'react';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import FileDownload from 'js-file-download';

const ImportsComponent = () => {
  const [importData, setImportData] = useState({});
  const [loading, setLoading] = useState(true);
  const [downloadCollection, setDownloadCollection] = useState({});
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios
        .get(`/api/imports`)
        .then((res) => {
          setImportData(res.data);
          setLoading(false);
        })
        .catch((err) => {
          console.log(err);
          setLoading(false);
        });
  }, []);

  const onBtnExport = () => {
    if (!downloadCollection.fileName) {
      setShowWarning(true);
      return;
    }
    var options = {
      method: 'GET',
      url: '/api/downloads',
      responseType: 'blob',
      headers: {
        collection_name: downloadCollection.collection_name,
      },
    };
    axios(options).then((response) => {
      FileDownload(response.data, downloadCollection.fileName);
    });
  };

  const handleCheckBoxSelect = (col) => {
    setDownloadCollection(col);
    setShowWarning(false);
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  List of CSVs Imported
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  View and download your imported CSV files
                </p>
              </div>
              <button
                  onClick={onBtnExport}
                  className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg"
              >
                Download Imported CSV
                <DocumentArrowDownIcon className="h-5 w-5 ml-2" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Warning Message */}
          {showWarning && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl mb-6">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-red-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Selection Required
                    </h3>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                      Please select a file to download.
                    </p>
                  </div>
                </div>
              </div>
          )}

          {/* Table */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-900 dark:text-gray-200">
                <thead className="text-xs text-white uppercase h-12 bg-gradient-to-r from-blue-600 to-indigo-600">
                <tr>
                  <th className="py-3 px-6">Select</th>
                  <th scope="col" className="py-3 px-6">
                    Organization ID
                  </th>
                  <th scope="col" className="py-3 px-6">
                    Import ID
                  </th>
                  <th scope="col" className="py-3 px-6">
                    File Name
                  </th>
                  <th scope="col" className="py-3 px-6">
                    Rows
                  </th>
                  <th scope="col" className="py-3 px-6">
                    Started Date
                  </th>
                  <th scope="col" className="py-3 px-6">
                    Submitted Date
                  </th>
                  <th scope="col" className="py-3 px-6">
                    Status
                  </th>
                </tr>
                </thead>
                <tbody>
                {Array.isArray(importData) && importData.length > 0 ? (
                    importData.map((col, idx) => (
                        <tr
                            key={idx}
                            className="h-12 text-center border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                        >
                          <td className="py-3 px-6">
                            <input
                                type="checkbox"
                                checked={col._id === downloadCollection._id}
                                onChange={() => handleCheckBoxSelect(col)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-blue-600 dark:checked:border-blue-600 dark:focus:ring-blue-400"
                            />
                          </td>
                          <td className="py-3 px-6">{col.orgId || 'N/A'}</td>
                          <td className="py-3 px-6">{col.importerId || 'N/A'}</td>
                          <td className="py-3 px-6">{col.fileName || 'N/A'}</td>
                          <td className="py-3 px-6">{col.rows}</td>
                          <td className="py-3 px-6">
                            {col.created_date ? col.created_date.split('T')[0] : 'N/A'}
                          </td>
                          <td className="py-3 px-6">
                            {col.created_date ? col.created_date.split('T')[0] : 'N/A'}
                          </td>
                          <td className="py-3 px-6">
                        <span
                            className={`inline-block py-1 px-2 rounded-full text-xs font-semibold uppercase ${
                                col.status === 'Complete'
                                    ? 'text-green-600 bg-green-100 dark:bg-green-900/20'
                                    : 'text-red-600 bg-red-100 dark:bg-red-900/20'
                            }`}
                        >
                          {col.status}
                        </span>
                          </td>
                        </tr>
                    ))
                ) : (
                    <tr className="h-12 text-center">
                      <td colSpan="8" className="py-4 text-gray-500 dark:text-gray-400">
                        {loading ? 'Loading...' : 'No Data Available'}
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
  );
};

export default ImportsComponent;