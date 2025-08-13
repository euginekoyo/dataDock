import axios from 'axios';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Layout from '../../layouts/Layout';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

const Configuration = () => {
  const [configList, setConfigList] = useState([]);
  const [templateId, setTemplateId] = useState(null);

  useEffect(() => {
    axios
        .get('/api/importer')
        .then((res) => {
          setConfigList(res.data);
        })
        .catch((e) => console.log(e));
  }, []);

  const handleDelete = (importerId) => {
    axios
        .delete(`/api/importer/${importerId}`)
        .then(() => {
          axios.get('/api/importer').then((res) => {
            setConfigList(res.data);
          });
        })
        .catch((e) => console.log(e));
  };

  return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Importer Configuration
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Manage your importer configurations
                  </p>
                </div>
                <Link href="/configcreate">
                  <button className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add an Importer
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          <dialog id="confirmDeleteModal" className="modal modal-bottom sm:modal-middle">
            <div className="modal-box bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
              <form method="dialog">
                <button
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    data-dismiss="modal"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirm Deletion
                </h3>
                <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete this configuration?
                </p>
                <div className="modal-action flex justify-end space-x-2">
                  <button
                      className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                      data-dismiss="modal"
                  >
                    Cancel
                  </button>
                  <button
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-xl hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg"
                      onClick={() => handleDelete(templateId)}
                  >
                    Delete
                  </button>
                </div>
              </form>
            </div>
          </dialog>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-6 py-8">
            {configList && configList.length > 0 ? (
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-700/50">
                    <thead className="bg-gray-50/50 dark:bg-gray-900/50">
                    <tr>
                      <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Configuration Name
                      </th>
                      <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                    {configList.map((obj, idx) => (
                        <tr
                            key={idx}
                            className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-colors duration-200"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link href={`/configuration/${obj._id}`}>
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer transition-colors duration-200">
                            {obj.name}
                          </span>
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Link href={`/configuration/testconfig/${obj._id}`}>
                                <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-sm">
                                  Preview
                                </button>
                              </Link>
                              <Link href={`/configuration/${obj._id}`}>
                                <button className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 font-medium rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200">
                                  View
                                </button>
                              </Link>
                              <button
                                  className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                                  onClick={() => {
                                    window.confirmDeleteModal.showModal();
                                    setTemplateId(obj._id);
                                  }}
                              >
                                <TrashIcon className="h-5 w-5 text-red-500 hover:text-red-700" />
                              </button>
                            </div>
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
            ) : (
                <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    No configurations available
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Get started by creating your first configuration
                  </p>
                  <Link href="/configcreate">
                    <button className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg">
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add an Importer
                    </button>
                  </Link>
                </div>
            )}
          </div>
        </div>
      </Layout>
  );
};

export default Configuration;