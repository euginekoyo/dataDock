import React, { useState, useEffect } from "react";

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
                className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold uppercase text-sm px-6 py-3 rounded-lg shadow-md hover:shadow-lg outline-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition-all duration-200 ease-in-out"
                type="button"
                onClick={() => setShowModal(true)}
            >
                {btnText ? btnText : "Import CSV"}
            </button>
            {showModal ? (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
                        onClick={() => setShowModal(false)}
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
                        <div className="relative w-full max-w-4xl h-full max-h-screen">
                            {/* Modal Content */}
                            <div className="bg-white rounded-xl shadow-2xl flex flex-col h-full border border-blue-200 overflow-hidden">
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                    <h3 className="text-2xl font-bold">DataDock!</h3>
                                    <button
                                        className="p-2 hover:bg-blue-500 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        onClick={() => setShowModal(false)}
                                        aria-label="Close modal"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="flex-1 p-0 overflow-hidden">
                                    {importerId ? (
                                        <iframe
                                            src={`${yoHostUrl}/importer/${importerId}`}
                                            title="yocsv"
                                            className="w-full h-full border-0"
                                            style={{ height: 'calc(100vh - 200px)' }}
                                        />
                                    ) : (
                                        <iframe
                                            src={`${yoHostUrl}/saasloader/${templateId}`}
                                            title="yocsv"
                                            className="w-full h-full border-0"
                                            style={{ height: 'calc(100vh - 200px)' }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </>
    );
}