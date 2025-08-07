import React, { useState, useEffect } from 'react';
import { hashPassword } from '../lib/auth';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
    const { user, loading } = useAuth();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        role: '',
        status: 'active',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
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
    }, [user, loading]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setError('');
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
            } else {
                setError('Failed to update user');
            }
        } catch (error) {
            console.error(error);
            setError('An error occurred while updating the user');
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage users and their roles</p>
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
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New User</h2>
                </div>
                <form onSubmit={handleCreateUser} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Name
                            </label>
                            <input
                                type="text"
                                placeholder="Enter full name"
                                value={newUser.name}
                                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                placeholder="Enter email address"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Role
                            </label>
                            <select
                                value={newUser.role}
                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status
                            </label>
                            <select
                                value={newUser.status}
                                onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                                disabled={isLoading}
                            >
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-6">
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Users ({users.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                    No users found. Create your first user above.
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                                        {user.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                        {user.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={user.role || ''}
                                            onChange={(e) => handleUpdateUser(user._id, { role: e.target.value })}
                                            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
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
                                            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                                        >
                                            <option value="active">Active</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleDeleteUser(user._id)}
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

export default UserManagement;