
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  XCircle,
} from 'lucide-react';
import { Context } from '../../context';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';

const ImportsComponent = () => {
  const [importData, setImportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadCollection, setDownloadCollection] = useState({});
  const [downloadType, setDownloadType] = useState('all');
  const [showWarning, setShowWarning] = useState(false);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, item: null });
  const [deleting, setDeleting] = useState(null);
  const [viewModal, setViewModal] = useState({ show: false, item: null });

  const { state, dispatch } = useContext(Context);  const router = useRouter();
  const { user } = useAuth();
  const abortControllerRef = useRef(new AbortController());

  useEffect(() => {
    const fetchData = async () => {
      const abortController = abortControllerRef.current;
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const importResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/imports`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
          cache: 'no-store',
        });
        if (!importResponse.ok) throw new Error('Failed to fetch imports');
        const imports = await importResponse.json();

        const userRole = user?.role || 'USER';
        let filteredImports = Array.isArray(imports) ? imports : [];
        if (userRole && userRole !== 'ADMIN') {
          filteredImports = filteredImports.filter((imp) =>
              imp.collaborators?.some((role) => role.toUpperCase() === userRole.toUpperCase())
          );
        }

        const sortedData = [...filteredImports].sort(
            (a, b) => new Date(b.created_date) - new Date(a.created_date)
        );
        setImportData(sortedData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load data. Please try again later.');
        }
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
    };
  }, [user]);

  const stats = React.useMemo(() => {
    if (!Array.isArray(importData) || importData.length === 0) {
      return { total: 0, completed: 0, failed: 0, totalRows: 0 };
    }
    const total = importData.length;
    const completed = importData.filter((item) => item.status === 'Complete').length;
    const failed = importData.filter((item) => item.status === 'Incomplete').length;
    const totalRows = importData.reduce((sum, item) => sum + (item.rows || 0), 0);
    return { total, completed, failed, totalRows };
  }, [importData]);

  const onBtnExport = useCallback(
      (col) => {
        if (!col.collection_name) {
          setShowWarning(true);
          return;
        }
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/downloads?type=${downloadType}`, {
          method: 'GET',
          headers: { collection_name: col.collection_name },
        })
            .then((response) => response.blob())
            .then((blob) => {
              const fileExtension = downloadType === 'all' ? '' : `_${downloadType}`;
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${col.fileName || 'unnamed'}${fileExtension}.csv`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            })
            .catch((err) => {
              console.error('Download error:', err);
              setShowWarning(true);
            });
      },
      [downloadType]
  );

  const handleDownloadTypeChange = (e) => {
    setDownloadType(e.target.value);
  };

  const handleViewDetails = (item) => {
    setViewModal({ show: true, item });
  };

  const handleRowClick = useCallback(
      async (col) => {
        if (col.status === 'Incomplete') {
          if (!col.collection_name || (!col.template_id && !col.baseTemplateId)) {
            console.error('Invalid import data:', col);
            return;
          }
          const templateId = col.template_id || col.baseTemplateId;
          const collectionName = col.collection_name;
          const workspaceName = col.workspaceName || 'default_workspace';
          const orgName = col.orgName || 'default_organization';

          console.log('Handling row click:', { collectionName, templateId, workspaceName, orgName });

          dispatch({ type: 'SET_COLLECTION_NAME', payload: collectionName });
          dispatch({ type: 'SET_CUR_TEMPLATE', payload: templateId });
          dispatch({ type: 'CURRENT_FILE', payload: { path: col.fileName } });
          dispatch({ type: 'SET_WORKSPACE_NAME', payload: workspaceName });
          dispatch({ type: 'SET_ORG_NAME', payload: orgName });

          console.log('Dispatched to context:', { collectionName, templateId, workspaceName, orgName, state });

          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/templates`, {
              headers: { template_id: templateId },
            });
            const data = await response.json();
            if (data && Array.isArray(data.columns)) {
              dispatch({ type: 'SET_SASS_TEMPLATE_COLUMNS', payload: data.columns });
            }
            if (data && data.schema) {
              dispatch({ type: 'SET_SAAS_TEMPLATE_SCHEMA', payload: data.schema });
            }
            // Log activity
            const activityPayload = {
              userId: user._id,
              collection_name: collectionName,
              workspace: workspaceName,
              organization: orgName,
              action: 'view_import',
              row_id: null,
            };
            console.log('Sending to /api/userActivity (handleRowClick):', activityPayload);
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/userActivity`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify(activityPayload),
            });
          } catch (error) {
            console.error('Error fetching template data or logging activity:', error);
          }
          router.push({ pathname: '/dataviewer/saas' }, undefined, { shallow: true });
        }
      },
      [dispatch, router, user]
  );

  const handleCleanNow = useCallback(
      async (col) => {
        if (col.status === 'Incomplete') {
          if (!col.collection_name || (!col.template_id && !col.baseTemplateId)) {
            console.error('Invalid import data:', col);
            return;
          }
          const templateId = col.template_id || col.baseTemplateId;
          const collectionName = col.collection_name;
          const workspaceName = col.workspaceName || 'default_workspace';
          const orgName = col.orgName || 'default_organization';

          console.log('Handling clean now:', { collectionName, templateId, workspaceName, orgName });

          dispatch({ type: 'SET_COLLECTION_NAME', payload: collectionName });
          dispatch({ type: 'SET_CUR_TEMPLATE', payload: templateId });
          dispatch({ type: 'CURRENT_FILE', payload: { path: col.fileName } });
          dispatch({ type: 'SET_WORKSPACE_NAME', payload: workspaceName });
          dispatch({ type: 'SET_ORG_NAME', payload: orgName });

          console.log('Dispatched to context:', { collectionName, templateId, workspaceName, orgName, state });

          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/templates`, {
              headers: { template_id: templateId },
            });
            const data = await response.json();
            if (data && Array.isArray(data.columns)) {
              dispatch({ type: 'SET_SASS_TEMPLATE_COLUMNS', payload: data.columns });
            }
            if (data && data.schema) {
              dispatch({ type: 'SET_SAAS_TEMPLATE_SCHEMA', payload: data.schema });
            }
            // Log activity
            const activityPayload = {
              userId: user._id,
              collection_name: collectionName,
              workspace: workspaceName,
              organization: orgName,
              action: 'clean_data',
              row_id: null,
            };
            console.log('Sending to /api/userActivity (handleCleanNow):', activityPayload);
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/userActivity`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify(activityPayload),
            });
          } catch (error) {
            console.error('Error fetching template data or logging activity:', error);
          }
          router.push({ pathname: '/dataviewer/saas' }, undefined, { shallow: true });
        }
      },
      [dispatch, router, user]
  );

  const handleDelete = useCallback(
      async (item) => {
        setDeleting(item._id);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/imports`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              importId: item._id,
              collection_name: item.collection_name,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to delete import');
          }

          setImportData((prev) => prev.filter((imp) => imp._id !== item._id));
          setDeleteConfirm({ show: false, item: null });
          if (downloadCollection._id === item._id) {
            setDownloadCollection({});
          }
        } catch (error) {
          console.error('Delete failed:', error);
          setError('Failed to delete import. Please try again.');
        } finally {
          setDeleting(null);
        }
      },
      [downloadCollection._id]
  );

  const StatCard = ({ icon: Icon, value, label, colorClass, bgClass }) => (
      <div className="group relative overflow-hidden bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-sm transition-all duration-200">
        <div className={`absolute inset-0 ${bgClass} opacity-0 group-hover:opacity-5 transition-opacity duration-200`}></div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-semibold text-gray-800 mb-1">{value}</div>
            <div className="text-xs text-gray-500 font-medium">{label}</div>
          </div>
          <div className={`p-2 ${bgClass} ${colorClass} rounded-md`}>
            <Icon className="h-3 w-3" />
          </div>
        </div>
      </div>
  );

  const ActionButton = ({ onClick, icon: Icon, label, variant = 'primary', size = 'sm' }) => {
    const baseClasses = 'inline-flex items-center gap-1 font-medium rounded-md transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-1 focus:ring-offset-1';
    const sizeClasses = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm';
    const variantClasses = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-500',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      purple: 'bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500',
    };

    return (
        <button onClick={onClick} className={`${baseClasses} ${sizeClasses} ${variantClasses[variant]}`}>
          <Icon className="h-3 w-3" />
          {label}
        </button>
    );
  };

  const DetailRow = ({ icon: Icon, label, value, colorClass = 'text-blue-500' }) => (
      <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-md">
        <div className={`p-1 ${colorClass}`}>
          <Icon className="h-3 w-3" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</div>
          <div className="text-xs text-gray-800 font-medium break-words">{value || 'N/A'}</div>
        </div>
      </div>
  );

  const formatDate = (dateString) => {
    return dateString
        ? new Date(dateString).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        })
        : 'N/A';
  };

  return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-gray-800 mb-1">Import Management</h1>
                <p className="text-xs text-gray-500">Monitor and manage your CSV data imports</p>
              </div>
              <select
                  value={downloadType}
                  onChange={handleDownloadTypeChange}
                  className="px-3 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              >
                <option value="all">All Records</option>
                <option value="valid">Valid Records</option>
                <option value="errors">Error Records</option>
              </select>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatCard
                icon={FileText}
                value={stats.total}
                label="Total Files"
                colorClass="text-blue-600"
                bgClass="bg-blue-100"
            />
            <StatCard
                icon={CheckCircle}
                value={stats.completed}
                label="Completed"
                colorClass="text-green-600"
                bgClass="bg-green-100"
            />
            <StatCard
                icon={XCircle}
                value={stats.failed}
                label="Incomplete"
                colorClass="text-red-600"
                bgClass="bg-red-100"
            />
            <StatCard
                icon={Calendar}
                value={stats.totalRows.toLocaleString()}
                label="Total Rows"
                colorClass="text-purple-600"
                bgClass="bg-purple-100"
            />
          </div>

          {/* Alerts */}
          {(showWarning || error) && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-md">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <p className="text-xs text-red-800 font-medium">
                    {error || 'Please select a file to download.'}
                  </p>
                </div>
              </div>
          )}

          {/* Main Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Importer ID</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Organization ID</th>

                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Workspace ID</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Valid Records</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Workspace</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {Array.isArray(importData) && importData.length > 0 ? (
                    importData.map((col, idx) => (
                        <tr
                            key={col._id || idx}
                            className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                            onClick={() => handleRowClick(col)}
                        >
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {col.importerId?.slice(-8) || 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {col.fileName || col.name || 'Unnamed File'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {col.orgId || col.organizationId || 'N/A'}
                          </td>

                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {col.workspaceId || 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {formatDate(col.created_date)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {(col.rows || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                        <span
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                col.status === 'Complete'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}
                        >
                          {col.status || 'Unknown'}
                        </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {col.orgName || 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {col.workspaceName || 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-right">
                            <div className="flex items-center gap-2 justify-end">
                              {col.status === 'Incomplete' && (
                                  <ActionButton
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCleanNow(col);
                                      }}
                                      icon={Edit}
                                      label="Resolve"
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
                              <ActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onBtnExport(col);
                                  }}
                                  icon={Download}
                                  label="Export"
                                  variant="primary"
                              />
                              {user?.role === 'ADMIN' && (
                                  <ActionButton
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm({ show: true, item: col });
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
                      <td colSpan="12" className="py-8 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-3 bg-gray-100 rounded-full">
                            <FileText className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="text-gray-500">
                            {loading ? (
                                <div className="flex items-center gap-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                                  <span className="text-xs font-medium">Loading imports...</span>
                                </div>
                            ) : error ? (
                                <span className="text-xs text-red-500 font-medium">{error}</span>
                            ) : (
                                <div>
                                  <div className="text-xs font-medium">No imports found</div>
                                  <div className="text-xs mt-1">Upload your first CSV file to get started</div>
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
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    Showing {importData.length} import{importData.length !== 1 ? 's' : ''}
                  </div>
                </div>
            )}
          </div>

          {/* View Details Modal */}
          {viewModal.show && viewModal.item && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-sm border border-gray-100">
                  <div className="sticky top-0 bg-white border-b border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-md">
                          <FileText className="h-3 w-3 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800">Import Details</h3>
                          <p className="text-xs text-gray-500">{viewModal.item.fileName || 'Unnamed File'}</p>
                        </div>
                      </div>
                      <button
                          onClick={() => setViewModal({ show: false, item: null })}
                          className="p-1 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-gray-500"
                      >
                        <X className="h-3 w-3 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Basic Information */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">Basic Information</h4>
                      <div className="grid grid-cols-1 gap-2">
                        <DetailRow
                            icon={FileText}
                            label="File Name"
                            value={viewModal.item.fileName || viewModal.item.name}
                            colorClass="text-blue-500"
                        />
                        <DetailRow
                            icon={Hash}
                            label="Importer ID"
                            value={viewModal.item.importerId?.slice(-12) || viewModal.item._id?.slice(-12) || 'N/A'}
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
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">Status & Timing</h4>
                      <div className="grid grid-cols-1 gap-2">
                        <DetailRow
                            icon={CheckCircle}
                            label="Status"
                            value={
                              <span
                                  className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                      viewModal.item.status === 'Complete'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                  }`}
                              >
                          {viewModal.item.status || 'Unknown'}
                        </span>
                            }
                            colorClass="text-blue-500"
                        />
                        <DetailRow
                            icon={Clock}
                            label="Created Date"
                            value={formatDate(viewModal.item.created_date)}
                            colorClass="text-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Organization Details */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">Organization Details</h4>
                      <div className="grid grid-cols-1 gap-2">
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
                        <DetailRow
                            icon={Hash}
                            label="Organization ID"
                            value={viewModal.item.orgId || viewModal.item.organizationId}
                            colorClass="text-cyan-500"
                        />
                        <DetailRow
                            icon={Hash}
                            label="Workspace ID"
                            value={viewModal.item.workspaceId}
                            colorClass="text-teal-500"
                        />
                      </div>
                    </div>

                    {/* Template Information */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">Template Information</h4>
                      <div className="grid grid-cols-1 gap-2">
                        <DetailRow
                            icon={FileText}
                            label="Template ID"
                            value={viewModal.item.template_id || viewModal.item.baseTemplateId}
                            colorClass="text-pink-500"
                        />
                        <DetailRow
                            icon={FileText}
                            label="Template Name"
                            value={viewModal.item['template name'] || viewModal.item.templateName}
                            colorClass="text-pink-500"
                        />
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
                  </div>
                  <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Last updated: {formatDate(viewModal.item.created_date)}
                      </div>
                      <div className="flex gap-2">
                        {viewModal.item.status === 'Incomplete' && (
                            <ActionButton
                                onClick={() => {
                                  setViewModal({ show: false, item: null });
                                  handleCleanNow(viewModal.item);
                                }}
                                icon={Edit}
                                label="Clean Data"
                                variant="purple"
                                size="sm"
                            />
                        )}
                        <ActionButton
                            onClick={() => setViewModal({ show: false, item: null })}
                            icon={X}
                            label="Close"
                            variant="secondary"
                            size="sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm.show && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-4 max-w-sm w-full shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-red-100 rounded-md">
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800">Delete Import</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Are you sure you want to delete <span className="font-semibold">{deleteConfirm.item?.fileName}</span>? This action cannot be undone.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <ActionButton
                        onClick={() => setDeleteConfirm({ show: false, item: null })}
                        icon={X}
                        label="Cancel"
                        variant="secondary"
                        size="sm"
                        disabled={deleting}
                    />
                    <ActionButton
                        onClick={() => handleDelete(deleteConfirm.item)}
                        icon={Trash2}
                        label={deleting === deleteConfirm.item?._id ? 'Deleting...' : 'Delete'}
                        variant="danger"
                        size="sm"
                        disabled={deleting}
                    />
                  </div>
                </div>
              </div>
          )}
        </div>
      </div>
  );
};

export default ImportsComponent;
