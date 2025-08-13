import { useState, useEffect } from 'react';
import { TrashIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import SuccessModal from '../common/SuccessModal';
import { useAuth } from '../../context/AuthContext'; // Adjust the import path

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

  const { user, loading } = useAuth(); // Access authenticated user and loading state

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
          setSelectedRole(data[0].name); // Set default selected role
        }
      } else {
        setError('Failed to fetch roles');
      }
    } catch (error) {
      console.error(error);
      setError('An error occurred while fetching roles');
      setRoles([{ name: 'USER', permissions: [] }]); // Fallback role
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
    if (collaborators.includes(selectedRole)) {
      setAlreadyPresentError(true);
      return;
    }
    setCollaborators([...collaborators, selectedRole]);
    setSelectedRole(''); // Reset the selection
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
          collaborators, // Contains roles
        })
        .then((response) => {
          setVisible(true);
        })
        .catch((error) => console.log(error));
  };

  const acknowledgeModal = () => {
    setVisible(false);
    setOrgName('');
    setWorkspaceName('');
    setCollaborators([]);
  };

  const handleDelete = (value) => {
    const newCollaborators = collaborators.filter((item) => item !== value);
    setCollaborators(newCollaborators);
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Collaborate
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage your organization and workspace collaborators
                </p>
              </div>
              <button
                  onClick={handleClick}
                  className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg"
              >
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {isVisible && (
              <SuccessModal
                  submit={acknowledgeModal}
                  message={'Successfully added the workspace!'}
              />
          )}

          {/* Form Section */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
            <form className="space-y-6">
              {/* Organization Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Create a Branch <span className="text-red-500">*</span>
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    The Branch Name to identify your Branch
                  </p>
                </div>
                <div className="space-y-2">
                  {!orgName && (
                      <div className="flex items-center space-x-2 text-sm text-red-500">
                        <InformationCircleIcon className="h-4 w-4" />
                        <span>This field is required</span>
                      </div>
                  )}
                  <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-0 bg-white/50 dark:bg-gray-700/50 ${
                          !orgName
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-200 focus:border-blue-500 dark:border-gray-600 dark:focus:border-blue-400'
                      } text-gray-900 dark:text-white placeholder-gray-400`}
                      placeholder="Enter Organization Name Here..."
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Create a Workspace <span className="text-red-500">*</span>
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    The Workspace Name to identify your workspace
                  </p>
                </div>
                <div className="space-y-2">
                  {!workspaceName && (
                      <div className="flex items-center space-x-2 text-sm text-red-500">
                        <InformationCircleIcon className="h-4 w-4" />
                        <span>This field is required</span>
                      </div>
                  )}
                  <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-0 bg-white/50 dark:bg-gray-700/50 ${
                          !workspaceName
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-200 focus:border-blue-500 dark:border-gray-600 dark:focus:border-blue-400'
                      } text-gray-900 dark:text-white placeholder-gray-400`}
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

              <hr className="my-6 border-gray-200 dark:border-gray-700" />

              {/* Collaborators */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Add Collaborators <span className="text-red-500">*</span>
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Select roles to add as collaborators to your workspace
                  </p>
                </div>
                <div className="space-y-2">
                  {collaborators.length < 1 && (
                      <div className="flex items-center space-x-2 text-sm text-red-500">
                        <InformationCircleIcon className="h-4 w-4" />
                        <span>Please add at least one role</span>
                      </div>
                  )}
                  {alreadyPresentError && (
                      <div className="flex items-center space-x-2 text-sm text-red-500">
                        <InformationCircleIcon className="h-4 w-4" />
                        <span>This role is already a collaborator</span>
                      </div>
                  )}
                  {error && (
                      <div className="flex items-center space-x-2 text-sm text-red-500">
                        <InformationCircleIcon className="h-4 w-4" />
                        <span>{error}</span>
                      </div>
                  )}
                  <div className="flex gap-4">
                    <select
                        value={selectedRole}
                        onChange={(e) => {
                          setAlreadyPresentError(false);
                          setWarning(false);
                          setSelectedRole(e.target.value);
                        }}
                        className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-0 bg-white/50 dark:bg-gray-700/50 ${
                            alreadyPresentError || error
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-blue-500 dark:border-gray-600 dark:focus:border-blue-400'
                        } text-gray-900 dark:text-white`}
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
                        className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg"
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
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl mt-6">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Missing Required Fields
                    </h3>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                      Please fill all the required fields to proceed.
                    </p>
                  </div>
                </div>
              </div>
          )}

          {/* Collaborators List */}
          <div className="mt-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Collaborators
            </h1>
            <ul className="space-y-3">
              {collaborators.length === 0 && (
                  <li className="text-gray-500 dark:text-gray-400 text-sm">
                    No Collaborators Added
                  </li>
              )}
              {collaborators.map((role, index) => (
                  <li
                      key={index}
                      className="flex justify-between items-center text-gray-900 dark:text-gray-200 text-sm"
                  >
                    <span>{role}</span>
                    <button
                        className="inline-flex items-center px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                        onClick={() => handleDelete(role)}
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Remove
                    </button>
                  </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
  );
};

export default CollaborateComponent;