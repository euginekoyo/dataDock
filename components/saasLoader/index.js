import axios from 'axios';
import React, { useEffect, useContext } from 'react';
import CsvUploader from '../csvuploader';
import { Context } from '../../context';
import { Info } from 'lucide-react';

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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
            <div className="p-6 max-w-5xl mx-auto">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Left Panel - Column Requirements */}
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3">
                                <div className="flex items-center gap-2">
                                    <Info className="w-4 h-4 text-white" />
                                    <h2 className="text-sm font-semibold text-white">
                                        Column Requirements
                                    </h2>
                                </div>
                            </div>

                            {/* Info Banner */}
                            <div className="p-3 bg-blue-50/30 border-b border-blue-100">
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    Ensure your file includes the following required columns:
                                </p>
                            </div>

                            {/* Expected Columns */}
                            <div className="p-3">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                        Expected Columns
                                    </h3>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                        {state.saasTemplateColumns?.length || 0} columns
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {state.saasTemplateColumns?.map((column, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2 bg-blue-50/30 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors duration-200"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                                <span className="text-xs font-medium text-gray-700">
                                                    {column.label}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Required
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {!state.saasTemplateColumns?.length && (
                                    <div className="text-center py-6">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Loading template columns...
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - CSV Uploader */}
                    <div className="flex-1 min-w-0">
                        <div className="bg-white rounded-xl shadow-md border border-blue-100 p-4">
                            <CsvUploader nextPageRoute="/saasloadmatcher" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SaasLoader;