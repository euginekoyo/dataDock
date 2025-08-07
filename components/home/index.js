import React, { Fragment, useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Popover, Transition } from '@headlessui/react';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/roles';

const Home = () => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [defaultTemplateId, setDefaultTemplateId] = useState();
    const [error, setError] = useState('');

    useEffect(() => {
        if (loading) return;
        if (!user || !hasPermission(user.role, 'view_dashboard')) {
            router.push('/login');
            return;
        }

        const fetchTemplates = async () => {
            try {
                const response = await axios.get('/api/templates', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                const defaultTemplate = response.data.find((el) => el.template_name === 'd_dock');
                setDefaultTemplateId(defaultTemplate?._id);
            } catch (e) {
                console.error(e);
                setError('Failed to load templates');
            }
        };

        fetchTemplates();
    }, [user, loading, router]);

    if (loading || !user) return null;

    return (
        <div id="home" className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
            <div className="p-6 max-w-5xl mx-auto">
                {/* Error Alert */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="text-red-700 text-sm font-medium">{error}</span>
                        </div>
                        <button
                            onClick={() => setError('')}
                            className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-100 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Welcome Header */}
                <div className="mb-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="p-1.5 bg-blue-600 rounded-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                            Welcome to DataDock!
                        </h1>
                    </div>
                    <p className="text-gray-600 text-sm">Effortlessly import and validate your CSV data</p>
                </div>

                {/* Quick Walkthrough Section */}
                <div className="bg-white rounded-xl shadow-lg border border-blue-100 p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        DataDock Quick Walkthrough
                    </h2>
                    <p className="text-gray-600 text-sm text-center mb-4">
                        Demo of importing and validating a CSV with a pre-configured template
                    </p>
                    <div className="space-y-4">
                        {/* Step 1 */}
                        <div className="flex flex-col gap-1 p-4 bg-blue-50 rounded-lg">
                            <h3 className="text-sm font-semibold text-gray-700">Step 1</h3>
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-600">
                                    The template is pre-configured with the field values: id, name, email, date, status
                                </p>
                                <a href="/csv/DataDock_Data_Type_Validation.csv" download>
                                    <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-xs">
                                        Download CSV
                                    </button>
                                </a>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex flex-col gap-1 p-4 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-gray-700">Step 2</h3>
                                <Popover className="relative">
                                    <Popover.Button>
                                        <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                                    </Popover.Button>
                                    <Transition
                                        as={Fragment}
                                        enter="transition ease-out duration-200"
                                        enterFrom="opacity-0 translate-y-1"
                                        enterTo="opacity-100 translate-y-0"
                                        leave="transition ease-in duration-150"
                                        leaveFrom="opacity-100 translate-y-0"
                                        leaveTo="opacity-0 translate-y-1"
                                    >
                                        <Popover.Panel className="absolute z-10 mt-2 bg-white rounded border border-blue-100 p-2 shadow-md -translate-x-1/2">
                                            <p className="text-xs">Create a template with the same schema as the CSV.</p>
                                            <img src="/solutions.jpg" alt="CSV schema" className="mt-2 max-w-[200px]" />
                                        </Popover.Panel>
                                    </Transition>
                                </Popover>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-600">Start the Import Flow and make the corrections</p>
                                <Link href={`/templates/testtemplate/${defaultTemplateId || ''}`}>
                                    <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-xs">
                                        Import CSV
                                    </button>
                                </Link>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex flex-col gap-1 p-4 bg-blue-50 rounded-lg">
                            <h3 className="text-sm font-semibold text-gray-700">Step 3</h3>
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-600">
                                    Go to Imports Section and check the status. CSV Data is imported successfully to your MongoDB.
                                </p>
                                <Link href="/imports">
                                    <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-xs">
                                        Validate Import Status
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sample CSVs Section */}
                <div className="bg-white rounded-xl shadow-lg border border-blue-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Sample CSVs to Try
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        <a href="/csv/million_records.csv" download>
                            <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-xs">
                                CSV with 1 million records
                            </button>
                        </a>
                        <a href="/csv/mail_validation.csv" download>
                            <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-xs">
                                CSV for custom mail validation
                            </button>
                        </a>
                        <a href="/csv/integer_validation.csv" download>
                            <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-xs">
                                CSV for custom integer validation
                            </button>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;