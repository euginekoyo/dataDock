import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Activity, Plus, Trash2, Search, Filter, X, CheckCircle, AlertCircle } from 'lucide-react';
import { hashPassword } from '../lib/auth';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
    const { user, loading } = useAuth();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        role: '',
        status: 'active',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    useEffect(() => {
        if (loading || !user) return;

        const fetchUsers = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`${baseUrl}/api/users`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setUsers(data || []);
                } else {
                    setError('Failed to fetch users');
                }
            } catch (error) {
                console.error(error);
                setError('An error occurred while fetching users');
            } finally {
                setIsLoading(false);
            }
        };

        const fetchRoles = async () => {
            try {
                const response = await fetch(`${baseUrl}/api/roles`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setRoles(data || []);
                    if (data.length > 0) {
                        setNewUser(prev => ({ ...prev, role: data[0].name }));
                    }
                } else {
                    setError('Failed to fetch roles');
                }
            } catch (error) {
                console.error(error);
                setError('An error occurred while fetching roles');
                setRoles([{ name: 'USER', permissions: [] }]);
            }
        };

        fetchUsers();
        fetchRoles();
    }, [user, loading,baseUrl]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            const tempPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await hashPassword(tempPassword);
            const userData = {
                ...newUser,
                password: hashedPassword,
                createdAt: new Date(),
            };

            const response = await fetch(`${baseUrl}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(userData),
            });

            if (response.ok) {
                const createdUser = await response.json();
                try {
                    await fetch(`${baseUrl}/api/auth/send-welcome-email`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${localStorage.getItem('token')}`,
                        },
                        body: JSON.stringify({
                            user: createdUser,
                            tempLink: `${window.location.origin}/login?token=${createdUser.tempToken}`,
                        }),
                    });
                } catch (emailError) {
                    console.warn('Failed to send welcome email:', emailError);
                    setError('User created, but failed to send welcome email');
                }

                setUsers(prev => [...prev, createdUser]);
                setNewUser({
                    name: '',
                    email: '',
                    role: roles[0]?.name || '',
                    status: 'active',
                });
                setSuccess('User created successfully!');
                setShowCreateForm(false);
            } else {
                const data = await response.json();
                setError(data.message || 'Failed to create user');
            }
        } catch (error) {
            console.error(error);
            setError('An error occurred while creating the user');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            const response = await fetch(`${baseUrl}/api/users/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (response.ok) {
                setUsers(users.filter((user) => user._id !== id));
                setSuccess('User deleted successfully!');
            } else {
                setError('Failed to delete user');
            }
        } catch (error) {
            console.error(error);
            setError('An error occurred while deleting the user');
        }
    };

    const handleUpdateUser = async (id, updates) => {
        try {
            const response = await fetch(`${baseUrl}/api/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(updates),
            });
            if (response.ok) {
                setUsers(prev => prev.map(user =>
                    user._id === id ? { ...user, ...updates } : user
                ));
                setSuccess('User updated successfully!');
            } else {
                setError('Failed to update user');
            }
        } catch (error) {
            console.error(error);
            setError('An error occurred while updating the user');
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

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
                            <User className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                            User Management
                        </h1>
                    </div>
                    <p className="text-gray-600 text-sm">Manage users and their roles with ease</p>
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

                {/* Create User Section */}
                <div className="mb-6">
                    {!showCreateForm ? (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 transform hover:scale-105"
                        >
                            <Plus className="w-4 h-4" />
                            Create New User
                        </button>
                    ) : (
                        <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden">
                            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Plus className="w-5 h-5" />
                                        Create New User
                                    </h2>
                                    <button
                                        onClick={() => setShowCreateForm(false)}
                                        className="text-white hover:bg-blue-500 p-1 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleCreateUser} className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1">
                                            <User className="w-3 h-3 text-blue-600" />
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter full name"
                                            value={newUser.name}
                                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                            className="w-full p-3 border-2 border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-blue-50/30"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1">
                                            <Mail className="w-3 h-3 text-blue-600" />
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="Enter email address"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                            className="w-full p-3 border-2 border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-blue-50/30"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1">
                                            <Shield className="w-3 h-3 text-blue-600" />
                                            Role
                                        </label>
                                        <select
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                            className="w-full p-3 border-2 border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-blue-50/30"
                                            disabled={isLoading}
                                        >
                                            {roles.length > 0 ? (
                                                roles.map((role) => (
                                                    <option key={role._id} value={role.name}>
                                                        {role.name}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="">No roles available</option>
                                            )}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1">
                                            <Activity className="w-3 h-3 text-blue-600" />
                                            Status
                                        </label>
                                        <select
                                            value={newUser.status}
                                            onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
                                            className="w-full p-3 border-2 border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-blue-50/30"
                                            disabled={isLoading}
                                        >
                                            <option value="active">Active</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-6 flex gap-3">
                                    <button
                                        type="submit"
                                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Creating...' : 'Create User'}
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

                {/* Search and Filter */}
                <div className="mb-4 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-3 border-2 border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-md"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-10 pr-6 py-3 border-2 border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-md appearance-none"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Users ({filteredUsers.length})
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-blue-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <User className="w-12 h-12 text-blue-300" />
                                            <div>
                                                <p className="text-lg font-semibold text-gray-500 mb-1">No users found</p>
                                                <p className="text-gray-400 text-sm">
                                                    {users.length === 0 ? 'Create your first user above.' : 'Try adjusting your search or filters.'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-blue-50 transition-colors duration-200">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                                        <span className="text-white font-semibold text-xs">
                                                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                                        </span>
                                                </div>
                                                <span className="text-gray-900 font-semibold text-sm">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium text-sm">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={user.role || ''}
                                                onChange={(e) => handleUpdateUser(user._id, { role: e.target.value })}
                                                className="p-2 border-2 border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/50 font-medium text-sm"
                                            >
                                                {roles.length > 0 ? (
                                                    roles.map((role) => (
                                                        <option key={role._id} value={role.name}>
                                                            {role.name}
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option value="">No roles available</option>
                                                )}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={user.status || 'active'}
                                                onChange={(e) => handleUpdateUser(user._id, { status: e.target.value })}
                                                className="p-2 border-2 border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/50 font-medium text-sm"
                                            >
                                                <option value="active">Active</option>
                                                <option value="suspended">Suspended</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => handleDeleteUser(user._id)}
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

export default UserManagement;