import React, {
  useContext,
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from 'react';
import { AgGridReact } from 'ag-grid-react';
import { InfiniteRowModelModule } from '@ag-grid-community/infinite-row-model';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
import { ModuleRegistry } from '@ag-grid-community/core';
import tooltip from './tooltip';
import { Context } from '../../context';
import axios from 'axios';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import Stepper from '../stepper';
import {
  customBoolean,
  customDateTime,
  customThreeDigitNumber,
  customNoGmailDomain,
  validInternationalPhoneNumber,
} from '../../lib/validation-engine';
import {
  BOOLEAN_FORMAT,
  DATE_TIME_FORMAT,
  NO_GMAIL_FORMAT,
  PHONE_NUMBER_FORMAT,
  THREE_DIGIT_NUMBER_FORMAT,
} from '../../constants';
import ReviewCsv from './reviewCsv';
import Confetti from '../confetti';
import { ajvCompileCustomValidator } from '../../lib/validation_util/yovalidator';
import { Info } from 'lucide-react';

ModuleRegistry.registerModules([InfiniteRowModelModule]);

const GridExample = ({ version }) => {
  const gridRef = useRef();
  const { state } = useContext(Context);
  const [columnDefs, setColumnDefs] = useState([
    {
      headerName: 'Row',
      valueGetter: 'node.rowIndex + 1',
      maxWidth: 80,
      pinned: 'left',
      lockPinned: true,
      cellClass: 'row-number-cell',
    },
    {
      headerName: 'feedback',
      field: 'feedback',
      hide: true,
    },
    {
      headerName: 'old',
      field: '_old',
      hide: true,
    },
    {
      headerName: 'corrections',
      field: '_corrections',
      hide: true,
    },
  ]);
  const [fileMetaData, setFileMetaData] = useState();
  const [isErrorFree, setIsErrorFree] = useState(false);
  const [originalDataSource, setOriginalDataSource] = useState();
  const [selectedErrorType, setSelectedErrorType] = useState();
  const [errorFilter, setErrorFilter] = useState(false);
  const [feedbackData, setFeedbackData] = useState({});
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [autofixValues, setAutofixValues] = useState([]);
  const [changedRowsIndex, setChangedRowsIndex] = useState([]);
  const [schema, setSchema] = useState({});
  const [autofixedlabels, setautofixedLabels] = useState([]);
  let templateColumns = [];
  let template = {};
  let userSchema = {};
  let recordsUri = `/api/meta/count?collection_name=${state.collection}`;
  let errorCountUri = `/api/meta/errorcount?collection_name=${state.collection}`;

  const getAiRecommendations = useCallback(() => {
    setLoadingSuggestions(true);
    fetch(`/api/datadock-ai/feedback?collection=${state.collection}`)
        .then((res) => res.json())
        .then((data) => {
          setFeedbackData(data.data);
          const rowCount = gridRef.current.api.getDisplayedRowCount();
          for (let i = 0; i < rowCount; i++) {
            const rowNode = gridRef.current.api.getDisplayedRowAtIndex(i);
            if (data.data[rowNode.data._id]) {
              rowNode.setDataValue('feedback', JSON.stringify(data.data[rowNode.data._id]?.feedback || data.data[rowNode.data._id]?.Feedback));
            }
          }
          gridRef.current.api.refreshCells({ force: true });
          setLoadingSuggestions(false);
        });
  }, [state.collection, gridRef, setLoadingSuggestions]);

  const showOnlyErrors = useCallback(
      (enabled) => {
        setErrorFilter(enabled);
        if (enabled) {
          const dataSource = {
            rowCount: undefined,
            getRows: async (params) => {
              let url = `/api/meta?collection=${state.collection}&`;
              url += `_start=${params.startRow}&_end=${params.endRow}`;
              url += '&only_errors=true';
              if (selectedErrorType && selectedErrorType != 'No selection') {
                url += `&column_name=${selectedErrorType}`;
              }
              fetch(url)
                  .then((httpResponse) => httpResponse.json())
                  .then((response) => {
                    params.successCallback(response.data, response.data.length);
                  })
                  .catch((error) => {
                    console.error(error);
                    params.failCallback();
                  });
            },
          };
          gridRef.current.api.setDatasource(dataSource);
        } else {
          gridRef.current.api.setDatasource(originalDataSource);
        }
      },
      [originalDataSource, selectedErrorType, state.collection, feedbackData]
  );

  const runAutofix = (label) => {
    if (gridRef?.current) {
      const itemsToUpdate = [];
      for (const row of autofixValues) {
        if (row.field === label) {
          const rowNode = gridRef.current.api.getDisplayedRowAtIndex(row.index);
          const data = rowNode.data;
          let oldValuesObj = rowNode.data._old || {};
          oldValuesObj[row.field] = row.oldValue;
          let correctionsObj = rowNode.data._corrections || {};
          delete correctionsObj[row.field];
          data._old = oldValuesObj;
          data._corrections = correctionsObj;
          data[row.field] = row.newValue || "";
          itemsToUpdate.push(data);
          setChangedRowsIndex((prev) => (prev.includes(row.index)) ? prev : prev.concat(row.index));
        }
      }
      userSchema = schema;
      autofixUpdateDb(itemsToUpdate, gridRef.current, label);
      gridRef.current.api.applyTransaction({ update: itemsToUpdate });
      gridRef.current.api.refreshCells({ force: true });
      autofixedlabels.push(label);
      setautofixedLabels([...autofixedlabels]);
    }
  };

  const undoAutoFix = () => {
    if (gridRef?.current) {
      const itemsToUpdate = [];
      for (const index of changedRowsIndex) {
        const rowNode = gridRef.current.api.getDisplayedRowAtIndex(index);
        const changedFields = rowNode.data._old ? Object.keys(rowNode.data._old) : [];
        let correctionsObj = {};
        let data = rowNode.data;
        for (const field of changedFields) {
          correctionsObj[field] = rowNode.data[field] || "";
          data[field] = rowNode.data._old[field] || "";
        }
        data._corrections = correctionsObj;
        itemsToUpdate.push(data);
      }
      gridRef.current.api.applyTransaction({ update: itemsToUpdate });
      gridRef.current.api.refreshCells({ force: true });
      setChangedRowsIndex([]);
    }
  };

  const autofixUpdateDb = (itemsToUpdate, params, label) => {
    let dataToBeUpdated = [];

    const removeByKey = (arr, key) => {
      const requiredIndex = arr.findIndex((el) => {
        return el.key === String(key);
      });
      if (requiredIndex === -1) {
        return false;
      }
      return !!arr.splice(requiredIndex, 1);
    };

    for (let item of itemsToUpdate) {
      let dbupdate = cellCheckBySchema(label, item[label]);
      if (!dbupdate) {
        let obj = {};
        obj.collection_id = state.collection;
        let validation_Arr = [];
        if (item && item.validationData) {
          validation_Arr = item.validationData;
          removeByKey(validation_Arr, label);
        }
        delete item.validationData;
        obj.data = item;
        obj.data.validationData = validation_Arr;
        obj.data._id = item._id;
        dataToBeUpdated.push(obj);
      }
    }
    let url = '/api/autofix';
    axios
        .post(url, dataToBeUpdated)
        .then((res) => {
          axios.get(errorCountUri).then((res) => {
            setFileMetaData((prev) => {
              return { ...prev, ...res.data };
            });
          });
        })
        .catch((err) => console.log(err));
  };

  const openAutofixModal = () => {
    if (gridRef?.current) {
      let autofixArray = [];
      gridRef.current.api.forEachNode((node) => {
        let correctionList = Object.keys(node.data._corrections || {});
        if (correctionList?.length > 0) {
          for (const field of correctionList) {
            autofixArray.push({ index: node.rowIndex, field: field, oldValue: node.data[field], newValue: node.data._corrections[field] || "" });
          }
        }
      });
      setAutofixValues(autofixArray);
    }
  };

  useEffect(() => {
    if (!selectedErrorType) return;
    let currentColumnDefs = gridRef?.current?.api?.getColumnDefs();
    if (Array.isArray(currentColumnDefs)) {
      let newColumnDefs = currentColumnDefs.map((elem) => {
        if (['feedback', 'corrections', 'old'].includes(elem.headerName)) {
          elem.hide = true;
        } else if (selectedErrorType === 'No selection' || elem.headerName === 'Row') {
          elem.hide = false;
        } else {
          elem.hide = elem.headerName === selectedErrorType ? false : true;
        }
        return elem;
      });
      setColumnDefs(newColumnDefs);
      showOnlyErrors(errorFilter);
    }
  }, [selectedErrorType, showOnlyErrors, errorFilter]);

  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      resizable: true,
      minWidth: 100,
      tooltipComponent: tooltip,
      cellClass: 'modern-cell',
      headerClass: 'modern-header',
    };
  }, []);

  const onShowLoading = useCallback(() => {
    gridRef.current.api.showLoadingOverlay();
  }, []);

  const onLoadingHide = useCallback(() => {
    gridRef.current.api.hideOverlay();
  }, []);

  const onGridReady = useCallback(
      async (params) => {
        let countOfRecords = 0;
        const dataSchema = () => {
          let schemaUrl = '/api/templates';
          const headers = {
            template_id: state.template,
          };

          fetch(schemaUrl, { headers })
              .then((httpResponse) => httpResponse.json())
              .then((response) => {
                templateColumns = response.columns;
                template = response;
                userSchema = response.schema;
                setSchema(response.schema);
                setColumnDefs((prev) =>
                    prev.concat(
                        templateColumns.map((x) => {
                          return {
                            headerName: x.label,
                            field: x.label,
                            editable: true,
                            cellClassRules: cellPassRules,
                            tooltipField: x.label,
                            hide: false,
                            headerClass: 'modern-header',
                            cellClass: 'modern-cell',
                            cellRenderer: (props) => {
                              if (props.value !== undefined) {
                                let feedback;
                                try {
                                  let feedbackObj = JSON.parse(props.data.feedback || '{}');
                                  if (feedbackObj) {
                                    if (Object.keys(feedbackObj).length > 0) {
                                      feedback = feedbackObj[props.colDef.headerName];
                                    }
                                  }
                                } catch (e) {}
                                onLoadingHide();
                                return (
                                    <div className="cell-content">
                                      <span className="cell-value">{props.value}</span>
                                      {feedback && (
                                          <div className="feedback-indicator">
                                            <Info
                                                className="w-4 h-4 text-blue-500 hover:text-blue-700 transition-colors cursor-pointer"
                                                title={`AI Suggestion: ${feedback}`}
                                            />
                                          </div>
                                      )}
                                    </div>
                                );
                              } else {
                                return onShowLoading();
                              }
                            },
                          };
                        })
                    )
                );
              });
        };
        dataSchema();

        await axios
            .get(recordsUri)
            .then((res) => {
              setFileMetaData(res.data);
              countOfRecords = res.data.totalRecords;
              axios
                  .get(errorCountUri)
                  .then((res) => {
                    setFileMetaData((prev) => {
                      return { ...prev, ...res.data };
                    });
                  })
                  .catch((err) => console.log(err));
            })
            .catch((err) => console.log(err));

        const dataSource = {
          rowCount: undefined,
          getRows: async (params) => {
            let url = `/api/meta?collection=${state.collection}&`;
            url += `_start=${params.startRow}&_end=${params.endRow}`;
            fetch(url)
                .then((httpResponse) => httpResponse.json())
                .then((response) => {
                  params.successCallback(response.data, countOfRecords);
                })
                .catch((error) => {
                  console.error(error);
                  params.failCallback();
                });
          },
        };
        params.api.setDatasource(dataSource);
        setOriginalDataSource(dataSource);
      },
      [state.collection, selectedErrorType, feedbackData]
  );

  const cellPassRules = {
    'cell-fail': (params) =>
        cellCheckBySchema(params.colDef.field, params.value),
    'null-check': (params) =>
        nullValCheckBySchema(params.colDef.field, params.value),
    'cell-modified': (params) =>
        changedRowsIndex.includes(params.node.rowIndex),
  };

  const cellCheckBySchema = (field, value) => {
    let flag = false;
    let error_flg = false;
    let data = value;

    if (field && value) {
      if (isNaN(value)) {
        flag = true;
      } else {
        data = JSON.parse(value);
      }

      let schemaProps = userSchema.properties || schema.properties;

      if (field in schemaProps) {
        let fieldSchema = schemaProps[field];
        let ajv = ajvCompileCustomValidator({ template });
        let valid = ajv.validate(fieldSchema, data);
        if (!valid) {
          error_flg = true;
        } else error_flg = false;
      }
    }

    return error_flg;
  };

  const nullValCheckBySchema = (field, value) => {
    let nullflag = false;
    if (field && !value) {
      let schemaRequired = userSchema.required || schema.required || [];
      if (schemaRequired.length) {
        if (schemaRequired.includes(field)) nullflag = true;
      }
    }
    return nullflag;
  };

  const onCellValueChanged = useCallback((params) => {
    let dbupdate = false;
    if (params.oldValue !== params.newValue) {
      let column = params.column.colDef.field;

      dbupdate = cellCheckBySchema(column, params.newValue);
      const removeByKey = (arr, key) => {
        const requiredIndex = arr.findIndex((el) => {
          return el.key === String(key);
        });
        if (requiredIndex === -1) {
          return false;
        }
        return !!arr.splice(requiredIndex, 1);
      };

      if (!dbupdate) {
        let obj = {};
        obj.collection_id = state.collection;
        let validation_Arr = [];
        if (params.data && params.data.validationData) {
          validation_Arr = params.data.validationData;
          removeByKey(validation_Arr, column);
        }
        delete params.data.validationData;
        obj.data = params.data;
        obj.data.validationData = validation_Arr;
        obj.data._id = params.data._id;

        let url = '/api/update';
        params.column.colDef.cellStyle = { backgroundColor: '' };
        params.api.refreshCells({
          force: true,
          columns: [column],
          rowNodes: [params.node],
        });

        axios
            .post(url, obj)
            .then((res) => {
              axios.get(errorCountUri).then((res) => {
                setFileMetaData((prev) => {
                  return { ...prev, ...res.data };
                });
              });
            })
            .catch((err) => console.log(err));
      } else {
        params.column.colDef.cellStyle = {
          backgroundColor: 'rgb(254 242 242)',
          borderLeft: '3px solid rgb(239 68 68)',
        };
        params.api.refreshCells({
          force: true,
          columns: [column],
          rowNodes: [params.node],
        });
      }
    }
  }, []);

  const customLoadingTemplate = `
    <div class="custom-loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner">
          <svg class="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <div class="loading-text">
          <h3 class="text-sm font-semibold text-gray-900">Loading Data</h3>
          <p class="text-xs text-gray-600">Please wait while we fetch your rows...</p>
        </div>
      </div>
    </div>
  `;

  return (
      <>
        <style jsx global>{`
          .ag-theme-alpine {
            --ag-header-height: 32px;
            --ag-row-height: 32px;
            --ag-border-color: #dbeafe;
            --ag-header-background-color: #eff6ff;
            --ag-row-hover-color: #dbeafe;
            --ag-selected-row-background-color: #bfdbfe;
            --ag-odd-row-background-color: #ffffff;
            --ag-even-row-background-color: #f8fafc;
            --ag-cell-horizontal-border: 1px solid #dbeafe;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.05);
            background: #ffffff;
          }

          .ag-theme-alpine .ag-body-viewport {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .ag-theme-alpine .ag-body-viewport::-webkit-scrollbar {
            display: none;
          }

          .modern-header {
            background: #eff6ff;
            border-bottom: 1px solid #dbeafe;
            font-weight: 600;
            font-size: 12px;
            color: #1e40af;
            padding: 0 12px;
            display: flex;
            align-items: center;
          }

          .modern-cell {
            padding: 6px 12px;
            border-right: 1px solid #dbeafe;
            transition: all 0.2s ease;
            background: #ffffff;
          }

          .row-number-cell {
            background: #eff6ff;
            font-weight: 600;
            color: #4b5563;
            text-align: center;
            border-right: 1px solid #dbeafe;
          }

          .cell-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            height: 100%;
          }

          .cell-value {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .feedback-indicator {
            margin-left: 6px;
            flex-shrink: 0;
          }

          .ag-cell.cell-fail {
            background: #fef2f2;
            border-left: 3px solid #ef4444;
            color: #dc2626;
            font-weight: 500;
          }

          .ag-cell.null-check {
            background: #fffbeb;
            border-left: 3px solid #f59e0b;
            color: #d97706;
            font-weight: 500;
          }

          .ag-cell.cell-modified {
            background: #f0fdf4;
            border-left: 3px solid #22c55e;
            color: #16a34a;
            font-weight: 500;
          }

          .ag-cell:hover {
            background: #dbeafe;
            transform: translateY(-1px);
          }

          .ag-cell:focus-within {
            outline: 2px solid #1e40af;
            outline-offset: -2px;
          }

          .custom-loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .loading-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            padding: 24px;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.05);
          }

          .loading-text h3 {
            margin: 0 0 6px 0;
            font-size: 14px;
            font-weight: 600;
            color: #1e3a8a;
            text-align: center;
          }

          .loading-text p {
            margin: 0;
            font-size: 12px;
            color: #4b5563;
            text-align: center;
          }

          .ag-header-cell-text {
            font-weight: 600;
            font-size: 12px;
          }

          .ag-pinned-left-header {
            border-right: 1px solid #dbeafe;
          }

          .ag-pinned-left-cols-container {
            border-right: 1px solid #dbeafe;
          }

          .ag-row-selected {
            background: #bfdbfe;
            border-left: 3px solid #1e40af;
          }

          .ag-row-hover {
            background: #dbeafe;
            transform: translateY(-1px);
          }

          .ag-header-row {
            background: #eff6ff;
          }

          .ag-root-wrapper {
            border-radius: 8px;
            overflow: hidden;
          }
        `}</style>

        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
          <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-md border border-blue-100 mb-6">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-blue-600 rounded-lg">
                        <Info className="w-6 h-6 text-white" />
                      </div>
                      <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                        Data Review Grid
                      </h1>
                    </div>
                    <p className="text-sm text-gray-600">
                      Review and edit your data with real-time validation
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">Errors</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">Required</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">Modified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="space-y-4">
              {version === 'norm' && <Stepper step={4} />}
              {isErrorFree && <Confetti />}

              <ReviewCsv
                  collectionName={state.collection}
                  fileName={state?.curFile?.path}
                  fileMetaData={fileMetaData}
                  setIsErrorFree={setIsErrorFree}
                  showOnlyErrors={showOnlyErrors}
                  selectErrorType={setSelectedErrorType}
                  getAiRecommendations={getAiRecommendations}
                  loadingSuggestions={loadingSuggestions}
                  columnDefs={columnDefs}
                  runAutofix={runAutofix}
                  openAutofixModal={openAutofixModal}
                  autofixValues={autofixValues}
                  undoAutoFix={undoAutoFix}
              />

              <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden">
                <div
                    style={{ height: 400, width: '100%' }}
                    className="ag-theme-alpine"
                >
                  <AgGridReact
                      ref={gridRef}
                      columnDefs={columnDefs}
                      defaultColDef={defaultColDef}
                      rowBuffer={0}
                      rowSelection={'single'}
                      rowModelType={'infinite'}
                      cacheBlockSize={100}
                      cacheOverflowSize={2}
                      maxConcurrentDatasourceRequests={1}
                      infiniteInitialRowCount={1000}
                      maxBlocksInCache={10}
                      tooltipShowDelay={0}
                      tooltipHideDelay={999999}
                      onCellValueChanged={onCellValueChanged}
                      onGridReady={onGridReady}
                      rowHeight={32}
                      headerHeight={32}
                      animateRows={true}
                      enableRangeSelection={true}
                      suppressMovableColumns={true}
                      overlayLoadingTemplate={customLoadingTemplate}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
  );
};

export default GridExample;