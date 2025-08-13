import React, {useEffect, useState} from 'react';
import {AlertCircle, CheckCircle, Key, Plus, Settings, Shield, Trash2, X} from 'lucide-react';
import {useAuth} from '../context/AuthContext';

const RoleManagement = () => {
    const { user, loading } = useAuth();
    const [roles, setRoles] = useState([]);
    const [newRole, setNewRole] = useState({ name: '', permissions: [] });
    const [permissionsList, setPermissionsList] = useState([
        'view_dashboard',
        'manage_users',
        'view_templates',
        'manage_templates',
        'custom_permission',
        'Pending_Jobs', 'Collaboration_Settings', 'Create_Jobs'
    ]);
    const [newPermission, setNewPermission] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);

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
        setSuccess('');
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
                setSuccess('Role created successfully!');
                setShowCreateForm(false);
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
                setSuccess('Role updated successfully!');
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
                setSuccess('Role deleted successfully!');
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

    const formatPermissionName = (permission) => {
        return permission
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
                <div className="max-w-5xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gradient-to-r from-blue-200 to-blue-300 rounded-xl w-1/4 mb-6"></div>
                        <div className="h-64 bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
            <div className="p-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-blue-600 rounded-lg">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                            Role Management
                        </h1>
                    </div>
                    <p className="text-gray-600 text-sm">Manage roles and their permissions with precision</p>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-700 text-sm font-medium">{error}</span>
                        </div>
                        <button
                            onClick={() => setError('')}
                            className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-100 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-green-700 text-sm font-medium">{success}</span>
                        </div>
                        <button
                            onClick={() => setSuccess('')}
                            className="text-green-500 hover:text-green-700 p-1 rounded-md hover:bg-green-100 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Create Role Section */}
                <div className="mb-6">
                    {!showCreateForm ? (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 transform hover:scale-105"
                        >
                            <Plus className="w-4 h-4" />
                            Create New Role
                        </button>
                    ) : (
                        <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden">
                            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Plus className="w-5 h-5" />
                                        Create New Role
                                    </h2>
                                    <button
                                        onClick={() => setShowCreateForm(false)}
                                        className="text-white hover:bg-blue-500 p-1 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleCreateRole} className="p-6">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1">
                                            <Settings className="w-3 h-3 text-blue-600" />
                                            Role Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter role name (e.g., ADMIN, MANAGER)"
                                            value={newRole.name}
                                            onChange={(e) => setNewRole({ ...newRole, name: e.target.value.toUpperCase() })}
                                            className="w-full p-3 border-2 border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-blue-50/30"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1">
                                            <Key className="w-3 h-3 text-blue-600" />
                                            Permissions
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {permissionsList.map((permission) => (
                                                <label key={permission} className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
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
                                                        className="w-3 h-3 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                        disabled={isLoading}
                                                    />
                                                    <span className="text-xs font-medium text-gray-700">
                                                        {formatPermissionName(permission)}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-gray-700">
                                            Add New Permission
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Enter new permission (e.g., manage_reports)"
                                                value={newPermission}
                                                onChange={(e) => setNewPermission(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                                                className="flex-1 p-3 border-2 border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-blue-50/30"
                                                disabled={isLoading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleAddPermission()}
                                                className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                                                disabled={isLoading || !newPermission}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <button
                                        type="submit"
                                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Creating...' : 'Create Role'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-6 rounded-lg transition-all duration-300"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* Roles Table */}
                <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Roles ({roles.length})
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-blue-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">
                                    Role Name
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">
                                    Permissions
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-100">
                            {roles.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Shield className="w-12 h-12 text-blue-300" />
                                            <div>
                                                <p className="text-lg font-semibold text-gray-500 mb-1">No roles found</p>
                                                <p className="text-gray-400 text-sm">Create your first role above.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                roles.map((role) => (
                                    <tr key={role._id} className="hover:bg-blue-50 transition-colors duration-200">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                                    <Shield className="w-4 h-4 text-white" />
                                                </div>
                                                <span className="text-gray-900 font-bold text-sm">{role.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-w-3xl">
                                                {permissionsList.map((permission) => (
                                                    <label key={permission} className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={role.permissions.includes(permission)}
                                                            onChange={() => togglePermission(role._id, permission)}
                                                            className="w-3 h-3 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                        />
                                                        <span className="text-xs font-medium text-gray-700">
                                                            {formatPermissionName(permission)}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => handleDeleteRole(role._id)}
                                                className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 font-medium flex items-center gap-1 transform hover:scale-105"
                                            >
                                                <Trash2 className="w-3 h-3" />
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
        </div>
    );
};

export default RoleManagement;