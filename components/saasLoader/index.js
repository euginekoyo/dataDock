import axios from 'axios';
import React, { useEffect, useContext } from 'react';
import CsvUploader from '../csvuploader';
import { Context } from '../../context';
import { AiOutlineInfoCircle } from 'react-icons/ai';

const SaasLoader = ({ templateId }) => {
    const { state, dispatch } = useContext(Context);

    const headers = {
        template_id: templateId,
    };

    useEffect(() => {
        axios
            .get('/api/templates', { headers })
            .then((result) => {
                if (result.data.columns) {
                    dispatch({
                        type: 'SET_SASS_TEMPLATE_COLUMNS',
                        payload: result.data.columns,
                    });
                    dispatch({
                        type: 'SET_SASS_BASE_TEMPLATE_ID',
                        payload: templateId,
                    });
                }
            })
            .catch((err) => console.log(err));
    }, [templateId, dispatch]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="container mx-auto px-4 lg:px-8">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Left Panel - Column Requirements */}
                    <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                                <div className="flex items-center space-x-2">
                                    <AiOutlineInfoCircle className="text-white text-xl" />
                                    <h2 className="text-lg font-semibold text-white">
                                        Column Requirements
                                    </h2>
                                </div>
                            </div>

                            {/* Info Banner */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                    Make sure your file includes the following required columns:
                                </p>
                            </div>

                            {/* Expected Columns */}
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                                        Expected Columns
                                    </h3>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    {state.saasTemplateColumns?.length || 0} columns
                  </span>
                                </div>

                                <div className="space-y-2">
                                    {state.saasTemplateColumns?.map((column, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          {column.label}
                        </span>
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Required
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {!state.saasTemplateColumns?.length && (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                            Loading template columns...
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - CSV Uploader */}
                    <div className="flex-1 min-w-0">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                            <CsvUploader nextPageRoute="/saasloadmatcher" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SaasLoader;