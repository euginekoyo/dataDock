import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import UserManagement from '../components/UserManagement';
import RoleManagement from '../components/RoleManagement';
import { hasPermission } from '../lib/roles';
import Layout from '../layouts/Layout';
import {
    LayoutDashboard,
    Users,
    Shield,
    Settings,
    Activity,
    Clock,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    Sparkles
} from 'lucide-react';

export default function Dashboard() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [permissions, setPermissions] = useState([]);
    const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalRoles: 0,
        recentActivity: []
    });

    useEffect(() => {
        console.log('Dashboard user:', { user, loading });
        if (!loading && !user) {
            console.log('Dashboard: No user, redirecting to /login');
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            const checkPermissions = async () => {
                setIsCheckingPermissions(true);
                console.log('Dashboard: Fetching permissions for role', user.role);
                // Use hasPermission to check a base permission and fetch role details
                const result = await hasPermission(user.role, 'view_dashboard');
                console.log('Dashboard permissions check result:', result);
                if (result.status === 200 && result.hasPerm) {
                    // Fetch full role details to get all permissions
                    const permsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/roles/public`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                    });
                    if (permsResponse.ok) {
                        const roles = await permsResponse.json();
                        const role = roles.find(r => r.name === user.role);
                        setPermissions(role?.permissions || []);
                        console.log('Fetched permissions:', role?.permissions);
                    } else {
                        setPermissions([]);
                    }
                } else {
                    setPermissions([]); // No access or error
                }
                setIsCheckingPermissions(false);
            };
            checkPermissions().catch((error) => {
                console.error('Error checking permissions:', error);
                setPermissions([]);
                setIsCheckingPermissions(false);
            });
        } else {
            console.log('Dashboard: No user, skipping permission check');
            setPermissions([]);
            setIsCheckingPermissions(false);
        }
    }, [user]);

    // Fetch dashboard stats
    useEffect(() => {
        if (user && permissions.length > 0) {
            const fetchStats = async () => {
                try {
                    const manageUsersPerm = await hasPermission(user.role, 'manage_users');
                    const viewUsersPerm = await hasPermission(user.role, 'view_users');
                    if (manageUsersPerm.hasPerm || viewUsersPerm.hasPerm) {
                        const usersResponse = await fetch('/api/users', {
                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                        });
                        if (usersResponse.ok) {
                            const users = await usersResponse.json();
                            setStats(prev => ({
                                ...prev,
                                totalUsers: users.length,
                                activeUsers: users.filter(u => u.status === 'active').length
                            }));
                        }
                    }

                    const manageRolesPerm = await hasPermission(user.role, 'manage_roles');
                    const viewRolesPerm = await hasPermission(user.role, 'view_roles');
                    if (manageRolesPerm.hasPerm || viewRolesPerm.hasPerm) {
                        const rolesResponse = await fetch('/api/roles', {
                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                        });
                        if (rolesResponse.ok) {
                            const roles = await rolesResponse.json();
                            setStats(prev => ({
                                ...prev,
                                totalRoles: roles.length
                            }));
                        }
                    }
                } catch (error) {
                    console.error('Error fetching stats:', error);
                }
            };
            fetchStats();
        }
    }, [user, permissions]);

    if (loading || !user || isCheckingPermissions) {
        return (
            <Layout>
                <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
                    <div className="max-w-5xl mx-auto">
                        <div className="animate-pulse">
                            <div className="h-8 bg-gradient-to-r from-blue-200 to-blue-300 rounded-xl w-1/4 mb-6"></div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="h-24 bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl"></div>
                                <div className="h-24 bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl"></div>
                                <div className="h-24 bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl"></div>
                            </div>
                            <div className="h-64 bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl"></div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    const hasManageUsers = permissions.includes('manage_users');
    const hasManageRoles = permissions.includes('manage_roles');
    const hasViewAccess = permissions.includes('view_dashboard') || hasManageUsers || hasManageRoles;

    const navigationTabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, show: hasViewAccess },
        { id: 'users', label: 'User Management', icon: Users, show: hasManageUsers },
        { id: 'roles', label: 'Role Management', icon: Shield, show: hasManageRoles }
    ].filter(tab => tab.show);

    const StatCard = ({ title, value, icon: Icon, color, description }) => (
        <div className="bg-white rounded-xl shadow-md border border-blue-100 p-4 hover:shadow-lg transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${color}`}>
                    <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{value}</div>
                    <div className="text-xs text-gray-500">{description}</div>
                </div>
            </div>
            <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>
    );

    const WelcomeSection = () => {
        const currentHour = new Date().getHours();
        const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
        return (
            <div className="bg-purple-900 via-blue-700 to-blue-800 rounded-xl shadow-lg p-6 mb-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full transform -translate-x-12 translate-y-12"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <h1 className="text-xl font-bold">
                            {greeting}, {user.name}!
                        </h1>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-300" />
                            <span>Role: {user.role}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-300" />
                            <span>Last login: {new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const OverviewContent = () => (
        <div className="space-y-6">
            {/* Stats Grid */}
            {(hasManageUsers || hasManageRoles) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hasManageUsers && (
                        <>
                            <StatCard
                                title="Total Users"
                                value={stats.totalUsers}
                                icon={Users}
                                color="from-blue-500 to-blue-600"
                                description="All registered users"
                            />
                            <StatCard
                                title="Active Users"
                                value={stats.activeUsers}
                                icon={Activity}
                                color="from-green-500 to-green-600"
                                description="Currently active"
                            />
                        </>
                    )}
                    {hasManageRoles && (
                        <StatCard
                            title="Total Roles"
                            value={stats.totalRoles}
                            icon={Shield}
                            color="from-purple-500 to-purple-600"
                            description="Configured roles"
                        />
                    )}
                </div>
            )}
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-md border border-blue-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {hasManageUsers && (
                        <button
                            onClick={() => setActiveTab('users')}
                            className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-300 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg">
                                    <Users className="w-4 h-4 text-white" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-sm text-gray-900">Manage Users</h3>
                                    <p className="text-gray-600 text-xs">Create, edit, and manage user accounts</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </button>
                    )}
                    {hasManageRoles && (
                        <button
                            onClick={() => setActiveTab('roles')}
                            className="flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all duration-300 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-600 rounded-lg">
                                    <Shield className="w-4 h-4 text-white" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-sm text-gray-900">Manage Roles</h3>
                                    <p className="text-gray-600 text-xs">Configure roles and permissions</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                        </button>
                    )}
                </div>
            </div>
            {/* No Permissions Message */}
            {!hasManageUsers && !hasManageRoles && hasViewAccess && (
                <div className="bg-white rounded-xl shadow-md border border-blue-100 p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                    <h2 className="text-lg font-semibold text-gray-700 mb-1">Limited Access</h2>
                    <p className="text-gray-500 text-sm">
                        You have access to the dashboard but no management permissions at this time.
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                        Contact your administrator to request additional permissions.
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
                <div className="p-6 max-w-5xl mx-auto">
                    <WelcomeSection />
                    {/* Navigation Tabs */}
                    {navigationTabs.length > 0 && (
                        <div className="mb-6">
                            <div className="bg-white rounded-xl shadow-md border border-blue-100 p-1.5">
                                <nav className="flex space-x-1.5">
                                    {navigationTabs.map((tab) => {
                                        const Icon = tab.icon;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 text-sm ${
                                                    activeTab === tab.id
                                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                                                        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                                }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>
                        </div>
                    )}
                    {/* Content Area */}
                    <div className="space-y-6">
                        {activeTab === 'overview' && <OverviewContent />}
                        {activeTab === 'users' && hasManageUsers && (
                            <div className="animate-fadeIn">
                                <UserManagement />
                            </div>
                        )}
                        {activeTab === 'roles' && hasManageRoles && (
                            <div className="animate-fadeIn">
                                <RoleManagement />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.5s ease-out forwards;
                }
            `}</style>
        </Layout>
    );
}