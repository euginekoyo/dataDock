import React, { useState, useCallback, useEffect } from 'react';
import FileDownload from 'js-file-download';
import axios from 'axios';
import HappyModal from './happyModal';
import { CloudArrowDownIcon } from '@heroicons/react/24/outline';
import ErrorTypeDropDown from './errorTypeSelector';
import WarningModal from './warningModal';
import { Switch } from '@headlessui/react';
import SuccessModal from './SuccessModal';
import { FaMagic } from 'react-icons/fa';
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
  const hideUploaderExtraButtons = process.env.NEXT_PUBLIC_HIDE_UPLOADER_BUTTONS === 'true';

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
          .review-csv-container .grid,
          .review-csv-container .flex {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .review-csv-container .grid::-webkit-scrollbar,
          .review-csv-container .flex::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6 review-csv-container">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total Rows</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {metaData ? formatNumber(metaData.totalRecords) : '0'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Valid Rows</p>
                    <p className="text-2xl font-bold text-green-900">
                      {metaData && typeof metaData.validRecords !== 'undefined' ? formatNumber(metaData.validRecords) : '...'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700">Error Rows</p>
                    <p className="text-2xl font-bold text-red-900">
                      {metaData && typeof metaData.validRecords !== 'undefined' ? formatNumber(metaData.totalRecords - metaData.validRecords) : '...'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <label className="text-sm font-medium text-gray-700">Only Errors</label>
                <Switch
                    checked={onlyError}
                    onChange={handleSwitch}
                    className={`${onlyError ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                >
                <span
                    className={`${onlyError ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-lg`}
                />
                </Switch>
              </div>
              <div className="min-w-[200px]">
                <ErrorTypeDropDown errData={metaData} selectErrorType={selectErrorType} />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="flex gap-2">
              {!hideUploaderExtraButtons && (
                  <button
                      onClick={getAiRecommendations}
                      disabled={loadingSuggestions}
                      className={`
                  inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                  ${loadingSuggestions ? 'bg-blue-100 text-blue-600 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'}
                `}
                  >
                    {loadingSuggestions ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Getting suggestions...
                        </>
                    ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Get AI Suggestions
                        </>
                    )}
                  </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                  onClick={undoAutoFix}
                  className="inline-flex items-center px-3 py-2 rounded-lg font-medium text-sm text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100 hover:border-orange-300 transition-all duration-200"
              >
                <FaMagic className="w-4 h-4 mr-2" />
                Undo Auto Fix
              </button>
              <button
                  onClick={openModal}
                  className="inline-flex items-center px-3 py-2 rounded-lg font-medium text-sm text-purple-600 bg-purple-50 border border-purple-200 hover:bg-purple-100 hover:border-purple-300 transition-all duration-200"
              >
                <FaMagic className="w-4 h-4 mr-2" />
                Auto Fix
              </button>
              {metaData && metaData.totalRecords > 0 && !downloadig.all ? (
                  <button
                      onClick={() => onBtnExport(false, 'all')}
                      className="inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm text-green-600 bg-green-50 border border-green-200 hover:bg-green-100 hover:border-green-300 transition-all duration-200"
                  >
                    <CloudArrowDownIcon className="w-4 h-4 mr-2" />
                    Download All
                  </button>
              ) : metaData && metaData.totalRecords > 0 ? (
                  <div className="inline-flex items-center px-4 py-2 rounded-lg bg-green-50 border border-green-200">
                    <svg className="animate-spin w-4 h-4 mr-2 text-green-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-medium text-green-600">Downloading All...</span>
                  </div>
              ) : (
                  <div className="inline-flex items-center px-4 py-2 rounded-lg bg-green-50 border border-green-200 opacity-50 cursor-not-allowed">
                    <span className="text-sm font-medium text-green-600">No Data</span>
                  </div>
              )}
              {metaData && metaData.totalRecords - metaData.validRecords > 0 && !downloadig.errors ? (
                  <button
                      onClick={() => onBtnExport(false, 'errors')}
                      className="inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all duration-200"
                  >
                    <CloudArrowDownIcon className="w-4 h-4 mr-2" />
                    Download Errors
                  </button>
              ) : metaData && metaData.totalRecords - metaData.validRecords > 0 ? (
                  <div className="inline-flex items-center px-4 py-2 rounded-lg bg-red-50 border border-red-200">
                    <svg className="animate-spin w-4 h-4 mr-2 text-red-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-medium text-red-600">Downloading Errors...</span>
                  </div>
              ) : (
                  <div className="inline-flex items-center px-4 py-2 rounded-lg bg-red-50 border border-red-200 opacity-50 cursor-not-allowed">
                    <span className="text-sm font-medium text-red-600">No Errors</span>
                  </div>
              )}
              {metaData && metaData.validRecords > 0 && !downloadig.valid ? (
                  <button
                      onClick={() => onBtnExport(false, 'valid')}
                      className="inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200"
                  >
                    <CloudArrowDownIcon className="w-4 h-4 mr-2" />
                    Download Valid
                  </button>
              ) : metaData && metaData.validRecords > 0 ? (
                  <div className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-50 border border-blue-200">
                    <svg className="animate-spin w-4 h-4 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-medium text-blue-600">Downloading Valid...</span>
                  </div>
              ) : (
                  <div className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 opacity-50 cursor-not-allowed">
                    <span className="text-sm font-medium text-blue-600">No Valid Rows</span>
                  </div>
              )}
              <button
                  onClick={onBtnSubmit}
                  className="inline-flex items-center px-6 py-2 rounded-lg font-medium text-sm text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
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
      </>
  );
};

export default ReviewCsv;