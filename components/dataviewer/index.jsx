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
import { InformationCircleIcon } from '@heroicons/react/24/solid';

ModuleRegistry.registerModules([InfiniteRowModelModule]);

const GridExample = ({ version }) => {
  const gridRef = useRef();
  const { state } = useContext(Context);
  const [columnDefs, setColumnDefs] = useState([
    {
      headerName: 'Row',
      valueGetter: 'node.rowIndex + 1',
      maxWidth: 100,
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
      minWidth: 120,
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
                                            <InformationCircleIcon
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
          <svg class="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <div class="loading-text">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Loading Data</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">Please wait while we fetch your rows...</p>
        </div>
      </div>
    </div>
  `;

  return (
      <>
        <style jsx global>{`
          .ag-theme-alpine {
            --ag-header-height: 48px;
            --ag-row-height: 48px;
            --ag-border-color: #e5e7eb;
            --ag-header-background-color: transparent;
            --ag-row-hover-color: #f3f4f6;
            --ag-selected-row-background-color: #dbeafe;
            --ag-odd-row-background-color: transparent;
            --ag-even-row-background-color: transparent;
            --ag-cell-horizontal-border: 1px solid #e5e7eb;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            background: transparent;
          }

          .ag-theme-alpine-dark {
            --ag-header-height: 48px;
            --ag-row-height: 48px;
            --ag-border-color: #374151;
            --ag-header-background-color: transparent;
            --ag-row-hover-color: #4b5563;
            --ag-selected-row-background-color: #1e40af;
            --ag-odd-row-background-color: transparent;
            --ag-even-row-background-color: transparent;
            --ag-cell-horizontal-border: 1px solid #374151;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.2), 0 4px 6px -4px rgb(0 0 0 / 0.2);
            background: transparent;
          }

          .ag-theme-alpine .ag-body-viewport,
          .ag-theme-alpine-dark .ag-body-viewport {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .ag-theme-alpine .ag-body-viewport::-webkit-scrollbar,
          .ag-theme-alpine-dark .ag-body-viewport::-webkit-scrollbar {
            display: none;
          }

          .modern-header {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-bottom: 2px solid #e5e7eb;
            font-weight: 600;
            font-size: 14px;
            color: #1f2937;
            padding: 0 16px;
            display: flex;
            align-items: center;
          }

          .ag-theme-alpine-dark .modern-header {
            background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
            border-bottom: 2px solid #374151;
            color: #f9fafb;
          }

          .modern-cell {
            padding: 8px 16px;
            border-right: 1px solid #e5e7eb;
            transition: all 0.2s ease;
            background: transparent;
          }

          .ag-theme-alpine-dark .modern-cell {
            border-right: 1px solid #374151;
            color: #f9fafb;
          }

          .row-number-cell {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            font-weight: 600;
            color: #6b7280;
            text-align: center;
            border-right: 2px solid #e5e7eb;
          }

          .ag-theme-alpine-dark .row-number-cell {
            background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
            border-right: 2px solid #374151;
            color: #d1d5db;
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
            margin-left: 8px;
            flex-shrink: 0;
          }

          .ag-cell.cell-fail {
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            border-left: 4px solid #ef4444;
            color: #dc2626;
            font-weight: 500;
          }

          .ag-theme-alpine-dark .ag-cell.cell-fail {
            background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
            border-left: 4px solid #f87171;
            color: #f87171;
          }

          .ag-cell.null-check {
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
            border-left: 4px solid #f59e0b;
            color: #d97706;
            font-weight: 500;
          }

          .ag-theme-alpine-dark .ag-cell.null-check {
            background: linear-gradient(135deg, #713f12 0%, #854d0e 100%);
            border-left: 4px solid #facc15;
            color: #facc15;
          }

          .ag-cell.cell-modified {
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border-left: 4px solid #22c55e;
            color: #16a34a;
            font-weight: 500;
          }

          .ag-theme-alpine-dark .ag-cell.cell-modified {
            background: linear-gradient(135deg, #14532d 0%, #15803d 100%);
            border-left: 4px solid #4ade80;
            color: #4ade80;
          }

          .ag-cell:hover {
            background: #f3f4f6;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.1);
          }

          .ag-theme-alpine-dark .ag-cell:hover {
            background: #4b5563;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.2);
          }

          .ag-cell:focus-within {
            outline: 2px solid #3b82f6;
            outline-offset: -2px;
          }

          .ag-theme-alpine-dark .ag-cell:focus-within {
            outline: 2px solid #60a5fa;
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

          .ag-theme-alpine-dark .custom-loading-overlay {
            background: rgba(17, 24, 39, 0.95);
          }

          .loading-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            padding: 32px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
          }

          .ag-theme-alpine-dark .loading-content {
            background: #1f2937;
          }

          .loading-spinner {
            display: flex;
            justify-content: center;
          }

          .loading-text h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            text-align: center;
          }

          .ag-theme-alpine-dark .loading-text h3 {
            color: #f9fafb;
          }

          .loading-text p {
            margin: 0;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
          }

          .ag-theme-alpine-dark .loading-text p {
            color: #d1d5db;
          }

          .ag-header-cell-text {
            font-weight: 600;
            font-size: 14px;
          }

          .ag-pinned-left-header {
            border-right: 2px solid #e5e7eb;
          }

          .ag-theme-alpine-dark .ag-pinned-left-header {
            border-right: 2px solid #374151;
          }

          .ag-pinned-left-cols-container {
            border-right: 2px solid #e5e7eb;
          }

          .ag-theme-alpine-dark .ag-pinned-left-cols-container {
            border-right: 2px solid #374151;
          }

          .ag-row-selected {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            border-left: 4px solid #3b82f6;
          }

          .ag-theme-alpine-dark .ag-row-selected {
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            border-left: 4px solid #60a5fa;
          }

          .ag-row-hover {
            background: #f3f4f6;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.1);
          }

          .ag-theme-alpine-dark .ag-row-hover {
            background: #4b5563;
            box-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.2);
          }

          .ag-row-even,
          .ag-row-odd {
            background: transparent;
          }

          .ag-header-row {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          }

          .ag-theme-alpine-dark .ag-header-row {
            background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
          }

          .ag-root-wrapper {
            border-radius: 16px;
            overflow: hidden;
          }
        `}</style>

        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Data Review Grid
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Review and edit your data with real-time validation
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Errors</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Required</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Modified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-6 py-8">
            {version === 'norm' && <Stepper step={4} />}
            {isErrorFree && <Confetti />}

            <div className="space-y-6">
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

              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                <div
                    style={{ height: 520, width: '100%' }}
                    className="ag-theme-alpine dark:ag-theme-alpine-dark"
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
                      rowHeight={48}
                      headerHeight={48}
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