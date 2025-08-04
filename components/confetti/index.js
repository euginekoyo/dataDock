import React from 'react';
import useWindowSize from 'react-use/lib/useWindowSize';
import Confetti from 'react-confetti';

const ConfettiComponent = () => {
  const { width, height } = useWindowSize();
  return <div></div>;
};

export default ConfettiComponent;
