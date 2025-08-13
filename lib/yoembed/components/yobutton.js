import React, { useState, useEffect } from "react";
import { X } from 'lucide-react';

export default function Modal({ templateId, yoHostUrl, btnText, importerId }) {
    const [showModal, setShowModal] = useState(false);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showModal]);

    return (
        <>
            <button
                className="relative px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-xs uppercase rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                type="button"
                onClick={() => setShowModal(true)}
            >
                {btnText || "Import CSV"}
            </button>
            {showModal && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-[1000] transition-opacity duration-200"
                        onClick={() => setShowModal(false)}
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 overflow-hidden">
                        <div className="relative w-full max-w-3xl h-[90vh]">
                            {/* Modal Content */}
                            <div className="bg-white rounded-xl shadow-xl flex flex-col h-full border border-blue-100 overflow-hidden">
                                {/* Header */}
                                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                    <h3 className="text-lg font-bold">DataFusion</h3>
                                    <button
                                        className="p-1.5 hover:bg-blue-500 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        onClick={() => setShowModal(false)}
                                        aria-label="Close modal"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="flex-1 p-0 overflow-hidden">
                                    {importerId ? (
                                        <iframe
                                            src={`${yoHostUrl}/importer/${importerId}`}
                                            title="yocsv"
                                            className="w-full h-full border-0"
                                            style={{ height: 'calc(100vh - 180px)' }}
                                        />
                                    ) : (
                                        <iframe
                                            src={`${yoHostUrl}/saasloader/${templateId}`}
                                            title="yocsv"
                                            className="w-full h-full border-0"
                                            style={{ height: 'calc(100vh - 180px)' }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}