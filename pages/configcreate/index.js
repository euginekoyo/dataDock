import ConfigList from '../../components/configuration/ConfigList';
import Layout from '../../layouts/Layout';

const ConfigCreate = () => {
  return (
    <Layout>
      <div className="overflow-x-auto mx-4 mt-5 rounded-lg">
        <div className="p-6 rounded-lg">
          <ConfigList />
        </div>
      </div>
    </Layout>
  );
};

export default ConfigCreate;
