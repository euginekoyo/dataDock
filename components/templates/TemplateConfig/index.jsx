import { useState, useEffect, useContext, Fragment } from 'react';
import axios from 'axios';
import { Context } from '../../../context';
import { useRouter } from 'next/router';
import {
    PencilIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    ArrowLeftIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';
import addColumnButton from './addColumnButton';
import handleEdit from './handleEdit';
import Link from 'next/link';
import { Dialog, Transition } from '@headlessui/react';
import Editor from '@monaco-editor/react';
import { InformationCircleIcon } from '@heroicons/react/24/solid';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AdminComponent = ({ templateId, type }) => {
    let [isOpen, setIsOpen] = useState(false);
    const [templateData, setTemplateData] = useState({});
    const router = useRouter();
    const { dispatch } = useContext(Context);
    const [isRegexMenuOpen, setIsRegexMenuOpen] = useState([]);
    const [isSchemaMenuOpen, setIsSchemaMenuOpen] = useState(false);
    const [mode, setMode] = useState('light');

    function beforeMount(monaco) {
        monaco.editor.defineTheme('yobulkdark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#1F2937',
            },
        });
    }

    function closeREGEXModal(idx) {
        let newRegexMenu = isRegexMenuOpen
        newRegexMenu[idx] = false
        setIsRegexMenuOpen([...newRegexMenu]);
    }

    function openREGEXModal(idx) {
        let newRegexMenu = isRegexMenuOpen
        newRegexMenu[idx] = true
        setIsRegexMenuOpen([...newRegexMenu]);
    }

    useEffect(() => {
        const headers = {
            template_id: templateId,
        };
        if (type === 'view') {
            axios
                .get('/api/templates', { headers })
                .then((res) => {
                    setTemplateData(res.data);
                })
                .catch((err) => console.log(err));
        }
    }, [templateId]);

    useEffect(() => {
        window
            .matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', (e) => setMode(e.matches ? 'dark' : 'light'));
        setMode(
            window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light'
        );
        return () => {
            window
                .matchMedia('(prefers-color-scheme: dark)')
                .removeEventListener('change', () => { });
        };
    }, []);

    function closeModal() {
        setIsOpen(false);
    }

    function openModal() {
        setIsOpen(true);
    }

    const handleTemplateName = (e) => {
        setTemplateData((prev) => {
            return { ...prev, template_name: e.target.value };
        });
    };

    const saveTemplate = () => {
        if (!templateData.template_name) {
            return;
        }
        axios
            .post('/api/templates', templateData)
            .then((result) => {
                router.push({ pathname: '/templates' }, undefined, {
                    shallow: true,
                });
            })
            .catch((err) => {
                console.log(err)
                toast.error(err.response.data.error);
            });
    };

    const handleDelete = (col) => {
        setTemplateData((prev) => {
            return {
                ...prev,
                columns: prev.columns.filter((el) => el.key !== col.key),
            };
        });
    };

    const handleOpenEditModal = ({
                                     isOpen,
                                     setIsOpen,
                                     closeModal,
                                     setTemplateData,
                                     columnData,
                                 }) => {
        dispatch({ type: 'SET_CUR_TEMPLATE_EDIT', payload: true });
        dispatch({ type: 'SET_CUR_TEMPLATE_EDIT_COLUMN', payload: columnData });
        handleEdit({
            isOpen,
            setIsOpen,
            closeModal,
            setTemplateData,
            columnData,
        });
    };

    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
                    <div className="max-w-7xl mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <Link href="/templates">
                                    <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    </button>
                                </Link>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {templateData && `${templateData.template_name ? templateData.template_name : 'Name your'} template`}
                                    </h1>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Manage your template configuration
                                    </p>
                                </div>
                            </div>
                            {type === 'create' && (
                                <button
                                    onClick={saveTemplate}
                                    className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg"
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                                    Save Template
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                        {type === 'view' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Key
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        The unique key used to identify this Template
                                    </p>
                                </div>
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                    {templateData._id}
                                </span>
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setIsSchemaMenuOpen(true)}
                                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg"
                                    >
                                        View Schema
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Schema Modal */}
                        <Transition appear show={isSchemaMenuOpen} as={Fragment}>
                            <Dialog
                                as="div"
                                className="relative z-50"
                                onClose={() => setIsSchemaMenuOpen(false)}
                            >
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

                                <div className="fixed inset-0 overflow-y-auto">
                                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                                        <Transition.Child
                                            as={Fragment}
                                            enter="ease-out duration-300"
                                            enterFrom="opacity-0 scale-95"
                                            enterTo="opacity-100 scale-100"
                                            leave="ease-in duration-200"
                                            leaveFrom="opacity-100 scale-100"
                                            leaveTo="opacity-0 scale-95"
                                        >
                                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white/90 dark:bg-gray-900/90 p-6 text-left align-middle shadow-xl transition-all backdrop-blur-sm">
                                                <Dialog.Title
                                                    as="h3"
                                                    className="text-lg font-semibold text-gray-900 dark:text-white"
                                                >
                                                    Template Schema
                                                </Dialog.Title>
                                                <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                                    <Editor
                                                        height="65vh"
                                                        width="100%"
                                                        theme={mode === 'dark' ? 'yobulkdark' : 'vs'}
                                                        language="json"
                                                        beforeMount={beforeMount}
                                                        defaultValue={JSON.stringify(
                                                            templateData.schema,
                                                            null,
                                                            '  '
                                                        )}
                                                    />
                                                </div>
                                                <div className="mt-4">
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg"
                                                        onClick={() => setIsSchemaMenuOpen(false)}
                                                    >
                                                        Close
                                                    </button>
                                                </div>
                                            </Dialog.Panel>
                                        </Transition.Child>
                                    </div>
                                </div>
                            </Dialog>
                        </Transition>

                        {/* Template Name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Name <span className="text-red-500">*</span>
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Name of the template
                                </p>
                            </div>
                            <div>
                                {type === 'view' && templateData ? (
                                    <span className="text-gray-900 dark:text-white font-medium">
                                        {templateData.template_name}
                                    </span>
                                ) : (
                                    <div className="space-y-2">
                                        {!templateData.template_name && (
                                            <div className="flex items-center space-x-2 text-sm text-red-500">
                                                <InformationCircleIcon className="h-4 w-4" />
                                                <span>This field is required</span>
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            id="default-input"
                                            className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-0 bg-white/50 dark:bg-gray-700/50 ${
                                                !templateData.template_name
                                                    ? 'border-red-300 focus:border-red-500'
                                                    : 'border-gray-200 focus:border-blue-500 dark:border-gray-600 dark:focus:border-blue-400'
                                            } text-gray-900 dark:text-white placeholder-gray-400`}
                                            value={templateData.template_name}
                                            disabled={type === 'view'}
                                            onChange={(e) => handleTemplateName(e)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Add Column Button */}
                    {type === 'create' && (
                        <div className="mt-6">
                            {addColumnButton({ openModal, isOpen, closeModal, setTemplateData })}
                        </div>
                    )}

                    {/* Columns Table */}
                    <div className="mt-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-gray-900 dark:text-gray-200">
                                <thead className="text-xs text-white uppercase h-12 bg-gradient-to-r from-blue-600 to-indigo-600">
                                <tr>
                                    <th scope="col" className="py-3 px-6">
                                        Column Name
                                    </th>
                                    <th scope="col" className="py-3 px-6">
                                        Format
                                    </th>
                                    <th scope="col" className="py-3 px-6">
                                        Example
                                    </th>
                                    <th scope="col" className="py-3 px-6">
                                        Required
                                    </th>
                                    <th scope="col" className="py-3 px-6">
                                        Validator
                                    </th>
                                    {type === 'create' && (
                                        <th scope="col" className="py-3 px-6">
                                            Action
                                        </th>
                                    )}
                                </tr>
                                </thead>
                                <tbody>
                                {templateData.columns ? (
                                    templateData.columns.map((col, idx) => (
                                        <tr
                                            key={idx}
                                            className="h-12 text-center border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                        >
                                            <td className="py-3 px-6">{col.label}</td>
                                            <td className="py-3 px-6">{col.data_type}</td>
                                            <td className="py-3 px-6">{col.example}</td>
                                            <td className="py-3 px-6">
                                                {col.is_required ? col.is_required.toString() : ''}
                                            </td>
                                            <td className="py-3 px-6">
                                                <button
                                                    className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                                                    onClick={() => openREGEXModal(idx)}
                                                >
                                                    <span>Custom Validator</span>
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </button>
                                                <Transition appear show={isRegexMenuOpen[idx] ? true : false} as={Fragment}>
                                                    <Dialog
                                                        as="div"
                                                        className="relative z-50"
                                                        onClose={() => closeREGEXModal(idx)}
                                                    >
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

                                                        <div className="fixed inset-0 overflow-y-auto">
                                                            <div className="flex min-h-full items-center justify-center p-4 text-center">
                                                                <Transition.Child
                                                                    as={Fragment}
                                                                    enter="ease-out duration-300"
                                                                    enterFrom="opacity-0 scale-95"
                                                                    enterTo="opacity-100 scale-100"
                                                                    leave="ease-in duration-200"
                                                                    leaveFrom="opacity-100 scale-100"
                                                                    leaveTo="opacity-0 scale-95"
                                                                >
                                                                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white/90 dark:bg-gray-900/90 p-6 text-left align-middle shadow-xl transition-all backdrop-blur-sm">
                                                                        <Dialog.Title
                                                                            as="h3"
                                                                            className="text-lg font-semibold text-gray-900 dark:text-white"
                                                                        >
                                                                            {col.pattern ? 'Regular Expression' : (col.validate ? 'Validator Function' : 'Regular Expression')}
                                                                        </Dialog.Title>
                                                                        <div className="mt-4">
                                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                                {col.pattern
                                                                                    ? col.pattern
                                                                                    : (col.validate ? col.validate : 'No validator defined')}
                                                                            </p>
                                                                        </div>
                                                                        <div className="mt-4">
                                                                            <button
                                                                                type="button"
                                                                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg"
                                                                                onClick={() => closeREGEXModal(idx)}
                                                                            >
                                                                                Close
                                                                            </button>
                                                                        </div>
                                                                    </Dialog.Panel>
                                                                </Transition.Child>
                                                            </div>
                                                        </div>
                                                    </Dialog>
                                                </Transition>
                                            </td>
                                            {type === 'create' && (
                                                <td className="py-3 px-6 flex justify-center space-x-4">
                                                    <PencilIcon
                                                        className="h-5 w-5 text-gray-600 dark:text-gray-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                        onClick={() =>
                                                            handleOpenEditModal({
                                                                isOpen,
                                                                setIsOpen,
                                                                closeModal,
                                                                setTemplateData,
                                                                columnData: col,
                                                            })
                                                        }
                                                    />
                                                    <TrashIcon
                                                        className="h-5 w-5 text-red-500 cursor-pointer hover:text-red-700 transition-colors"
                                                        onClick={() => handleDelete(col)}
                                                    />
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={type === 'create' ? 6 : 5} className="py-4 text-center text-gray-500 dark:text-gray-400">
                                            No columns defined
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminComponent;