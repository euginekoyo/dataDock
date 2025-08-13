import React, {useState, useRef} from 'react';
import Editor from '@monaco-editor/react';
import {useRouter} from 'next/router';
import {InformationCircleIcon, ArrowDownTrayIcon, ArrowLeftIcon} from '@heroicons/react/24/outline';
import SyntaxHighlighter from 'react-syntax-highlighter';
import {googlecode} from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import Link from 'next/link';
import {Tab} from '@headlessui/react';
import {ToastContainer, toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

const JSON_Template = () => {
    const router = useRouter();
    const [prompt, setPrompt] = useState('');
    const editorRef = useRef();
    const defaultCode = `{
    "type": "object",
    "properties": {
        "firstName": {
        "type": "string",
        "maxLength": 5,
        "format": "first-name-validation",
        "validate": "(x) => (x.startsWith('yo') ? true : false)"
        },
        "email": { "type": "string", "format": "email" },
        "dob": { "type": "string", "format": "date" },
        "countryCode": {
        "type": "string",
        "enum": ["US", "CA"]
        }
    },
    "required": ["firstName", "email", "dob", "countryCode"]    
}`;
    const [isValidJson, setIsValidJson] = useState(true);
    const [code, setCode] = useState('{}');
    const [templateName, setTemplateName] = useState('');
    const [value, setValue] = useState('{}');
    const [isGenerating, setIsGenerating] = useState(false);

    function handleEditorDidMount(editor, monaco) {
        editorRef.current = editor;
    }

    const saveTemplate = () => {
        if (!templateName) {
            toast.error('Template name is required');
            return;
        }
        try {
            JSON.parse(value);
        } catch (e) {
            setIsValidJson(false);
            toast.error('Invalid JSON schema');
            return;
        }
        editorRef.current.trigger('editor', 'editor.action.formatDocument');
        axios
            .post('/api/templates/json', {templateName, schema: value})
            .then((result) => {
                router.push({pathname: '/templates'}, undefined, {
                    shallow: true,
                });
            })
            .catch((err) => {
                console.error('Error saving template:', err);
                toast.error(err.response?.data?.error || 'Failed to save template');
            });
    };

    const handleEditorChange = (value) => {
        try {
            JSON.parse(value);
            setIsValidJson(true);
        } catch {
            setIsValidJson(false);
        }
        setValue(value);
        setCode(value);
    };

    const generateAJV = () => {
        setIsGenerating(true);
        setValue('Generating schema...');
        setIsValidJson(true);

        fetch('/api/datadock-ai/ajvschema', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === 200 && data.data) {
                    const formattedJson = JSON.stringify(data.data, null, 2);
                    setValue(formattedJson);
                    setIsValidJson(true);
                } else {
                    const errorMsg = data.data?.error || 'Invalid response from API';
                    if (errorMsg.includes('Rate limit exceeded')) {
                        const resetTime = data.data?.rateLimitReset
                            ? new Date(Number(data.data.rateLimitReset)).toLocaleString()
                            : 'later';
                        throw new Error(`Rate limit exceeded. Please try again after ${resetTime} or upgrade your OpenRouter plan.`);
                    }
                    throw new Error(errorMsg);
                }
            })
            .catch((e) => {
                console.error('Error generating AJV schema:', e);
                setValue('{"error": "Failed to generate schema"}');
                setIsValidJson(false);
                toast.error(e.message);
            })
            .finally(() => {
                setIsGenerating(false);
            });
    };

    return (
        <>
            <ToastContainer/>
            <div
                className="">
                {/* Header */}
                <div
                    className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
                    <div className="max-w-7xl mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <Link href="/templates">
                                    <button
                                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400"/>
                                    </button>
                                </Link>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                        JSON Schema Template
                                    </h1>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Create and validate JSON schemas
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={saveTemplate}
                                className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg"
                            >
                                <ArrowDownTrayIcon className="h-4 w-4 mr-2"/>
                                Save Template
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Panel - Editor */}
                        <div className="space-y-6">
                            {/* Template Name */}
                            <div
                                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            Template Name
                                            <span className="text-red-500 ml-1">*</span>
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Give your template a descriptive name
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {!templateName && (
                                        <div className="flex items-center space-x-2 text-sm text-red-500">
                                            <InformationCircleIcon className="h-4 w-4"/>
                                            <span>This field is required</span>
                                        </div>
                                    )}
                                    <input
                                        type="text"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        placeholder="Enter template name..."
                                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-0 bg-white/50 dark:bg-gray-700/50 ${
                                            !templateName
                                                ? 'border-red-300 focus:border-red-500'
                                                : 'border-gray-200 focus:border-blue-500 dark:border-gray-600 dark:focus:border-blue-400'
                                        } text-gray-900 dark:text-white placeholder-gray-400`}
                                    />
                                </div>
                            </div>

                            {/* Error Message */}
                            {!isValidJson && !isGenerating && (
                                <div
                                    className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl">
                                    <div className="flex items-start">
                                        <InformationCircleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-3"/>
                                        <div>
                                            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                                                JSON Validation Error
                                            </h3>
                                            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                                                <p className="mb-2">Please check the following:</p>
                                                <ul className="list-disc list-inside space-y-1">
                                                    <li>
                                                        JSON formatting using{' '}
                                                        <a
                                                            href="https://jsonformatter.curiousconcept.com/"
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="underline hover:text-red-600"
                                                        >
                                                            JSON Formatter
                                                        </a>
                                                    </li>
                                                    <li>
                                                        Regex validation using{' '}
                                                        <a
                                                            href="https://regex101.com/"
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="underline hover:text-red-600"
                                                        >
                                                            Regex101
                                                        </a>
                                                    </li>
                                                    <li>
                                                        JSON escape sequences using{' '}
                                                        <a
                                                            href="https://www.freeformatter.com/json-escape.html"
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="underline hover:text-red-600"
                                                        >
                                                            JSON Escape Tool
                                                        </a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Editor */}
                            <div
                                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        JSON Schema Editor
                                    </h3>
                                    <div
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            isValidJson
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}
                                    >
                                        {isValidJson ? 'Valid JSON' : 'Invalid JSON'}
                                    </div>
                                </div>
                                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                    <Editor
                                        height="65vh"
                                        width="100%"
                                        language="json"
                                        value={value}
                                        defaultValue={code}
                                        theme="vs-dark"
                                        onChange={handleEditorChange}
                                        onMount={handleEditorDidMount}
                                        options={{
                                            minimap: {enabled: false},
                                            fontSize: 13,
                                            validate: false,
                                            renderValidationDecorations: 'off',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Panel - AI Assistant and Examples */}
                        <div className="space-y-6">
                            <div
                                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                                <Tab.Group>
                                    <Tab.List
                                        className="flex bg-gradient-to-r from-blue-500 to-indigo-600 p-1 rounded-t-2xl">
                                        <Tab
                                            className={({selected}) =>
                                                classNames(
                                                    'flex-1 flex items-center justify-center relative rounded-xl py-3 px-4 text-sm font-medium transition-all duration-200',
                                                    selected
                                                        ? 'bg-white text-blue-600 shadow-lg'
                                                        : 'text-white/80 hover:text-white hover:bg-white/10'
                                                )
                                            }
                                        >
                                            <span className="mr-2">With DataFusionAI</span>
                                            <span
                                                className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                        BETA
                      </span>
                                        </Tab>
                                        <Tab
                                            className={({selected}) =>
                                                classNames(
                                                    'flex-1 flex items-center justify-center rounded-xl py-3 px-4 text-sm font-medium transition-all duration-200',
                                                    selected
                                                        ? 'bg-white text-blue-600 shadow-lg'
                                                        : 'text-white/80 hover:text-white hover:bg-white/10'
                                                )
                                            }
                                        >
                                            Without DataFusionAI
                                        </Tab>
                                    </Tab.List>
                                    <Tab.Panels>
                                        <Tab.Panel className="p-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                        Generate with AI
                                                    </h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                        Describe what you want to validate and let AI generate the
                                                        schema
                                                    </p>
                                                </div>
                                                <div className="space-y-4">
                          <textarea
                              rows="10"
                              value={prompt}
                              onChange={(e) => setPrompt(e.target.value)}
                              placeholder="Example: Create a schema for user registration that validates email, password with minimum 8 characters, age between 18-100, and optional phone number..."
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          />
                                                    <button
                                                        onClick={generateAJV}
                                                        disabled={isGenerating || !prompt.trim()}
                                                        className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                                    >
                                                        {isGenerating ? (
                                                            <>
                                                                <div
                                                                    className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                                Generating...
                                                            </>
                                                        ) : (
                                                            'Generate Schema'
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </Tab.Panel>
                                        <Tab.Panel className="p-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                        Sample Schema
                                                    </h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                        A basic example to get you started
                                                    </p>
                                                </div>
                                                <div
                                                    className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                                    <SyntaxHighlighter
                                                        language="json"
                                                        wrapLongLines={true}
                                                        style={googlecode}
                                                        className="text-sm"
                                                    >
                                                        {defaultCode}
                                                    </SyntaxHighlighter>
                                                </div>
                                                <button
                                                    onClick={() => setValue(defaultCode)}
                                                    className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-medium rounded-xl hover:from-green-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg"
                                                >
                                                    Copy to Editor
                                                </button>
                                            </div>
                                        </Tab.Panel>
                                    </Tab.Panels>
                                </Tab.Group>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default JSON_Template;