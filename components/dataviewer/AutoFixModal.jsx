import { Transition, Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { Fragment, useContext } from 'react';
import { ImMagicWand } from 'react-icons/im';
import { Context } from '../../context';

const AutoFixModal = ({ isOpen, closeModal, columnDefs, runAutofix, autofixValues }) => {
  const { state } = useContext(Context);

  const templateColumnNames = state?.curSaasLoadMapperTemplate || [];
  const columnNames = Array.isArray(columnDefs)
      ? columnDefs.map((column) => column.headerName)
      : [];
  const finalColumns = Array.isArray(templateColumnNames)
      ? Array.from(new Set(templateColumnNames.map((e) => e.label)))
      : [];

  return (
      <>
        <style jsx global>{`
        .modal-scroll-container {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }

        .modal-scroll-container::-webkit-scrollbar {
          display: none; /* Chrome, Safari, and other Webkit browsers */
        }

        /* Enhance table styling for consistency */
        .autofix-table {
          border-collapse: separate;
          border-spacing: 0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .autofix-table thead {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .autofix-table th {
          font-weight: 600;
          color: #374151;
          text-transform: none;
          letter-spacing: 0.5px;
        }

        .autofix-table tbody {
          background: #ffffff;
        }

        .autofix-table tr:hover {
          background: #f8fafc;
        }

        .autofix-table td {
          border-top: 1px solid #e5e7eb;
          vertical-align: middle;
        }

        .autofix-table button {
          transition: all 0.2s ease;
        }

        .autofix-table button:hover {
          background-color: #e3f2fd;
          border-color: #2563eb;
          color: #2563eb;
          transform: translateY(-1px);
        }

        /* Improve modal panel styling */
        .modal-panel {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        /* Close button hover effect */
        .close-button:hover {
          background-color: #e5e7eb !important;
        }

        /* Dark mode adjustments */
        .dark .autofix-table {
          border: 1px solid #374151;
        }

        .dark .autofix-table thead {
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
        }

        .dark .autofix-table th {
          color: #e5e7eb;
        }

        .dark .autofix-table tbody {
          background: #1f2937;
        }

        .dark .autofix-table tr:hover {
          background: #374151;
        }

        .dark .autofix-table td {
          border-top: 1px solid #4b5563;
          color: #d1d5db;
        }

        .dark .autofix-table button {
          border-color: #60a5fa;
          color: #60a5fa;
        }

        .dark .autofix-table button:hover {
          background-color: #1e40af;
          border-color: #3b82f6;
          color: #bfdbfe;
        }
      `}</style>

        <Transition appear show={isOpen} onClose={closeModal}>
          <Dialog as="div" className="relative z-50" onClose={closeModal}>
            <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>
            <div className="fixed inset-0 modal-scroll-container">
              <div className="flex min-h-fit justify-center p-4 text-center">
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-5xl transform rounded-md bg-white p-6 text-left align-middle transition-all dark:bg-gray-900 dark:border-2 dark:border-white modal-panel">
                    <Dialog.Title
                        as="h2"
                        className="text-lg flex items-center font-medium leading-6 text-gray-900 dark:text-white"
                    >
                      Auto Fix Columns
                      <button
                          type="button"
                          className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white close-button"
                          data-modal-toggle="defaultModal"
                          onClick={closeModal}
                      >
                        <XMarkIcon className="h-6" />
                        <span className="sr-only">Close modal</span>
                      </button>
                    </Dialog.Title>
                    <div className="mt-4">
                      <table className="min-w-full autofix-table">
                        <thead>
                        <tr>
                          <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          >
                            Preview
                          </th>
                          <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          >
                            AutoFix
                          </th>
                          <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          >
                            Action
                          </th>
                        </tr>
                        </thead>
                        <tbody>
                        {autofixValues?.length > 0 ? (
                            finalColumns.map((item, _idx) => {
                              if (
                                  Array.isArray(autofixValues) &&
                                  autofixValues.filter((e) => e.field === item).length > 0
                              ) {
                                return (
                                    <tr key={_idx}>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <p className="text-sm text-gray-900 dark:text-gray-200">{item}</p>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <p className="text-sm text-gray-900 dark:text-gray-200">
                                          {Array.isArray(autofixValues) &&
                                              autofixValues.map((e, i) => {
                                                if (item === e.field) {
                                                  return (
                                                      <div className="flex gap-3" key={i}>
                                                        <span>{e.oldValue}</span>
                                                        <span className="text-red-500 dark:text-red-400">|</span>
                                                        <span>{e.newValue}</span>
                                                      </div>
                                                  );
                                                }
                                                return null;
                                              })}
                                        </p>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button
                                            className="px-3 py-1 flex items-center gap-2 border border-blue-500 hover:border-blue-600 text-blue-500 rounded-md dark:border-blue-400 dark:text-blue-400 dark:hover:border-blue-300 dark:hover:text-blue-300"
                                            onClick={() => {
                                              closeModal();
                                              runAutofix(item);
                                            }}
                                        >
                                          <ImMagicWand />
                                          AutoFix
                                        </button>
                                      </td>
                                    </tr>
                                );
                              }
                              return null;
                            })
                        ) : (
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap"></td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <p className="text-sm text-gray-900 dark:text-gray-200">No Autofix Suggestions</p>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap"></td>
                            </tr>
                        )}
                        </tbody>
                      </table>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </>
  );
};

export default AutoFixModal;