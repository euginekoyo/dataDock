import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/roles';
import { AlertTriangle, CheckCircle, Database, FileText, User, RefreshCw, Search, Filter, BarChart3, Activity, Clock, Eye } from 'lucide-react';
import axios from 'axios';
import Link from 'next/link';

const SuperAdminDashboard = () => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [imports, setImports] = useState([]);
    const [userActivity, setUserActivity] = useState([]);
    const [roles, setRoles] = useState([]);
    const [error, setError] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [selectedRole, setSelectedRole] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'lastActivity', direction: 'desc' });
    const [importsPage, setImportsPage] = useState(1);
    const [activityPage, setActivityPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const pageSizeOptions = [10, 25, 50];

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const fetchRoles = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${baseUrl}/api/roles`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.status === 200) {
                setRoles(Array.isArray(response.data) ? response.data : []);
            } else {
                setError('Failed to fetch roles');
                setRoles([{ name: 'USER', permissions: [] }]);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
            setError('An error occurred while fetching roles');
            setRoles([{ name: 'USER', permissions: [] }]);
        }
    };

    const fetchData = useCallback(async () => {
        setLoadingData(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const [importsResponse, activityResponse, usersResponse] = await Promise.all([
                axios.get('/api/imports', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/userActivity', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            let filteredImports = Array.isArray(importsResponse.data) ? importsResponse.data : [];
            if (selectedRole !== 'ALL') {
                filteredImports = filteredImports.filter((imp) =>
                    imp.collaborators?.some((role) => role.toUpperCase() === selectedRole.toUpperCase())
                );
            }

            if (searchTerm) {
                const lowerSearch = searchTerm.toLowerCase();
                filteredImports = filteredImports.filter(
                    (imp) =>
                        imp.fileName?.toLowerCase().includes(lowerSearch) ||
                        imp.name?.toLowerCase().includes(lowerSearch) ||
                        imp.collection_name?.toLowerCase().includes(lowerSearch) ||
                        imp.workspace?.toLowerCase().includes(lowerSearch) ||
                        imp.organization?.toLowerCase().includes(lowerSearch)
                );
            }

            const userRoleMap = new Map(usersResponse.data.map((u) => [u._id.toString(), u.role]));
            let filteredActivity = Array.isArray(activityResponse.data.data) ? activityResponse.data.data : [];
            if (selectedRole !== 'ALL') {
                filteredActivity = filteredActivity.filter((activity) =>
                    userRoleMap.get(activity.userId.toString())?.toUpperCase() === selectedRole.toUpperCase()
                );
            }
            if (searchTerm) {
                const lowerSearch = searchTerm.toLowerCase();
                filteredActivity = filteredActivity.filter(
                    (activity) =>
                        activity.userName?.toLowerCase().includes(lowerSearch) ||
                        activity.collection_name?.toLowerCase().includes(lowerSearch) ||
                        activity.workspace?.toLowerCase().includes(lowerSearch) ||
                        activity.organization?.toLowerCase().includes(lowerSearch)
                );
            }

            if (sortConfig.key) {
                filteredImports.sort((a, b) => {
                    let aValue = a[sortConfig.key] || '';
                    let bValue = b[sortConfig.key] || '';
                    if (sortConfig.key === 'created_date') {
                        aValue = new Date(aValue).getTime();
                        bValue = new Date(bValue).getTime();
                    }
                    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                    if (typeof bValue === 'string') bValue = bValue.toLowerCase();
                    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                });
                filteredActivity.sort((a, b) => {
                    let aValue = a[sortConfig.key === 'created_date' ? 'lastActivity' : sortConfig.key] || '';
                    let bValue = b[sortConfig.key === 'created_date' ? 'lastActivity' : sortConfig.key] || '';
                    if (sortConfig.key === 'created_date' || sortConfig.key === 'lastActivity') {
                        aValue = new Date(aValue).getTime();
                        bValue = new Date(bValue).getTime();
                    }
                    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                    if (typeof bValue === 'string') bValue = bValue.toLowerCase();
                    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            setImports(filteredImports);
            setUserActivity(filteredActivity);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoadingData(false);
        }
    }, [selectedRole, searchTerm, sortConfig, baseUrl]);

    useEffect(() => {
        if (loading) return;
        if (!user || !hasPermission(user.role, 'view_dashboard')) {
            router.push('/login');
            return;
        }
        fetchRoles();
        fetchData();
    }, [user, loading, router, fetchData]);

    const stats = React.useMemo(() => {
        if (!Array.isArray(imports) || imports.length === 0) {
            return { total: 0, completed: 0, processing: 0, failed: 0, totalRows: 0, totalErrors: 0, activeUsers: 0, totalActions: 0 };
        }
        const total = imports.length;
        const completed = imports.filter((item) => item.status === 'Complete').length;
        const processing = imports.filter((item) => item.status === 'Processing').length;
        const failed = imports.filter((item) => item.status === 'Failed' || item.status === 'Incomplete').length;
        const totalRows = imports.reduce((sum, item) => sum + (item.totalRecords || 0), 0);
        const totalErrors = imports.reduce((sum, item) => sum + (item.errorRecords || 0), 0);
        const activeUsers = new Set(userActivity.map((a) => a.userName)).size;
        const totalActions = userActivity.reduce((sum, item) => sum + (item.actionCount || 0), 0);
        return { total, completed, processing, failed, totalRows, totalErrors, activeUsers, totalActions };
    }, [imports, userActivity]);

    const handleRefresh = () => {
        fetchData();
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getPaginatedData = (data, page) => {
        const startIndex = (page - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    };

    const getPageCount = (data) => {
        return Math.ceil(data.length / itemsPerPage);
    };

    const PaginationControls = ({ currentPage, setPage, data }) => {
        const pageCount = getPageCount(data);
        return (
            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setPage(1);
                        }}
                        className="px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-800"
                    >
                        {pageSizeOptions.map((size) => (
                            <option key={size} value={size}>
                                {size} per page
                            </option>
                        ))}
                    </select>
                    <span className="text-xs text-gray-600">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                        {Math.min(currentPage * itemsPerPage, data.length)} of {data.length} entries
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-xs disabled:opacity-50 hover:bg-gray-200"
                    >
                        Previous
                    </button>
                    <span className="text-xs text-gray-600">
                        Page {currentPage} of {pageCount}
                    </span>
                    <button
                        onClick={() => setPage(currentPage + 1)}
                        disabled={currentPage === pageCount}
                        className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-xs disabled:opacity-50 hover:bg-gray-200"
                    >
                        Next
                    </button>
                </div>
            </div>
        );
    };

    const StatCard = ({ icon: Icon, value, label, colorClass, bgClass, delay = 0 }) => (
        <div
            className={`group relative bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-sm transition-all duration-200 opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]`}
            style={{ animationDelay: `${delay}ms` }}
        >
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

    const ProgressBar = ({ progress, status }) => {
        const getProgressColor = () => {
            if (status === 'Failed' || status === 'Incomplete') return 'bg-red-500';
            if (status === 'Processing') return 'bg-yellow-500';
            return 'bg-green-500';
        };

        return (
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        );
    };

    const LoadingCard = () => (
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 animate-pulse">
            <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 bg-gray-200 rounded-md"></div>
                <div className="w-12 h-3 bg-gray-200 rounded"></div>
            </div>
            <div className="w-16 h-6 bg-gray-200 rounded mb-1"></div>
            <div className="w-24 h-3 bg-gray-200 rounded"></div>
        </div>
    );

    const SkeletonTable = () => (
        <div className="animate-pulse space-y-3">
            <div className="h-10 bg-gray-100 rounded-md"></div>
            {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-50 rounded-md"></div>
            ))}
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

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs text-gray-600 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-md">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-xs text-red-700 font-medium">{error}</span>
                            <button
                                onClick={() => setError('')}
                                className="ml-auto p-1 rounded-md hover:bg-red-100 transition-all duration-200"
                            >
                                <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-semibold text-gray-800 mb-1">Dashboard</h1>
                            <p className="text-xs text-gray-500">Monitor imports and user activity</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search imports, users..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 pr-3 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                                />
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="pl-8 pr-6 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                                >
                                    <option value="ALL">All Roles</option>
                                    {roles.length > 0 ? (
                                        roles.map((role) => (
                                            <option key={role._id} value={role.name}>
                                                {role.name}
                                            </option>
                                        ))
                                    ) : (
                                        <option value="">Loading roles...</option>
                                    )}
                                </select>
                            </div>
                            <button
                                onClick={handleRefresh}
                                disabled={loadingData}
                                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-all duration-200 shadow-sm disabled:opacity-50"
                            >
                                <RefreshCw className={`h-3 w-3 mr-1 ${loadingData ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                            <a
                                href="/imports"
                                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-all duration-200 shadow-sm"
                            >
                                <Eye className="h-3 w-3 mr-1" />
                                View Imports
                            </a>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {loadingData ? (
                        [...Array(4)].map((_, i) => <LoadingCard key={i} />)
                    ) : (
                        <>
                            <StatCard
                                icon={FileText}
                                value={stats.total.toLocaleString()}
                                label="Total Imported Files"
                                colorClass="text-blue-600"
                                bgClass="bg-blue-100"
                                delay={0}
                            />
                            <StatCard
                                icon={CheckCircle}
                                value={stats.completed.toLocaleString()}
                                label="Completed Jobs"
                                colorClass="text-green-600"
                                bgClass="bg-green-100"
                                delay={100}
                            />
                            <StatCard
                                icon={Database}
                                value={stats.totalRows.toLocaleString()}
                                label="Total Record Rows"
                                colorClass="text-purple-600"
                                bgClass="bg-purple-100"
                                delay={200}
                            />
                            <StatCard
                                icon={Activity}
                                value={stats.activeUsers.toLocaleString()}
                                label="Active Users"
                                colorClass="text-indigo-600"
                                bgClass="bg-indigo-100"
                                delay={300}
                            />
                        </>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <div className="p-1 bg-blue-100 rounded-md">
                                <User className="h-3 w-3 text-blue-600" />
                            </div>
                            User Activity ({selectedRole})
                        </h2>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last updated: {new Date().toLocaleTimeString()}
                        </div>
                    </div>
                    {loadingData ? (
                        <SkeletonTable />
                    ) : userActivity.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <User className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500 mb-2">No user activity found for {selectedRole} role</p>
                            <a href="/imports" className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline">
                                Start an import to log activity →
                            </a>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('userName')}
                                        >
                                            User {sortConfig.key === 'userName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th
                                            className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('collection_name')}
                                        >
                                            Collection {sortConfig.key === 'collection_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th
                                            className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('workspace')}
                                        >
                                            Workspace {sortConfig.key === 'workspace' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th
                                            className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('organization')}
                                        >
                                            Branch {sortConfig.key === 'organization' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th
                                            className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('lastActivity')}
                                        >
                                            Last Activity {sortConfig.key === 'lastActivity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tasks</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {getPaginatedData(userActivity, activityPage).map((activity, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-all duration-200">
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <User className="h-3 w-3 text-blue-600" />
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-800">{activity.userName || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-xs text-gray-600">{activity.collection_name || 'N/A'}</td>
                                            <td className="px-4 py-2 text-xs text-gray-600">{activity.workspace || 'N/A'}</td>
                                            <td className="px-4 py-2 text-xs text-gray-600">{activity.organization || 'N/A'}</td>
                                            <td className="px-4 py-2 text-xs text-gray-600">{formatDate(activity.lastActivity)}</td>
                                            <td className="px-4 py-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                                    {activity.action || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-xs font-semibold text-gray-800">{activity.actionCount || 0}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationControls currentPage={activityPage} setPage={setActivityPage} data={userActivity} />
                        </>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <div className="p-1 bg-green-100 rounded-md">
                                <Database className="h-3 w-3 text-green-600" />
                            </div>
                            Imports Progress ({selectedRole})
                        </h2>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {stats.totalErrors > 0 && (
                                <span className="text-red-600 font-medium">{stats.totalErrors.toLocaleString()} errors detected</span>
                            )}
                        </div>
                    </div>
                    {loadingData ? (
                        <SkeletonTable />
                    ) : imports.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Database className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500 mb-2">No imports found for {selectedRole} role</p>
                            <Link href="/imports" className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline">
                                Start a new import →
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('importerId')}
                                        >
                                            Importer ID {sortConfig.key === 'importerId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th
                                            className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('fileName')}
                                        >
                                            Name {sortConfig.key === 'fileName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th
                                            className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('workspaceId')}
                                        >
                                            Workspace ID {sortConfig.key === 'workspaceId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th
                                            className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('created_date')}
                                        >
                                            Created Date {sortConfig.key === 'created_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Progress</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Records</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Errors</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {getPaginatedData(imports, importsPage).map((item, idx) => {
                                        const progress = item.totalRecords > 0 ? Math.round((item.validRecords / item.totalRecords) * 100) : 0;
                                        return (
                                            <tr key={idx} className="hover:bg-gray-50 transition-all duration-200">
                                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                                                    {item.importerId?.slice(-8) || 'N/A'}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                                                    {item.fileName || item.name || 'Unnamed File'}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                                                    {item.workspaceId || 'N/A'}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                                                    {formatDate(item.created_date)}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                                                            item.status === 'Complete'
                                                                ? 'bg-green-100 text-green-800'
                                                                : item.status === 'Processing'
                                                                    ? 'bg-yellow-100 text-yellow-800'
                                                                    : 'bg-red-100 text-red-800'
                                                        }`}
                                                    >
                                                        {item.status || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1">
                                                            <ProgressBar progress={progress} status={item.status} />
                                                        </div>
                                                        <span className="text-xs font-medium text-gray-800 min-w-[2rem]">{progress}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-800">
                                                    {item.totalRecords?.toLocaleString() || 0}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <span className={`text-xs font-medium ${item.errorRecords > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                                        {item.errorRecords?.toLocaleString() || 0}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">{item.orgName || 'N/A'}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-right">
                                                    <a
                                                        href="/imports"
                                                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-all duration-200"
                                                    >
                                                        <Eye className="h-3 w-3 mr-1" />
                                                        View
                                                    </a>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationControls currentPage={importsPage} setPage={setImportsPage} data={imports} />
                        </>
                    )}
                </div>

                <style jsx>{`
                    @keyframes fadeIn {
                        from {
                            opacity: 0;
                        }
                        to {
                            opacity: 1;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;