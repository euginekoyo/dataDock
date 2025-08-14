import React, { useState, useCallback, useEffect } from 'react';
import FileDownload from 'js-file-download';
import axios from 'axios';
import HappyModal from './happyModal';
import { Download, Sparkles, Send, Undo2 } from 'lucide-react';
import ErrorTypeDropDown from './errorTypeSelector';
import WarningModal from './warningModal';
import { Switch } from '@headlessui/react';
import SuccessModal from './SuccessModal';
import AutoFixModal from './AutoFixModal';

const ReviewCsv = ({
                     collectionName,
                     fileName,
                     fileMetaData,
                     setIsErrorFree,
                     showOnlyErrors,
                     selectErrorType,
                     getAiRecommendations,
                     loadingSuggestions,
                     columnDefs,
                     runAutofix,
                     openAutofixModal,
                     autofixValues,
                     undoAutoFix,
                   }) => {
  const [metaData, setMetaData] = useState();
  const [downloadig, setDownloadig] = useState({ all: false, errors: false, valid: false });
  const [isVisible, setIsVisible] = useState(false);
  const [isWarningModalVisible, setWarningModalVisible] = useState(false);
  const [isDownloadWarningModalVisible, setDownloadWarningModalVisible] = useState({ all: false, errors: false, valid: false });
  const [showWarning, setShowWarning] = useState(true);
  const [onlyError, setOnlyError] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const hideUploaderExtraButtons = process.env.NEXT_PUBLIC_HIDE_UPLOADER_BUTTONS === 'false';

  const openModal = () => {
    setIsOpen(true);
    openAutofixModal();
  };
  const closeModal = () => setIsOpen(false);

  useEffect(() => {
    setMetaData((prev) => {
      if (fileMetaData && typeof fileMetaData.validRecords !== 'undefined') {
        if (fileMetaData.totalRecords - fileMetaData.validRecords === 0) {
          setIsErrorFree(true);
          setShowWarning(false);
          setIsVisible(true);
          setTimeout(() => {
            setIsErrorFree(false);
          }, 10000);
        }
      }
      return fileMetaData;
    });
  }, [fileMetaData, setIsErrorFree]);

  const onBtnExport = useCallback(
      (forceDownload, type = 'all') => {
        if (showWarning && !forceDownload) {
          setDownloadWarningModalVisible((prev) => ({ ...prev, [type]: true }));
          return;
        }
        setDownloadWarningModalVisible((prev) => ({ ...prev, [type]: false }));
        setDownloadig((prev) => ({ ...prev, [type]: true }));

        const endpoint = `/api/downloads/${type}`;
        const downloadFileName =
            type === 'errors' ? `${fileName.replace('.csv', '')}_errors.csv` :
                type === 'valid' ? `${fileName.replace('.csv', '')}_valid.csv` :
                    fileName;

        const options = {
          method: 'GET',
          url: endpoint,
          responseType: 'blob',
          headers: {
            collection_name: collectionName,
          },
        };

        axios(options)
            .then((response) => {
              FileDownload(response.data, downloadFileName);
              setDownloadig((prev) => ({ ...prev, [type]: false }));
            })
            .catch((error) => {
              console.error(`Error downloading ${type} CSV:`, error);
              setDownloadig((prev) => ({ ...prev, [type]: false }));
              let errorMessage = 'Failed to download CSV. Please try again.';
              if (error.response?.data?.error) {
                errorMessage = `Failed to download ${type} CSV: ${error.response.data.error}`;
              } else if (error.message) {
                errorMessage = `Failed to download ${type} CSV: ${error.message}`;
              }
              alert(errorMessage);
            });
      },
      [showWarning, collectionName, fileName]
  );

  const onBtnSubmit = useCallback(() => {
    if (showWarning) {
      setWarningModalVisible(true);
    } else {
      setShowResultModal(true);
    }
  }, [showWarning]);

  const submitFirstModal = () => {
    setWarningModalVisible(false);
    setShowResultModal(true);
  };

  const onFinalSubmit = () => {
    setShowResultModal(false);
  };

  const handleSwitch = () => {
    setOnlyError(!onlyError);
    showOnlyErrors(!onlyError);
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num;
  };

  return (
      <>
        <style jsx global>{`
          .review-csv-container {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .review-csv-container::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div className="mb-2 bg-gradient-to-br from-blue-50 via-white to-blue-50 ">
          <div className="bg-white border border-blue-100 rounded-xl shadow-md p-4 w-full mx-auto">
            {/* Header Section (Optional - Placeholder for future title or info) */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">CSV Review</h2>
            </div>

            {/* Statistics Section */}
            <div className="mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-700">Total Rows</p>
                      <p className="text-lg font-bold text-blue-900">
                        {metaData ? formatNumber(metaData.totalRecords) : '0'}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700">Valid Rows</p>
                      <p className="text-lg font-bold text-green-900">
                        {metaData && typeof metaData.validRecords !== 'undefined' ? formatNumber(metaData.validRecords) : '...'}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-3 border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-red-700">Error Rows</p>
                      <p className="text-lg font-bold text-red-900">
                        {metaData && typeof metaData.validRecords !== 'undefined' ? formatNumber(metaData.totalRecords - metaData.validRecords) : '...'}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters Section */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
                <label className="text-sm font-medium text-gray-700">Only Errors</label>
                <Switch
                    checked={onlyError}
                    onChange={handleSwitch}
                    className={`${onlyError ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`}
                >
                  <span
                      className={`${onlyError ? 'translate-x-4' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-sm`}
                  />
                </Switch>
              </div>
              <div className="min-w-[180px] flex-1">
                <ErrorTypeDropDown errData={metaData} selectErrorType={selectErrorType} />
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex gap-2 mb-4 sm:mb-0">
                {!hideUploaderExtraButtons && (
                    <button
                        onClick={getAiRecommendations}
                        disabled={loadingSuggestions}
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 ${
                            loadingSuggestions
                                ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transform hover:scale-105'
                        }`}
                    >
                      {loadingSuggestions ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Getting suggestions...
                          </>
                      ) : (
                          <>
                            <Sparkles className="w-3 h-3 mr-1" />
                            Get AI Suggestions
                          </>
                      )}
                    </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                    onClick={undoAutoFix}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg font-medium text-xs text-orange-600 bg-orange-50 border border-orange-100 hover:bg-orange-100 hover:border-orange-200 transition-all duration-200 transform hover:scale-105"
                >
                  <Undo2 className="w-3 h-3 mr-1" />
                  Undo Auto Fix
                </button>
                <button
                    onClick={openModal}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg font-medium text-xs text-purple-600 bg-purple-50 border border-purple-100 hover:bg-purple-100 hover:border-purple-200 transition-all duration-200 transform hover:scale-105"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto Fix
                </button>

                {metaData && metaData.totalRecords > 0 && !downloadig.all ? (
                    <button
                        onClick={() => onBtnExport(false, 'all')}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg font-medium text-xs text-green-600 bg-green-50 border border-green-100 hover:bg-green-100 hover:border-green-200 transition-all duration-200 transform hover:scale-105"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download All
                    </button>
                ) : metaData && metaData.totalRecords > 0 ? (
                    <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-50 border border-green-100">
                      <svg className="animate-spin w-3 h-3 mr-1 text-green-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs font-medium text-green-600">Downloading All...</span>
                    </div>
                ) : (
                    <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-50 border border-green-100 opacity-50 cursor-not-allowed">
                      <span className="text-xs font-medium text-green-600">No Data</span>
                    </div>
                )}
                {metaData && metaData.totalRecords - metaData.validRecords > 0 && !downloadig.errors ? (
                    <button
                        onClick={() => onBtnExport(false, 'errors')}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg font-medium text-xs text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-all duration-200 transform hover:scale-105"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download Errors
                    </button>
                ) : metaData && metaData.totalRecords - metaData.validRecords > 0 ? (
                    <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-red-50 border border-red-100">
                      <svg className="animate-spin w-3 h-3 mr-1 text-red-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs font-medium text-red-600">Downloading Errors...</span>
                    </div>
                ) : (
                    <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-red-50 border border-red-100 opacity-50 cursor-not-allowed">
                      <span className="text-xs font-medium text-red-600">No Errors</span>
                    </div>
                )}
                {metaData && metaData.validRecords > 0 && !downloadig.valid ? (
                    <button
                        onClick={() => onBtnExport(false, 'valid')}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg font-medium text-xs text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-all duration-200 transform hover:scale-105"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download Valid
                    </button>
                ) : metaData && metaData.validRecords > 0 ? (
                    <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
                      <svg className="animate-spin w-3 h-3 mr-1 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs font-medium text-blue-600">Downloading Valid...</span>
                    </div>
                ) : (
                    <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 opacity-50 cursor-not-allowed">
                      <span className="text-xs font-medium text-blue-600">No Valid Rows</span>
                    </div>
                )}
                <button
                    onClick={onBtnSubmit}
                    className="inline-flex items-center px-4 py-1.5 rounded-lg font-medium text-xs text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Submit
                </button>
              </div>
            </div>

            <AutoFixModal
                isOpen={isOpen}
                closeModal={closeModal}
                columnDefs={columnDefs}
                runAutofix={runAutofix}
                autofixValues={autofixValues}
            />
            {showResultModal && <SuccessModal submit={onFinalSubmit} message={fileMetaData} />}
            <HappyModal isVisible={isVisible} setIsVisible={setIsVisible} />
            <WarningModal
                isVisible={isDownloadWarningModalVisible.all}
                setIsVisible={(val) => setDownloadWarningModalVisible((prev) => ({ ...prev, all: val }))}
                submit={() => onBtnExport(true, 'all')}
                metaData={fileMetaData}
                type="Download"
            />
            <WarningModal
                isVisible={isDownloadWarningModalVisible.errors}
                setIsVisible={(val) => setDownloadWarningModalVisible((prev) => ({ ...prev, errors: val }))}
                submit={() => onBtnExport(true, 'errors')}
                metaData={fileMetaData}
                type="Download"
            />
            <WarningModal
                isVisible={isDownloadWarningModalVisible.valid}
                setIsVisible={(val) => setDownloadWarningModalVisible((prev) => ({ ...prev, valid: val }))}
                submit={() => onBtnExport(true, 'valid')}
                metaData={fileMetaData}
                type="Download"
            />
            <WarningModal
                isVisible={isWarningModalVisible}
                setIsVisible={setWarningModalVisible}
                submit={submitFirstModal}
                metaData={fileMetaData}
                type="Submit"
            />
          </div>
        </div>
      </>
  );
};

export default ReviewCsv;