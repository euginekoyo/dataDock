import { Dialog, RadioGroup, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { DROPDOWN_SELECT_TEXT } from '../../../constants';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import customValidationDropdown from './customValidationDropdown';

const formats = [
  {
    name: 'Number',
    Description: 'Numbers with , and . characters allowed',
  },
  {
    name: 'Text',
    Description: 'Any String of Characters',
  },
  {
    name: 'Date',
    Description: 'Matches selected Date Format',
  },
  {
    name: 'Boolean',
    Description: 'Matches Boolean Values',
  },
  {
    name: 'Email',
    Description: 'Valid Email Address',
  },
];

const ValidationModel = ({ isOpen, closeModal, setModalData }) => {
  const [selected, setSelected] = useState(null);

  const customValidationFinder = ({ obj, e }) => {
    if (!e.custom_validations || e.custom_validations.length === 0) {
      return { key: 'custom_validation', value: null };
    }
    if (e.custom_validations.indexOf(obj.value) > -1) {
      return obj;
    } else {
      return { key: 'custom_validation', value: null };
    }
  };

  const handleFormatSelection = (e) => {
    setModalData((prev) => {
      if (prev.find((el) => el.key === 'data_type')) {
        let newArr = prev.map((obj) =>
            obj.key === 'data_type'
                ? { key: 'data_type', value: e.name }
                : obj.key === 'custom_validation'
                    ? customValidationFinder({ obj, e })
                    : obj
        );
        return newArr;
      } else {
        return [...prev, { key: 'data_type', value: e.name }];
      }
    });

    setSelected(e);
  };

  const handleCustomFormatSelection = (selected) => {
    if (selected !== DROPDOWN_SELECT_TEXT) {
      setModalData((prev) => {
        if (prev.find((el) => el.key === 'custom_validation')) {
          return prev.map((obj) =>
              obj.key === 'custom_validation'
                  ? { key: 'custom_validation', value: selected }
                  : obj
          );
        } else {
          return [...prev, { key: 'custom_validation', value: selected }];
        }
      });
    }
  };

  return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-30" onClose={closeModal}>
          <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-6 text-left shadow-xl transition-all border border-gray-200/50 dark:border-gray-700/50">
                  <Dialog.Title
                      as="h2"
                      className="text-xl font-semibold text-gray-900 dark:text-white flex items-center justify-between mb-6"
                  >
                    Choose Validation Format
                    <button
                        type="button"
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        onClick={closeModal}
                    >
                      <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span className="sr-only">Close modal</span>
                    </button>
                  </Dialog.Title>
                  <div className="mt-4">
                    <RadioGroup value={selected} onChange={handleFormatSelection}>
                      <div className="space-y-3">
                        {formats.map((plan) => (
                            <RadioGroup.Option
                                key={plan.name}
                                value={plan}
                                className={({ active, checked }) =>
                                    `relative flex cursor-pointer rounded-xl px-5 py-4 border-2 bg-white/50 dark:bg-gray-800/50 transition-all duration-200 ${
                                        checked
                                            ? 'border-blue-500 dark:border-blue-400 shadow-lg'
                                            : 'border-gray-200 dark:border-gray-700'
                                    } ${active ? 'ring-2 ring-blue-400 dark:ring-blue-600 ring-offset-2' : ''}`
                                }
                            >
                              {({ checked }) => (
                                  <div className="flex w-full items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                      <div className="text-sm">
                                        <RadioGroup.Label as="div" className="flex items-center space-x-3">
                                    <span className="font-medium text-gray-900 dark:text-gray-200">
                                      {plan.name}
                                    </span>
                                          {plan.custom_validations && (
                                              <customValidationDropdown
                                                  options={plan}
                                                  handleCustomFormatSelection={handleCustomFormatSelection}
                                                  handleFormatSelection={handleFormatSelection}
                                              />
                                          )}
                                        </RadioGroup.Label>
                                        <RadioGroup.Description
                                            as="span"
                                            className="italic text-gray-500 dark:text-gray-400"
                                        >
                                          {plan.Description}
                                        </RadioGroup.Description>
                                      </div>
                                    </div>
                                    {checked && (
                                        <CheckCircleIcon className="h-6 w-6 text-green-500 dark:text-green-400" />
                                    )}
                                  </div>
                              )}
                            </RadioGroup.Option>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105 shadow-lg"
                        onClick={closeModal}
                    >
                      Save
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
  );
};

export default ValidationModel;