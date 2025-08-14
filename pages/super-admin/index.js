
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/roles';
import {
    AlertTriangle,
    Calendar,
    CheckCircle,
    Clock,
    Database,
    FileText,
    User,
} from 'lucide-react';
import axios from 'axios';

const SuperAdminDashboard = () => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [imports, setImports] = useState([]);
    const [userActivity, setUserActivity] = useState([]);
    const [error, setError] = useState('');
    const [loadingData, setLoadingData] = useState(true);

    const fetchData = useCallback(async () => {
        setLoadingData(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const [importsResponse, activityResponse] = await Promise.all([
                axios.get('/api/imports', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get('/api/userActivity', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            setImports(importsResponse.data);
            setUserActivity(activityResponse.data.data);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => {
        if (loading) return;
        if (!user || !hasPermission(user.role, 'view_dashboard')) {
            router.push('/login');
            return;
        }
        fetchData();
    }, [user, loading, router, fetchData]);

    const stats = React.useMemo(() => {
        if (!Array.isArray(imports) || imports.length === 0) {
            return { total: 0, completed: 0, incomplete: 0, totalRows: 0, totalErrors: 0 };
        }
        const total = imports.length;
        const completed = imports.filter(item => item.status === 'Complete').length;
        const incomplete = imports.filter(item => item.status === 'Incomplete').length;
        const totalRows = imports.reduce((sum, item) => sum + (item.totalRecords || 0), 0);
        const totalErrors = imports.reduce((sum, item) => sum + (item.errorRecords || 0), 0);
        return { total, completed, incomplete, totalRows, totalErrors };
    }, [imports]);

    const StatCard = ({ icon: Icon, value, label, colorClass, bgClass }) => (
        <div className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
            <div className={`absolute inset-0 ${bgClass} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
                    <div className="text-sm text-gray-500 font-medium">{label}</div>
                </div>
                <div className={`p-3 ${bgClass} ${colorClass} rounded-xl shadow-sm`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </div>
    );

    const DetailRow = ({ icon: Icon, label, value, colorClass = "text-blue-500" }) => (
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div className={`p-1 ${colorClass}`}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    {label}
                </div>
                <div className="text-sm text-gray-900 font-medium break-words">
                    {value || 'N/A'}
                </div>
            </div>
        </div>
    );

    if (loading || !user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
            <div className="p-6 max-w-7xl mx-auto">
                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <span className="text-sm text-red-700 font-medium">{error}</span>
                        </div>
                        <button
                            onClick={() => setError('')}
                            className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-100 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h1>
                            <p className="text-gray-600 text-sm">Monitor data cleaning and validation progress</p>
                        </div>
                        <a
                            href="/imports"
                            className="inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm text-purple-600 bg-purple-50 border border-purple-100 hover:bg-purple-100 hover:border-purple-200 transition-all duration-200"
                        >
                            View All Imports
                        </a>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
                    <StatCard
                        icon={FileText}
                        value={stats.total}
                        label="Total Imports"
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
                        icon={AlertTriangle}
                        value={stats.incomplete}
                        label="Incomplete"
                        colorClass="text-red-600"
                        bgClass="bg-red-100"
                    />
                    <StatCard
                        icon={Database}
                        value={stats.totalRows.toLocaleString()}
                        label="Total Rows"
                        colorClass="text-purple-600"
                        bgClass="bg-purple-100"
                    />
                    <StatCard
                        icon={AlertTriangle}
                        value={stats.totalErrors.toLocaleString()}
                        label="Error Rows"
                        colorClass="text-orange-600"
                        bgClass="bg-orange-100"
                    />
                </div>

                {/* User Activity Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        User Activity
                    </h2>
                    {loadingData ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                            <span className="ml-3 text-gray-600">Loading activity...</span>
                        </div>
                    ) : userActivity.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No user activity found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Collection</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Activity</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions Performed</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                {userActivity.map((activity, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-all duration-200">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <User className="h-4 w-4 text-blue-500" />
                                                <span className="text-sm text-gray-900">{activity.userName || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-900">{activity.collection_name}</td>
                                        <td className="py-4 px-6 text-sm text-gray-900">
                                            {new Date(activity.lastActivity).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-900">{activity.actionCount}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Imports Progress Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Database className="h-5 w-5 text-blue-600" />
                        Imports Progress
                    </h2>
                    {loadingData ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                            <span className="ml-3 text-gray-600">Loading imports...</span>
                        </div>
                    ) : imports.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No imports found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">File Name</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Collection</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Rows</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Error Rows</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Errors by Column</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                {imports.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-all duration-200">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-4 w-4 text-blue-500" />
                                                <span className="text-sm text-gray-900">{item.fileName || 'Unnamed File'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-900">{item.collection_name}</td>
                                        <td className="py-4 px-6">
                        <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                item.status === 'Complete'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}
                        >
                          {item.status || 'Unknown'}
                        </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-900">{item.totalRecords.toLocaleString()}</td>
                                        <td className="py-4 px-6 text-sm text-gray-900">{item.errorRecords.toLocaleString()}</td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-wrap gap-2">
                                                {item.errorCountbyColumn.map((err, i) => (
                                                    <span
                                                        key={i}
                                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                                                    >
                              {err._id}: {err.count}
                            </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-900">
                                            {item.created_date ? new Date(item.created_date).toLocaleString() : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
