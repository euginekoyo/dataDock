import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const RoleManagement = () => {
    const { user, loading } = useAuth();
    const [roles, setRoles] = useState([]);
    const [newRole, setNewRole] = useState({ name: '', permissions: [] });
    const [permissionsList, setPermissionsList] = useState([
        'view_dashboard',
        'manage_users',
        'view_templates',
        'manage_templates',
        'view_libraries',
        'manage_libraries',
        'custom_permission',
    ]);
    const [newPermission, setNewPermission] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (loading || !user) return;

        const fetchRoles = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/api/roles', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setRoles(data || []);
                } else {
                    setError('Failed to fetch roles');
                }
            } catch (error) {
                console.error(error);
                setError('An error occurred while fetching roles');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRoles();
    }, [user, loading]);

    const handleCreateRole = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/roles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(newRole),
            });

            if (response.ok) {
                const createdRole = await response.json();
                setRoles(prev => [...prev, createdRole]);
                setNewRole({ name: '', permissions: [] });
            } else {
                const data = await response.json();
                setError(data.message || 'Failed to create role');
            }
        } catch (error) {
            console.error(error);
            setError('An error occurred while creating the role');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateRole = async (id, updates) => {
        try {
            const response = await fetch(`/api/roles/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(updates),
            });
            if (response.ok) {
                setRoles(prev => prev.map(role =>
                    role._id === id ? { ...role, ...updates } : role
                ));
            } else {
                setError('Failed to update role');
            }
        } catch (error) {
            console.error(error);
            setError('An error occurred while updating the role');
        }
    };

    const handleDeleteRole = async (id) => {
        if (!window.confirm('Are you sure you want to delete this role?')) {
            return;
        }

        try {
            const response = await fetch(`/api/roles/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (response.ok) {
                setRoles(roles.filter((role) => role._id !== id));
            } else {
                setError('Failed to delete role');
            }
        } catch (error) {
            console.error(error);
            setError('An error occurred while deleting the role');
        }
    };

    const handleAddPermission = (roleId) => {
        if (newPermission && !permissionsList.includes(newPermission)) {
            setPermissionsList(prev => [...prev, newPermission]);
            setNewPermission('');
            if (roleId) {
                const role = roles.find(r => r._id === roleId);
                if (role) {
                    handleUpdateRole(roleId, {
                        permissions: [...role.permissions, newPermission],
                    });
                }
            }
        }
    };

    const togglePermission = (roleId, permission) => {
        const role = roles.find(r => r._id === roleId);
        if (role) {
            const updatedPermissions = role.permissions.includes(permission)
                ? role.permissions.filter(p => p !== permission)
                : [...role.permissions, permission];
            handleUpdateRole(roleId, { permissions: updatedPermissions });
        }
    };

    if (loading || !user) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
                    <div className="h-64 bg-gray-300 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Role Management</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage roles and their permissions</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
                    <span>{error}</span>
                    <button
                        onClick={() => setError('')}
                        className="text-red-500 hover:text-red-700 text-xl font-bold"
                    >
                        &times;
                    </button>
                </div>
            )}

            <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg mb-8 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Role</h2>
                </div>
                <form onSubmit={handleCreateRole} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Role Name
                            </label>
                            <input
                                type="text"
                                placeholder="Enter role name"
                                value={newRole.name}
                                onChange={(e) => setNewRole({ ...newRole, name: e.target.value.toUpperCase() })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Permissions
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {permissionsList.map((permission) => (
                                    <label key={permission} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={newRole.permissions.includes(permission)}
                                            onChange={() => {
                                                setNewRole(prev => ({
                                                    ...prev,
                                                    permissions: prev.permissions.includes(permission)
                                                        ? prev.permissions.filter(p => p !== permission)
                                                        : [...prev.permissions, permission],
                                                }));
                                            }}
                                            className="mr-2"
                                            disabled={isLoading}
                                        />
                                        {permission}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Add New Permission
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter new permission"
                                value={newPermission}
                                onChange={(e) => setNewPermission(e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => handleAddPermission()}
                                className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoading || !newPermission}
                            >
                                Add Permission
                            </button>
                        </div>
                    </div>
                    <div className="mt-6">
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating...' : 'Create Role'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Roles ({roles.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Role Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Permissions
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {roles.length === 0 ? (
                            <tr>
                                <td colSpan="3" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                    No roles found. Create your first role above.
                                </td>
                            </tr>
                        ) : (
                            roles.map((role) => (
                                <tr key={role._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                                        {role.name}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {permissionsList.map((permission) => (
                                                <label key={permission} className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={role.permissions.includes(permission)}
                                                        onChange={() => togglePermission(role._id, permission)}
                                                        className="mr-2"
                                                    />
                                                    {permission}
                                                </label>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleDeleteRole(role._id)}
                                            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg shadow-md hover:shadow-lg"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RoleManagement;