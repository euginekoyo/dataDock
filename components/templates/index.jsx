import Link from 'next/link';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

const MainBar = () => {
    const [templates, setTemplates] = useState([]);
    const [templateId, setTemplateId] = useState(null);

    useEffect(() => {
        axios
            .get('/api/templates')
            .then((res) => {
                setTemplates(
                    res.data.filter(
                        (el) =>
                            el['template_name'] && el['template_name'].split('.').length === 1
                    )
                );
            })
            .catch((e) => console.log(e));
    }, []);

    const handleDelete = (tId) => {
        axios
            .delete(`/api/templates?template_id=${tId}`)
            .then(() => {
                axios.get('/api/templates').then((res) => {
                    setTemplates(
                        res.data.filter((el) => el['template_name'])
                    );
                });
                setTemplateId(null);
                window.confirmDeleteModal.close();
            })
            .catch((e) => console.log(e));
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Delete Confirmation Modal */}
            <dialog id="confirmDeleteModal" className="modal modal-bottom sm:modal-middle">
                <div className="modal-box bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <form method="dialog">
                        <button
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                            data-dismiss="modal"
                        >
                            <XMarkIcon className="h-3 w-3 text-gray-500" />
                        </button>
                        <h3 className="text-sm font-semibold text-gray-800">Delete Template</h3>
                        <p className="py-2 text-xs text-gray-500">
                            Are you sure you want to delete this template? This action cannot be undone.
                        </p>
                        <div className="modal-action flex justify-end space-x-2">
                            <button
                                className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-200 transition-all duration-200"
                                type="button"
                            >
                                Cancel
                            </button>
                            <button
                                className="inline-flex items-center px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-all duration-200"
                                onClick={() => handleDelete(templateId)}
                            >
                                Delete
                            </button>
                        </div>
                    </form>
                </div>
            </dialog>

            {/* Header Section */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-semibold text-gray-800">Templates</h1>
                            <p className="text-xs text-gray-500">Manage your template configurations</p>
                        </div>
                        <Link href="/templatecreate">
                            <button
                                type="button"
                                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-all duration-200 hover:shadow-sm"
                            >
                                <PlusIcon className="h-3 w-3 mr-1" />
                                Create Template
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="w-full mx-auto px-4 py-6">
                {templates && templates.length > 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                            <tr>
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
                            {templates.map((obj, idx) => (
                                <tr
                                    key={idx}
                                    className="hover:bg-gray-50 transition-colors duration-200"
                                >
                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                                        {obj._id}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <Link href={`/templates/${obj._id}`}>
                        <span className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer transition-colors duration-200">
                          {obj.template_name}
                        </span>
                                        </Link>
                                    </td>

                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                                        {obj.created_date ? formatDate(obj.created_date) : 'N/A'}
                                    </td>

                                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2">
                                            <Link href={`/templates/testtemplate/${obj._id}`}>
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-all duration-200"
                                                >
                                                    Preview
                                                </button>
                                            </Link>
                                            <Link href={`/templates/${obj._id}`}>
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center px-3 py-1 bg-white text-gray-700 text-xs font-medium rounded-md border border-gray-200 hover:bg-gray-100 transition-all duration-200"
                                                >
                                                    View
                                                </button>
                                            </Link>
                                            <button
                                                type="button"
                                                className="p-1 rounded-full hover:bg-red-100 transition-colors"
                                                onClick={() => {
                                                    window.confirmDeleteModal.showModal();
                                                    setTemplateId(obj._id);
                                                }}
                                            >
                                                <TrashIcon className="h-3 w-3 text-red-500 hover:text-red-600" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <div className="mx-auto h-8 w-8 text-gray-400 mb-2">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-sm font-medium text-gray-600 mb-1">
                            No templates yet
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">
                            Get started by creating your first template
                        </p>
                        <Link href="/templatecreate">
                            <button className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-all duration-200">
                                <PlusIcon className="h-3 w-3 mr-1" />
                                Create Template
                            </button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MainBar;