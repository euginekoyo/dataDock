import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Database,
  Download,
  Edit,
  Eye,
  FileText,
  Hash,
  Trash2,
  User,
  X,
  XCircle
} from 'lucide-react';
import {Context} from "../../context";
import {useRouter} from "next/router";
import {useAuth} from "../../context/AuthContext";

const ImportsComponent = () => {
  const [importData, setImportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadCollection, setDownloadCollection] = useState({});
  const [downloadType, setDownloadType] = useState('all');
  const [showWarning, setShowWarning] = useState(false);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({show: false, item: null});
  const [deleting, setDeleting] = useState(null);
  const [actionDropdown, setActionDropdown] = useState(null);
  const [viewModal, setViewModal] = useState({show: false, item: null});

  const {dispatch} = useContext(Context);
  const router = useRouter();
  const {user} = useAuth();
  const abortControllerRef = useRef(new AbortController());

  useEffect(() => {
    const fetchData = async () => {
      const abortController = abortControllerRef.current;
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const importResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/imports`, {
          headers: {Authorization: `Bearer ${token}`},
          signal: abortController.signal,
          cache: 'no-store',
        });
        if (!importResponse.ok) throw new Error('Failed to fetch imports');
        const imports = await importResponse.json();
        console.log('API Response:', imports);

        const userRole = user?.role || 'USER';
        console.log('User role:', userRole);
        let filteredImports = Array.isArray(imports) ? imports : [];
        if (userRole && userRole !== 'ADMIN') {
          filteredImports = filteredImports.filter(imp => {
            const hasAccess = imp.collaborators && imp.collaborators.some(role =>
                role.toUpperCase() === userRole.toUpperCase()
            );
            console.log(`Filtering ${imp.fileName || imp._id}:`, {
              collaborators: imp.collaborators,
              userRole,
              hasAccess
            });
            return hasAccess;
          });
        }
        console.log('Filtered imports:', filteredImports);

        const sortedData = [...filteredImports].sort((a, b) =>
            new Date(b.created_date) - new Date(a.created_date)
        );
        console.log('Sorted data:', sortedData);
        setImportData(sortedData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Fetch error:', err);
          setError(err.message || 'Failed to load data. Please try again later.');
        }
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      abortControllerRef.current.abort(); // Cleanup on unmount
      abortControllerRef.current = new AbortController(); // Reset for next mount
    };
  }, [user]);

  const stats = React.useMemo(() => {
    if (!Array.isArray(importData) || importData.length === 0) {
      return { total: 0, completed: 0, failed: 0, totalRows: 0 };
    }
    const total = importData.length;
    const completed = importData.filter(item => item.status === 'Complete').length;
    const failed = importData.filter(item => item.status === 'Incomplete').length;
    const totalRows = importData.reduce((sum, item) => sum + (item.rows || 0), 0);
    return { total, completed, failed, totalRows };
  }, [importData]);

  const onBtnExport = useCallback(() => {
    if (!downloadCollection.fileName) {
      setShowWarning(true);
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/downloads?type=${downloadType}`, {
      method: 'GET',
      headers: {collection_name: downloadCollection.collection_name},
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
  }, [downloadCollection, downloadType]);

  const handleCheckBoxSelect = (col) => {
    setDownloadCollection(col);
    setShowWarning(false);
  };

  const handleDownloadTypeChange = (e) => {
    setDownloadType(e.target.value);
  };

  const handleViewDetails = (item) => {
    setViewModal({show: true, item});
  };

  const handleRowClick = useCallback(async (col) => {
    if (col.status === 'Incomplete') {
      const templateId = col.template_id || col.baseTemplateId;
      const collectionName = col.collection_name;
      if (!templateId || !collectionName) {
        console.error('Missing template_id or collection_name:', col);
        return;
      }
      dispatch({type: 'SET_COLLECTION_NAME', payload: collectionName});
      dispatch({type: 'SET_CUR_TEMPLATE', payload: templateId});
      dispatch({type: 'CURRENT_FILE', payload: {path: col.fileName}});
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/templates`, {
          headers: {template_id: templateId},
        });
        const data = await response.json();
        if (data && Array.isArray(data.columns)) {
          dispatch({type: 'SET_SASS_TEMPLATE_COLUMNS', payload: data.columns});
        }
        if (data && data.schema) {
          dispatch({type: 'SET_SAAS_TEMPLATE_SCHEMA', payload: data.schema});
        }
      } catch (error) {
        console.error('Error fetching template data:', error);
      }
      router.push({pathname: '/dataviewer/saas'}, undefined, {shallow: true});
    }
  }, [dispatch, router]);

  const handleCleanNow = useCallback(async (col) => {
    if (col.status === 'Incomplete') {
      const templateId = col.template_id || col.baseTemplateId;
      const collectionName = col.collection_name;
      if (!templateId || !collectionName) {
        console.error('Missing template_id or collection_name:', col);
        return;
      }
      dispatch({type: 'SET_COLLECTION_NAME', payload: collectionName});
      dispatch({type: 'SET_CUR_TEMPLATE', payload: templateId});
      dispatch({type: 'CURRENT_FILE', payload: {path: col.fileName}});
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/templates`, {
          headers: {template_id: templateId},
        });
        const data = await response.json();
        if (data && Array.isArray(data.columns)) {
          dispatch({type: 'SET_SASS_TEMPLATE_COLUMNS', payload: data.columns});
        }
        if (data && data.schema) {
          dispatch({type: 'SET_SAAS_TEMPLATE_SCHEMA', payload: data.schema});
        }
      } catch (error) {
        console.error('Error fetching template data:', error);
      }
      router.push({pathname: '/dataviewer/saas'}, undefined, {shallow: true});
    }
  }, [dispatch, router]);

  const handleDelete = useCallback(async (item) => {
    setDeleting(item._id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/imports`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          importId: item._id,
          collection_name: item.collection_name
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete import');
      }

      setImportData(prev => prev.filter(imp => imp._id !== item._id));
      setDeleteConfirm({show: false, item: null});
      if (downloadCollection._id === item._id) {
        setDownloadCollection({});
      }
    } catch (error) {
      console.error('Delete failed:', error);
      setError('Failed to delete import. Please try again.');
    } finally {
      setDeleting(null);
    }
  }, [downloadCollection._id]);

  const StatCard = ({icon: Icon, value, label, colorClass, bgClass}) => (
      <div
          className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300">
        <div
            className={`absolute inset-0 ${bgClass} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</div>
          </div>
          <div className={`p-3 ${bgClass} ${colorClass} rounded-xl shadow-sm`}>
            <Icon className="h-6 w-6"/>
          </div>
        </div>
      </div>
  );

  const ActionButton = ({onClick, icon: Icon, label, variant = 'primary', size = 'sm'}) => {
    const baseClasses = "inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2";
    const sizeClasses = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
    const variantClasses = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      purple: 'bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500'
    };

    return (
        <button
            onClick={onClick}
            className={`${baseClasses} ${sizeClasses} ${variantClasses[variant]}`}
        >
          <Icon className="h-4 w-4"/>
          {label}
        </button>
    );
  };

  const DetailRow = ({icon: Icon, label, value, colorClass = "text-blue-500"}) => (
      <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className={`p-1 ${colorClass}`}>
          <Icon className="h-4 w-4"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            {label}
          </div>
          <div className="text-sm text-gray-900 dark:text-gray-100 font-medium break-words">
            {value || 'N/A'}
          </div>
        </div>
      </div>
  );

  const SchemaFieldCard = ({fieldName, fieldSchema, errorMessage}) => (
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              {fieldName.trim()}
            </h5>
            {fieldSchema.required && (
                <span
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 mt-1">
              Required
            </span>
            )}
          </div>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              fieldSchema.type === 'string' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                  fieldSchema.type === 'integer' || fieldSchema.type === 'number' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      fieldSchema.type === 'boolean' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
          }`}>
          {fieldSchema.type}
        </span>
        </div>

        <div className="space-y-2 text-xs">
          {fieldSchema.format && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Format:</span>
                <span className="font-mono text-gray-900 dark:text-gray-100">{fieldSchema.format}</span>
              </div>
          )}
          {fieldSchema.pattern && (
              <div className="flex flex-col gap-1">
                <span className="text-gray-500 dark:text-gray-400">Pattern:</span>
                <code
                    className="font-mono text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded text-gray-900 dark:text-gray-100 break-all">
                  {fieldSchema.pattern}
                </code>
              </div>
          )}
          {errorMessage && (
              <div className="flex flex-col gap-1">
                <span className="text-gray-500 dark:text-gray-400">Error Message:</span>
                <span className="text-red-600 dark:text-red-400 font-medium">{errorMessage}</span>
              </div>
          )}
        </div>
      </div>
  );

  const formatJsonValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'string') {
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(value);
        return parsed;
      } catch {
        return value;
      }
    }
    return value;
  };

  return (
      <div
          className="w-full  p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Import Management</h1>
              <p className="text-gray-600 dark:text-gray-400">Monitor and manage your CSV data imports</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                  value={downloadType}
                  onChange={handleDownloadTypeChange}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              >
                <option value="all">All Records</option>
                <option value="valid">Valid Records</option>
                <option value="errors">Error Records</option>
              </select>
              <ActionButton
                  onClick={onBtnExport}
                  icon={Download}
                  label="Export Data"
                  variant="primary"
                  size="md"
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <StatCard
              icon={FileText}
              value={stats.total}
              label="Total Files"
              colorClass="text-blue-600 dark:text-blue-400"
              bgClass="bg-blue-100 dark:bg-blue-900/20"
          />
          <StatCard
              icon={CheckCircle}
              value={stats.completed}
              label="Completed"
              colorClass="text-green-600 dark:text-green-400"
              bgClass="bg-green-100 dark:bg-green-900/20"
          />
          <StatCard
              icon={XCircle}
              value={stats.failed}
              label="Incomplete"
              colorClass="text-red-600 dark:text-red-400"
              bgClass="bg-red-100 dark:bg-red-900/20"
          />
          <StatCard
              icon={Calendar}
              value={stats.totalRows.toLocaleString()}
              label="Total Rows"
              colorClass="text-purple-600 dark:text-purple-400"
              bgClass="bg-purple-100 dark:bg-purple-900/20"
          />
        </div>

        {/* Alerts */}
        {(showWarning || error) && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500"/>
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                  {error || 'Please select a file to download.'}
                </p>
              </div>
            </div>
        )}

        {/* Main Table */}
        <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12"></th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">File
                  Details
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valid
                  Records
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Import
                  Date
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Organization</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">WorkSpace</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Array.isArray(importData) && importData.length > 0 ? (
                  importData.map((col, idx) => (
                      <tr
                          key={idx}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 ${
                              col._id === downloadCollection._id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                          }`}
                      >
                        <td className="py-4 px-6">
                          <input
                              type="radio"
                              name="selectedFile"
                              checked={col._id === downloadCollection._id}
                              onChange={() => handleCheckBoxSelect(col)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400"/>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-gray-100">
                                {col.fileName || 'Unnamed File'}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                ID: {col.importerId ? col.importerId.toString().slice(-8) : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {(col.rows || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">rows</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {col.created_date ? new Date(col.created_date).toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {col.created_date ? new Date(col.created_date).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : ''}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                      <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              col.status === 'Complete'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}
                      >
                        {col.status || 'Unknown'}
                      </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">{col.orgName}</div>
                          {/*<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">*/}
                          {/*  {col.collaborators?.join(', ') || 'N/A'}*/}
                          {/*</div>*/}
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-md text-gray-900 font-medium dark:text-gray-400">{col.workspaceName}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {col.status === 'Incomplete' && (
                                <ActionButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCleanNow(col);
                                    }}
                                    icon={Edit}
                                    label="Clean"
                                    variant="purple"
                                />
                            )}
                            <ActionButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(col);
                                }}
                                icon={Eye}
                                label="View"
                                variant="secondary"
                            />
                            {user?.role === 'ADMIN' && (
                                <ActionButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirm({show: true, item: col});
                                    }}
                                    icon={Trash2}
                                    label="Delete"
                                    variant="danger"
                                />
                            )}
                          </div>
                        </td>
                      </tr>
                  ))
              ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                          <FileText className="h-8 w-8 text-gray-400"/>
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {loading ? (
                              <div className="flex items-center gap-3">
                                <div
                                    className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                                <span className="text-lg font-medium">Loading imports...</span>
                              </div>
                          ) : error ? (
                              <span className="text-lg text-red-500 font-medium">{error}</span>
                          ) : (
                              <div>
                                <div className="text-lg font-medium">No imports found</div>
                                <div className="text-sm mt-1">Upload your first CSV file to get started</div>
                              </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
          {Array.isArray(importData) && importData.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <div>
                    Showing {importData.length} import{importData.length !== 1 ? 's' : ''}
                  </div>

                </div>
              </div>
          )}
        </div>

        {/* View Details Modal */}
        {viewModal.show && viewModal.item && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div
                  className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div
                    className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400"/>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          Import Details
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {viewModal.item.fileName || 'Unnamed File'}
                        </p>
                      </div>
                    </div>
                    <button
                        onClick={() => setViewModal({show: false, item: null})}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      <X className="h-5 w-5 text-gray-500 dark:text-gray-400"/>
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailRow
                          icon={FileText}
                          label="File Name"
                          value={viewModal.item.fileName}
                          colorClass="text-blue-500"
                      />
                      <DetailRow
                          icon={Hash}
                          label="Import ID"
                          value={viewModal.item.importerId?.toString().slice(-12) || viewModal.item._id?.slice(-12)}
                          colorClass="text-purple-500"
                      />
                      <DetailRow
                          icon={Database}
                          label="Collection Name"
                          value={viewModal.item.collection_name}
                          colorClass="text-green-500"
                      />
                      <DetailRow
                          icon={Hash}
                          label="Total Rows"
                          value={viewModal.item.rows ? viewModal.item.rows.toLocaleString() : '0'}
                          colorClass="text-orange-500"
                      />
                    </div>
                  </div>

                  {/* Status and Timing */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status & Timing</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailRow
                          icon={CheckCircle}
                          label="Status"
                          value={
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                viewModal.item.status === 'Complete'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            }`}>
                              {viewModal.item.status || 'Unknown'}
                            </span>
                          }
                          colorClass="text-blue-500"
                      />
                      <DetailRow
                          icon={Clock}
                          label="Import Date"
                          value={viewModal.item.created_date ? (
                              <div>
                                <div>{new Date(viewModal.item.created_date).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(viewModal.item.created_date).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                          ) : 'N/A'}
                          colorClass="text-indigo-500"
                      />
                    </div>
                  </div>


                  {/* Collaborators */}
                  {viewModal.item.collaborators && viewModal.item.collaborators.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Collaborators</h4>
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex flex-wrap gap-2">
                            {viewModal.item.collaborators.map((collaborator, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                                >
                              {collaborator}
                            </span>
                            ))}
                          </div>
                        </div>
                      </div>
                  )}

                  {/*/!* Schema Information *!/*/}
                  {/*{viewModal.item.schema && (*/}
                  {/*    <div>*/}
                  {/*      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Schema</h4>*/}
                  {/*      {(() => {*/}
                  {/*        const schemaData = formatJsonValue(viewModal.item.schema);*/}
                  {/*        if (schemaData && typeof schemaData === 'object' && schemaData.properties) {*/}
                  {/*          const requiredFields = schemaData.required || [];*/}
                  {/*          const errorMessages = schemaData.errorMessage?.properties || {};*/}

                  {/*          return (*/}
                  {/*              <div className="space-y-4">*/}
                  {/*                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">*/}
                  {/*                  {Object.entries(schemaData.properties).map(([fieldName, fieldSchema]) => (*/}
                  {/*                      <SchemaFieldCard*/}
                  {/*                          key={fieldName}*/}
                  {/*                          fieldName={fieldName}*/}
                  {/*                          fieldSchema={{*/}
                  {/*                            ...fieldSchema,*/}
                  {/*                            required: requiredFields.includes(fieldName)*/}
                  {/*                          }}*/}
                  {/*                          errorMessage={errorMessages[fieldName]}*/}
                  {/*                      />*/}
                  {/*                  ))}*/}
                  {/*                </div>*/}

                  {/*                {schemaData.additionalProperties !== undefined && (*/}
                  {/*                    <div*/}
                  {/*                        className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">*/}
                  {/*                      <div className="flex items-center gap-2">*/}
                  {/*                        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400"/>*/}
                  {/*                        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">*/}
                  {/*                    Additional Properties: {schemaData.additionalProperties ? 'Allowed' : 'Not Allowed'}*/}
                  {/*                  </span>*/}
                  {/*                      </div>*/}
                  {/*                    </div>*/}
                  {/*                )}*/}
                  {/*              </div>*/}
                  {/*          );*/}
                  {/*        }*/}

                  {/*        return (*/}
                  {/*            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">*/}
                  {/*          <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">*/}
                  {/*            {typeof schemaData === 'object'*/}
                  {/*                ? JSON.stringify(schemaData, null, 2)*/}
                  {/*                : String(schemaData)*/}
                  {/*            }*/}
                  {/*          </pre>*/}
                  {/*            </div>*/}
                  {/*        );*/}
                  {/*      })()}*/}
                  {/*    </div>*/}
                  {/*)}*/}

                  {/* Template Information */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Template Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(viewModal.item.template_id || viewModal.item.baseTemplateId) && (
                          <DetailRow
                              icon={FileText}
                              label="Template ID"
                              value={viewModal.item.template_id || viewModal.item.baseTemplateId}
                              colorClass="text-pink-500"
                          />
                      )}
                      {viewModal.item['template name'] && (
                          <DetailRow
                              icon={FileText}
                              label="Template Name"
                              value={viewModal.item['template name']}
                              colorClass="text-pink-500"
                          />
                      )}
                      {viewModal.item.validators !== undefined && (
                          <DetailRow
                              icon={CheckCircle}
                              label="Validators"
                              value={viewModal.item.validators === null ? 'None' : String(viewModal.item.validators)}
                              colorClass="text-indigo-500"
                          />
                      )}
                    </div>
                  </div>

                  {/* Organization Details */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Organization Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailRow
                          icon={User}
                          label="Branch"
                          value={viewModal.item.orgName}
                          colorClass="text-cyan-500"
                      />
                      <DetailRow
                          icon={Database}
                          label="Workspace"
                          value={viewModal.item.workspaceName}
                          colorClass="text-teal-500"
                      />
                      {viewModal.item.orgId && (
                          <DetailRow
                              icon={Hash}
                              label="Organization ID"
                              value={viewModal.item.orgId}
                              colorClass="text-cyan-500"
                          />
                      )}
                      {viewModal.item.workspaceId && (
                          <DetailRow
                              icon={Hash}
                              label="Workspace ID"
                              value={viewModal.item.workspaceId}
                              colorClass="text-teal-500"
                          />
                      )}
                    </div>
                  </div>

                  {/*/!* Additional Metadata *!/*/}
                  {/*{Object.keys(viewModal.item).filter(key =>*/}
                  {/*    !['_id', 'fileName', 'rows', 'status', 'created_date', 'orgName', 'workspaceName', 'collaborators', 'collection_name', 'importerId', 'template_id', 'baseTemplateId', 'schema', 'template name', 'validators', 'orgId', 'workspaceId'].includes(key)*/}
                  {/*).length > 0 && (*/}
                  {/*    <div>*/}
                  {/*      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Additional Information</h4>*/}
                  {/*      <div className="space-y-3">*/}
                  {/*        {Object.entries(viewModal.item)*/}
                  {/*            .filter(([key]) => !['_id', 'fileName', 'rows', 'status', 'created_date', 'orgName', 'workspaceName', 'collaborators', 'collection_name', 'importerId', 'template_id', 'baseTemplateId', 'schema', 'template name', 'validators', 'orgId', 'workspaceId'].includes(key))*/}
                  {/*            .map(([key, value], index) => (*/}
                  {/*                <div key={index} className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">*/}
                  {/*            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 capitalize">*/}
                  {/*              {key.replace(/_/g, ' ')}:*/}
                  {/*            </span>*/}
                  {/*                  <span className="text-sm text-gray-900 dark:text-gray-100 text-right max-w-xs break-words">*/}
                  {/*              {(() => {*/}
                  {/*                const formattedValue = formatJsonValue(value);*/}
                  {/*                if (typeof formattedValue === 'object' && formattedValue !== null) {*/}
                  {/*                  return (*/}
                  {/*                      <pre className="text-xs bg-gray-100 dark:bg-gray-600 p-2 rounded font-mono whitespace-pre-wrap break-words max-w-xs">*/}
                  {/*                      {JSON.stringify(formattedValue, null, 2)}*/}
                  {/*                    </pre>*/}
                  {/*                  );*/}
                  {/*                }*/}
                  {/*                return String(formattedValue || 'N/A');*/}
                  {/*              })()}*/}
                  {/*            </span>*/}
                  {/*                </div>*/}
                  {/*            ))}*/}
                  {/*      </div>*/}
                  {/*    </div>*/}
                  {/*)}*/}
                </div>

                {/* Modal Footer */}
                <div
                    className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 rounded-b-2xl">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Last updated: {viewModal.item.created_date ?
                        new Date(viewModal.item.created_date).toLocaleString() : 'Unknown'}
                    </div>
                    <div className="flex gap-3">
                      {viewModal.item.status === 'Incomplete' && (
                          <ActionButton
                              onClick={() => {
                                setViewModal({show: false, item: null});
                                handleCleanNow(viewModal.item);
                              }}
                              icon={Edit}
                              label="Clean Data"
                              variant="purple"
                              size="md"
                          />
                      )}
                      <button
                          onClick={() => setViewModal({show: false, item: null})}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400"/>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Import</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete <span className="font-semibold">{deleteConfirm.item?.fileName}</span>?
                  This action cannot be undone and will permanently remove all associated data.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                      onClick={() => setDeleteConfirm({show: false, item: null})}
                      disabled={deleting}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={() => handleDelete(deleteConfirm.item)}
                      disabled={deleting}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {deleting === deleteConfirm.item?._id ? (
                        <>
                          <div
                              className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Deleting...
                        </>
                    ) : (
                        <>
                          <Trash2 className="h-4 w-4"/>
                          Delete Import
                        </>
                    )}
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
};

export default ImportsComponent;