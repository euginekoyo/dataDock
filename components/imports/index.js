import React, { useState, useEffect, useCallback } from 'react';
import { Download, AlertTriangle, FileText, CheckCircle, XCircle, Calendar } from 'lucide-react';

const ImportsComponent = () => {
  const [importData, setImportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadCollection, setDownloadCollection] = useState({});
  const [downloadType, setDownloadType] = useState('all');
  const [showWarning, setShowWarning] = useState(false);

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!Array.isArray(importData) || importData.length === 0) {
      return { total: 0, completed: 0, failed: 0, totalRows: 0 };
    }

    const total = importData.length;
    const completed = importData.filter(item => item.status === 'Complete').length;
    const failed = total - completed;
    const totalRows = importData.reduce((sum, item) => sum + (item.rows || 0), 0);

    return { total, completed, failed, totalRows };
  }, [importData]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/imports`)
        .then(res => res.json())
        .then((data) => {
          // Sort data by created_date in descending order (latest first)
          const sortedData = Array.isArray(data) ? [...data].sort((a, b) =>
              new Date(b.created_date) - new Date(a.created_date)
          ) : [];
          setImportData(sortedData);
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

    fetch(`/api/downloads?type=${downloadType}`, {
      method: 'GET',
      headers: {
        collection_name: downloadCollection.collection_name,
      },
    })
        .then(response => response.blob())
        .then((blob) => {
          const fileExtension = downloadType === 'all' ? '' : `_${downloadType}`;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${downloadCollection.fileName}${fileExtension}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        })
        .catch((err) => {
          console.error('Download error:', err);
          setShowWarning(true);
        });
  };

  const handleCheckBoxSelect = (col) => {
    setDownloadCollection(col);
    setShowWarning(false);
  };

  const handleDownloadTypeChange = (e) => {
    setDownloadType(e.target.value);
  };

  return (
      <div className="max-w-6xl mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Files</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Completed</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.failed}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Failed</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalRows.toLocaleString()}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Rows</div>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Imported Files</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage your CSV imports</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                  value={downloadType}
                  onChange={handleDownloadTypeChange}
                  className="text-sm px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="all">All Records</option>
                <option value="valid">Valid Records</option>
                <option value="errors">Error Records</option>
              </select>

              <button
                  onClick={onBtnExport}
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>
        </div>

        {/* Warning Alert */}
        {showWarning && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-800 dark:text-red-200">Please select a file to download.</p>
              </div>
            </div>
        )}

        {/* Modern Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12"></th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">File Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rows</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Import ID</th>
              </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Array.isArray(importData) && importData.length > 0 ? (
                  importData.map((col, idx) => (
                      <tr
                          key={idx}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                              col._id === downloadCollection._id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                          onClick={() => handleCheckBoxSelect(col)}
                      >
                        <td className="py-3 px-4">
                          <input
                              type="radio"
                              name="selectedFile"
                              checked={col._id === downloadCollection._id}
                              onChange={() => handleCheckBoxSelect(col)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {col.fileName || 'Unnamed File'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Org: {col.orgId || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{col.rows || 0}</td>
                        <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                          {col.created_date ? new Date(col.created_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                      <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              col.status === 'Complete'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}
                      >
                        {col.status || 'Unknown'}
                      </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {col.importerId ? col.importerId.slice(-8) : 'N/A'}
                        </td>
                      </tr>
                  ))
              ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-gray-400 dark:text-gray-500">
                          {loading ? (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                                <span className="text-sm">Loading...</span>
                              </div>
                          ) : (
                              <span className="text-sm">No imported files found</span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        {Array.isArray(importData) && importData.length > 0 && (
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
              {importData.length} file{importData.length !== 1 ? 's' : ''} imported
            </div>
        )}
      </div>
  );
};

export default ImportsComponent;