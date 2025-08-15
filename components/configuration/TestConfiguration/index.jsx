import { YoButton } from '../../../lib/yoembed';

const TestConfiguration = ({ configId }) => {
  return (
    <div className="flex flex-col justify-center items-center mt-3">
      <YoButton
        btnText="Import CSV"
        importerId={configId}
        yoHostUrl={`${process.env.NEXT_PUBLIC_API_URL}`}
      />
    </div>
  );
};

export default TestConfiguration;
