import React, {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/router';
import {useAuth} from '../../context/AuthContext';
import {hasPermission} from '../../lib/roles';
import {AlertTriangle, CheckCircle, Database, FileText, User, TrendingUp, RefreshCw, Search, Filter, BarChart3, Activity, Clock, Eye} from 'lucide-react';
import axios from 'axios';
import Link from "next/link";

const SuperAdminDashboard = () => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [imports, setImports] = useState([]);
    const [userActivity, setUserActivity] = useState([]);
    const [error, setError] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [selectedRole, setSelectedRole] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const fetchData = useCallback(async () => {
        setLoadingData(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const [importsResponse, activityResponse, usersResponse] = await Promise.all([
                axios.get('/api/imports', {
                    headers: {Authorization: `Bearer ${token}`},
                }),
                axios.get('/api/userActivity', {
                    headers: {Authorization: `Bearer ${token}`},
                }),
                axios.get('/api/users', {
                    headers: {Authorization: `Bearer ${token}`},
                }),
            ]);

            // Filter imports by role
            let filteredImports = Array.isArray(importsResponse.data) ? importsResponse.data : [];
            if (selectedRole !== 'ALL') {
                filteredImports = filteredImports.filter(imp =>
                        imp.collaborators && imp.collaborators.some(role =>
                            role.toUpperCase() === selectedRole.toUpperCase()
                        )
                );
            }

            // Filter user activity by role
            const userRoleMap = new Map(usersResponse.data.map(u => [u._id.toString(), u.role]));
            let filteredActivity = Array.isArray(activityResponse.data.data) ? activityResponse.data.data : [];
            if (selectedRole !== 'ALL') {
                filteredActivity = filteredActivity.filter(activity =>
                    userRoleMap.get(activity.userId.toString())?.toUpperCase() === selectedRole.toUpperCase()
                );
            }

            setImports(filteredImports);
            setUserActivity(filteredActivity);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoadingData(false);
        }
    }, [selectedRole]);

    useEffect(() => {
        if (loading) return;
        if (!user || !hasPermission(user.role, 'view_dashboard')) {
            router.push('/login');
            return;
        }
        fetchData();
    }, [user, loading, router, fetchData, selectedRole]);

    const stats = React.useMemo(() => {
        if (!Array.isArray(imports) || imports.length === 0) {
            return {total: 0, completed: 0, processing: 0, failed: 0, totalRows: 0, totalErrors: 0, activeUsers: 0, totalActions: 0};
        }
        const total = imports.length;
        const completed = imports.filter(item => item.status === 'Complete').length;
        const processing = imports.filter(item => item.status === 'Processing').length;
        const failed = imports.filter(item => item.status === 'Failed' || item.status === 'Incomplete').length;
        const totalRows = imports.reduce((sum, item) => sum + (item.totalRecords || 0), 0);
        const totalErrors = imports.reduce((sum, item) => sum + (item.errorRecords || 0), 0);
        const activeUsers = new Set(userActivity.map(a => a.userName)).size;
        const totalActions = userActivity.reduce((sum, item) => sum + (item.actionCount || 0), 0);

        return {total, completed, processing, failed, totalRows, totalErrors, activeUsers, totalActions};
    }, [imports, userActivity]);

    const handleRefresh = () => {
        fetchData();
    };

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const StatCard = ({icon: Icon, value, label, trend, colorClass, bgClass, delay = 0}) => (
        <div
            className={`group relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500 hover:-translate-y-2 transform opacity-0 animate-[fadeInUp_0.6s_ease-out_forwards]`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className={`absolute inset-0 ${bgClass} opacity-0 group-hover:opacity-10 transition-all duration-500`}></div>
            <div className="relative">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 ${bgClass} ${colorClass} rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    {trend && (
                        <div className="flex items-center text-xs">
                            <TrendingUp className="h-3 w-3 text-green-500 mr-1 animate-pulse" />
                            <span className="text-green-600 font-medium">{trend}</span>
                        </div>
                    )}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1 transition-all duration-300 group-hover:scale-105">{value}</div>
                <div className="text-sm text-gray-500 font-medium">{label}</div>
            </div>
        </div>
    );

    const ProgressBar = ({progress, status}) => {
        const getProgressColor = () => {
            if (status === 'Failed' || status === 'Incomplete') return 'bg-gradient-to-r from-red-400 to-red-600';
            if (status === 'Processing') return 'bg-gradient-to-r from-yellow-400 to-orange-500';
            return 'bg-gradient-to-r from-green-400 to-green-600';
        };

        return (
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                    className={`h-3 rounded-full transition-all duration-1000 ease-out ${getProgressColor()} relative overflow-hidden`}
                    style={{width: `${progress}%`}}
                >
                    <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
                </div>
            </div>
        );
    };

    const LoadingCard = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded mb-2"></div>
            <div className="w-32 h-4 bg-gray-200 rounded"></div>
        </div>
    );

    const SkeletonTable = () => (
        <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-100 rounded-lg"></div>
            {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-50 rounded-lg"></div>
            ))}
        </div>
    );

    if (loading || !user) return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading dashboard...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative p-6 max-w-7xl mx-auto">
                {/* Error Alert with slide-in animation */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between shadow-md transform animate-[slideDown_0.3s_ease-out]">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse"/>
                            <span className="text-sm text-red-700 font-medium">{error}</span>
                        </div>
                        <button
                            onClick={() => setError('')}
                            className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-100 transition-all duration-200 hover:scale-110"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Header with enhanced animations */}
                <div className="mb-8 opacity-0 animate-[fadeInDown_0.6s_ease-out_forwards]">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2 bg-blue-600 bg-clip-text text-transparent">
                                Dashboard
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search imports, users..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                                />
                            </div>

                            {/* Role Filter */}
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md appearance-none"
                                >
                                    <option value="ALL">All Roles</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="MODERATOR">Moderator</option>
                                    <option value="USER">User</option>
                                </select>
                            </div>

                            {/* Refresh Button */}
                            <button
                                onClick={handleRefresh}
                                disabled={loadingData}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md disabled:opacity-50"
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>

                            <a
                                href="/imports"
                                className="inline-flex items-center px-4 py-2 rounded-xl font-medium text-white bg-blue-600 border border-purple-100 hover:bg-purple-100 hover:border-purple-200 transition-all duration-200 hover:scale-105 shadow-sm"
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                View All Imports
                            </a>
                        </div>
                    </div>
                </div>

                {/* Enhanced Stats Grid with staggered animations */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                    {loadingData ? (
                        [...Array(4)].map((_, i) => <LoadingCard key={i} />)
                    ) : (
                        <>
                            <StatCard
                                icon={FileText}
                                value={stats.total.toLocaleString()}
                                label="Total Imports"
                                colorClass="text-blue-600"
                                bgClass="bg-blue-100"
                                delay={0}
                            />
                            <StatCard
                                icon={CheckCircle}
                                value={stats.completed.toLocaleString()}
                                label="Completed"
                                colorClass="text-green-600"
                                bgClass="bg-green-100"
                                delay={100}
                            />
                            <StatCard
                                icon={Database}
                                value={stats.totalRows.toLocaleString()}
                                label="Total Rows Processed"
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

                {/* User Activity Section with enhanced styling */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 opacity-0 animate-[fadeInUp_0.6s_ease-out_0.4s_forwards]">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <User className="h-5 w-5 text-blue-600"/>
                            </div>
                            User Activity ({selectedRole})
                        </h2>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Last updated: {new Date().toLocaleTimeString()}
                        </div>
                    </div>

                    {loadingData ? (
                        <SkeletonTable />
                    ) : userActivity.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <User className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 text-lg mb-2">No user activity found for {selectedRole} role</p>
                            <a
                                href="/imports"
                                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                            >
                                Start an import to log activity →
                            </a>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Collection</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Activity</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tasks</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {userActivity.map((activity, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-all duration-200 group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                                    <User className="h-4 w-4 text-blue-600"/>
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{activity.userName || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-700">{activity.collection_name}</td>
                                        <td className="py-4 px-6 text-sm text-gray-700">
                                            {new Date(activity.lastActivity).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {activity.action}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm font-semibold text-gray-900">{activity.actionCount}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Imports Progress Section with enhanced visuals */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 p-6 opacity-0 animate-[fadeInUp_0.6s_ease-out_0.6s_forwards]">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Database className="h-5 w-5 text-green-600"/>
                            </div>
                            Imports Progress ({selectedRole})
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                {stats.totalErrors > 0 && (
                                    <span className="text-red-600 font-medium">
                                        {stats.totalErrors.toLocaleString()} errors detected
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {loadingData ? (
                        <SkeletonTable />
                    ) : imports.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Database className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 text-lg mb-2">No imports found for {selectedRole} role</p>
                            <a
                                href="/imports"
                                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                            >
                                Start a new import →
                            </a>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">File</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Records</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Errors</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {imports.map((item, idx) => {
                                    const progress = item.totalRecords > 0
                                        ? Math.round((item.validRecords / item.totalRecords) * 100)
                                        : 0;

                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 transition-all duration-200 group">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                                        <FileText className="h-4 w-4 text-blue-600"/>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{item.fileName || 'Unnamed File'}</div>
                                                        <div className="text-xs text-gray-500">{item.collection_name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                                    item.status === 'Complete'
                                                        ? 'bg-green-100 text-green-800'
                                                        : item.status === 'Processing'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {item.status || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1">
                                                        <ProgressBar progress={progress} status={item.status} />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900 min-w-[3rem]">{progress}%</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-sm font-medium text-gray-900">{item.totalRecords?.toLocaleString() || 0}</td>
                                            <td className="py-4 px-6">
                                                <span className={`text-sm font-medium ${item.errorRecords > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {item.errorRecords?.toLocaleString() || 0}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-700">{item.orgName || 'N/A'}</td>
                                            <td className="py-4 px-6 text-sm text-gray-500">
                                                {item.created_date ? new Date(item.created_date).toLocaleDateString() : 'N/A'}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes fadeInDown {
                    from {
                        opacity: 0;
                        transform: translateY(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }

                .animate-blob {
                    animation: blob 7s infinite;
                }

                .animation-delay-2000 {
                    animation-delay: 2s;
                }

                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </div>
    );
};

export default SuperAdminDashboard;