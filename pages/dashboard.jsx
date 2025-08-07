import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import UserManagement from '../components/UserManagement';
import RoleManagement from '../components/RoleManagement';
import { hasPermission } from '../lib/roles';
import Layout from '../layouts/Layout';

export default function Dashboard() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [permissions, setPermissions] = useState([]);
    const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);

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
                const perms = await hasPermission(user.role);
                console.log('Dashboard permissions:', perms);
                setPermissions(perms);
                setIsCheckingPermissions(false);
            };
            checkPermissions();
        } else {
            console.log('Dashboard: No user, skipping permission check');
            setPermissions([]);
            setIsCheckingPermissions(false);
        }
    }, [user]);

    if (loading || !user || isCheckingPermissions) {
        return (
            <Layout>
                <div className="p-6">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
                        <div className="h-64 bg-gray-300 rounded"></div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="p-6 max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Welcome, {user.name}
                </h1>
                {permissions.includes('manage_users') ? (
                    <div className="mt-6">
                        <h2 className="text-xl font-semibold mb-4">User Management</h2>
                        <UserManagement />
                    </div>
                ) : (
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        You do not have permission to manage users.
                    </p>
                )}
                {permissions.includes('manage_roles') && (
                    <div className="mt-6">
                        <h2 className="text-xl font-semibold mb-4">Role Management</h2>
                        <RoleManagement />
                    </div>
                )}
                {!permissions.includes('manage_users') && !permissions.includes('manage_roles') && (
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        You have access to the dashboard.
                    </p>
                )}
            </div>
        </Layout>
    );
}