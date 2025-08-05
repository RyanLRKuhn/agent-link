import WorkflowModule from './components/WorkflowModule';

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="h-16 border-b border-gray-800 bg-gray-900 flex items-center px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold">
            A
          </div>
          <h1 className="text-xl font-semibold text-white">AgentLink</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-gray-900 p-6 flex items-center justify-center">
        <WorkflowModule />
      </main>
    </div>
  );
}
