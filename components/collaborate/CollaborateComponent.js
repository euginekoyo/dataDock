
import { useState, useEffect } from 'react';
import { TrashIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import SuccessModal from '../common/SuccessModal';
import { useAuth } from '../../context/AuthContext';

const CollaborateComponent = () => {
  const [orgName, setOrgName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState('');
  const [isVisible, setVisible] = useState(false);
  const [warning, setWarning] = useState(false);
  const [alreadyPresentError, setAlreadyPresentError] = useState(false);

  const { user, loading } = useAuth();

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/roles`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data || []);
        if (data.length > 0) {
          setSelectedRole(data[0].name);
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

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!selectedRole) {
      alert('Please select a valid role');
      return;
    }
    if (collaborators.some((col) => col.role === selectedRole)) {
      setAlreadyPresentError(true);
      return;
    }
    setCollaborators([...collaborators, { role: selectedRole }]);
    setSelectedRole(roles[0]?.name || '');
    setAlreadyPresentError(false);
  };

  const handleClick = (e) => {
    e.preventDefault();
    if (!orgName || !workspaceName || collaborators.length === 0) {
      setWarning(true);
      return;
    }
    axios
        .post(`${process.env.NEXT_PUBLIC_API_URL}/api/collaborate`, {
          orgName,
          workspaceName,
          collaborators: collaborators.map((col) => ({
            role: col.role,
            date: new Date().toISOString(), // Placeholder; adjust based on API response
            name: orgName, // Using orgName as placeholder for name
            organizationId: 'N/A', // Placeholder; replace with actual ID if available
            templateId: 'N/A', // Placeholder
            templateName: workspaceName, // Using workspaceName as placeholder
            workspaceId: 'N/A', // Placeholder
          })),
        })
        .then((response) => {
          setCollaborators(response.data.collaborators || collaborators); // Update with API response if available
          setVisible(true);
        })
        .catch((error) => {
          console.error(error);
          setError('Failed to submit collaboration');
        });
  };

  const acknowledgeModal = () => {
    setVisible(false);
    setOrgName('');
    setWorkspaceName('');
    setCollaborators([]);
  };

  const handleDelete = (role) => {
    setCollaborators(collaborators.filter((col) => col.role !== role));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
  };

  if (loading || !user) {
    return (
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-6 bg-blue-100 rounded-lg w-1/4 mb-4"></div>
              <div className="h-48 bg-blue-50 rounded-lg"></div>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-gray-800">Collaborate</h1>
                <p className="text-xs text-gray-500">
                  Manage your Branch and workspace collaborators
                </p>
              </div>
              <button
                  onClick={handleClick}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-all duration-200 hover:shadow-sm"
              >
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          {isVisible && (
              <SuccessModal
                  submit={acknowledgeModal}
                  message={'Successfully added the workspace!'}
              />
          )}

          {/* Form Section */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <form className="space-y-4">
              {/* Organization Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">
                    Create a Branch <span className="text-red-500">*</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    The Branch Name to identify your Branch
                  </p>
                </div>
                <div className="space-y-1">
                  {!orgName && warning && (
                      <div className="flex items-center space-x-1 text-xs text-red-500">
                        <InformationCircleIcon className="h-3 w-3" />
                        <span>This field is required</span>
                      </div>
                  )}
                  <input
                      type="text"
                      className={`w-full px-3 py-2 rounded-md border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-800 placeholder-gray-400 text-xs ${
                          !orgName && warning
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-200 focus:border-blue-500'
                      }`}
                      placeholder="Enter Branch Name Here..."
                      value={orgName}
                      onChange={(evt) => {
                        setWarning(false);
                        setOrgName(evt.target.value);
                      }}
                      required
                  />
                </div>
              </div>

              {/* Workspace Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">
                    Create a Workspace <span className="text-red-500">*</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    The Workspace Name to identify your workspace
                  </p>
                </div>
                <div className="space-y-1">
                  {!workspaceName && warning && (
                      <div className="flex items-center space-x-1 text-xs text-red-500">
                        <InformationCircleIcon className="h-3 w-3" />
                        <span>This field is required</span>
                      </div>
                  )}
                  <input
                      type="text"
                      className={`w-full px-3 py-2 rounded-md border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-800 placeholder-gray-400 text-xs ${
                          !workspaceName && warning
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-200 focus:border-blue-500'
                      }`}
                      placeholder="Enter Workspace Name Here..."
                      value={workspaceName}
                      onChange={(evt) => {
                        setWarning(false);
                        setWorkspaceName(evt.target.value);
                      }}
                      required
                  />
                </div>
              </div>

              <hr className="my-4 border-gray-200" />

              {/* Collaborators */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">
                    Add Collaborators <span className="text-red-500">*</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Select roles to add as collaborators to your workspace
                  </p>
                </div>
                <div className="space-y-1">
                  {collaborators.length < 1 && warning && (
                      <div className="flex items-center space-x-1 text-xs text-red-500">
                        <InformationCircleIcon className="h-3 w-3" />
                        <span>Please add at least one role</span>
                      </div>
                  )}
                  {alreadyPresentError && (
                      <div className="flex items-center space-x-1 text-xs text-red-500">
                        <InformationCircleIcon className="h-3 w-3" />
                        <span>This role is already a collaborator</span>
                      </div>
                  )}
                  {error && (
                      <div className="flex items-center space-x-1 text-xs text-red-500">
                        <InformationCircleIcon className="h-3 w-3" />
                        <span>{error}</span>
                      </div>
                  )}
                  <div className="flex gap-2">
                    <select
                        value={selectedRole}
                        onChange={(e) => {
                          setAlreadyPresentError(false);
                          setWarning(false);
                          setSelectedRole(e.target.value);
                        }}
                        className={`flex-1 px-3 py-2 rounded-md border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-800 text-xs ${
                            alreadyPresentError || error
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-blue-500'
                        }`}
                    >
                      <option value="">Select a Role...</option>
                      {roles.map((role) => (
                          <option key={role.name} value={role.name}>
                            {role.name}
                          </option>
                      ))}
                    </select>
                    <button
                        type="button"
                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-all duration-200 hover:shadow-sm"
                        onClick={handleAdd}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Warning Message */}
          {warning && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-md mt-4">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-4 w-4 text-red-500 mt-0.5 mr-2" />
                  <div>
                    <h3 className="text-xs font-medium text-red-800">
                      Missing Required Fields
                    </h3>
                    <p className="mt-0.5 text-xs text-red-700">
                      Please fill all the required fields to proceed.
                    </p>
                  </div>
                </div>
              </div>
          )}

          {/* Collaborators Table */}
          <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50">
              <h1 className="text-sm font-semibold text-gray-800">
                Collaborators ({collaborators.length})
              </h1>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                <tr>
                  <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    Role
                  </th>
                  <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    Organization ID
                  </th>
                  <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    Template ID
                  </th>
                  <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    Template Name
                  </th>
                  <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    Workspace ID
                  </th>
                  <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    Created Date
                  </th>
                  <th
                      scope="col"
                      className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {collaborators.length === 0 ? (
                    <tr>
                      <td
                          colSpan="8"
                          className="px-4 py-8 text-center text-xs text-gray-500"
                      >
                        No Collaborators Added
                      </td>
                    </tr>
                ) : (
                    collaborators.map((col, idx) => (
                        <tr
                            key={idx}
                            className="hover:bg-gray-50 transition-colors duration-200"
                        >
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {col.role}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {col.name || orgName || 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {col.organizationId || 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {col.templateId || 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {col.templateName || workspaceName || 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {col.workspaceId || 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {col.date ? formatDate(col.date) : 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-right">
                            <button
                                className="inline-flex items-center px-3 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-md hover:bg-red-200 transition-colors duration-200"
                                onClick={() => handleDelete(col.role)}
                            >
                              <TrashIcon className="h-3 w-3 mr-1" />
                              Remove
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

export default CollaborateComponent;
