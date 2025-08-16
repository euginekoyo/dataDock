import React from 'react';
import InputBox from './inputbox';

const ValidatedCell = () => {
  console.log('Rendering ValidatedCell with props: Employee age, peter');
  return <InputBox columnName="Employee age" val="peter" />;
};

export default ValidatedCell;