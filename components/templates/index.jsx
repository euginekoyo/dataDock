import Link from 'next/link';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

const MainBar = () => {
    const [templates, setTemplates] = useState();
    const [templateId, setTemplateId] = useState();

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
            .then((res) => {
                axios.get('/api/templates').then((res) => {
                    setTemplates(res.data.filter((el) => el['template_name']));
                });
            })
            .catch((e) => console.log(e));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* Delete Confirmation Modal */}
            <dialog
                id="confirmDeleteModal"
                className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
            >
                <form method="dialog" className="modal-box bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl">
                    <button
                        className="absolute top-4 right-4 btn btn-square btn-ghost btn-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                        data-dismiss="modal"
                    >
                        <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                    </button>

                    <div className="text-center pt-2">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                            <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Delete Template
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                            Are you sure you want to delete this template configuration? This action cannot be undone.
                        </p>
                    </div>

                    <div className="modal-action justify-center gap-3">
                        <button
                            className="btn btn-ghost px-6 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                            type="button"
                        >
                            Cancel
                        </button>
                        <button
                            className="btn bg-red-600 hover:bg-red-700 text-white px-6 py-2 transition-colors duration-200 shadow-lg hover:shadow-xl"
                            onClick={() => handleDelete(templateId)}
                        >
                            Delete
                        </button>
                    </div>
                </form>
            </dialog>

            <div className="container mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                            Templates
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                            Manage your template configurations
                        </p>
                    </div>

                    <Link href={`/templatecreate`}>
                        <button
                            type="button"
                            className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                            <PlusIcon className="w-5 h-5 transition-transform group-hover:rotate-90 duration-200" />
                            Create Template
                        </button>
                    </Link>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates &&
                        templates.map((obj, idx) => (
                            <div
                                className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:transform hover:scale-105 overflow-hidden"
                                key={idx}
                            >
                                {/* Card Header */}
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                                    <div className="flex items-start justify-between">
                                        <Link href={`/templates/${obj._id}`}>
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors duration-200 line-clamp-2">
                                                {obj.template_name}
                                            </h2>
                                        </Link>
                                        <button
                                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                            onClick={() => {
                                                window.confirmDeleteModal.showModal();
                                                setTemplateId(obj._id);
                                            }}
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="p-6 bg-gray-50 dark:bg-gray-750">
                                    <div className="flex gap-3">
                                        <Link href={`/templates/testtemplate/${obj._id}`} className="flex-1">
                                            <button
                                                type="button"
                                                className="w-full bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-medium py-2.5 px-4 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200 shadow-sm hover:shadow-md"
                                            >
                                                Preview
                                            </button>
                                        </Link>
                                        <Link href={`/templates/${obj._id}`} className="flex-1">
                                            <button
                                                type="button"
                                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                            >
                                                View
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>

                {/* Empty State */}
                {templates && templates.length === 0 && (
                    <div className="text-center py-16">
                        <div className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-500 mb-6">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No templates yet
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Get started by creating your first template
                        </p>
                        <Link href={`/templatecreate`}>
                            <button className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg px-6 py-3 transition-all duration-200 shadow-lg hover:shadow-xl">
                                <PlusIcon className="w-5 h-5" />
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