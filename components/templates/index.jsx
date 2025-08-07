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
        <div className="h-full bg-gradient-to-br from-blue-50 via-white to-blue-50">
            {/* Delete Confirmation Modal */}
            <dialog
                id="confirmDeleteModal"
                className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
            >
                <form method="dialog" className="modal-box bg-white border border-blue-100 shadow-md rounded-xl p-4">
                    <button
                        className="absolute top-2 right-2 p-1 rounded-md hover:bg-blue-50 transition-colors duration-200"
                        data-dismiss="modal"
                    >
                        <XMarkIcon className="w-4 h-4 text-gray-500" aria-hidden="true" />
                    </button>

                    <div className="text-center pt-2">
                        <div className="mx-auto flex items-center justify-center h-8 w-8 rounded-full bg-red-50 mb-3">
                            <TrashIcon className="h-4 w-4 text-red-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                            Delete Template
                        </h3>
                        <p className="text-xs text-gray-600 mb-4">
                            Are you sure you want to delete this template configuration? This action cannot be undone.
                        </p>
                    </div>

                    <div className="modal-action justify-center gap-2">
                        <button
                            className="px-4 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 text-xs font-semibold"
                            type="button"
                        >
                            Cancel
                        </button>
                        <button
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-1.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-xs font-semibold"
                            onClick={() => handleDelete(templateId)}
                        >
                            Delete
                        </button>
                    </div>
                </form>
            </dialog>

            <div className="p-6 max-w-5xl mx-auto">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-blue-600 rounded-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                                Templates
                            </h1>
                        </div>
                        <p className="text-gray-600 text-sm">
                            Manage your template configurations
                        </p>
                    </div>

                    <Link href={`/templatecreate`}>
                        <button
                            type="button"
                            className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-300 text-xs"
                        >
                            <PlusIcon className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
                            Create Template
                        </button>
                    </Link>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates &&
                        templates.map((obj, idx) => (
                            <div
                                className="group bg-white rounded-xl shadow-md border border-blue-100 transition-all duration-300 hover:transform hover:scale-105 overflow-hidden"
                                key={idx}
                            >
                                {/* Card Header */}
                                <div className="p-4 border-b border-blue-50">
                                    <div className="flex items-start justify-between">
                                        <Link href={`/templates/${obj._id}`}>
                                            <h2 className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer transition-colors duration-200 line-clamp-2">
                                                {obj.template_name}
                                            </h2>
                                        </Link>
                                        <button
                                            className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                            onClick={() => {
                                                window.confirmDeleteModal.showModal();
                                                setTemplateId(obj._id);
                                            }}
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="p-4 bg-blue-50/30">
                                    <div className="flex gap-2">
                                        <Link href={`/templates/testtemplate/${obj._id}`} className="flex-1">
                                            <button
                                                type="button"
                                                className="w-full bg-white text-blue-600 font-semibold py-1.5 px-3 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors duration-200 shadow-sm hover:shadow-md text-xs"
                                            >
                                                Preview
                                            </button>
                                        </Link>
                                        <Link href={`/templates/${obj._id}`} className="flex-1">
                                            <button
                                                type="button"
                                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-1.5 px-3 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-xs"
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
                    <div className="text-center py-12">
                        <div className="mx-auto h-12 w-12 text-blue-300 mb-3">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-1">
                            No templates yet
                        </h3>
                        <p className="text-xs text-gray-600 mb-3">
                            Get started by creating your first template
                        </p>
                        <Link href={`/templatecreate`}>
                            <button className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg px-4 py-2 transition-all duration-200 shadow-md hover:shadow-lg text-xs">
                                <PlusIcon className="w-4 h-4" />
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