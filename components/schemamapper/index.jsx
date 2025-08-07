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
import { FileText } from 'lucide-react';

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
      cellStyle: { backgroundColor: '#F8FAFC' },
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
        borderRadius: '4px',
        backgroundColor: '#ffffff',
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
      cellStyle: { cursor: 'pointer', backgroundColor: '#ffffff' },
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
            --ag-header-height: 24px;
            --ag-row-height: 24px;
            --ag-border-color: #dbeafe;
            --ag-header-background-color: #eff6ff;
            --ag-row-hover-color: #dbeafe;
            --ag-selected-row-background-color: #bfdbfe;
            --ag-odd-row-background-color: #ffffff;
            --ag-even-row-background-color: #f8fafc;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.05);
          }

          .ag-theme-alpine .ag-body-viewport {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .ag-theme-alpine .ag-body-viewport::-webkit-scrollbar {
            display: none;
          }

          .schema-mapper-container {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .schema-mapper-container::-webkit-scrollbar {
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
          }

          .modern-cell:hover {
            background: #dbeafe;
            transform: translateY(-1px);
          }

          .ag-row-even {
            background: #ffffff;
          }

          .ag-row-odd {
            background: #f8fafc;
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

          .template-name-container {
            background: #ffffff;
            border: 1px solid #dbeafe;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            margin-bottom: 12px;
          }

          .template-name-title {
            font-size: 14px;
            font-weight: 600;
            color: #1e3a8a;
            margin-bottom: 4px;
          }

          .template-name-description {
            font-size: 12px;
            color: #4b5563;
            margin-bottom: 8px;
          }

          .template-name-input {
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            padding: 8px;
            font-size: 12px;
            color: #1e3a8a;
            width: 100%;
            transition: all 0.2s ease;
          }

          .template-name-input:focus {
            border-color: #1e40af;
            box-shadow: 0 0 0 2px rgba(29, 78, 216, 0.1);
            outline: none;
          }

          .error-text {
            color: #dc2626;
            font-size: 11px;
            margin-top: 4px;
          }

          .create-template-button {
            transition: all 0.2s ease;
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 600;
            background: transparent;
            border: 1px solid #1e40af;
            color: #1e40af;
          }

          .create-template-button:hover {
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            border-color: #1e3a8a;
            color: #ffffff;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
        `}</style>

        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
          <div className="p-6 max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-md border border-blue-100 mb-6">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-blue-600 rounded-lg">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                        Schema Mapping
                      </h1>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Define the data types and requirements for your template
                    </p>
                  </div>
                  <button
                      onClick={saveTemplate}
                      className="create-template-button flex items-center gap-2 h-8 px-4 text-xs font-semibold"
                  >
                    <FileText className="w-4 h-4" />
                    Create Template
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            {!loading && (
                <div className="bg-white rounded-xl shadow-md border border-blue-100">
                  <div className="p-4">
                    <div className="template-name-container flex flex-col">
                      <h2 className="template-name-title">Template Name</h2>
                      <p className="template-name-description">Enter a name for your template</p>
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
                    <div className="ag-theme-alpine" style={{ height: (state.validationTemplate?.length + 1) * 24 || 200, width: '100%' }}>
                      <AgGridReact
                          ref={gridRef}
                          columnDefs={columnDefs}
                          rowData={state.validationTemplate}
                          onGridReady={onGridReady}
                          rowHeight={24}
                          headerHeight={24}
                      />
                    </div>
                  </div>
                </div>
            )}
            {loading && (
                <UploadProgress progress={progress} loaded={recordsUploaded} />
            )}
          </div>
        </div>
      </>
  );
};

export default SchemaMapper;