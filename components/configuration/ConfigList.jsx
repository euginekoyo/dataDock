import {useEffect, useState} from 'react';
import {AttachToImporter, AttachToOrganizations, AttachToWorkspace,} from './index';
import Link from 'next/link';
import SuccessModal from '../common/SuccessModal';
import SyntaxHighlighter from 'react-syntax-highlighter';
import {googlecode} from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import {InformationCircleIcon} from '@heroicons/react/24/solid';
import CopyToClipboard from 'react-copy-to-clipboard';
import {ChevronLeftIcon, DocumentDuplicateIcon} from '@heroicons/react/24/outline';
import axios from 'axios';
import {toast, ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const jsonOBJ = [
  {
    value: 'Object A',
    label: 'Object A',
  },
  {
    value: 'Object B',
    label: 'Object B',
  },
  {
    value: 'Object C',
    label: 'Object C',
  },
];

const ConfigList = () => {
  const [organizations, setOrganizations] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [importers, setImporters] = useState([]);
  const [importerName, setImporterName] = useState('');
  const [attachToImporters, setAttachToImporters] = useState(null);
  const [attachToOrganizations, setAttachToOrganizations] = useState(null);
  const [attachThemeJSONObj, setAttachThemeJSONObj] = useState(null);
  const [attachToWorkspace, setAttachToWorkspace] = useState(null);
  const [attachWebHookURL, setAttachWebHookURL] = useState(null);
  const [configurationData, setConfigurationData] = useState(null);
  const [error, setError] = useState(null);
  const [isVisible, setVisible] = useState(false);

  const [code, setCode] = useState(`import { YoButton } from "../../lib/yoembed";
import "./App.css";

function App() {
    return (
    <div className="App">
        <h2>This is my SAAS</h2>
        <hr />
        <br />
        <YoButton
            importId="Generated when saving importer"
            yoHostUrl={\`${process.env.NEXT_PUBLIC_API_URL}\`}
        />
    </div>
    );
}

export default App;`);

  const handleClick = (e) => {
    e.preventDefault();
    if (
        !importerName ||
        !attachToImporters
    ) {
      setError('* Please fill all the required fields');
      return;
    }

    axios
        .post('/api/importer', {
          importerName: importerName,
          templateId: attachToImporters.value,
          organizationId: attachToOrganizations?.value,
          workspaceId: attachToWorkspace?.value,
          templateName: attachToImporters.label,
        })
        .then((response) => {
          if ((response.status = 201))
            setConfigurationData({
              importerId: response.data.insertedId,
              templateId: attachToImporters.value, // ✅ ADD THIS

            });
          setVisible(true);
        })
        .catch((err) => {
          console.log(err);
          toast.error(err.response.data.error);
        });
  };

  useEffect(() => {
    if (configurationData) {
      setCode(`import { YoButton } from "../../lib/yoembed";
import "./App.css";

function App() {
    return (
    <div className="App">
        <h2>This is my SAAS</h2>
        <hr />
        <br />
        <YoButton
            importId="${configurationData.importerId}"
            templateId="${configurationData.templateId}"  
            yoHostUrl={\`${process.env.NEXT_PUBLIC_API_URL}\`}
        />
    </div>
    );
}

export default App;`);
    }
  }, [configurationData]);

  useEffect(() => {
    axios
        .get('/api/templates')
        .then((res) => {
          let listOfTemplates = res.data
              .filter(
                  (el) =>
                      el['template_name'] && el['template_name'].split('.').length === 1
              )
              .map((el) => {
                return { value: el._id, label: el.template_name };
              });
          setImporters(listOfTemplates);
        })
        .catch((e) => console.log(e));

    axios
        .get('/api/organizations')
        .then((res) => {
          setOrganizations(
              res.data.map((el) => {
                return { value: el._id, label: el.orgName };
              })
          );
        })
        .catch((e) => console.log(e));

    axios
        .get('/api/organizations')
        .then((res) => {
          setWorkspaces(
              res.data.map((el) => {
                return {
                  value: el.workspaces[0].workspaceId,
                  label: el.workspaces[0].workspaceName,
                };
              })
          );
        })
        .catch((e) => console.log(e));
  }, []);

  const acknowledgeModal = () => {
    setVisible(false);
    setImporterName('');
    setAttachToWorkspace(null);
    setAttachToOrganizations(null);
    setAttachToImporters(null);
  };

  useEffect(() => {
    if (
        attachToImporters &&
        attachToOrganizations &&
        attachThemeJSONObj &&
        attachToWorkspace &&
        attachWebHookURL
    ) {
      setError('');
    }
  }, [
    attachThemeJSONObj,
    attachToImporters,
    attachToOrganizations,
    attachToWorkspace,
    attachWebHookURL,
  ]);

  return (
      <>
        <ToastContainer />
        <div className="rounded-lg min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link href="/configuration">
                    <button className="inline-flex items-center px-3 py-2 rounded-xl text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <ChevronLeftIcon className="h-5 w-5 mr-1" />
                      Back to List
                    </button>
                  </Link>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                      Create Importer Configuration
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Configure your importer settings and generate embed code
                    </p>
                  </div>
                </div>
                <button
                    onClick={handleClick}
                    className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-6 py-8">
            {isVisible && (
                <SuccessModal
                    submit={acknowledgeModal}
                    message={'Successfully added the importer!'}
                />
            )}

            {/* Form and Code Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              {/* Form Section */}
              <div className="space-y-6">
                {/* Importer Name */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Name <span className="text-red-500">*</span>
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Name of the importer
                      </p>
                    </div>
                    <div className="space-y-2">
                      {!importerName && (
                          <div className="flex items-center space-x-2 text-sm text-red-500">
                            <InformationCircleIcon className="h-4 w-4" />
                            <span>This field is required</span>
                          </div>
                      )}
                      <input
                          type="text"
                          id="default-input"
                          className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-0 bg-white/50 dark:bg-gray-700/50 ${
                              !importerName
                                  ? 'border-red-300 focus:border-red-500'
                                  : 'border-gray-200 focus:border-blue-500 dark:border-gray-600 dark:focus:border-blue-400'
                          } text-gray-900 dark:text-white placeholder-gray-400`}
                          value={importerName}
                          placeholder="Enter Your Importer Name"
                          onChange={(e) => {
                            setError('');
                            setImporterName(e.target.value);
                          }}
                      />
                    </div>
                  </div>
                </div>

                {/* Attach Components */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                  <AttachToImporter
                      attachToImporters={attachToImporters}
                      setAttachToImporters={setAttachToImporters}
                      importers={importers}
                  />
                  <AttachToOrganizations
                      attachToOrganizations={attachToOrganizations}
                      setAttachToOrganizations={setAttachToOrganizations}
                      organizations={organizations}
                  />
                  <AttachToWorkspace
                      attachToWorkspace={attachToWorkspace}
                      setAttachToWorkspace={setAttachToWorkspace}
                      workspaces={workspaces}
                  />

                </div>
              </div>

            </div>
          </div>
        </div>
      </>
  );
};

export default ConfigList;