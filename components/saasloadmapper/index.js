import React, {useCallback, useContext, useEffect, useRef, useState,} from 'react';
import {AgGridReact} from 'ag-grid-react';
import {Context} from '../../context';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
import stringSimilarity from 'string-similarity';
import axios from 'axios';
import UploadProgress from '../uploadProgress';
import {useRouter} from 'next/router';
import MyModal from '../genericdialog';
import CheckboxComponent from './CheckboxComponent';
import {Tab} from '@headlessui/react';
import classNames from 'classnames';
import cuid from 'cuid';
import {UploadCloud} from 'lucide-react';

const columnMatcher = ({ saasTemplate, validationTemplate }) => {
    if (!saasTemplate || !validationTemplate) return;
    let saasTemplateLabels = saasTemplate.map((e) => e.label);
    let columnMatcherTemplate = validationTemplate.map((el) => {
        let bestMatchObj = stringSimilarity.findBestMatch(
            el.key,
            saasTemplateLabels
        );
        let bestMatchObjLabel = bestMatchObj.bestMatch['target'];
        let saasTemplateObj = saasTemplate.find(
            (e) => e.label === bestMatchObjLabel
        );
        return { ...saasTemplateObj, key: el.key, is_imported: true };
    });
    return columnMatcherTemplate;
};

const columnMatcherAi = async ({ saasTemplate, validationTemplate }) => {
    if (!saasTemplate || !validationTemplate) return;
    let saasTemplateLabels = saasTemplate.map((e) => e.label);
    let validationTemplateLabels = validationTemplate.map((e) => e.label);
    let resp = await fetch('/api/datadock-ai/match', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            validationTemplateColumns: validationTemplateLabels,
            saasTemplateColumns: saasTemplateLabels,
        }),
    });
    let parsedResp = await resp.json();
    let matchedColumns = parsedResp?.data || {};
    let columnMatcherTemplate = validationTemplate.map((el) => {
        let saasTemplateObj = saasTemplate.find(
            (e) => e.label === matchedColumns[el.key]
        );
        return {
            ...saasTemplateObj,
            key: el.key,
            is_imported: matchedColumns[el.key] ? true : false,
        };
    });
    return columnMatcherTemplate;
};

const SassLoadMapper = () => {
    const gridRef = useRef();
    const router = useRouter();

    const [selectedTab, setSelectedTab] = useState(1);
    const { state, dispatch } = useContext(Context);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duplicate, setDuplicate] = useState(false);

    const hideAi = process.env.NEXT_PUBLIC_HIDE_AI === 'false';

    useEffect(() => {
        selectedTab === 0
            ? columnMatcherAi({
                saasTemplate: state.saasTemplateColumns,
                validationTemplate: state.validationTemplate,
            }).then((payload) => {
                dispatch({
                    type: 'SET_SAAS_LOAD_MAPPER_TEMPLATE',
                    payload,
                });
            })
            : dispatch({
                type: 'SET_SAAS_LOAD_MAPPER_TEMPLATE',
                payload: columnMatcher({
                    saasTemplate: state.saasTemplateColumns,
                    validationTemplate: state.validationTemplate,
                }),
            });
    }, [selectedTab, state.saasTemplateColumns, state.validationTemplate, dispatch]);

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
            },
            data: data,
        };
        axios(options)
            .then((res) => {
                dispatch({
                    type: 'SET_COLLECTION_NAME',
                    payload: res.data.collection_name,
                });
                setTimeout(() => {
                    router.push({ pathname: '/dataviewer/saas' }, undefined, {
                        shallow: true,
                    });
                }, 300);
            })
            .catch((err) => console.log(err));
    };

    const saveTemplate = () => {
        // Check for duplicate labels
        let labels = state.curSaasLoadMapperTemplate
            .filter((el) => el.is_imported)
            .map((el) => el.label);

        if (new Set(labels).size !== labels.length) {
            setDuplicate(true);
            return;
        }

        setLoading(true);

        // Get and sanitize base file name
        const originalName = state.curFile?.name || 'uploaded_file.csv';
        const baseName = originalName.replace(/\.[^/.]+$/, ''); // Remove extension

        const slugifiedName = baseName
            .toLowerCase()
            .replace(/\s+/g, '_')                   // spaces → underscores
            .replace(/[^a-z0-9_-]/g, '');           // remove special characters

        const fileName = `upload-${slugifiedName}-${cuid()}.csv`;

        const data = {
            columns: state.curSaasLoadMapperTemplate.filter(
                (el) => el.is_imported && el.label
            ),
            baseTemplateId: state.baseTemplateId,
            fileName: fileName,
        };
        axios
            .post('/api/templates', data)
            .then((result) => {
                dispatch({ type: 'SET_CUR_TEMPLATE', payload: result.data.insertedId });
                uploadFile({
                    target: state.curFile,
                    template_id: result.data.insertedId,
                });
            })
            .catch((err) => {
                console.log(err);
            });
    };

    const columnDefs = [
        {
            headerName: 'CSV Column',
            resizable: true,
            field: 'key',
            type: 'nonEditableColumn',
            cellStyle: { backgroundColor: '#F8FAFC' },
        },
        {
            headerName: 'Template Column',
            resizable: true,
            field: 'label',
            editable: true,
            cellStyle: { cursor: 'pointer' },
            cellEditor: 'agSelectCellEditor',
            singleClickEdit: true,
            cellEditorParams: {
                values: state.saasTemplateColumns
                    ? state.saasTemplateColumns.map((el) => el.label)
                    : [],
            },
            onCellValueChanged: (e) => {
                dispatch({ type: 'SAAS_LOAD_MAPPER_TEMPLATE_UPDATE', payload: e.data });
            },
            cellClass: (params) => {
                return state.curSaasLoadMapperTemplate.filter(
                    (el) => el.is_imported && el.label === params.value
                ).length > 1
                    ? 'text-red-400 editable-grid-cell'
                    : 'editable-grid-cell';
            },
            cellRenderer: function (params) {
                return params.value;
            },
        },
        {
            headerName: 'Select Columns',
            resizable: true,
            field: 'is_imported',
            cellStyle: { direction: 'rtl' },
            cellRenderer: 'checkboxRenderer',
            onCellValueChanged: (e) => {
                dispatch({ type: 'SAAS_LOAD_MAPPER_TEMPLATE_UPDATE', payload: e.data });
            },
        },
        {
            headerName: 'Example',
            resizable: true,
            field: 'example',
            cellStyle: { backgroundColor: '#F8FAFC' },
        }
    ];

    const onFirstDataRendered = useCallback((params) => {
        gridRef.current.api.forEachNode((node) => node.setSelected(true));
    }, []);

    const onGridReady = useCallback((params) => {
        window.addEventListener('resize', function () {
            setTimeout(function () {
                params.api.sizeColumnsToFit();
            });
        });
        gridRef.current.api.sizeColumnsToFit();
    }, []);

    let frameworkComponents = { checkboxRenderer: CheckboxComponent };

    const GridWrapper = ({ children }) => (
        <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden">
            <div className="p-4">
                <div
                    className="ag-theme-alpine rounded-lg overflow-hidden border border-blue-100"
                    style={{
                        height: (state.curSaasLoadMapperTemplate?.length + 1) * 50 || 300,
                        width: '100%',
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );

    return (
        <>
            {!loading && (
                <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
                    <div className="p-6 max-w-5xl mx-auto">
                        {/* Header Section */}
                        <div className="bg-white rounded-xl shadow-md border border-blue-100 mb-6">
                            <div className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="p-1.5 bg-blue-600 rounded-lg">
                                                <UploadCloud className="w-6 h-6 text-white" />
                                            </div>
                                            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                                                Column Mapping
                                            </h1>
                                        </div>
                                        <p className="text-gray-600 text-sm">
                                            Map your CSV columns to the template fields
                                        </p>
                                    </div>
                                    <button
                                        onClick={saveTemplate}
                                        className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg px-4 py-2 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-xs"
                                    >
                                        <UploadCloud className="w-4 h-4" />
                                        Upload Data
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        {!hideAi ? (
                            <div className="bg-white rounded-xl shadow-md border border-blue-100">
                                <Tab.Group
                                    onChange={(index) => {
                                        setSelectedTab(index);
                                    }}
                                    defaultIndex={1}
                                >
                                    {/* Tab Navigation */}
                                    <div className="border-b border-blue-100 p-4 pb-0">
                                        <Tab.List className="flex space-x-1 rounded-lg bg-blue-50/30 p-1">
                                            <Tab
                                                className={({ selected }) =>
                                                    classNames(
                                                        'w-full relative rounded-lg py-2 px-3 text-xs font-semibold transition-all duration-200',
                                                        selected
                                                            ? 'bg-white text-blue-600 shadow-sm'
                                                            : 'text-gray-600 hover:bg-blue-100'
                                                    )
                                                }
                                            >
                                                <span>With DataFusion-AI</span>
                                                <div className="absolute inline-flex items-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full -top-1 -right-1">
                                                    BETA
                                                </div>
                                            </Tab>
                                            <Tab
                                                className={({ selected }) =>
                                                    classNames(
                                                        'w-full rounded-lg py-2 px-3 text-xs font-semibold transition-all duration-200',
                                                        selected
                                                            ? 'bg-white text-blue-600 shadow-sm'
                                                            : 'text-gray-600 hover:bg-blue-100'
                                                    )
                                                }
                                            >
                                                Without DataFusion-AI
                                            </Tab>
                                        </Tab.List>
                                    </div>

                                    {/* Tab Panels */}
                                    <Tab.Panels>
                                        <Tab.Panel className="p-4">
                                            <div className="mb-4 p-3 bg-blue-50/30 rounded-lg border border-blue-100">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                                    <p className="text-xs text-blue-800 font-medium">
                                                        AI-powered column matching active
                                                    </p>
                                                </div>
                                            </div>
                                            <GridWrapper>
                                                <AgGridReact
                                                    ref={gridRef}
                                                    columnDefs={columnDefs}
                                                    rowData={state.curSaasLoadMapperTemplate}
                                                    onGridReady={onGridReady}
                                                    rowHeight={50}
                                                    suppressHorizontalScroll={true}
                                                    suppressRowClickSelection={true}
                                                    rowSelection={'multiple'}
                                                    onFirstDataRendered={onFirstDataRendered}
                                                    components={frameworkComponents}
                                                />
                                            </GridWrapper>
                                        </Tab.Panel>
                                        <Tab.Panel className="p-4">
                                            <div className="mb-4 p-3 bg-blue-50/30 rounded-lg border border-blue-100">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                                                    <p className="text-xs text-gray-600 font-medium">
                                                        String similarity matching active
                                                    </p>
                                                </div>
                                            </div>
                                            <GridWrapper>
                                                <AgGridReact
                                                    ref={gridRef}
                                                    columnDefs={columnDefs}
                                                    rowData={state.curSaasLoadMapperTemplate}
                                                    onGridReady={onGridReady}
                                                    rowHeight={50}
                                                    suppressHorizontalScroll={true}
                                                    suppressRowClickSelection={true}
                                                    rowSelection={'multiple'}
                                                    onFirstDataRendered={onFirstDataRendered}
                                                    components={frameworkComponents}
                                                />
                                            </GridWrapper>
                                        </Tab.Panel>
                                    </Tab.Panels>
                                </Tab.Group>
                            </div>
                        ) : (
                            <div>
                                <div className="mb-4 p-3 bg-blue-50/30 rounded-lg border border-blue-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                                        <p className="text-xs text-gray-600 font-medium">
                                            String similarity matching active
                                        </p>
                                    </div>
                                </div>
                                <GridWrapper>
                                    <AgGridReact
                                        ref={gridRef}
                                        columnDefs={columnDefs}
                                        rowData={state.curSaasLoadMapperTemplate}
                                        onGridReady={onGridReady}
                                        rowHeight={50}
                                        suppressHorizontalScroll={true}
                                        suppressRowClickSelection={true}
                                        rowSelection={'multiple'}
                                        onFirstDataRendered={onFirstDataRendered}
                                        components={frameworkComponents}
                                    />
                                </GridWrapper>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {loading && <UploadProgress progress={progress} />}
            {duplicate && (
                <MyModal
                    title={'Duplicate Columns Detected'}
                    description={
                        'Please check the labels highlighted in red. These columns have been mapped to the same template field and need to be corrected.'
                    }
                    isVisible={duplicate}
                    setIsvisible={setDuplicate}
                />
            )}
        </>
    );
};

export default SassLoadMapper;