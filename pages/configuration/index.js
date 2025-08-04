import axios from 'axios';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Layout from '../../layouts/Layout';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

const Configuration = () => {
  const [configList, setConfigList] = useState([]);
  const [templateId, setTemplateId] = useState();

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
        .then((res) => {
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
                <button className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" data-dismiss="modal">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {configList && configList.length > 0 ? (
                  configList.map((obj, idx) => (
                      <div
                          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-gray-200/50 dark:border-gray-700/50"
                          key={idx}
                      >
                        <div className="flex justify-between items-center mb-4">
                          <Link href={`/configuration/${obj._id}`}>
                            <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                              {obj.name}
                            </h2>
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
                        <div className="flex space-x-2">
                          <Link href={`/configuration/testconfig/${obj._id}`}>
                            <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg">
                              Preview
                            </button>
                          </Link>
                          <Link href={`/configuration/${obj._id}`}>
                            <button className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 font-medium rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200">
                              View
                            </button>
                          </Link>
                        </div>
                      </div>
                  ))
              ) : (
                  <div className="col-span-full text-center text-gray-500 dark:text-gray-400">
                    No configurations available
                  </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
  );
};

export default Configuration;