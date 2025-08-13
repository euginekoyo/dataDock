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
import Stepper from '../stepper';
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
  const [template, setTemplate] = useState({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Memoized URIs to prevent unnecessary re-renders
  const recordsUri = useMemo(() =>
          `/api/meta/count?collection_name=${state.collection}`,
      [state.collection]
  );
  const errorCountUri = useMemo(() =>
          `/api/meta/errorcount?collection_name=${state.collection}`,
      [state.collection]
  );

  // Validation functions defined before cellPassRules (CRITICAL)
  const cellCheckBySchema = useCallback((field, value) => {
    console.log('cellCheckBySchema called:', { field, value, schema: Object.keys(schema).length });

    if (!field || value === undefined || value === null) return false;

    let errorFlg = false;
    let data = value;

    // Handle different data types
    if (typeof value === 'string' && value.trim() === '') {
      data = '';
    } else if (typeof value === 'string' && !isNaN(value) && value !== '') {
      try {
        data = JSON.parse(value);
      } catch (e) {
        // Keep as string if parsing fails
        data = value;
      }
    }

    // Use schema for validation
    const schemaProps = schema.properties || {};
    if (field in schemaProps && Object.keys(schema).length > 0) {
      const fieldSchema = schemaProps[field];
      console.log('Validating field:', field, 'with value:', data, 'against schema:', fieldSchema);

      try {
        const ajv = ajvCompileCustomValidator({ template });
        const valid = ajv.validate(fieldSchema, data);
        errorFlg = !valid;

        if (!valid) {
          console.log('Validation failed for:', field, 'errors:', ajv.errors);
        }
      } catch (e) {
        console.error('Validation error:', e);
        errorFlg = false;
      }
    }

    console.log('cellCheckBySchema result:', { field, value, errorFlg });
    return errorFlg;
  }, [schema, template]);

  const nullValCheckBySchema = useCallback((field, value) => {
    console.log('nullValCheckBySchema called:', { field, value, schema: Object.keys(schema).length });

    if (!field) return false;

    let nullFlag = false;
    if (value === undefined || value === null || value === '') {
      const schemaRequired = schema.required || [];
      if (schemaRequired.length && schemaRequired.includes(field)) {
        nullFlag = true;
        console.log('Null check failed for required field:', field);
      }
    }

    console.log('nullValCheckBySchema result:', { field, value, nullFlag });
    return nullFlag;
  }, [schema]);

  // cellPassRules defined AFTER validation functions with proper dependencies
  const cellPassRules = useMemo(() => {
    console.log('Creating cellPassRules with schema keys:', Object.keys(schema).length);
    return {
      'cell-fail': (params) => {
        const result = cellCheckBySchema(params.colDef.field, params.value);
        if (result) console.log('cell-fail rule triggered for:', params.colDef.field, params.value);
        return result;
      },
      'null-check': (params) => {
        const result = nullValCheckBySchema(params.colDef.field, params.value);
        if (result) console.log('null-check rule triggered for:', params.colDef.field, params.value);
        return result;
      },
      'cell-modified': (params) => {
        const result = changedRowsIndex.includes(params.node.rowIndex);
        if (result) console.log('cell-modified rule triggered for row:', params.node.rowIndex);
        return result;
      },
    };
  }, [cellCheckBySchema, nullValCheckBySchema, changedRowsIndex, schema]);

  // Enhanced cell renderer with loading state handling
  const cellRenderer = useCallback((props) => {
    // Handle loading state properly
    if (props.value === undefined) {
      return <span className="cell-value empty-cell">Loading...</span>;
    }

    // Enhanced feedback parsing
    let feedback;
    try {
      const feedbackObj = JSON.parse(props.data.feedback || '{}');
      if (feedbackObj && Object.keys(feedbackObj).length > 0) {
        feedback = feedbackObj[props.colDef.headerName];
      }
    } catch (e) {
      // Silently handle parsing errors
    }

    return (
        <div className="cell-content">
          <span className="cell-value">{props.value}</span>
          <div className="cell-indicators">
            {feedback && (
                <div className="feedback-indicator">
                  <Info
                      className="w-4 h-4 text-blue-500 hover:text-blue-700 transition-colors cursor-pointer"
                      title={`AI Suggestion: ${feedback}`}
                  />
                </div>
            )}
          </div>
        </div>
    );
  }, []);

  const getAiRecommendations = useCallback(() => {
    setLoadingSuggestions(true);
    fetch(`/api/datadock-ai/feedback?collection=${state.collection}`)
        .then((res) => res.json())
        .then((data) => {
          setFeedbackData(data.data);
          const rowCount = gridRef.current?.api?.getDisplayedRowCount() || 0;
          for (let i = 0; i < rowCount; i++) {
            const rowNode = gridRef.current.api.getDisplayedRowAtIndex(i);
            if (rowNode && data.data[rowNode.data._id]) {
              rowNode.setDataValue('feedback', JSON.stringify(data.data[rowNode.data._id]?.feedback || data.data[rowNode.data._id]?.Feedback));
            }
          }
          gridRef.current?.api?.refreshCells({ force: true });
          setLoadingSuggestions(false);
        })
        .catch((error) => {
          console.error('Error fetching AI recommendations:', error);
          setLoadingSuggestions(false);
        });
  }, [state.collection]);

  const showOnlyErrors = useCallback((enabled) => {
    setErrorFilter(enabled);
    if (enabled) {
      const dataSource = {
        rowCount: undefined, // Keep undefined for error filtering
        getRows: async (params) => {
          let url = `/api/meta?collection=${state.collection}&_start=${params.startRow}&_end=${params.endRow}`;
          url += '&only_errors=true';
          if (selectedErrorType && selectedErrorType !== 'No selection') {
            url += `&column_name=${selectedErrorType}`;
          }
          try {
            const response = await fetch(url);
            const data = await response.json();
            params.successCallback(data.data, data.data.length);
          } catch (error) {
            console.error('Error fetching filtered data:', error);
            params.failCallback();
          }
        },
      };
      gridRef.current?.api?.setDatasource(dataSource);
    } else {
      gridRef.current?.api?.setDatasource(originalDataSource);
    }
  }, [originalDataSource, selectedErrorType, state.collection]);

  const runAutofix = useCallback((label) => {
    if (!gridRef?.current) return;

    const itemsToUpdate = [];
    for (const row of autofixValues) {
      if (row.field === label) {
        const rowNode = gridRef.current.api.getDisplayedRowAtIndex(row.index);
        if (!rowNode) continue;

        const data = rowNode.data;
        const oldValuesObj = rowNode.data._old || {};
        oldValuesObj[row.field] = row.oldValue;
        const correctionsObj = rowNode.data._corrections || {};
        delete correctionsObj[row.field];

        data._old = oldValuesObj;
        data._corrections = correctionsObj;
        data[row.field] = row.newValue || '';
        itemsToUpdate.push(data);

        setChangedRowsIndex((prev) => (prev.includes(row.index) ? prev : [...prev, row.index]));
      }
    }

    autofixUpdateDb(itemsToUpdate, gridRef.current, label);
    gridRef.current.api.applyTransaction({ update: itemsToUpdate });
    gridRef.current.api.refreshCells({ force: true });

    setautofixedLabels(prev => [...prev, label]);
  }, [autofixValues]);

  const undoAutoFix = useCallback(() => {
    if (!gridRef?.current) return;

    const itemsToUpdate = [];
    for (const index of changedRowsIndex) {
      const rowNode = gridRef.current.api.getDisplayedRowAtIndex(index);
      if (!rowNode) continue;

      const changedFields = rowNode.data._old ? Object.keys(rowNode.data._old) : [];
      const correctionsObj = {};
      const data = rowNode.data;

      for (const field of changedFields) {
        correctionsObj[field] = rowNode.data[field] || '';
        data[field] = rowNode.data._old[field] || '';
      }
      data._corrections = correctionsObj;
      itemsToUpdate.push(data);
    }

    gridRef.current.api.applyTransaction({ update: itemsToUpdate });
    gridRef.current.api.refreshCells({ force: true });
    setChangedRowsIndex([]);
  }, [changedRowsIndex]);

  const autofixUpdateDb = useCallback((itemsToUpdate, params, label) => {
    const dataToBeUpdated = [];
    const removeByKey = (arr, key) => {
      const requiredIndex = arr.findIndex((el) => el.key === String(key));
      if (requiredIndex === -1) return false;
      return !!arr.splice(requiredIndex, 1);
    };

    for (const item of itemsToUpdate) {
      const dbupdate = cellCheckBySchema(label, item[label]);
      if (!dbupdate) {
        const obj = {
          collection_id: state.collection,
          data: { ...item }
        };

        let validationArr = [];
        if (item?.validationData) {
          validationArr = [...item.validationData];
          removeByKey(validationArr, label);
        }

        delete obj.data.validationData;
        obj.data.validationData = validationArr;
        obj.data._id = item._id;
        dataToBeUpdated.push(obj);
      }
    }

    if (dataToBeUpdated.length === 0) return;

    axios.post('/api/autofix', dataToBeUpdated)
        .then(() => axios.get(errorCountUri))
        .then((res) => {
          setFileMetaData((prev) => ({ ...prev, ...res.data }));
        })
        .catch((err) => console.error('Autofix error:', err));
  }, [cellCheckBySchema, state.collection, errorCountUri]);

  const openAutofixModal = useCallback(() => {
    if (!gridRef?.current) return;

    const autofixArray = [];
    gridRef.current.api.forEachNode((node) => {
      const correctionList = Object.keys(node.data._corrections || {});
      if (correctionList?.length > 0) {
        for (const field of correctionList) {
          autofixArray.push({
            index: node.rowIndex,
            field: field,
            oldValue: node.data[field],
            newValue: node.data._corrections[field] || '',
          });
        }
      }
    });
    setAutofixValues(autofixArray);
  }, []);

  // Effect for error type changes
  useEffect(() => {
    if (!selectedErrorType || !gridRef?.current?.api) return;

    const currentColumnDefs = gridRef.current.api.getColumnDefs();
    if (!Array.isArray(currentColumnDefs)) return;

    const newColumnDefs = currentColumnDefs.map((elem) => {
      if (['feedback', 'corrections', 'old'].includes(elem.headerName)) {
        return { ...elem, hide: true };
      } else if (selectedErrorType === 'No selection' || elem.headerName === 'Row') {
        return { ...elem, hide: false };
      } else {
        return { ...elem, hide: elem.headerName !== selectedErrorType };
      }
    });

    setColumnDefs(newColumnDefs);
    showOnlyErrors(errorFilter);
  }, [selectedErrorType, showOnlyErrors, errorFilter]);

  // Effect to refresh cells when schema or template changes (CRITICAL for error highlighting)
  useEffect(() => {
    if (gridRef?.current?.api && Object.keys(schema).length > 0) {
      // Update column definitions to ensure cellClassRules are properly applied
      const currentColumnDefs = gridRef.current.api.getColumnDefs();
      if (Array.isArray(currentColumnDefs)) {
        const updatedColumnDefs = currentColumnDefs.map((colDef) => {
          if (colDef.field && colDef.field !== 'feedback' && colDef.field !== '_old' && colDef.field !== '_corrections' && colDef.headerName !== 'Row') {
            return {
              ...colDef,
              cellClassRules: cellPassRules // Ensure cellClassRules are applied
            };
          }
          return colDef;
        });

        gridRef.current.api.setColumnDefs(updatedColumnDefs);
        // Force refresh all cells to apply new validation rules
        setTimeout(() => {
          gridRef.current.api.refreshCells({ force: true });
        }, 100);
      }
    }
  }, [schema, template, cellPassRules]);

  const defaultColDef = useMemo(() => ({
    flex: 1,
    resizable: true,
    minWidth: 100,
    tooltipComponent: tooltip,
    cellClass: 'modern-cell',
    headerClass: 'modern-header',
  }), []);

  const onShowLoading = useCallback(() => {
    gridRef.current?.api?.showLoadingOverlay();
  }, []);

  const onLoadingHide = useCallback(() => {
    gridRef.current?.api?.hideOverlay();
  }, []);

  // Fixed onGridReady with proper async handling and column setup
  const onGridReady = useCallback(async (params) => {
    if (!state.collection || !state.template) {
      console.error('Missing collection or template ID:', state);
      params.api.showNoRowsOverlay();
      return;
    }

    setIsInitialLoading(true);
    onShowLoading();

    try {
      // Fetch template data first (CRITICAL for validation setup)
      const templateResponse = await fetch('/api/templates', {
        headers: { template_id: state.template }
      });

      if (!templateResponse.ok) {
        throw new Error('Failed to fetch template');
      }

      const templateData = await templateResponse.json();

      if (!templateData || !Array.isArray(templateData.columns)) {
        console.error('Invalid template data:', templateData);
        params.api.showNoRowsOverlay();
        return;
      }

      // Set template and schema FIRST (critical for validation)
      setTemplate(templateData);
      setSchema(templateData.schema || {});

      // Create column definitions with cellClassRules applied
      const templateColumns = templateData.columns
          .filter(x => x.label !== 'errors') // Filter out the errors column
          .map((x) => ({
            headerName: x.label,
            field: x.label,
            editable: true,
            cellClassRules: cellPassRules, // Apply the validation rules
            tooltipField: x.label,
            hide: false,
            headerClass: 'modern-header',
            cellClass: 'modern-cell',
            cellRenderer: cellRenderer,
          }));

      // Update column definitions
      setColumnDefs((prev) => [...prev, ...templateColumns]);

      // Fetch metadata
      const [metaCountResponse, errorCountResponse] = await Promise.all([
        axios.get(recordsUri),
        axios.get(errorCountUri),
      ]);

      setFileMetaData({
        ...metaCountResponse.data,
        ...errorCountResponse.data,
      });

      const countOfRecords = metaCountResponse.data.totalRecords;

      // Create data source
      const dataSource = {
        rowCount: countOfRecords,
        getRows: async (params) => {
          const url = `/api/meta?collection=${state.collection}&_start=${params.startRow}&_end=${params.endRow}`;
          try {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            params.successCallback(data.data, countOfRecords);
          } catch (error) {
            console.error('Error fetching grid data:', error);
            params.failCallback();
          }
        },
      };

      params.api.setDatasource(dataSource);
      setOriginalDataSource(dataSource);

      // Force refresh after everything is set up to ensure error highlighting works
      setTimeout(() => {
        params.api.refreshCells({ force: true });
      }, 100);

    } catch (error) {
      console.error('Error in onGridReady:', error);
      params.api.showNoRowsOverlay();
    } finally {
      setIsInitialLoading(false);
      onLoadingHide();
    }
  }, [state.collection, state.template, cellPassRules, cellRenderer, recordsUri, errorCountUri]);

  const onCellValueChanged = useCallback((params) => {
    if (params.oldValue === params.newValue) return;

    const column = params.column.colDef.field;
    const dbUpdate = cellCheckBySchema(column, params.newValue);

    const removeByKey = (arr, key) => {
      const requiredIndex = arr.findIndex((el) => el.key === String(key));
      if (requiredIndex === -1) return false;
      return !!arr.splice(requiredIndex, 1);
    };

    if (!dbUpdate) {
      const obj = {
        collection_id: state.collection,
        data: { ...params.data }
      };

      let validationArr = [];
      if (params.data?.validationData) {
        validationArr = [...params.data.validationData];
        removeByKey(validationArr, column);
      }

      delete obj.data.validationData;
      obj.data.validationData = validationArr;
      obj.data._id = params.data._id;

      // Clear error styling by refreshing cells
      params.api.refreshCells({ force: true, columns: [column], rowNodes: [params.node] });

      axios.post('/api/update', obj)
          .then(() => axios.get(errorCountUri))
          .then((res) => {
            setFileMetaData((prev) => ({ ...prev, ...res.data }));
          })
          .catch((err) => console.error('Update error:', err));
    } else {
      // Refresh to show error styling through cellClassRules
      params.api.refreshCells({ force: true, columns: [column], rowNodes: [params.node] });
    }
  }, [cellCheckBySchema, errorCountUri, state.collection]);

  const customLoadingTemplate = useMemo(() => `
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
  `, []);

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

          .cell-value.empty-cell {
            color: #9ca3af;
            font-style: italic;
          }

          .cell-indicators {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-left: 6px;
            flex-shrink: 0;
          }

          .feedback-indicator {
            display: flex;
            align-items: center;
          }

          /* CRITICAL: Error highlighting styles - these must match the cellClassRules names */
          .ag-cell.cell-fail {
            background: #fef2f2 !important;
            border-left: 3px solid #ef4444 !important;
            color: #dc2626 !important;
            font-weight: 500;
          }

          .ag-cell.null-check {
            background: #fffbeb !important;
            border-left: 3px solid #f59e0b !important;
            color: #d97706 !important;
            font-weight: 500;
          }

          .ag-cell.cell-modified {
            background: #f0fdf4 !important;
            border-left: 3px solid #22c55e !important;
            color: #16a34a !important;
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
                    <a
                        href={"/imports"}
                        className="inline-flex items-center px-3 py-1.5 mb-3 rounded-lg font-medium text-xs text-purple-600 bg-purple-50 border border-purple-100 hover:bg-purple-100 hover:border-purple-200 transition-all duration-200 transform hover:scale-105"
                    >
                      {/*<Sparkles className="w-3 h-3 mr-1" />*/}
                      Back
                    </a>
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
            <div className="space-y-4 w-full">
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
                      rowBuffer={10}
                      rowSelection={'single'}
                      rowModelType={'infinite'}
                      cacheBlockSize={100}
                      cacheOverflowSize={2}
                      maxConcurrentDatasourceRequests={3}
                      infiniteInitialRowCount={100}
                      maxBlocksInCache={10}
                      tooltipShowDelay={500}
                      tooltipHideDelay={2000}
                      onCellValueChanged={onCellValueChanged}
                      onGridReady={onGridReady}
                      rowHeight={32}
                      headerHeight={32}
                      animateRows={false}
                      suppressMovableColumns={true}
                      overlayLoadingTemplate={customLoadingTemplate}
                      suppressRowClickSelection={true}
                      suppressCellFocus={false}
                      enableCellTextSelection={true}
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