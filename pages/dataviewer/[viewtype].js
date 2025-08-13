import React, { useEffect, useState } from 'react';
import Dataviewer from '../../components/dataviewer';
import { useRouter } from 'next/router';
import Layout from '../../layouts/Layout';

const DataviewerPage = () => {
  const { query } = useRouter();
  const { viewtype } = query;
  const [dataViewerType, setDataViewerType] = useState();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!viewtype) {
      setIsLoading(false);
      return;
    }
    setDataViewerType(viewtype);
    setIsLoading(false);
  }, [viewtype]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
      <>
        {dataViewerType === 'norm' ? (
            <Layout>
              <Dataviewer version={dataViewerType} />
            </Layout>
        ) : (

            <Dataviewer version={dataViewerType} />
        )}
      </>
  );
};

export default DataviewerPage;