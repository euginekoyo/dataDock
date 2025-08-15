import { YoButton } from '../../../lib/yoembed';

function App({ templateId }) {
  return (
    <div className="flex flex-col h-full  justify-center items-center dark:bg-gray-800">
      <div className="mt-3 fixed p-72 gap-2 top-0">
        <YoButton
          btnText="Import CSV Data"
          templateId={templateId}
          yoHostUrl={`${process.env.NEXT_PUBLIC_API_URL}`}
        />

      </div>
    </div>
  );
}

export default App;
