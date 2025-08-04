import React, {
    useEffect,
    useState,
    useContext,
    useCallback,
    useRef,
} from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Context } from '../../context';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
import stringSimilarity from 'string-similarity';
import axios from 'axios';
import UploadProgress from '../uploadProgress';
import { useRouter } from 'next/router';
import MyModal from '../genericdialog';
import CheckboxComponent from './CheckboxComponent';
import { Tab } from '@headlessui/react';
import classNames from 'classnames';
import Link from 'next/link';
import cuid from 'cuid';

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
        let labels = state.curSaasLoadMapperTemplate
            .filter((el) => el.is_imported)
            .map((el) => el.label);
        if (new Set(labels).size !== labels.length) {
            setDuplicate(true);
            return;
        }

        setLoading(true);
        let data = {
            columns: state.curSaasLoadMapperTemplate.filter(
                (el) => el.is_imported && el.label
            ),
            baseTemplateId: state.baseTemplateId,
            fileName: state.curFile.name + cuid(),
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
                <div
                    className="ag-theme-alpine rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600"
                    style={{
                        height: (state.curSaasLoadMapperTemplate?.length + 1) * 67 || 400,
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
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
                    <div className="container mx-auto px-4 lg:px-8">
                        {/* Header Section */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                                            Column Mapping
                                        </h1>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            Change or confirm column matches between your CSV and template
                                        </p>
                                    </div>
                                    <button
                                        onClick={saveTemplate}
                                        className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/50 dark:focus:ring-blue-400/50"
                                    >
                                        <span className="relative z-10">Upload Data</span>
                                        <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        {!hideAi ? (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                                <Tab.Group
                                    onChange={(index) => {
                                        setSelectedTab(index);
                                    }}
                                    defaultIndex={1}
                                >
                                    {/* Tab Navigation */}
                                    <div className="border-b border-gray-200 dark:border-gray-700 p-6 pb-0">
                                        <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 dark:bg-gray-700 p-1">
                                            <Tab
                                                className={({ selected }) =>
                                                    classNames(
                                                        'w-full relative rounded-lg py-3 px-4 text-sm font-medium leading-5 transition-all duration-200',
                                                        selected
                                                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                                            : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600/50'
                                                    )
                                                }
                                            >
                                                <span>With DataDock-AI</span>
                                                <div className="absolute inline-flex items-center px-2 py-0.5 justify-center text-xs font-bold text-white bg-red-500 rounded-full -top-1 -right-1">
                                                    BETA
                                                </div>
                                            </Tab>
                                            <Tab
                                                className={({ selected }) =>
                                                    classNames(
                                                        'w-full rounded-lg py-3 px-4 text-sm font-medium leading-5 transition-all duration-200',
                                                        selected
                                                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                                            : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600/50'
                                                    )
                                                }
                                            >
                                                Without DataDock-AI
                                            </Tab>
                                        </Tab.List>
                                    </div>

                                    {/* Tab Panels */}
                                    <Tab.Panels>
                                        <Tab.Panel className="p-6">
                                            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
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
                                                    rowHeight={70}
                                                    suppressHorizontalScroll={true}
                                                    suppressRowClickSelection={true}
                                                    rowSelection={'multiple'}
                                                    onFirstDataRendered={onFirstDataRendered}
                                                    components={frameworkComponents}
                                                />
                                            </GridWrapper>
                                        </Tab.Panel>
                                        <Tab.Panel className="p-6">
                                            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
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
                                                    rowHeight={70}
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
                                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
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
                                        rowHeight={70}
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