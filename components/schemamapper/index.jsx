import { useState, useCallback, useRef, useContext } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Context } from '../../context';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
import { useRouter } from 'next/router';
import axios from 'axios';
import UploadProgress from '../uploadProgress';
import ToggleValueRenderer from './ToggleButton';
import {
  DATE_DATA_TYPE,
  STRING_DATA_TYPE,
  NUMBER_DATA_TYPE,
  EMAIL_CHECK_TYPE,
  BOOLEAN_DATA_TYPE,
  DATE_CHECK_TYPE,
  THREE_DIGIT_CHECK_TYPE,
  NO_GMAIL_CHECK_TYPE,
  EMAIL_DATA_TYPE,
  DROPDOWN_SELECT_TEXT,
} from '../../constants';
// import Stepper from '../stepper';

const SchemaMapper = () => {
  const gridRef = useRef();
  const { state, dispatch } = useContext(Context);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recordsUploaded, setRecordsUploaded] = useState(0);
  const [templateName, setTemplateName] = useState();
  const router = useRouter();

  const schemaDataTypes = [
    DATE_DATA_TYPE,
    STRING_DATA_TYPE,
    EMAIL_DATA_TYPE,
    NUMBER_DATA_TYPE,
    BOOLEAN_DATA_TYPE,
  ];
  const checkTypes = [
    DROPDOWN_SELECT_TEXT,
    EMAIL_CHECK_TYPE,
    DATE_CHECK_TYPE,
    THREE_DIGIT_CHECK_TYPE,
    NO_GMAIL_CHECK_TYPE,
  ];

  const columnDefs = [
    {
      headerName: 'Table Column',
      field: 'key',
      cellStyle: { background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)' },
      headerClass: 'modern-header',
    },
    {
      headerName: 'Data Type',
      field: 'data_type',
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: schemaDataTypes,
      },
      cellStyle: {
        cursor: 'pointer',
        borderRadius: '5px',
        background: '#ffffff',
      },
      headerClass: 'modern-header',
      cellClass: 'modern-cell',
      onCellValueChanged: (e) =>
          dispatch({ type: 'CURRENT_FILE_TEMPLATE_UPDATE', payload: e.data }),
    },
    {
      headerName: 'Required',
      field: 'is_required',
      cellRenderer: ToggleValueRenderer,
      cellStyle: { cursor: 'pointer', background: '#ffffff' },
      headerClass: 'modern-header',
      cellClass: 'modern-cell',
    },
  ];

  const uploadFile = ({ target, template_id }) => {
    let data = new FormData();
    data.append('file', target);

    var options = {
      method: 'post',
      url: '/api/upload',
      headers: {
        'Content-Type': 'multipart/form-data',
        template_id: template_id,
      },
      onUploadProgress: (progressEvent) => {
        const { loaded, total } = progressEvent;
        let percent = Math.floor((loaded * 100) / total);
        setProgress(percent);
        setRecordsUploaded(loaded);
      },
      data: data,
    };
    axios(options)
        .then((res) => {
          dispatch({
            type: 'SET_COLLECTION_NAME',
            payload: res.data.collection_name,
          });

          router.push({ pathname: '/templates' }, undefined, {
            shallow: true,
          });
        })
        .catch((err) => console.log(err));
  };

  const saveTemplate = () => {
    if (!templateName) return;
    setLoading(true);
    let data = {
      columns: state.validationTemplate.map((e) => ({
        ...e,
        custom_message: `${e.label} should be of type ${e.data_type}`,
      })),
      template_name: templateName,
    };
    delete data.collection_name;
    axios
        .post('/api/templates', data)
        .then((result) => {
          // dispatch({ type: 'SET_CUR_TEMPLATE', payload: result.data.insertedId });
          // uploadFile({
          //   target: state.curFile,
          //   template_id: result.data.insertedId,
          // });
        })
        .catch((err) => console.log(err));
    router.push({ pathname: '/templates' });
  };

  const onGridReady = useCallback((params) => {
    params.api.sizeColumnsToFit();
    window.addEventListener('resize', function () {
      setTimeout(function () {
        params.api.sizeColumnsToFit();
      });
    });
    gridRef.current.api.sizeColumnsToFit();
    return () => {
      window.removeEventListener('resize', () => {});
    };
  }, []);

  return (
      <>
        <style jsx global>{`
        .ag-theme-alpine {
          --ag-header-height: 30px;
          --ag-row-height: 30px;
          --ag-border-color: #e5e7eb;
          --ag-header-background-color: #f9fafb;
          --ag-row-hover-color: #f3f4f6;
          --ag-selected-row-background-color: #dbeafe;
          --ag-odd-row-background-color: #ffffff;
          --ag-even-row-background-color: #fafafa;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
        }

        /* Hide scrollbars but keep scrolling functionality */
        .ag-theme-alpine .ag-body-viewport {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }

        .ag-theme-alpine .ag-body-viewport::-webkit-scrollbar {
          display: none; /* Chrome, Safari, and other Webkit browsers */
        }

        /* Ensure outer container hides scrollbars */
        .schema-mapper-container {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }

        .schema-mapper-container::-webkit-scrollbar {
          display: none; /* Chrome, Safari, and other Webkit browsers */
        }

        .modern-header {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-bottom: 2px solid #e2e8f0;
          font-weight: 600;
          font-size: 14px;
          color: #374151;
          padding: 0 16px;
          display: flex;
          align-items: center;
        }

        .modern-cell {
          padding: 8px 16px;
          border-right: 1px solid #f3f4f6;
          transition: all 0.2s ease;
        }

        .modern-cell:hover {
          background: #f8fafc;
          transform: translateY(-1px);
        }

        .ag-row-even {
          background: #ffffff;
        }

        .ag-row-odd {
          background: #fafafa;
        }

        .ag-row-hover {
          background: #f8fafc;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
        }

        .ag-header-row {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .ag-root-wrapper {
          border-radius: 12px;
          overflow: hidden;
        }

        /* Style the template name input section */
        .template-name-container {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          margin-bottom: 16px;
        }

        .template-name-title {
          font-size: 18px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
        }

        .template-name-description {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 12px;
        }

        .template-name-input {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px;
          font-size: 14px;
          color: #374151;
          width: 100%;
          transition: all 0.2s ease;
        }

        .template-name-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          outline: none;
        }

        .error-text {
          color: #ef4444;
          font-size: 12px;
          margin-top: 4px;
        }

        /* Style buttons */
        .create-template-button {
          transition: all 0.2s ease;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 600;
          background: transparent;
          border: 1px solid #3b82f6;
          color: #3b82f6;
        }

        .create-template-button:hover {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-color: #2563eb;
          color: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        /* Dark mode support */
        .dark .ag-theme-alpine {
          --ag-header-background-color: #1f2937;
          --ag-row-hover-color: #374151;
          --ag-selected-row-background-color: #1e40af;
          --ag-odd-row-background-color: #1f2937;
          --ag-even-row-background-color: #111827;
          --ag-border-color: #4b5563;
        }

        .dark .modern-header {
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
          color: #e5e7eb;
          border-bottom: 2px solid #4b5563;
        }

        .dark .modern-cell {
          border-right: 1px solid #4b5563;
          color: #d1d5db;
        }

        .dark .modern-cell:hover {
          background: #374151;
        }

        .dark .ag-row-hover {
          background: #374151;
        }

        .dark .template-name-container {
          background: #1f2937;
          border: 1px solid #4b5563;
          color: #d1d5db;
        }

        .dark .template-name-title {
          color: #e5e7eb;
        }

        .dark .template-name-description {
          color: #9ca3af;
        }

        .dark .template-name-input {
          background: #111827;
          border-color: #4b5563;
          color: #d1d5db;
        }

        .dark .template-name-input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
        }

        .dark .error-text {
          color: #f87171;
        }

        .dark .create-template-button {
          border-color: #60a5fa;
          color: #60a5fa;
        }

        .dark .create-template-button:hover {
          background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
          border-color: #3b82f6;
          color: #ffffff;
        }
      `}</style>

        <div className="schema-mapper-container">
          {/* <Stepper step={3} /> */}
          {!loading && (
              <>
                <div className="w-full sm:flex sm:space-x-8 sm:p-4">
                  <button
                      onClick={saveTemplate}
                      className="create-template-button h-8 px-4 m-2 text-sm font-semibold ml-auto"
                  >
                    Create Template
                  </button>
                </div>
                <div className="ag-theme-alpine p-4" style={{ height: '420px', width: 'auto' }}>
                  <div className="template-name-container my-4 flex flex-col">
                    <h2 className="template-name-title">Name</h2>
                    <p className="template-name-description">Name of the template</p>
                    <div className="flex flex-col w-full">
                      <input
                          type="text"
                          id="default-input"
                          className="template-name-input"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                      />
                      {!templateName && <span className="error-text">Template name cannot be empty</span>}
                    </div>
                  </div>
                  <AgGridReact
                      ref={gridRef}
                      columnDefs={columnDefs}
                      rowData={state.validationTemplate}
                      onGridReady={onGridReady}
                      rowHeight={30}
                      headerHeight={30}
                  />
                </div>
              </>
          )}
          {loading && (
              <UploadProgress progress={progress} loaded={recordsUploaded} />
          )}
        </div>
      </>
  );
};

export default SchemaMapper;