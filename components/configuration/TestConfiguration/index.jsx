import { YoButton } from '../../../lib/yoembed';

const TestConfiguration = ({ configId }) => {
  return (
    <div className="flex flex-col justify-center items-center mt-3">
      <YoButton
        btnText="Import CSV"
        importerId={configId}
        yoHostUrl={'http://localhost:5050'}
      />
    </div>
  );
};

export default TestConfiguration;
